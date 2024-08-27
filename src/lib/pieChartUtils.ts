import { PieValueType } from '@mui/x-charts';
import { Transaction, TransactionType } from '@prisma/client';
import { COLOR_MAP } from './getCategoryColor';
import { TransactionCategory } from '@/constants/types';
import Decimal from 'decimal.js';
import { getCategoryLabel } from './utils';

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
  groupedData: Record<TransactionCategory, Decimal>,
): PieValueType[] =>
  Object.entries(groupedData).map(([category, amount], index) => ({
    id: index,
    value: amount.toDecimalPlaces(0).toNumber(),
    label: getCategoryLabel(category as TransactionCategory),
    color: COLOR_MAP[category as TransactionCategory],
  }));
