import { PieValueType } from '@mui/x-charts';
import { Transaction, TransactionType } from '@prisma/client';
import { COLOR_MAP } from './getCategoryColor';
import {
  ExpenseCategory,
  IncomeCategory,
  TransactionCategory,
} from '@/constants/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';

export const groupTransactionsByCategory = (
  transactions: Transaction[],
  type: TransactionType,
) =>
  transactions
    .filter((transaction) => transaction.type === type)
    .reduce(
      (acc, transaction) => {
        const { category, amountDefaultCurrency } = transaction;

        // TODO: use decimal
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += amountDefaultCurrency;

        return acc;
      },
      {} as Record<string, number>,
    );

// Convert grouped data to the desired structure for pie chart
export const convertToChartData = (
  groupedData: Record<string, number>,
): PieValueType[] =>
  Object.entries(groupedData).map(([category, value], index) => ({
    id: index,
    value,
    label:
      EXPENSE_CATEGORIES[category as ExpenseCategory] ||
      INCOME_CATEGORIES[category as IncomeCategory],
    color: COLOR_MAP[category as TransactionCategory],
  }));
