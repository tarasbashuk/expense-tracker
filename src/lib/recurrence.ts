import { addMonths, endOfDay } from 'date-fns';

export type RecurrenceEndMode = 'never' | 'count' | 'date';

export function getLastPaymentDate(
  start: Date,
  count: number,
): Date | undefined {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 1200 ||
    !Number.isFinite(start.getTime())
  ) {
    return undefined;
  }

  let lastPayment = start;

  // Match the scheduler: each payment advances from the previous payment date.
  for (let payment = 1; payment < count; payment += 1) {
    lastPayment = addMonths(lastPayment, 1);
  }

  return endOfDay(lastPayment);
}
