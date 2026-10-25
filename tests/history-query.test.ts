import { expect, test, vi } from 'vitest';
import {
  defaultHistoryQuery,
  historyMonthHref,
  parseHistoryQuery,
  serializeHistoryQuery,
} from '@/lib/historyQuery';
import getHistoryTransactions from '@/app/actions/getHistoryTransactions';
import getStats from '@/app/actions/getStats';
import { getYearlyStats } from '@/app/actions/getYearlyStats';
import getTransactions from '@/app/actions/getTransactions';
import { getPeriodRange } from '@/lib/dateRange';
import { DEFAULT_SETTINGS, isCreditCardCategory } from '@/constants/constants';
import { ExpenseCategory } from '@/constants/types';
import { transaction } from './fixtures';

vi.mock('@/app/actions/getTransactions', () => ({ default: vi.fn() }));
vi.mock('@/app/actions/getSettings', () => ({
  default: vi.fn(async () => ({
    settings: { ...DEFAULT_SETTINGS, creditCardTrackingEnabled: true },
  })),
}));

const now = new Date(2026, 9, 21);

test('every applied filter round-trips in the URL without translating category IDs', () => {
  const value = {
    ...defaultHistoryQuery(now),
    periodMode: 'custom' as const,
    customRange: { start: '2025-01-01', end: '2025-02-28' },
    type: 'Expense' as const,
    category: ExpenseCategory.Groceries,
    search: 'Сільпо & 12,50',
    tagIds: ['trip', 'food'],
    recurringOnly: true,
  };

  const decoded = parseHistoryQuery(serializeHistoryQuery(value), now);

  expect(decoded).toEqual(value);
});

test('invalid dates, enums and tag IDs use safe defaults and never become prototype properties', () => {
  const decoded = parseHistoryQuery(
    'period=invalid&date=2026-02-30&start=2026-10-10&end=2026-09-01&type=__proto__&category=__proto__&tag=good&tag=good&tag=%3Cbad%3E&recurring=false',
    now,
  );

  expect(decoded).toEqual({ ...defaultHistoryQuery(now), tagIds: ['good'] });
  expect(parseHistoryQuery('date=2024-02-29', now).anchorDate).toBe(
    '2024-02-29',
  );
});

test('fresh category and month links cannot inherit search, tags or recurring filters', () => {
  const category = new URL(
    historyMonthHref(2025, 1, 'Expense', ExpenseCategory.Education),
    'https://example.test',
  );
  const month = new URL(historyMonthHref(2025, 1), 'https://example.test');
  const filters = parseHistoryQuery(category.search, now);

  expect(filters.type).toBe('Expense');
  expect(filters.category).toBe('education');
  expect(filters.search).toBe('');
  expect(filters.tagIds).toEqual([]);
  expect(filters.recurringOnly).toBe(false);
  expect(
    getPeriodRange(filters.periodMode, filters.anchorDate, filters.customRange),
  ).toEqual({ start: '2025-02-01', end: '2025-02-28' });
  expect(parseHistoryQuery(month.search, now)).toMatchObject({
    type: 'all',
    category: 'all',
    search: '',
    tagIds: [],
    recurringOnly: false,
  });
});

test('category drill-down matches statistics and excludes credit categories', async () => {
  const records = [
    transaction({
      id: 'school',
      date: new Date('2026-10-04T12:00:00Z'),
      category: 'education',
      amount: 100,
      amountDefaultCurrency: 23.47,
    }),
    transaction({
      id: 'school2',
      date: new Date('2026-10-08T12:00:00Z'),
      category: 'education',
      amountDefaultCurrency: 12.21,
    }),
    transaction({
      id: 'credit',
      date: new Date('2026-10-08T12:00:00Z'),
      category: 'CCRepayment',
      amountDefaultCurrency: 80.12,
    }),
    transaction({
      id: 'salary',
      date: new Date('2026-10-08T12:00:00Z'),
      category: 'salary',
      type: 'Income',
      amountDefaultCurrency: 500.42,
    }),
  ];
  vi.mocked(getTransactions).mockImplementation(async (_, __, exclude) => ({
    transactions: records.filter(
      (row) => !exclude || !isCreditCardCategory(row.category),
    ),
  }));

  const stats = await getStats(2026, 9);
  const school = await getHistoryTransactions(
    historyMonthHref(2026, 9, 'Expense', ExpenseCategory.Education).split(
      '?',
    )[1],
  );
  const credit = await getHistoryTransactions(
    historyMonthHref(2026, 9, 'Expense', ExpenseCategory.CCRepayment).split(
      '?',
    )[1],
  );
  const yearly = await getYearlyStats(2026);
  const month = await getHistoryTransactions(
    historyMonthHref(2026, 9).split('?')[1],
  );

  expect(school.transactions?.map((row) => row.id)).toEqual([
    'school',
    'school2',
  ]);
  expect(
    school.transactions?.reduce(
      (sum, row) => sum + row.amountDefaultCurrency,
      0,
    ),
  ).toBeCloseTo(
    stats.expenseChartData!.find((item) => item.label === 'education')!.value,
  );
  expect(credit.transactions).toEqual([]);
  expect(
    stats.expenseChartData?.some((item) => item.label === 'CCRepayment'),
  ).toBe(false);
  expect(getTransactions).toHaveBeenCalledWith(
    '2026-10-01',
    '2026-10-31',
    true,
  );
  expect(month.transactions?.some((row) => row.id === 'credit')).toBe(false);
  expect(
    month.transactions
      ?.filter((row) => row.type === 'Income')
      .reduce((sum, row) => sum + row.amountDefaultCurrency, 0),
  ).toBeCloseTo(yearly.data!.monthlyIncome[9]);
  expect(
    month.transactions
      ?.filter((row) => row.type === 'Expense')
      .reduce((sum, row) => sum + row.amountDefaultCurrency, 0),
  ).toBeCloseTo(yearly.data!.monthlyExpense[9]);
});

test('the first history action response already intersects all applied filters', async () => {
  const record = transaction({
    category: 'education',
    isRecurring: true,
    text: 'School',
    tags: [
      {
        id: 'trip',
        userId: 'owner',
        name: 'Trip',
        normalizedName: 'trip',
        color: 'blue',
      },
    ],
  });
  vi.mocked(getTransactions).mockResolvedValue({
    transactions: [
      record,
      transaction({ text: 'Other', category: 'education' }),
    ],
  });
  const query =
    'period=month&date=2026-10-01&type=Expense&category=education&q=School&recurring=1&tag=trip';

  const result = await getHistoryTransactions(query);

  expect(result.transactions).toEqual([record]);
  expect(getTransactions).toHaveBeenCalledExactlyOnceWith(
    '2026-10-01',
    '2026-10-31',
    true,
  );
});

test('custom category filters survive URL parsing and filter history records', async () => {
  const category = 'custom:category-123';
  const filters = { ...defaultHistoryQuery(now), category };
  const query = serializeHistoryQuery(filters);
  const matching = transaction({ id: 'custom', category });
  vi.mocked(getTransactions).mockResolvedValue({
    transactions: [matching, transaction({ id: 'other' })],
  });

  const parsed = parseHistoryQuery(query, now);
  const result = await getHistoryTransactions(query);

  expect(parsed.category).toBe(category);
  expect(result.transactions).toEqual([matching]);
  expect(parseHistoryQuery('category=custom:', now).category).toBe('all');
  expect(parseHistoryQuery('category=custom:%3Cbad%3E', now).category).toBe(
    'all',
  );
});
