'use server';

import getTransactions from './getTransactions';
import { parseHistoryQuery } from '@/lib/historyQuery';
import { getPeriodRange } from '@/lib/dateRange';
import { filterTransactions } from '@/lib/filterTransactions';

export default async function getHistoryTransactions(query: string) {
  const filters = parseHistoryQuery(query);
  const range = getPeriodRange(
    filters.periodMode,
    filters.anchorDate,
    filters.customRange,
  );
  const response = await getTransactions(range.start, range.end, true);

  if (response.error) {
    return response;
  }

  return {
    transactions: filterTransactions(
      response.transactions ?? [],
      filters.search,
      filters.category,
      filters.type,
      filters.recurringOnly,
      filters.tagIds,
    ),
  };
}
