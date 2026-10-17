import { expect, test } from 'vitest';
import { transactionsToCsv } from '@/lib/transactionsCsv';
import { transaction } from './fixtures';

test('CSV preserves Unicode, quotes, newlines, dates, and original and converted amounts', () => {
  const rows = [
    transaction({
      text: 'Кава, "велика"\nз молоком',
      amount: 12.5,
      amountDefaultCurrency: 50,
    }),
  ];

  const csv = transactionsToCsv(rows, 'UAH');

  expect(csv.startsWith('\uFEFF"Date","Description"')).toBe(true);
  expect(csv).toContain(
    '"2026-08-12","Кава, ""велика""\nз молоком","Expense","groceries","12.5","EUR","50","UAH",""\r\n',
  );
  expect(csv).not.toContain('test-user');
});

test('CSV neutralizes spreadsheet formulas in text fields', () => {
  const csv = transactionsToCsv(
    [transaction({ text: '=HYPERLINK("bad")' })],
    'EUR',
  );

  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
});

test('empty CSV contains only its header', () => {
  const csv = transactionsToCsv([], 'EUR');

  expect(csv.split('\r\n')).toHaveLength(2);
});
