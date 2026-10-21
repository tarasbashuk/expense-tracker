import { expect, test } from 'vitest';
import { formatCurrency } from '@/lib/formatCurrency';

test('analytics formatting localizes decimals and preserves trailing zeroes without changing the input', () => {
  const amount = 1625.874;
  const options = { locale: 'uk-UA', minimumFractionDigits: 2 };

  expect(formatCurrency(amount, 'EUR', options).replace(/\u00a0/g, ' ')).toBe(
    '1 625,87 €',
  );
  expect(formatCurrency(470, 'EUR', options)).toBe('470,00 €');
  expect(formatCurrency(470, 'EUR', { ...options, locale: 'en-US' })).toBe(
    '470.00 €',
  );
  expect(amount).toBe(1625.874);
});

test('existing callers retain their previous currency formatting', () => {
  expect(formatCurrency(1625.87, 'EUR')).toBe('1 625.87 €');
  expect(formatCurrency(470, 'EUR')).toBe('470 €');
  expect(formatCurrency(470)).toBe('470');
});
