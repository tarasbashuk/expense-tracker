'use server';

import getTransactions from './getTransactions';
import { parseHistoryQuery } from '@/lib/historyQuery';
import { getPeriodRange } from '@/lib/dateRange';
import { filterTransactions } from '@/lib/filterTransactions';
import { isCreditCardCategory } from '@/constants/constants';

export default async function getHistoryTransactions(query: string) {
  const filters = parseHistoryQuery(query);
  const range = getPeriodRange(
    filters.periodMode,
    filters.anchorDate,
    filters.customRange,
  );
  // Category statistics include credit categories; normal/yearly history excludes them.
  const excludeCredit = !isCreditCardCategory(filters.category);
  const response = await getTransactions(range.start, range.end, excludeCredit);

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
