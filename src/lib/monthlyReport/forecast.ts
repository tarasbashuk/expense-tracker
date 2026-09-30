import Decimal from 'decimal.js';
import type { Transaction } from '@prisma/client';
import { ExpenseCategory } from '@/constants/types';

export const getForecastPeriods = (now: Date) => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
    previousStart: new Date(Date.UTC(year, month - 1, 1)),
    historicalStart: new Date(Date.UTC(year - 1, month, 1)),
    historicalEnd: new Date(Date.UTC(year - 1, month + 1, 1)),
  };
};

const isExpense = (t: Transaction) =>
  t.type === 'Expense' && t.category !== ExpenseCategory.CCRepayment;

const matchKey = (t: Transaction) => {
  const description = t.text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return description ? JSON.stringify([t.category, description]) : null;
};

const total = (rows: Transaction[]) =>
  rows.reduce(
    (value, t) => value.plus(t.amountDefaultCurrency),
    new Decimal(0),
  );

const money = (value: Decimal) => value.toDecimalPlaces(2).toNumber();

export function buildMonthlyForecast(transactions: Transaction[], now: Date) {
  const periods = getForecastPeriods(now);
  const expenses = transactions.filter(isExpense);
  const history = expenses.filter(
    (t) => t.date >= periods.historicalStart && t.date < periods.historicalEnd,
  );
  const previousRecurring = expenses.filter(
    (t) =>
      t.isRecurring &&
      t.date >= periods.previousStart &&
      t.date < periods.start,
  );
  const currentRecurring = expenses.filter(
    (t) => t.isRecurring && t.date >= periods.start && t.date < periods.end,
  );
  const unmatchedCurrent = [...currentRecurring];
  const recurring: Transaction[] = [];

  for (const source of previousRecurring) {
    const key = matchKey(source);
    const currentIndex =
      key === null
        ? -1
        : unmatchedCurrent.findIndex((t) => matchKey(t) === key);

    if (currentIndex >= 0) {
      recurring.push(...unmatchedCurrent.splice(currentIndex, 1));

      continue;
    }

    const lastDay = new Date(
      Date.UTC(
        periods.start.getUTCFullYear(),
        periods.start.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();
    const dueDate = new Date(
      Date.UTC(
        periods.start.getUTCFullYear(),
        periods.start.getUTCMonth(),
        Math.min(source.date.getUTCDate(), lastDay),
      ),
    );

    if (!source.recurringEndDate || dueDate <= source.recurringEndDate) {
      recurring.push(source);
    }
  }

  recurring.push(...unmatchedCurrent);

  // Replace at most one historical expense per recurring payment. Never erase
  // a whole category: school fees and school supplies can share a category.
  const availableMatches = [...recurring];
  const retainedHistory: Transaction[] = [];
  const removedHistory: Transaction[] = [];

  for (const historical of history) {
    const key = matchKey(historical);
    const matchIndex =
      key === null
        ? -1
        : availableMatches.findIndex((t) => matchKey(t) === key);

    if (matchIndex >= 0) {
      availableMatches.splice(matchIndex, 1);
      removedHistory.push(historical);
    } else if (historical.isRecurring) {
      // Last year's recurring payments are superseded by the current schedule.
      removedHistory.push(historical);
    } else {
      retainedHistory.push(historical);
    }
  }

  const projected = [...retainedHistory, ...recurring];
  const categories = new Map<string, Decimal>();

  for (const row of projected) {
    categories.set(
      row.category,
      (categories.get(row.category) || new Decimal(0)).plus(
        row.amountDefaultCurrency,
      ),
    );
  }

  return {
    month: periods.start.toISOString().slice(0, 7),
    historicalMonth: periods.historicalStart.toISOString().slice(0, 7),
    hasHistoricalExpenses: history.length > 0,
    hasRecurringExpenses: recurring.length > 0,
    historicalTotal: money(total(history)),
    replacedHistoricalTotal: money(total(removedHistory)),
    recurringTotal: money(total(recurring)),
    total: money(total(projected)),
    categories: Array.from(categories, ([category, amount]) => ({
      category,
      total: money(amount),
    })).sort((a, b) => b.total - a.total),
  };
}

export type MonthlyForecast = ReturnType<typeof buildMonthlyForecast>;
