'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  HistoryQuery,
  parseHistoryQuery,
  serializeHistoryQuery,
} from '../historyQuery';
import { replaceUrlQuery } from '../replaceUrlQuery';

export default function useHistoryQuery() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [now] = useState(() => new Date());
  const filters = useMemo(() => parseHistoryQuery(query, now), [query, now]);
  const updateFilters = useCallback(
    (patch: Partial<HistoryQuery>) => {
      const current = parseHistoryQuery(window.location.search, now);
      replaceUrlQuery(serializeHistoryQuery({ ...current, ...patch }));
    },
    [now],
  );

  return { filters, updateFilters };
}
