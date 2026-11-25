import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { prepareRecurringSeries } from '@/lib/recurringSeries';
import { hasRemainingPayments } from '@/lib/recurrence';
import { transaction } from './fixtures';

const input = {
  text: 'Phone',
  amount: 10,
  category: 'other',
  currency: 'EUR' as const,
  type: 'Expense' as const,
  date: new Date(2026, 0, 15),
  isCreditTransaction: false,
  isRecurring: true,
  recurrenceEndMode: 'count' as const,
  recurringPaymentCount: 10,
};
const first = transaction({
  ...input,
  id: 'first',
  userId: 'owner',
  recurringSeriesId: 'series',
  recurringPaymentNumber: 1,
  recurringEndDate: new Date(2026, 9, 15),
});
const third = transaction({
  ...first,
  id: 'third',
  date: new Date(2026, 2, 15),
  recurringPaymentNumber: 3,
});

function database(latest = third) {
  const updateMany = vi.fn();
  const findFirst = vi.fn().mockResolvedValue(latest);
  const tx = {
    transaction: { updateMany, findFirst },
  } as unknown as Prisma.TransactionClient;

  return { tx, updateMany, findFirst };
}

describe('recurring series', () => {
  it('creates a new series with the first payment included', async () => {
    const { tx, updateMany } = database();

    const result = await prepareRecurringSeries(tx, 'owner', input, null);

    expect(result.recurringSeriesId).toEqual(expect.any(String));
    expect(result).toMatchObject({
      recurrenceEndMode: 'count',
      recurringPaymentCount: 10,
      recurringPaymentNumber: 1,
    });
    expect(result.recurringEndDate).toEqual(
      new Date(2026, 9, 15, 23, 59, 59, 999),
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('editing payment three keeps total count and computes only remaining months', async () => {
    const { tx } = database();

    const result = await prepareRecurringSeries(
      tx,
      'owner',
      { ...input, date: third.date },
      third,
    );

    expect(result.recurringPaymentNumber).toBe(3);
    expect(result.recurringEndDate).toEqual(
      new Date(2026, 9, 15, 23, 59, 59, 999),
    );
  });

  it('editing an earlier payment uses the latest date and updates only owned series metadata', async () => {
    const { tx, updateMany, findFirst } = database();

    const result = await prepareRecurringSeries(
      tx,
      'owner',
      { ...input, recurringPaymentCount: 12 },
      first,
    );

    expect(result.recurringEndDate).toEqual(
      new Date(2026, 11, 15, 23, 59, 59, 999),
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'owner', recurringSeriesId: 'series' },
      orderBy: { recurringPaymentNumber: 'desc' },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'owner', recurringSeriesId: 'series' },
      data: {
        isRecurring: true,
        isLastDayOfMonth: false,
        dayOfMonth: 15,
        recurrenceEndMode: 'count',
        recurringPaymentCount: 12,
        recurringEndDate: result.recurringEndDate,
      },
    });
  });

  it.each([0, 2, 3.5, 1201, NaN])(
    'rejects count %s below issued payments or outside limits',
    async (count) => {
      const { tx, updateMany } = database();

      await expect(
        prepareRecurringSeries(
          tx,
          'owner',
          { ...input, recurringPaymentCount: count },
          third,
        ),
      ).rejects.toThrow('recurrence.invalidTotal');
      expect(updateMany).not.toHaveBeenCalled();
    },
  );

  it('stops the entire series while retaining historical numbering', async () => {
    const { tx, updateMany } = database();

    const result = await prepareRecurringSeries(
      tx,
      'owner',
      { ...input, isRecurring: false },
      third,
    );

    expect(result).toMatchObject({
      isRecurring: false,
      recurringSeriesId: 'series',
      recurringPaymentNumber: 3,
      recurringPaymentCount: 10,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'owner', recurringSeriesId: 'series' },
      data: { isRecurring: false },
    });
  });

  it('switches an existing series to unlimited without losing its number', async () => {
    const { tx } = database();

    const result = await prepareRecurringSeries(
      tx,
      'owner',
      { ...input, recurrenceEndMode: 'never' },
      third,
    );

    expect(result).toMatchObject({
      recurringPaymentCount: null,
      recurringEndDate: null,
      recurringPaymentNumber: 3,
      recurrenceEndMode: 'never',
    });
  });

  it('rejects an end date before the last issued payment', async () => {
    const { tx } = database();

    await expect(
      prepareRecurringSeries(
        tx,
        'owner',
        {
          ...input,
          recurrenceEndMode: 'date',
          recurringEndDate: new Date(2026, 1, 15),
        },
        first,
      ),
    ).rejects.toThrow('recurrence.invalidEndDate');
  });

  it('does not infer historical payment numbers from a legacy end date', async () => {
    const { tx } = database();
    const legacy = transaction({
      isRecurring: true,
      recurringEndDate: new Date(2027, 0, 15),
    });

    const result = await prepareRecurringSeries(
      tx,
      'owner',
      {
        ...input,
        recurrenceEndMode: undefined,
        recurringPaymentCount: undefined,
        recurringEndDate: legacy.recurringEndDate!,
      },
      legacy,
    );

    expect(result).toMatchObject({
      recurrenceEndMode: 'date',
      recurringPaymentNumber: 1,
      recurringPaymentCount: null,
    });
  });

  it('stops at the total while preserving legacy recurring behavior', () => {
    expect(
      hasRemainingPayments({
        recurringPaymentNumber: 10,
        recurringPaymentCount: 10,
      }),
    ).toBe(false);
    expect(hasRemainingPayments(third)).toBe(true);
    expect(hasRemainingPayments(transaction())).toBe(true);
  });
});

it('month-end is opt-in even when the transaction date is the last day', async () => {
  const { tx } = database();

  const result = await prepareRecurringSeries(
    tx,
    'owner',
    { ...input, date: new Date(2026, 3, 30), recurringPaymentCount: 2 },
    null,
  );

  expect(result).toMatchObject({ isLastDayOfMonth: false, dayOfMonth: 30 });
  expect(result.recurringEndDate).toEqual(
    new Date(2026, 4, 30, 23, 59, 59, 999),
  );
});

it('month-end switch updates the entire series and its final date', async () => {
  const current = transaction({
    ...third,
    date: new Date(2026, 3, 30),
    dayOfMonth: 30,
  });
  const { tx, updateMany } = database(current);

  const result = await prepareRecurringSeries(
    tx,
    'owner',
    {
      ...input,
      date: current.date,
      isLastDayOfMonth: true,
      recurringPaymentCount: 4,
    },
    current,
  );

  expect(result.recurringEndDate).toEqual(
    new Date(2026, 4, 31, 23, 59, 59, 999),
  );
  expect(updateMany).toHaveBeenCalledWith({
    where: { userId: 'owner', recurringSeriesId: 'series' },
    data: expect.objectContaining({ isLastDayOfMonth: true, dayOfMonth: 30 }),
  });
});

it('editing a February payment retains day 31 and switching month-end off restores the anchor', async () => {
  const current = transaction({
    ...third,
    date: new Date(2026, 1, 28),
    dayOfMonth: 31,
    isLastDayOfMonth: true,
  });
  const { tx } = database(current);

  const result = await prepareRecurringSeries(
    tx,
    'owner',
    {
      ...input,
      date: current.date,
      isLastDayOfMonth: false,
      recurringPaymentCount: 4,
    },
    current,
  );

  expect(result).toMatchObject({ dayOfMonth: 31, isLastDayOfMonth: false });
  expect(result.recurringEndDate).toEqual(
    new Date(2026, 2, 31, 23, 59, 59, 999),
  );
});

it('stopping a series preserves its monthly rule', async () => {
  const current = transaction({
    ...third,
    isLastDayOfMonth: true,
    dayOfMonth: 30,
  });
  const { tx } = database(current);

  const result = await prepareRecurringSeries(
    tx,
    'owner',
    { ...input, isRecurring: false },
    current,
  );

  expect(result).toMatchObject({
    isRecurring: false,
    isLastDayOfMonth: true,
    dayOfMonth: 30,
  });
});

it('rejects non-boolean month-end values from a client', async () => {
  const { tx } = database();

  await expect(
    prepareRecurringSeries(
      tx,
      'owner',
      { ...input, isLastDayOfMonth: 'true' as unknown as boolean },
      null,
    ),
  ).rejects.toThrow('recurrence.invalidMonthlyRule');
});
