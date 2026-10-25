'use server';
import { TransactionType } from '@prisma/client';
import {
  convertToChartData,
  groupTransactionsByCategory,
} from '@/lib/pieChartUtils';
import getTransactions from './getTransactions';
import { PieValueType } from '@mui/x-charts';
import { dateKeyFromLocalDate } from '@/lib/dateRange';

async function getStats(
  year: number | string,
  month: number | string,
): Promise<{
  expenseChartData?: PieValueType[];
  incomeChartData?: PieValueType[];
  error?: string;
}> {
  const startDate =
    typeof year === 'string'
      ? year
      : dateKeyFromLocalDate(new Date(year, Number(month), 1));
  const endDate =
    typeof month === 'string'
      ? month
      : dateKeyFromLocalDate(new Date(Number(year), month + 1, 0));

  const { transactions = [], error } = await getTransactions(
    startDate,
    endDate,
    true,
  );

  if (error) {
    return { error: 'Database error' };
  }

  const groupedExpenses = groupTransactionsByCategory(
    transactions,
    TransactionType.Expense,
  );
  const groupedIncomes = groupTransactionsByCategory(
    transactions,
    TransactionType.Income,
  );
  const expenseChartData = convertToChartData(groupedExpenses);
  const incomeChartData = convertToChartData(groupedIncomes);

  const sortedExpenseChartData = expenseChartData.sort(
    (c1, c2) => c2.value - c1.value,
  );

  const sortedIncomeChartData = incomeChartData.sort(
    (c1, c2) => c2.value - c1.value,
  );

  return {
    expenseChartData: sortedExpenseChartData,
    incomeChartData: sortedIncomeChartData,
  };
}

export default getStats;
