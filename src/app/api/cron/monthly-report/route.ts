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
        const clerkUser = encrypted
          ? await (await clerkClient()).users.getUser(user.clerkUserId)
          : null;
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
        const analysisInput = buildAnalysisInput(
          transactions,
          previousTransactions,
          user.settings?.defaultCurrency || Currency.EUR,
          lastMonth.toISOString().slice(0, 7),
        );
        const language = user.settings?.language || 'ENG';
        const analysis =
          Date.now() + MONTHLY_ANALYSIS_TIMEOUT_MS < analysisDeadline
            ? await getMonthlyAnalysis(analysisInput, language)
            : null;

        // Send monthly report email
        await sendMonthlyReportEmail({
          analysis,
          analysisTransactions: analysisInput.transactions,
          language,
          userEmail: user.email,
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
        });

        reportsSent.push(user.email);
        console.log(`Monthly report sent to ${user.email}`);
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
