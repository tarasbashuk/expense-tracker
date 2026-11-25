import { randomUUID } from 'node:crypto';
import type { Prisma, Transaction } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { getLastPaymentDate } from './recurrence';
import type { TransactionFormData } from '@/constants/types';

type SeriesFields = Pick<
  Transaction,
  | 'recurringSeriesId'
  | 'recurrenceEndMode'
  | 'recurringPaymentCount'
  | 'recurringPaymentNumber'
  | 'recurringEndDate'
  | 'isRecurring'
  | 'isLastDayOfMonth'
  | 'dayOfMonth'
>;

export async function prepareRecurringSeries(
  tx: Prisma.TransactionClient,
  userId: string,
  input: TransactionFormData,
  existing: Transaction | null,
): Promise<SeriesFields> {
  const empty: SeriesFields = {
    isLastDayOfMonth: false,
    dayOfMonth: null,
    recurringSeriesId: null,
    recurrenceEndMode: null,
    recurringPaymentCount: null,
    recurringPaymentNumber: null,
    recurringEndDate: null,
    isRecurring: false,
  };

  if (!input.isRecurring) {
    if (!existing?.recurringSeriesId) return empty;

    await tx.transaction.updateMany({
      where: { userId, recurringSeriesId: existing.recurringSeriesId },
      data: { isRecurring: false },
    });

    return {
      isLastDayOfMonth: existing.isLastDayOfMonth,
      dayOfMonth: existing.dayOfMonth,
      recurringSeriesId: existing.recurringSeriesId,
      recurrenceEndMode: existing.recurrenceEndMode,
      recurringPaymentCount: existing.recurringPaymentCount,
      recurringPaymentNumber: existing.recurringPaymentNumber,
      recurringEndDate: existing.recurringEndDate,
      isRecurring: false,
    };
  }

  const mode =
    input.recurrenceEndMode ??
    existing?.recurrenceEndMode ??
    (input.recurringEndDate ? 'date' : 'never');

  if (!['never', 'count', 'date'].includes(mode)) {
    throw new Error('recurrence.invalidMode');
  }

  if (
    input.isLastDayOfMonth !== undefined &&
    typeof input.isLastDayOfMonth !== 'boolean'
  ) {
    throw new Error('recurrence.invalidMonthlyRule');
  }

  const isLastDayOfMonth =
    input.isLastDayOfMonth ?? existing?.isLastDayOfMonth ?? false;
  const dayOfMonth = existing?.dayOfMonth ?? input.date.getDate();
  const monthlyRule = { isLastDayOfMonth, dayOfMonth };

  const seriesId = existing?.recurringSeriesId ?? randomUUID();
  const number = existing?.recurringPaymentNumber ?? 1;
  const latest = existing?.recurringSeriesId
    ? await tx.transaction.findFirst({
        where: { userId, recurringSeriesId: seriesId },
        orderBy: { recurringPaymentNumber: 'desc' },
      })
    : null;
  const latestNumber = latest?.recurringPaymentNumber ?? number;
  const latestDate =
    !latest || latest.id === existing?.id ? input.date : latest.date;
  const count =
    mode === 'count'
      ? (input.recurringPaymentCount ?? existing?.recurringPaymentCount)
      : null;
  let endDate: Date | null = null;

  if (mode === 'count') {
    if (
      count == null ||
      !Number.isInteger(count) ||
      count < latestNumber ||
      count > 1200
    ) {
      throw new Error('recurrence.invalidTotal');
    }

    endDate =
      getLastPaymentDate(latestDate, count - latestNumber + 1, monthlyRule) ??
      null;

    if (!endDate) throw new Error('recurrence.invalidTotal');
  } else if (mode === 'date') {
    endDate = input.recurringEndDate ?? null;

    if (
      !endDate ||
      !Number.isFinite(endDate.getTime()) ||
      startOfDay(endDate) < startOfDay(latestDate) ||
      startOfDay(endDate) < startOfDay(input.date)
    ) {
      throw new Error('recurrence.invalidEndDate');
    }
  }

  const schedule = {
    ...monthlyRule,
    isRecurring: true,
    recurrenceEndMode: mode,
    recurringPaymentCount: count ?? null,
    recurringEndDate: endDate,
  };

  if (existing?.recurringSeriesId) {
    await tx.transaction.updateMany({
      where: { userId, recurringSeriesId: seriesId },
      data: schedule,
    });
  }

  return {
    ...schedule,
    recurringSeriesId: seriesId,
    recurringPaymentNumber: number,
  };
}
