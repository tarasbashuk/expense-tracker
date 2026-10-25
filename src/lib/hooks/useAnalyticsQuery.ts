'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionType } from '@prisma/client';
import { ChartType } from '@/constants/types';
import { MAX_YEAR, MIN_YEAR } from '@/constants/constants';
import { initialHalfYear } from '../statisticsPresentation';
import { replaceUrlQuery } from '../replaceUrlQuery';
import { dateKeyFromLocalDate, getPeriodRange } from '../dateRange';
import { parseHistoryQuery } from '../historyQuery';

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
  const anchorDate = dateKeyFromLocalDate(new Date(year, month, 1));
  const period = parseHistoryQuery(params.toString(), new Date(year, month, 1));
  const periodMode = period.periodMode;
  const customRange = period.customRange;
  const range = getPeriodRange(periodMode, anchorDate, customRange);
  const state = {
    year,
    month,
    chartType,
    transactionType,
    half,
    periodMode,
    customRange,
  };
  const periodParams: Record<string, string> =
    periodMode === 'month'
      ? {}
      : {
          period: periodMode,
          start: customRange.start,
          end: customRange.end,
        };
  const canonical =
    kind === 'month'
      ? new URLSearchParams({
          year: String(year),
          month: String(month + 1),
          chart: chartType,
          type: transactionType,
          ...periodParams,
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
            ...(next.periodMode === 'month'
              ? {}
              : {
                  period: next.periodMode,
                  start: next.customRange.start,
                  end: next.customRange.end,
                }),
          })
        : new URLSearchParams({
            year: String(next.year),
            half: String(next.half),
          });
    replaceUrlQuery(query.toString());
  };

  return { ...state, anchorDate, range, update };
}
