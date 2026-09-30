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

type ForecastSource = 'historical' | 'previousRecurring' | 'currentRecurring';

export interface ForecastTransaction {
  ref: number;
  source: ForecastSource;
  description: string;
  category: string;
  date: string;
  amount: number;
  currency: string;
  amountDefaultCurrency: number;
  isRecurring: boolean;
  recurringEndDate: string | null;
}

export interface ForecastInput {
  month: string;
  historicalMonth: string;
  transactions: ForecastTransaction[];
}

interface ForecastDecisions {
  replacements: { ref: number; replacementRef: number; reason: string }[];
  optionalExpenses: { ref: number; reason: string }[];
  assumptions: string[];
}

const reasonSchema = { type: 'string', minLength: 1, maxLength: 500 };

export const forecastDecisionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    replacements: {
      type: 'array',
      maxItems: 200,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ref: { type: 'integer' },
          replacementRef: { type: 'integer' },
          reason: reasonSchema,
        },
        required: ['ref', 'replacementRef', 'reason'],
      },
    },
    optionalExpenses: {
      type: 'array',
      maxItems: 100,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { ref: { type: 'integer' }, reason: reasonSchema },
        required: ['ref', 'reason'],
      },
    },
    assumptions: { type: 'array', maxItems: 5, items: reasonSchema },
  },
  required: ['replacements', 'optionalExpenses', 'assumptions'],
};

export function buildForecastInput(
  transactions: Transaction[],
  now: Date,
): ForecastInput {
  const periods = getForecastPeriods(now);
  const lastDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const rows: ForecastTransaction[] = [];

  for (const t of transactions) {
    if (t.type !== 'Expense' || t.category === ExpenseCategory.CCRepayment) {
      continue;
    }

    let source: ForecastSource;

    if (t.date >= periods.historicalStart && t.date < periods.historicalEnd) {
      source = 'historical';
    } else if (
      t.isRecurring &&
      t.date >= periods.previousStart &&
      t.date < periods.start
    ) {
      const dueDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          Math.min(t.date.getUTCDate(), lastDay),
        ),
      );

      if (t.recurringEndDate && dueDate > t.recurringEndDate) {
        continue;
      }

      source = 'previousRecurring';
    } else if (
      t.isRecurring &&
      t.date >= periods.start &&
      t.date < periods.end
    ) {
      source = 'currentRecurring';
    } else {
      continue;
    }

    if (
      !Number.isFinite(t.amount) ||
      !Number.isFinite(t.amountDefaultCurrency)
    ) {
      throw new Error('Invalid forecast amounts');
    }

    rows.push({
      ref: rows.length + 1,
      source,
      description: t.text,
      category: t.category,
      date: t.date.toISOString().slice(0, 10),
      amount: t.amount,
      currency: t.currency,
      amountDefaultCurrency: t.amountDefaultCurrency,
      isRecurring: Boolean(t.isRecurring),
      recurringEndDate: t.recurringEndDate?.toISOString().slice(0, 10) ?? null,
    });
  }

  return {
    month: periods.start.toISOString().slice(0, 7),
    historicalMonth: periods.historicalStart.toISOString().slice(0, 7),
    transactions: rows,
  };
}

const validReason = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 500;

export type ForecastValidationCode =
  | 'invalid_object'
  | 'invalid_structure'
  | 'invalid_replacement'
  | 'unknown_or_reused_reference'
  | 'invalid_replacement_direction'
  | 'replacement_chain'
  | 'invalid_optional_expense'
  | 'optional_expense_conflict';

export class ForecastValidationError extends Error {
  constructor(public readonly code: ForecastValidationCode) {
    super('Invalid forecast decisions');
    this.name = 'ForecastValidationError';
  }
}

const invalidForecast = (code: ForecastValidationCode): never => {
  throw new ForecastValidationError(code);
};

const total = (rows: ForecastTransaction[]) =>
  rows
    .reduce((sum, row) => sum.plus(row.amountDefaultCurrency), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();

export function calculateForecast(input: ForecastInput, value: unknown) {
  if (!value || typeof value !== 'object') {
    return invalidForecast('invalid_object');
  }

  const decisions = value as ForecastDecisions;

  if (
    !Array.isArray(decisions.replacements) ||
    decisions.replacements.length > 200 ||
    !Array.isArray(decisions.optionalExpenses) ||
    decisions.optionalExpenses.length > 100 ||
    !Array.isArray(decisions.assumptions) ||
    decisions.assumptions.length > 5 ||
    !decisions.assumptions.every(validReason)
  ) {
    return invalidForecast('invalid_structure');
  }

  const byRef = new Map(input.transactions.map((row) => [row.ref, row]));
  const replaced = new Set<number>();

  for (const replacement of decisions.replacements) {
    if (
      !replacement ||
      !Number.isInteger(replacement.ref) ||
      !Number.isInteger(replacement.replacementRef) ||
      !validReason(replacement.reason)
    ) {
      return invalidForecast('invalid_replacement');
    }

    const from = byRef.get(replacement.ref);
    const to = byRef.get(replacement.replacementRef);

    if (!from || !to || replaced.has(from.ref)) {
      return invalidForecast('unknown_or_reused_reference');
    }

    const allowed =
      (from.source === 'historical' && to.source !== 'historical') ||
      (from.source === 'previousRecurring' && to.source === 'currentRecurring');
    if (!allowed) {
      return invalidForecast('invalid_replacement_direction');
    }

    // Multiple old charges may become one bundled bill. Each source is removed
    // once; the retained target is added once from the input, not per match.
    replaced.add(from.ref);
  }

  // Require direct references to the retained payment, never replacement chains.
  if (decisions.replacements.some((r) => replaced.has(r.replacementRef))) {
    return invalidForecast('replacement_chain');
  }

  const optional = new Set<number>();

  for (const item of decisions.optionalExpenses) {
    if (!item || !Number.isInteger(item.ref) || !validReason(item.reason)) {
      return invalidForecast('invalid_optional_expense');
    }

    const row = byRef.get(item.ref);

    if (
      !row ||
      row.source !== 'historical' ||
      row.isRecurring ||
      replaced.has(item.ref) ||
      optional.has(item.ref)
    ) {
      return invalidForecast('optional_expense_conflict');
    }

    optional.add(item.ref);
  }

  const history = input.transactions.filter(
    (row) => row.source === 'historical',
  );
  const removedHistory = history.filter(
    (row) => row.isRecurring || replaced.has(row.ref),
  );
  const retainedHistory = history.filter(
    (row) =>
      !row.isRecurring && !replaced.has(row.ref) && !optional.has(row.ref),
  );
  const recurring = input.transactions.filter(
    (row) => row.source !== 'historical' && !replaced.has(row.ref),
  );
  const optionalRows = history.filter((row) => optional.has(row.ref));
  const projected = [...retainedHistory, ...recurring];
  const categories = new Map<string, Decimal>();

  for (const row of projected) {
    categories.set(
      row.category,
      (categories.get(row.category) ?? new Decimal(0)).plus(
        row.amountDefaultCurrency,
      ),
    );
  }

  return {
    month: input.month,
    historicalMonth: input.historicalMonth,
    hasHistoricalExpenses: history.length > 0,
    hasRecurringExpenses: recurring.length > 0,
    historicalTotal: total(history),
    replacedHistoricalTotal: total(removedHistory),
    recurringTotal: total(recurring),
    total: total(projected),
    optionalTotal: total(optionalRows),
    totalWithOptional: total([...projected, ...optionalRows]),
    categories: Array.from(categories, ([category, amount]) => ({
      category,
      total: amount.toDecimalPlaces(2).toNumber(),
    })).sort((a, b) => b.total - a.total),
    replacements: decisions.replacements.map((item) => ({
      description: byRef.get(item.ref)!.description,
      replacementDescription: byRef.get(item.replacementRef)!.description,
      reason: item.reason,
    })),
    optionalExpenses: decisions.optionalExpenses.map((item) => ({
      description: byRef.get(item.ref)!.description,
      amount: byRef.get(item.ref)!.amountDefaultCurrency,
      reason: item.reason,
    })),
    assumptions: decisions.assumptions,
  };
}

export type MonthlyForecast = ReturnType<typeof calculateForecast>;
