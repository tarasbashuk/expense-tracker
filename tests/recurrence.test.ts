import { describe, expect, it } from 'vitest';
import { getLastPaymentDate } from '@/lib/recurrence';

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
