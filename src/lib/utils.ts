import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import {
  ExpenseCategory,
  IncomeCategory,
  TransactionCategory,
} from '@/constants/types';
import { Transaction, TransactionType } from '@prisma/client';
import { Locale } from '@/locales';

export const getCategoryLabel = (category: TransactionCategory) =>
  EXPENSE_CATEGORIES[category as ExpenseCategory] ||
  INCOME_CATEGORIES[category as IncomeCategory];

export const formatDate = (date: Date | string, locale: Locale) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale === 'uk-UA' ? 'uk-UA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};

export const getTransactionSign = (type: TransactionType) =>
  type === TransactionType.Expense ? '-' : '+';

export const getCheckSum = (transactions: Transaction[]) =>
  transactions.reduce((acc, tr) => acc + tr.amountDefaultCurrency, 0);
