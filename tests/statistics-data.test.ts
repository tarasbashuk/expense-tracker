import { expect, test, vi } from 'vitest';
import Decimal from 'decimal.js';
import { convertToChartData } from '@/lib/pieChartUtils';
import {
  initialHalfYear,
  yearlyPresentation,
} from '@/lib/statisticsPresentation';
import { getYearlyStats } from '@/app/actions/getYearlyStats';
import getTransactions from '@/app/actions/getTransactions';
import { TransactionCategory } from '@/constants/types';

vi.mock('@/app/actions/getTransactions', () => ({ default: vi.fn() }));

const now = new Date(2026, 9, 21);

test('category data preserves fractional amounts and stable category colors', () => {
  const input = {
    education: new Decimal('1626.46'),
    groceries: new Decimal('640.12'),
  } as Record<TransactionCategory, Decimal>;

  const result = convertToChartData(input);
  const reordered = convertToChartData({
    groceries: input.groceries,
    education: input.education,
  } as Record<TransactionCategory, Decimal>);

  expect(result.map((item) => item.value)).toEqual([1626.46, 640.12]);
  expect(result[0].color).toBe(reordered[1].color);
});

test('half-year defaults follow the selected year and current calendar month', () => {
  expect(initialHalfYear(2026, now)).toBe(1);
  expect(initialHalfYear(2025, now)).toBe(0);
  expect(initialHalfYear(2027, now)).toBe(0);
  expect(initialHalfYear(2026, new Date(2026, 5, 30))).toBe(0);
});

test('annual presentation retains future records and zero transactions, but marks empty future months missing', () => {
  const income = [10.25, 0, 0, 0, 0, 0, 200, 0, 0, 13.12, 5, 0];
  const expense = [2.12, 0, 0, 0, 0, 0, 30, 0, 0, 20, 0, 0];
  const counts = [1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0];

  const result = yearlyPresentation(income, expense, counts, 2026, now);

  expect(result.rows.map((row) => row.month)).toEqual([10, 9, 6, 1, 0]);
  expect(result.months[9].incomplete).toBe(true);
  expect(result.months[10].missing).toBe(false);
  expect(result.months[11].missing).toBe(true);
  expect(result.months[1].hasData).toBe(true);
  expect(result.income).toBeCloseTo(228.37);
  expect(result.expense).toBeCloseTo(52.12);
  expect(result.axisMax).toBeCloseTo(220);
});

test('empty and past years have finite scales and no incomplete month', () => {
  const result = yearlyPresentation([], [], [], 2025, now);

  expect(result.rows).toEqual([]);
  expect(result.income).toBe(0);
  expect(result.expense).toBe(0);
  expect(result.axisMax).toBeGreaterThan(0);
  expect(result.months.some((month) => month.missing || month.incomplete)).toBe(
    false,
  );
});

test('yearly errors are propagated rather than displayed as zero totals', async () => {
  vi.mocked(getTransactions).mockResolvedValue({ error: 'Database error' });

  const result = await getYearlyStats(2026);

  expect(result).toEqual({ error: 'Database error' });
  expect(getTransactions).toHaveBeenCalledWith(
    '2026-01-01',
    '2026-12-31',
    true,
  );
});
