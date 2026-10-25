'use client';
import { useCategoryCatalog } from '@/components/categories/useCategoryCatalog';
import { customCategoryKey, isCustomCategory } from './customCategories';
import { useIntl } from 'react-intl';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/constants';
import { ExpenseCategory, IncomeCategory } from '@/constants/types';

export const getCategoryMessageId = (category: string) =>
  `categories.${category}`;

export const useCategoryI18n = () => {
  const { formatMessage } = useIntl();
  const { categories } = useCategoryCatalog();

  const getLabel = (category: string) => {
    if (isCustomCategory(category)) {
      return (
        categories.find(({ id }) => customCategoryKey(id) === category)?.name ||
        formatMessage({
          id: 'customCategories.unknown',
          defaultMessage: 'Custom category',
        })
      );
    }

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
