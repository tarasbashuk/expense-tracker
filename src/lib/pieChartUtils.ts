import { PieValueType } from '@mui/x-charts';
import { Transaction, TransactionType } from '@prisma/client';
import { COLOR_MAP } from './getCategoryColor';
import {
  ExpenseCategory,
  IncomeCategory,
  TransactionCategory,
} from '@/constants/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import Decimal from 'decimal.js';

export const groupTransactionsByCategory = (
  transactions: Transaction[],
  type: TransactionType,
) =>
  transactions
    .filter((transaction) => transaction.type === type)
    .reduce(
      (acc, transaction) => {
        const { category, amountDefaultCurrency } = transaction;

        if (!acc[category]) {
          acc[category] = new Decimal(0);
        }

        acc[category] = acc[category].plus(new Decimal(amountDefaultCurrency));

        return acc;
      },
      {} as Record<string, Decimal>,
    );

export const convertToChartData = (
  groupedData: Record<string, Decimal>,
): PieValueType[] =>
  Object.entries(groupedData).map(([category, amount], index) => ({
    id: index,
    value: amount.toDecimalPlaces(0).toNumber(),
    label:
      EXPENSE_CATEGORIES[category as ExpenseCategory] ||
      INCOME_CATEGORIES[category as IncomeCategory],
    color: COLOR_MAP[category as TransactionCategory],
  }));
