import { describe, expect, it } from 'vitest';
import { getLastPaymentDate, getNextPaymentDate } from '@/lib/recurrence';

describe('last recurring payment', () => {
  it('includes the first payment in the total', () => {
    const result = getLastPaymentDate(new Date(2026, 0, 15), 10);

    expect(result).toEqual(new Date(2026, 9, 15, 23, 59, 59, 999));
  });

  it('supports a single payment', () => {
    const result = getLastPaymentDate(new Date(2026, 0, 15), 1);

    expect(result).toEqual(new Date(2026, 0, 15, 23, 59, 59, 999));
  });

  it('matches monthly scheduler clamping through February', () => {
    const result = getLastPaymentDate(new Date(2024, 0, 31), 3);

    expect(result).toEqual(new Date(2024, 2, 29, 23, 59, 59, 999));
  });

  it.each([0, -1, 1.5, NaN, Infinity, 1201])(
    'rejects invalid count %s',
    (count) => {
      expect(getLastPaymentDate(new Date(), count)).toBeUndefined();
    },
  );
});

describe('explicit monthly rules', () => {
  it.each([2024, 2025, 2026, 2028])(
    'returns to day 31 after February in %s',
    (year) => {
      const rule = { dayOfMonth: 31, isLastDayOfMonth: false };
      const february = getNextPaymentDate(new Date(year, 0, 31), rule);
      const march = getNextPaymentDate(february, rule);
      const april = getNextPaymentDate(march, rule);

      expect(february).toEqual(new Date(year, 2, 0));
      expect(march).toEqual(new Date(year, 2, 31));
      expect(april).toEqual(new Date(year, 3, 30));
    },
  );

  it('distinguishes the last day from fixed day 30 and fixed day 28', () => {
    const april = new Date(2026, 3, 30);

    expect(
      getNextPaymentDate(april, { isLastDayOfMonth: true, dayOfMonth: 30 }),
    ).toEqual(new Date(2026, 4, 31));
    expect(
      getNextPaymentDate(april, { isLastDayOfMonth: false, dayOfMonth: 30 }),
    ).toEqual(new Date(2026, 4, 30));
    expect(
      getNextPaymentDate(new Date(2026, 1, 28), { dayOfMonth: 28 }),
    ).toEqual(new Date(2026, 2, 28));
  });

  it.each([29, 30, 31])('retains anchor %s after clamping', (dayOfMonth) => {
    const february = getNextPaymentDate(new Date(2026, 0, dayOfMonth), {
      dayOfMonth,
    });

    expect(getNextPaymentDate(february, { dayOfMonth })).toEqual(
      new Date(2026, 2, dayOfMonth),
    );
  });

  it('keeps the initial transaction date and uses month end only for future payments', () => {
    const start = new Date(2026, 3, 15);
    const rule = { isLastDayOfMonth: true, dayOfMonth: 15 };

    expect(getLastPaymentDate(start, 1, rule)).toEqual(
      new Date(2026, 3, 15, 23, 59, 59, 999),
    );
    expect(getLastPaymentDate(start, 3, rule)).toEqual(
      new Date(2026, 5, 30, 23, 59, 59, 999),
    );
    expect(start).toEqual(new Date(2026, 3, 15));
  });

  it('uses the same anchored date for the installment total and successive payments', () => {
    const start = new Date(2026, 0, 31);
    const rule = { dayOfMonth: 31 };

    expect(getLastPaymentDate(start, 3, rule)).toEqual(
      new Date(2026, 2, 31, 23, 59, 59, 999),
    );
    expect(getNextPaymentDate(getNextPaymentDate(start, rule), rule)).toEqual(
      new Date(2026, 2, 31),
    );
  });

  it('handles year boundaries', () => {
    expect(
      getNextPaymentDate(new Date(2026, 11, 28), { isLastDayOfMonth: true }),
    ).toEqual(new Date(2027, 0, 31));
  });

  it.each([0, 32, 1.5, NaN])(
    'rejects invalid anchor %s for a count preview',
    (dayOfMonth) => {
      expect(
        getLastPaymentDate(new Date(), 10, { dayOfMonth }),
      ).toBeUndefined();
    },
  );
});
