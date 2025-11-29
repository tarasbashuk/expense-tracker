'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { decryptFloat } from '@/lib/crypto';
import { ExpenseCategory } from '@/constants/types';

interface CategoryForecast {
  category: string;
  averageAmount: number;
}

interface MonthlyForecast {
  categoryForecasts: CategoryForecast[];
  error?: string;
}

async function getMonthlyForecast(): Promise<MonthlyForecast> {
  const user = await currentUser();
  const userId = user?.id;
  const decryptKey = user?.primaryEmailAddressId;

  if (!userId) {
    return {
      categoryForecasts: [],
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

    // Decrypt if needed
    let processedTransactions = transactions;

    if (shouldDecrypt && decryptKey) {
      processedTransactions = transactions.map((transaction) => ({
        ...transaction,
        amountDefaultCurrency: decryptFloat(
          transaction.amountDefaultCurrency,
          decryptKey,
        ),
      }));
    }

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

    return {
      categoryForecasts,
    };
  } catch (error) {
    console.error('Error fetching monthly forecast:', error);

    return {
      categoryForecasts: [],
      error: 'Database error',
    };
  }
}

export default getMonthlyForecast;

