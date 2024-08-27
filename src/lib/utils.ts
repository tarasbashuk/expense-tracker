import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import {
  ExpenseCategory,
  IncomeCategory,
  TransactionCategory,
} from '@/constants/types';
import { TransactionType } from '@prisma/client';

export const getCategoryLabel = (category: TransactionCategory) =>
  EXPENSE_CATEGORIES[category as ExpenseCategory] ||
  INCOME_CATEGORIES[category as IncomeCategory];

export const getTransactionSign = (type: TransactionType) =>
  type === TransactionType.Expense ? '-' : '+';
