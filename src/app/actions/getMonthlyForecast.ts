'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, subYears, format } from 'date-fns';
import { decryptFloat } from '@/lib/crypto';
import { ExpenseCategory } from '@/constants/types';
import { DATE_FORMATS } from '@/constants/constants';

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
    // Get date range for last year
    const oneYearAgo = subYears(now, 1);
    const oneYearAgoStartDate = startOfMonth(oneYearAgo);
    const lastMonthEndDate = endOfMonth(subMonths(now, 1));
    
    // Format dates the same way as getIncomeExpense
    const oneYearAgoStart = new Date(format(oneYearAgoStartDate, DATE_FORMATS.YYYY_MM_DD));
    const lastMonthEnd = new Date(format(lastMonthEndDate, DATE_FORMATS.YYYY_MM_DD));
    // Get all expense transactions from last year
    // Exclude recurring transactions, Others category, and CCRepayment
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        type: TransactionType.Expense,
        date: {
          gte: oneYearAgoStart,
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

