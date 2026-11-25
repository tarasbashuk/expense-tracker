import { addMonths, endOfDay } from 'date-fns';

export interface MonthlyRule {
  isLastDayOfMonth?: boolean;
  dayOfMonth?: number | null;
}

// Calendar-only calculation shared by the scheduler and UTC dashboard dates.
export function getMonthlyPaymentDay(
  year: number,
  month: number,
  fallbackDay: number,
  rule: MonthlyRule = {},
): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return rule.isLastDayOfMonth
    ? lastDay
    : Math.min(rule.dayOfMonth ?? fallbackDay, lastDay);
}

export function getNextPaymentDate(start: Date, rule: MonthlyRule = {}): Date {
  const next = addMonths(start, 1);
  next.setDate(
    getMonthlyPaymentDay(
      next.getFullYear(),
      next.getMonth(),
      start.getDate(),
      rule,
    ),
  );

  return next;
}

export type RecurrenceEndMode = 'never' | 'count' | 'date';

export function getLastPaymentDate(
  start: Date,
  count: number,
  rule: MonthlyRule = {},
): Date | undefined {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 1200 ||
    !Number.isFinite(start.getTime()) ||
    (rule.dayOfMonth != null &&
      (!Number.isInteger(rule.dayOfMonth) ||
        rule.dayOfMonth < 1 ||
        rule.dayOfMonth > 31))
  ) {
    return undefined;
  }

  let lastPayment = start;

  // The first payment keeps its actual date; the rule applies to successors.
  for (let payment = 1; payment < count; payment += 1) {
    lastPayment = getNextPaymentDate(lastPayment, rule);
  }

  return endOfDay(lastPayment);
}

export function hasRemainingPayments(transaction: {
  recurringPaymentCount?: number | null;
  recurringPaymentNumber?: number | null;
}): boolean {
  return (
    transaction.recurringPaymentCount == null ||
    (transaction.recurringPaymentNumber ?? 0) <
      transaction.recurringPaymentCount
  );
}
