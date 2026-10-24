'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionType } from '@prisma/client';
import { ChartType } from '@/constants/types';
import { MAX_YEAR, MIN_YEAR } from '@/constants/constants';
import { initialHalfYear } from '../statisticsPresentation';
import { replaceUrlQuery } from '../replaceUrlQuery';

export default function useAnalyticsQuery(kind: 'month' | 'year') {
  const params = useSearchParams();
  const [now] = useState(() => new Date());
  const requestedYear = Number(params.get('year'));
  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= Number(MIN_YEAR) &&
    requestedYear <= Number(MAX_YEAR)
      ? requestedYear
      : now.getFullYear();
  const requestedMonth = Number(params.get('month'));
  const month =
    Number.isInteger(requestedMonth) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth - 1
      : now.getMonth();
  const chartType: ChartType = params.get('chart') === 'pie' ? 'pie' : 'bar';
  const transactionType =
    params.get('type') === TransactionType.Income
      ? TransactionType.Income
      : TransactionType.Expense;
  const half =
    params.get('half') === '0'
      ? 0
      : params.get('half') === '1'
        ? 1
        : initialHalfYear(year, now);
  const state = { year, month, chartType, transactionType, half };
  const canonical =
    kind === 'month'
      ? new URLSearchParams({
          year: String(year),
          month: String(month + 1),
          chart: chartType,
          type: transactionType,
        }).toString()
      : new URLSearchParams({
          year: String(year),
          half: String(half),
        }).toString();
  const currentQuery = params.toString();

  // Pin defaults to this history entry so Back restores the same period even later.
  useEffect(() => {
    if (currentQuery !== canonical) {
      replaceUrlQuery(canonical);
    }
  }, [canonical, currentQuery]);

  const update = (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    const query =
      kind === 'month'
        ? new URLSearchParams({
            year: String(next.year),
            month: String(next.month + 1),
            chart: next.chartType,
            type: next.transactionType,
          })
        : new URLSearchParams({
            year: String(next.year),
            half: String(next.half),
          });
    replaceUrlQuery(query.toString());
  };

  return { ...state, update };
}
