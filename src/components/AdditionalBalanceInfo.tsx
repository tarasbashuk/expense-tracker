'use client';

import PeriodBalance from './history/PeriodBalance';
import PeriodAmounts from './statistics/PeriodAmounts';
import { LoadingPlaceholder } from './history/TransactionSkeleton';

export default function AdditionalBalanceInfo({
  income,
  expense,
  loading = false,
}: {
  income: number;
  expense: number;
  loading?: boolean;
}) {
  return (
    <PeriodBalance
      income={income}
      expense={expense}
      summaryContent={
        loading ? (
          <LoadingPlaceholder height={60} />
        ) : (
          <PeriodAmounts income={income} expense={expense} />
        )
      }
    />
  );
}
