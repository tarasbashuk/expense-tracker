'use server';
import { TransactionType } from '@prisma/client';
import {
  convertToChartData,
  groupTransactionsByCategory,
} from '@/lib/pieChartUtils';
import getTransactions from './getTransactions';
import { PieValueType } from '@mui/x-charts';

async function getStats(
  year: number,
  month: number,
): Promise<{
  expenseChartData?: PieValueType[];
  incomeChartData?: PieValueType[];
  error?: string;
}> {
  const { transactions = [], error } = await getTransactions(
    year,
    Number(month),
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
