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

test('recurring-only intersects other filters and retains ended recurring history', () => {
  const rows = [
    transaction({
      text: 'School',
      isRecurring: true,
      recurringEndDate: new Date('2025-01-01'),
    }),
    transaction({ text: 'School', isRecurring: false }),
    transaction({ text: 'School', isRecurring: null }),
    transaction({ text: 'School refund', isRecurring: true, type: 'Income' }),
    transaction({ text: 'Books', isRecurring: true }),
  ];

  const filtered = filterTransactions(
    rows,
    'school',
    'groceries',
    'Expense',
    true,
  );
  const unfiltered = filterTransactions(
    rows,
    'school',
    'groceries',
    'Expense',
    false,
  );

  expect(filtered).toEqual([rows[0]]);
  expect(unfiltered).toEqual(rows.slice(0, 3));
});

test('tag OR combines with search, category, type and recurrence AND without reordering', () => {
  const tag = (id: string) => ({
    id,
    name: id,
    normalizedName: id,
    color: 'blue',
    userId: 'test-user',
  });
  const rows = [
    transaction({
      id: 'first',
      text: 'Coffee',
      category: 'dining',
      isRecurring: true,
      tags: [tag('trip')],
    }),
    transaction({
      id: 'second',
      text: 'Coffee',
      category: 'dining',
      isRecurring: true,
      tags: [tag('work')],
    }),
    transaction({
      text: 'Coffee',
      category: 'dining',
      isRecurring: true,
      tags: [tag('other')],
    }),
    transaction({
      text: 'Coffee',
      category: 'dining',
      isRecurring: false,
      tags: [tag('trip')],
    }),
    transaction({
      text: 'Coffee',
      category: 'dining',
      type: 'Income',
      isRecurring: true,
      tags: [tag('trip')],
    }),
    transaction({
      text: 'Coffee',
      category: 'groceries',
      isRecurring: true,
      tags: [tag('trip')],
    }),
    transaction({
      text: 'Tea',
      category: 'dining',
      isRecurring: true,
      tags: [tag('trip')],
    }),
    transaction({ text: 'Coffee', category: 'dining', isRecurring: true }),
  ];

  expect(
    filterTransactions(rows, 'coffee', 'dining', 'Expense', true, [
      'trip',
      'work',
    ]),
  ).toEqual(rows.slice(0, 2));
  expect(filterTransactions(rows, '', 'all', 'all', false, [])).toEqual(rows);
});
