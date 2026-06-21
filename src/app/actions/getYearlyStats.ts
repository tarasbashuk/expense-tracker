'use server';

import { getMonth } from 'date-fns';
import { TransactionType } from '@prisma/client';
import getTransactions from './getTransactions';
import { dateKeyFromLocalDate } from '@/lib/dateRange';

export type YearlyStatsData = {
  monthlyIncome: number[];
  monthlyExpense: number[];
};

export type YearlyStatsResponse = {
  data?: YearlyStatsData;
  error?: string;
};

export async function getYearlyStats(
  year: number,
): Promise<YearlyStatsResponse> {
  try {
    const startDate = dateKeyFromLocalDate(new Date(year, 0, 1));
    const endDate = dateKeyFromLocalDate(new Date(year, 12, 0));
    const { transactions = [] } = await getTransactions(
      startDate,
      endDate,
      true,
    );

    // Initialize 12-month arrays with zeros
    const monthlyIncomeTotals: number[] = new Array(12).fill(0);
    const monthlyExpenseTotals: number[] = new Array(12).fill(0);

    // Aggregate amounts per month
    transactions.forEach((transaction) => {
      const monthIndex = getMonth(new Date(transaction.date));
      if (transaction.type === TransactionType.Income) {
        monthlyIncomeTotals[monthIndex] += transaction.amountDefaultCurrency;
      } else {
        monthlyExpenseTotals[monthIndex] += transaction.amountDefaultCurrency;
      }
    });

    return {
      data: {
        monthlyIncome: monthlyIncomeTotals,
        monthlyExpense: monthlyExpenseTotals,
      },
    };
  } catch (error) {
    console.error('Error fetching yearly stats:', error);

    return {
      error: 'Failed to fetch yearly stats',
    };
  }
}
