import { expect, test } from 'vitest';

import { filterTransactions } from '@/lib/filterTransactions';
import { transaction } from './fixtures';

test('description search ignores case and surrounding spaces, including Ukrainian', () => {
  const rows = [
    transaction({ text: 'Сільпо продукти' }),
    transaction({ text: 'Coffee' }),
  ];

  const result = filterTransactions(rows, '  СІЛЬПО ', 'all', 'all');

  expect(result).toEqual([rows[0]]);
  expect(rows).toHaveLength(2);
});

test('search intersects category and type filters', () => {
  const rows = [
    transaction({ text: 'Shop', category: 'groceries' }),
    transaction({ text: 'Shop refund', category: 'groceries', type: 'Income' }),
    transaction({ text: 'Shop', category: 'others' }),
  ];

  const result = filterTransactions(rows, 'shop', 'groceries', 'Expense');

  expect(result).toEqual([rows[0]]);
});

test('empty query returns all records allowed by the other filters', () => {
  const rows = [transaction(), transaction({ type: 'Income' })];

  const result = filterTransactions(rows, '   ', 'all', 'Income');

  expect(result).toEqual([rows[1]]);
});
