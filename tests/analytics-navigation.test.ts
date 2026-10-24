// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import useHistoryQuery from '@/lib/hooks/useHistoryQuery';
import useAnalyticsQuery from '@/lib/hooks/useAnalyticsQuery';
import useAnalyticsScrollRestore, {
  rememberAnalyticsScroll,
} from '@/lib/hooks/useAnalyticsScrollRestore';
import { historyMonthHref } from '@/lib/historyQuery';
import { installUrlTest } from './url-test-helpers';

vi.mock('next/navigation', async () => ({
  useSearchParams: (await import('./url-test-helpers')).useTestSearchParams,
}));

beforeEach(() => {
  installUrlTest(
    '/transactions?period=month&date=2025-08-01&type=Expense&category=education&q=school&tag=trip&recurring=1',
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('history reads deep-linked filters immediately and changes replace the current browser entry', () => {
  const { result, unmount } = renderHook(useHistoryQuery);
  const length = window.history.length;

  expect(result.current.filters).toMatchObject({
    type: 'Expense',
    category: 'education',
    search: 'school',
    tagIds: ['trip'],
    recurringOnly: true,
  });

  act(() => result.current.updateFilters({ search: 'school books' }));

  expect(window.history.length).toBe(length);
  expect(result.current.filters.search).toBe('school books');
  unmount();

  const reopened = renderHook(useHistoryQuery);

  expect(reopened.result.current.filters.search).toBe('school books');
  expect(reopened.result.current.filters.category).toBe('education');
});

test('Back and Forward restore the applied URL model without a second local filter state', async () => {
  const { result } = renderHook(useHistoryQuery);

  act(() => window.history.pushState(null, '', historyMonthHref(2025, 2)));

  expect(result.current.filters.category).toBe('all');
  expect(result.current.filters.search).toBe('');

  await act(async () => window.history.back());
  await waitFor(() =>
    expect(result.current.filters.category).toBe('education'),
  );

  expect(result.current.filters.search).toBe('school');
  expect(result.current.filters.recurringOnly).toBe(true);

  await act(async () => window.history.forward());
  await waitFor(() =>
    expect(result.current.filters.anchorDate).toBe('2025-03-01'),
  );

  expect(result.current.filters.tagIds).toEqual([]);
});

test('returning to statistics restores period, type, chart and scroll only after its data is ready', async () => {
  window.history.replaceState(
    null,
    '',
    '/stats?year=2025&month=8&chart=pie&type=Income',
  );
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('scrollY', 786);
  const first = renderHook(() => useAnalyticsQuery('month'));

  act(() => rememberAnalyticsScroll());
  first.unmount();
  window.history.pushState(null, '', historyMonthHref(2025, 7));
  window.history.back();
  await waitFor(() => expect(window.location.pathname).toBe('/stats'));

  const restored = renderHook(
    ({ ready }) => {
      const state = useAnalyticsQuery('month');
      useAnalyticsScrollRestore(ready);

      return state;
    },
    { initialProps: { ready: false } },
  );

  expect(restored.result.current).toMatchObject({
    year: 2025,
    month: 7,
    chartType: 'pie',
    transactionType: 'Income',
  });
  expect(scrollTo).not.toHaveBeenCalled();

  restored.rerender({ ready: true });
  await waitFor(() =>
    expect(scrollTo).toHaveBeenCalledWith({ top: 786, behavior: 'instant' }),
  );
});

test('year and half-year survive remounting without expanding history for every control change', () => {
  window.history.replaceState(null, '', '/yearly-stats?year=2025&half=1');
  const first = renderHook(() => useAnalyticsQuery('year'));
  const length = window.history.length;

  expect(first.result.current).toMatchObject({ year: 2025, half: 1 });

  act(() => first.result.current.update({ year: 2024, half: 0 }));
  first.unmount();

  const restored = renderHook(() => useAnalyticsQuery('year'));

  expect(restored.result.current).toMatchObject({ year: 2024, half: 0 });
  expect(window.history.length).toBe(length);
});
