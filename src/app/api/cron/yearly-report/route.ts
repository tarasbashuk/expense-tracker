export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfYear, endOfYear, subYears } from 'date-fns';
import * as Sentry from '@sentry/nextjs';
import { sendYearlyReportEmail } from '@/lib/yearlyReportEmail';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import { TransactionType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    Sentry.captureMessage('Yearly report cron job started', 'info');

    // Verify secret key for security
    const authHeader = request.headers.get('authorization');
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const lastYear = subYears(today, 1);
    const lastYearStart = startOfYear(lastYear);
    const lastYearEnd = endOfYear(lastYear);

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
        // Get user's transactions for last year
        const transactions = await db.transaction.findMany({
          where: {
            userId: user.clerkUserId,
            date: {
              gte: lastYearStart,
              lte: lastYearEnd,
            },
          },
          orderBy: {
            amountDefaultCurrency: 'desc',
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
          (t) => t.type === TransactionType.Expense && t.category !== 'CCRepayment',
        );
        const incomes = transactions.filter(
          (t) => t.type === TransactionType.Income && t.category !== 'CreditReceived',
        );

        const totalExpenses = expenses.reduce(
          (sum, t) => sum + t.amountDefaultCurrency,
          0,
        );
        const totalIncomes = incomes.reduce(
          (sum, t) => sum + t.amountDefaultCurrency,
          0,
        );

        // Calculate average per month
        const avgExpensesPerMonth = totalExpenses / 12;
        const avgIncomesPerMonth = totalIncomes / 12;

        // Group expenses by category
        const expensesByCategory = expenses.reduce(
          (acc, t) => {
            const category = t.category;
            if (!acc[category]) {
              acc[category] = { total: 0, count: 0 };
            }
            acc[category].total += t.amountDefaultCurrency;
            acc[category].count += 1;
            return acc;
          },
          {} as Record<string, { total: number; count: number }>,
        );

        // Group incomes by category
        const incomesByCategory = incomes.reduce(
          (acc, t) => {
            const category = t.category;
            if (!acc[category]) {
              acc[category] = { total: 0, count: 0 };
            }
            acc[category].total += t.amountDefaultCurrency;
            acc[category].count += 1;
            return acc;
          },
          {} as Record<string, { total: number; count: number }>,
        );

        // Convert to arrays and sort by total amount
        const expenseCategories = Object.entries(expensesByCategory)
          .map(([category, data]) => ({
            category,
            total: data.total,
            count: data.count,
            avgPerMonth: data.total / 12,
          }))
          .sort((a, b) => b.total - a.total);

        const incomeCategories = Object.entries(incomesByCategory)
          .map(([category, data]) => ({
            category,
            total: data.total,
            count: data.count,
            avgPerMonth: data.total / 12,
          }))
          .sort((a, b) => b.total - a.total);

        // Top 10 expenses by amount
        const topExpenses = expenses
          .slice(0, 10)
          .map((t) => ({
            text: t.text,
            amountDefaultCurrency: t.amountDefaultCurrency,
            currency: t.currency,
            date: t.date,
            category: t.category,
          }));

        // Top 10 incomes by amount
        const topIncomes = incomes
          .slice(0, 10)
          .map((t) => ({
            text: t.text,
            amountDefaultCurrency: t.amountDefaultCurrency,
            currency: t.currency,
            date: t.date,
            category: t.category,
          }));

        // Send yearly report email
        await sendYearlyReportEmail({
          userEmail: user.email,
          userName: user.firstName || user.email,
          year: lastYear.getFullYear().toString(),
          totalTransactions: transactions.length,
          totalExpenses,
          totalIncomes,
          avgExpensesPerMonth,
          avgIncomesPerMonth,
          expenseCategories,
          incomeCategories,
          topExpenses,
          topIncomes,
          expenseCategoriesMap: EXPENSE_CATEGORIES,
          incomeCategoriesMap: INCOME_CATEGORIES,
          defaultCurrency: user.settings?.defaultCurrency,
        });

        reportsSent.push(user.email);
        console.log(`Yearly report sent to ${user.email}`);
      } catch (error) {
        console.error(
          `Failed to process yearly report for ${user.email}:`,
          error,
        );
        Sentry.captureException(error);
      }
    }

    Sentry.captureMessage(
      `Yearly report processed. Reports sent: ${reportsSent.length}`,
      'info',
    );

    return NextResponse.json({
      success: true,
      reportsSent: reportsSent.length,
      year: lastYear.getFullYear().toString(),
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error processing yearly report:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

