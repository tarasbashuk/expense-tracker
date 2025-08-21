'use client';
import { useIntl } from 'react-intl';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import {
  ExpenseCategory,
  IncomeCategory,
  TransactionCategory,
} from '@/constants/types';

export const getCategoryMessageId = (category: TransactionCategory) =>
  `categories.${category}`;

export const useCategoryI18n = () => {
  const { formatMessage } = useIntl();

  const getLabel = (category: TransactionCategory) => {
    const fallback =
      EXPENSE_CATEGORIES[category as ExpenseCategory] ||
      INCOME_CATEGORIES[category as IncomeCategory] ||
      String(category);

    return formatMessage({
      id: getCategoryMessageId(category),
      defaultMessage: fallback,
    });
  };

  return { getLabel };
};
