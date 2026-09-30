export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';
import { Currency } from '@prisma/client';
import {
  buildAnalysisInput,
  decodeReportTransactions,
  getReportPeriods,
  getReportTransactions,
  summarizeMonth,
} from '@/lib/monthlyReport/data';
import {
  getMonthlyAnalysis,
  MONTHLY_ANALYSIS_TIMEOUT_MS,
} from '@/lib/monthlyReport/analysis';
import * as Sentry from '@sentry/nextjs';
import {
  buildForecastInput,
  getForecastPeriods,
} from '@/lib/monthlyReport/forecast';
import { sendMonthlyReportEmail } from '@/lib/monthlyReportEmail';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import { processYearlyReportForUsers } from '../yearly-report/processYearlyReport';

export async function GET(request: NextRequest) {
  // Budget from invocation start, including database and Clerk requests.
  // Reserve the final 15 seconds for email delivery and other report work.
  const analysisDeadline = Date.now() + (maxDuration * 1000 - 15_000);

  try {
    Sentry.captureMessage('Monthly report cron job started', 'info');

    // Verify secret key for security
    const authHeader = request.headers.get('authorization');
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const periods = getReportPeriods(today);
    const lastMonth = periods.start;

    // Check if we should also send yearly report (if it's January)
    // Since cron runs on the 1st of each month, we only need to check the month
    // Allow forcing yearly report via query parameter for testing
    const { searchParams } = new URL(request.url);
    const forceYearly = searchParams.get('forceYearly') === 'true';
    const isJanuary = today.getUTCMonth() === 0; // 0 = January
    const shouldSendYearlyReport = forceYearly || isJanuary;

    // Get all users with their settings
    const users = await db.user.findMany({
      select: {
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        settings: {
          select: {
            defaultCurrency: true,
            encryptData: true,
            creditCardTrackingEnabled: true,
            language: true,
          },
        },
      },
    });

    const reportsSent = [];

    for (const user of users) {
      try {
        // Load the report month and the preceding month for comparison.
        const storedTransactions = await db.transaction.findMany({
          where: {
            userId: user.clerkUserId,
            date: {
              gte: periods.previousStart,
              lt: periods.end,
            },
          },
          orderBy: {
            amount: 'desc',
          },
        });

        const reportTransactions = getReportTransactions(
          storedTransactions,
          user.settings?.creditCardTrackingEnabled ?? false,
        );
        if (!reportTransactions.some((t) => t.date >= periods.start)) {
          console.log(
            `No transactions for user ${user.email}, skipping report`,
          );
          continue;
        }

        const encrypted = Boolean(user.settings?.encryptData);
        const clerkUser = await (
          await clerkClient()
        ).users.getUser(user.clerkUserId);
        const recipients = Array.from(
          new Set(
            clerkUser.emailAddresses
              .filter((email) => email.verification?.status === 'verified')
              .map((email) => email.emailAddress.trim().toLowerCase())
              .filter(Boolean),
          ),
        );

        if (recipients.length === 0) {
          Sentry.captureMessage(
            'Monthly report skipped: no verified account emails',
            'warning',
          );
          continue;
        }

        const readableTransactions = decodeReportTransactions(
          reportTransactions,
          encrypted,
          clerkUser?.primaryEmailAddressId,
        );
        const transactions = readableTransactions.filter(
          (t) => t.date >= periods.start,
        );
        const previousTransactions = readableTransactions.filter(
          (t) => t.date < periods.start,
        );
        const summary = summarizeMonth(transactions);
        const { totalExpenses, totalIncomes, totalDonations, topExpenses } =
          summary;
        const topCategories = [...summary.categories]
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        let forecast = null;

        try {
          const forecastPeriods = getForecastPeriods(today);
          const forecastRows = await db.transaction.findMany({
            where: {
              userId: user.clerkUserId,
              OR: [
                {
                  date: {
                    gte: forecastPeriods.historicalStart,
                    lt: forecastPeriods.historicalEnd,
                  },
                },
                {
                  isRecurring: true,
                  date: {
                    gte: forecastPeriods.start,
                    lt: forecastPeriods.end,
                  },
                },
              ],
            },
          });
          const decodedForecastRows = decodeReportTransactions(
            getReportTransactions(
              forecastRows,
              user.settings?.creditCardTrackingEnabled ?? false,
            ),
            encrypted,
            clerkUser?.primaryEmailAddressId,
          );

          forecast = buildForecastInput(
            [...transactions, ...decodedForecastRows],
            today,
          );
        } catch {
          Sentry.captureMessage(
            'Monthly forecast unavailable; sending standard report',
            'warning',
          );
        }

        const analysisInput = buildAnalysisInput(
          transactions,
          previousTransactions,
          user.settings?.defaultCurrency || Currency.EUR,
          lastMonth.toISOString().slice(0, 7),
          forecast,
        );
        const language = user.settings?.language || 'ENG';
        const analysis =
          Date.now() + MONTHLY_ANALYSIS_TIMEOUT_MS < analysisDeadline
            ? await getMonthlyAnalysis(analysisInput, language)
            : null;

        // Generate the analysis once, then send a separate copy to each recipient.
        const report = {
          forecast: analysis?.forecast ?? null,
          analysis,
          analysisTransactions: analysisInput.transactions,
          language,
          userName: user.firstName || user.email,
          month: lastMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }),
          totalTransactions: transactions.length,
          totalExpenses,
          totalIncomes,
          totalDonations,
          topExpenses,
          topCategories,
          expenseCategories: EXPENSE_CATEGORIES,
          incomeCategories: INCOME_CATEGORIES,
          defaultCurrency: user.settings?.defaultCurrency,
        };
        const deliveries = await Promise.all(
          recipients.map(async (userEmail) => {
            const sent = await sendMonthlyReportEmail({ ...report, userEmail });

            return sent ? userEmail : null;
          }),
        );
        const successfulRecipients = deliveries.filter(
          (email) => email !== null,
        );

        reportsSent.push(...successfulRecipients);
        console.log(
          `Monthly report sent to ${successfulRecipients.length} account emails`,
        );
      } catch (error) {
        console.error(
          `Failed to process monthly report for ${user.email}:`,
          error,
        );
        Sentry.captureException(error);
      }
    }

    // If it's January 1st, also send yearly report
    if (shouldSendYearlyReport) {
      try {
        Sentry.captureMessage(
          'Yearly report triggered from monthly report',
          'info',
        );

        const yearlyResult = await processYearlyReportForUsers(users);

        Sentry.captureMessage(
          `Yearly report processed. Reports sent: ${yearlyResult.reportsSent.length}`,
          'info',
        );
      } catch (error) {
        console.error('Failed to process yearly report:', error);
        Sentry.captureException(error);
      }
    }

    const message = shouldSendYearlyReport
      ? `Monthly and yearly reports processed. Reports sent: ${reportsSent.length}`
      : `Monthly report processed. Reports sent: ${reportsSent.length}`;

    Sentry.captureMessage(message, 'info');

    return NextResponse.json({
      success: true,
      reportsSent: reportsSent.length,
      month: lastMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      yearlyReportSent: shouldSendYearlyReport,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error processing monthly report:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
