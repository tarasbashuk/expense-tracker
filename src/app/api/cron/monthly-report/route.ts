export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import * as Sentry from '@sentry/nextjs';
import { sendMonthlyReportEmail } from '@/lib/monthlyReportEmail';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';

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

    // Get all users
    const users = await db.user.findMany({
      select: {
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
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

        // Top 5 expenses by amount (excluding CCRepayment)
        const topExpenses = expenses
          .filter((t) => t.category !== 'CCRepayment')
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
          topExpenses,
          topCategories,
          expenseCategories: EXPENSE_CATEGORIES,
          incomeCategories: INCOME_CATEGORIES,
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

    Sentry.captureMessage(
      `Monthly report processed. Reports sent: ${reportsSent.length}`,
      'info',
    );

    return NextResponse.json({
      success: true,
      reportsSent: reportsSent.length,
      month: lastMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
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
