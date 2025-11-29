'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { decrypt, decryptFloat } from '@/lib/crypto';
import { ExpenseCategory } from '@/constants/types';

interface CategoryForecast {
  category: string;
  averageAmount: number;
}

interface MonthlyForecast {
  categoryForecasts: CategoryForecast[];
  recurringTotal: number;
  totalForecast: number;
  error?: string;
}

async function getMonthlyForecast(): Promise<MonthlyForecast> {
  const user = await currentUser();
  const userId = user?.id;
  const decryptKey = user?.primaryEmailAddressId;

  if (!userId) {
    return {
      categoryForecasts: [],
      recurringTotal: 0,
      totalForecast: 0,
      error: 'User not found',
    };
  }

  // Get encryptData setting from user settings
  const settings = await db.settings.findUnique({
    where: { clerkUserId: userId },
    select: { encryptData: true },
  });

  const shouldDecrypt = Boolean(settings?.encryptData && decryptKey);

  try {
    const now = new Date();
    // Get date range for last 6 months
    const sixMonthsAgo = subMonths(now, 6);
    const sixMonthsAgoStart = startOfMonth(sixMonthsAgo);
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Get all expense transactions from last 6 months
    // Exclude recurring transactions, Others category, and CCRepayment
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        type: TransactionType.Expense,
        date: {
          gte: sixMonthsAgoStart,
          lte: lastMonthEnd,
        },
        isRecurring: false, // Exclude recurring transactions
        category: {
          notIn: [ExpenseCategory.Others, ExpenseCategory.CCRepayment],
        },
      },
    });

    // Get recurring transactions total from last month (same logic as getRecurringTransactions)
    // These are the recurring transactions that will be expected in the current month
    const lastMonth = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const recurringTransactions = await db.transaction.findMany({
      where: {
        userId,
        type: TransactionType.Expense,
        isRecurring: true,
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
        OR: [
          { recurringEndDate: null },
          { recurringEndDate: { gt: now } },
        ],
        CCExpenseTransactionId: null,
      },
    });

    // Decrypt if needed
    let processedTransactions = transactions;
    let processedRecurring = recurringTransactions;

    if (shouldDecrypt && decryptKey) {
      processedTransactions = transactions.map((transaction) => ({
        ...transaction,
        amountDefaultCurrency: decryptFloat(
          transaction.amountDefaultCurrency,
          decryptKey,
        ),
      }));

      processedRecurring = recurringTransactions.map((transaction) => ({
        ...transaction,
        amountDefaultCurrency: decryptFloat(
          transaction.amountDefaultCurrency,
          decryptKey,
        ),
      }));
    }

    // Calculate recurring total
    const recurringTotal = processedRecurring.reduce(
      (sum, t) => sum + (Number(t.amountDefaultCurrency) || 0),
      0,
    );

    // Group transactions by category and calculate averages
    const categoryMap = new Map<string, number[]>();

    processedTransactions.forEach((transaction) => {
      const category = transaction.category;
      const amount = Number(transaction.amountDefaultCurrency) || 0;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(amount);
    });

    // Calculate average for each category
    const categoryForecasts: CategoryForecast[] = Array.from(
      categoryMap.entries(),
    ).map(([category, amounts]) => {
      const averageAmount =
        amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

      return {
        category,
        averageAmount: Math.round(averageAmount * 100) / 100, // Round to 2 decimals
      };
    });

    // Sort by average amount descending
    categoryForecasts.sort((a, b) => b.averageAmount - a.averageAmount);

    // Calculate total forecast
    const totalForecast =
      categoryForecasts.reduce(
        (sum, forecast) => sum + forecast.averageAmount,
        0,
      ) + recurringTotal;

    return {
      categoryForecasts,
      recurringTotal,
      totalForecast: Math.round(totalForecast * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching monthly forecast:', error);

    return {
      categoryForecasts: [],
      recurringTotal: 0,
      totalForecast: 0,
      error: 'Database error',
    };
  }
}

export default getMonthlyForecast;

