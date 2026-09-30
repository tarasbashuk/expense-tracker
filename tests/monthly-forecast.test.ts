import { expect, test } from 'vitest';
import {
  buildMonthlyForecast,
  getForecastPeriods,
} from '@/lib/monthlyReport/forecast';
import { renderMonthlyForecast } from '@/lib/monthlyReport/renderForecast';
import { transaction } from './fixtures';

const now = new Date('2026-09-01T09:00:00Z');
const historical = (overrides: Parameters<typeof transaction>[0] = {}) =>
  transaction({
    date: new Date('2025-09-15T00:00:00Z'),
    ...overrides,
  });
const recurring = (overrides: Parameters<typeof transaction>[0] = {}) =>
  transaction({
    isRecurring: true,
    ...overrides,
  });

test('replaces a historical school payment with its current price, retaining other category expenses', () => {
  const rows = [
    historical({
      text: 'School',
      category: 'education',
      amountDefaultCurrency: 500,
    }),
    historical({
      text: 'Books',
      category: 'education',
      amountDefaultCurrency: 100,
    }),
    recurring({
      text: ' SCHOOL ',
      category: 'education',
      amountDefaultCurrency: 650,
    }),
  ];

  const result = buildMonthlyForecast(rows, now);

  expect(result.historicalTotal).toBe(600);
  expect(result.replacedHistoricalTotal).toBe(500);
  expect(result.recurringTotal).toBe(650);
  expect(result.total).toBe(750);
  expect(result.categories).toEqual([{ category: 'education', total: 750 }]);
});

test('uses current month prices once and adds new recurring payments', () => {
  const result = buildMonthlyForecast(
    [
      historical({ isRecurring: true, amountDefaultCurrency: 20 }),
      recurring({ amountDefaultCurrency: 25 }),
      recurring({ date: new Date('2026-09-12'), amountDefaultCurrency: 30 }),
      recurring({ text: 'New subscription', amountDefaultCurrency: 5 }),
    ],
    now,
  );

  expect(result.total).toBe(35);
  expect(result.recurringTotal).toBe(35);
  expect(result.replacedHistoricalTotal).toBe(20);
});

test('excludes ended and obsolete recurring expenses, income, repayments and other months', () => {
  const result = buildMonthlyForecast(
    [
      historical({
        isRecurring: true,
        text: 'Cancelled subscription',
        amountDefaultCurrency: 50,
      }),
      recurring({ recurringEndDate: new Date('2026-09-11') }),
      historical({ type: 'Income', amountDefaultCurrency: 2000 }),
      historical({ category: 'CCRepayment', amountDefaultCurrency: 1000 }),
      historical({ date: new Date('2025-10-01'), amountDefaultCurrency: 800 }),
    ],
    now,
  );

  expect(result.total).toBe(0);
  expect(result.replacedHistoricalTotal).toBe(50);
  expect(result.hasHistoricalExpenses).toBe(true);
  expect(result.hasRecurringExpenses).toBe(false);
});

test('matches one payment at a time and never matches empty descriptions or different categories', () => {
  const result = buildMonthlyForecast(
    [
      historical({ amountDefaultCurrency: 10 }),
      historical({ amountDefaultCurrency: 15 }),
      historical({ text: '', amountDefaultCurrency: 20 }),
      historical({ category: 'dining', amountDefaultCurrency: 25 }),
      recurring({ amountDefaultCurrency: 30 }),
      recurring({ text: '', amountDefaultCurrency: 40 }),
    ],
    now,
  );

  expect(result.replacedHistoricalTotal).toBe(10);
  expect(result.total).toBe(130);
});

test('handles January boundaries and leap February end dates inclusively', () => {
  const periods = getForecastPeriods(new Date('2026-01-31T23:00:00Z'));
  const result = buildMonthlyForecast(
    [
      recurring({
        date: new Date('2024-01-31'),
        recurringEndDate: new Date('2024-02-29'),
        amountDefaultCurrency: 0.1,
      }),
      recurring({
        date: new Date('2024-01-30'),
        recurringEndDate: new Date('2024-02-28'),
        amountDefaultCurrency: 0.2,
      }),
    ],
    new Date('2024-02-01'),
  );

  expect(periods.previousStart.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  expect(periods.historicalStart.toISOString()).toBe(
    '2025-01-01T00:00:00.000Z',
  );
  expect(result.total).toBe(0.1);
});

test('marks missing history as partial and empty data as unavailable in both languages', () => {
  const partial = buildMonthlyForecast([recurring()], now);
  const empty = buildMonthlyForecast([], now);

  const uk = renderMonthlyForecast(partial, 'EUR', 'UKR');
  const en = renderMonthlyForecast(partial, 'EUR', 'ENG');
  const unavailable = renderMonthlyForecast(empty, 'EUR', 'ENG');

  expect(partial.hasHistoricalExpenses).toBe(false);
  expect(uk).toContain('Частковий прогноз');
  expect(en).toContain('Partial forecast');
  expect(en).toContain('2026-09');
  expect(unavailable).toContain('Insufficient data');
  expect(unavailable).not.toContain('≈');
  expect(renderMonthlyForecast(null, 'EUR', 'ENG')).toBe('');
});
