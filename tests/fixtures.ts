import type { Transaction } from '@prisma/client';

export const transaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: 'test-transaction',
  userId: 'test-user',
  text: 'Groceries',
  amount: 10,
  amountDefaultCurrency: 10,
  currency: 'EUR',
  type: 'Expense',
  category: 'groceries',
  date: new Date('2026-08-12T00:00:00Z'),
  createdAt: new Date('2026-08-12T00:00:00Z'),
  updatedAt: new Date('2026-08-12T00:00:00Z'),
  isCreditTransaction: false,
  isRecurring: false,
  recurringEndDate: null,
  CCExpenseTransactionId: null,
  ...overrides,
});
