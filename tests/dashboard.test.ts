import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Transaction } from '@prisma/client';
import getHomeDashboard from '@/app/actions/getHomeDashboard';
import { getMonthToDateRanges } from '@/lib/dateRange';
import { encrypt, encryptFloat } from '@/lib/crypto';
import { transaction as makeTransaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  findSettings: vi.fn(),
  findTransactions: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ currentUser: mocks.currentUser }));

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: {
    settings: { findUnique: mocks.findSettings },
    transaction: { findMany: mocks.findTransactions },
  },
}));

type DashboardQuery = {
  where: {
    userId: string;
    date?: {
      gte: Date;
      lt: Date;
    };
    NOT?: {
      OR: {
        category: string;
      }[];
    };
  };
  take?: number;
  orderBy?: unknown;
};

let records: Transaction[];
let queries: DashboardQuery[];

const transaction = (
  date: string,
  amount: number,
  overrides: Partial<Transaction> = {},
) =>
  makeTransaction({
    date: new Date(`${date}T00:00:00Z`),
    amount,
    amountDefaultCurrency: amount,
    ...overrides,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 20, 12));
  mocks.currentUser.mockResolvedValue({
    id: 'test-user',
    primaryEmailAddressId: 'test-key',
  });
  mocks.findSettings.mockResolvedValue({ encryptData: false });
  records = [];
  queries = [];
  mocks.findTransactions.mockImplementation(async (query: DashboardQuery) => {
    queries.push(query);
    const { date, NOT } = query.where;
    const matching = records.filter(
      (t) =>
        (!date || (t.date >= date.gte && t.date < date.lt)) &&
        (!NOT ||
          !NOT.OR.some((condition) => t.category === condition.category)),
    );

    return query.take ? matching.slice(0, query.take) : matching;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test('month-to-date clamps shorter months, leap years and year boundaries', () => {
  for (const [year, month, day, expected] of [
    [2026, 8, 20, '2026-08-20'],
    [2026, 2, 31, '2026-02-28'],
    [2024, 2, 31, '2024-02-29'],
    [2026, 0, 1, '2025-12-01'],
  ] as const) {
    const ranges = getMonthToDateRanges(new Date(year, month, day));
    expect(ranges.previous.end).toBe(expected);
    expect(ranges.previous.start).toBe(`${expected.slice(0, 8)}01`);
  }
});

test('dashboard compares matching inclusive days and excludes future transactions and credit flows', async () => {
  records = [
    transaction('2026-08-01', 20),
    transaction('2026-08-20', 80),
    transaction('2026-08-21', 900),
    transaction('2026-09-01', 30),
    transaction('2026-09-20', 20),
    transaction('2026-09-21', 500),
    transaction('2026-09-10', 200, { type: 'Income', category: 'salary' }),
    transaction('2026-09-10', 1000, {
      type: 'Income',
      category: 'creditReceived',
    }),
    transaction('2026-09-10', 1000, { category: 'CCRepayment' }),
  ];
  const result = await getHomeDashboard();
  expect(result.data!.monthlySummary).toEqual({
    income: 200,
    expense: 50,
    net: 150,
    expenseChangePercent: -50,
  });
  expect(
    queries.every((query) => query.where.userId === 'test-user'),
  ).toBeTruthy();
  const recentQuery = queries.find((query) => query.take);
  expect(recentQuery?.take).toBe(5);
  expect(recentQuery?.orderBy).toEqual([
    { date: 'desc' },
    { createdAt: 'desc' },
  ]);
});

test('zero previous expenses produce no percentage; decimal amounts stay accurate', async () => {
  records = [transaction('2026-09-01', 0.1), transaction('2026-09-02', 0.2)];
  const result = await getHomeDashboard();
  expect(result.data!.monthlySummary).toEqual({
    income: 0,
    expense: 0.3,
    net: -0.3,
    expenseChangePercent: null,
  });
});

test('empty dashboard returns zero totals and no recent transactions', async () => {
  const result = await getHomeDashboard();
  expect(result.data!.monthlySummary).toEqual({
    income: 0,
    expense: 0,
    net: 0,
    expenseChangePercent: null,
  });
  expect(result.data!.recentTransactions).toEqual([]);
});

test('encrypted amounts and recent descriptions are decrypted', async () => {
  mocks.findSettings.mockResolvedValue({ encryptData: true });
  records = [
    transaction('2026-09-12', 10, {
      text: encrypt('Food', 'test-key'),
      amount: encryptFloat(10, 'test-key'),
      amountDefaultCurrency: encryptFloat(9, 'test-key'),
    }),
  ];
  const result = await getHomeDashboard();
  expect(result.data!.monthlySummary.expense).toBe(9);
  expect(result.data!.recentTransactions[0].text).toBe('Food');
  expect(result.data!.recentTransactions[0].amount).toBe(10);
});

test('anonymous request cannot query transactions', async () => {
  mocks.currentUser.mockResolvedValue(null);
  expect(await getHomeDashboard()).toEqual({ error: 'User not found' });
  expect(queries.length).toBe(0);
});

test('database failure returns a dashboard error', async () => {
  mocks.findTransactions.mockRejectedValue(new Error('Database unavailable'));
  expect(await getHomeDashboard()).toEqual({
    error: 'Unable to load dashboard',
  });
});
