export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import * as Sentry from '@sentry/nextjs';
import { sendMonthlyReportEmail } from '@/lib/monthlyReportEmail';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import { processYearlyReportForUsers } from '../yearly-report/processYearlyReport';

export async function GET(request: NextRequest) {
  try {
    Sentry.captureMessage('Monthly report cron job started', 'info');

    // Verify secret key for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const lastMonth = subMonths(today, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    // Check if we should also send yearly report (if it's January)
    // Since cron runs on the 1st of each month, we only need to check the month
    // Allow forcing yearly report via query parameter for testing
    const { searchParams } = new URL(request.url);
    const forceYearly = searchParams.get('forceYearly') === 'true';
    const isJanuary = today.getMonth() === 0; // 0 = January
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
          },
        },
      },
    });

    const reportsSent = [];

    for (const user of users) {
      try {
        // Get user's transactions for last month
        const transactions = await db.transaction.findMany({
          where: {
            userId: user.clerkUserId,
            date: {
              gte: lastMonthStart,
              lte: lastMonthEnd,
            },
          },
          orderBy: {
            amount: 'desc',
          },
        });

        if (transactions.length === 0) {
          console.log(
            `No transactions for user ${user.email}, skipping report`,
          );
          continue;
        }

        // Calculate statistics (excluding CCRepayment and CreditReceived)
        const expenses = transactions.filter(
          (t) => t.type === 'Expense' && t.category !== 'CCRepayment',
        );
        const incomes = transactions.filter(
          (t) => t.type === 'Income' && t.category !== 'CreditReceived',
        );

        const totalExpenses = expenses.reduce(
          (sum, t) => sum + t.amountDefaultCurrency,
          0,
        );
        const totalIncomes = incomes.reduce(
          (sum, t) => sum + t.amountDefaultCurrency,
          0,
        );

        // Calculate total donations
        const donations = expenses.filter((t) => t.category === 'donations');
        const totalDonations = donations.reduce(
          (sum, t) => sum + t.amountDefaultCurrency,
          0,
        );

        // Top 5 expenses by amount (excluding CCRepayment)
        const topExpenses = expenses
          .sort((a, b) => b.amountDefaultCurrency - a.amountDefaultCurrency)
          .slice(0, 5);

        // Top 5 categories by count
        const categoryCounts = expenses.reduce(
          (acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1;

            return acc;
          },
          {} as Record<string, number>,
        );

        const topCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([category, count]) => ({ category, count }));

        // Send monthly report email
        await sendMonthlyReportEmail({
          userEmail: user.email,
          userName: user.firstName || user.email,
          month: lastMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
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
