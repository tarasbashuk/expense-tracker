import { TransactionType } from '@prisma/client';
import type { CustomCategory } from '@prisma/client';
import {
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
  isCreditCardCategory,
} from '@/constants/constants';

export const CATEGORY_ICON_KEYS = [
  'tag',
  'baby',
  'heart',
  'paw',
  'house',
  'wrench',
  'car',
  'bike',
  'bus',
  'plane',
  'train',
  'ship',
  'shopping',
  'cart',
  'gift',
  'coffee',
  'utensils',
  'cake',
  'apple',
  'flower',
  'tree',
  'leaf',
  'sun',
  'umbrella',
  'book',
  'graduation',
  'music',
  'guitar',
  'headphones',
  'camera',
  'film',
  'game',
  'palette',
  'scissors',
  'shirt',
  'gem',
  'dumbbell',
  'trophy',
  'tent',
  'stethoscope',
  'pill',
  'briefcase',
  'laptop',
  'phone',
  'banknote',
  'piggybank',
  'tools',
  'sparkles',
] as const;

export type CategoryRecord = Pick<
  CustomCategory,
  'id' | 'name' | 'type' | 'icon' | 'archived'
>;

export const customCategoryKey = (id: string) => `custom:${id}`;

export const isCustomCategory = (key: string) => key.startsWith('custom:');

export function validateCustomCategory(input: {
  name: unknown;
  type: unknown;
  icon: unknown;
}) {
  const name =
    typeof input.name === 'string' ? input.name.trim().normalize('NFC') : '';
  const normalizedName = name.toLowerCase();

  if (
    !name ||
    name.length > 40 ||
    normalizedName.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(name) ||
    !Object.values(TransactionType).includes(input.type as TransactionType) ||
    !CATEGORY_ICON_KEYS.includes(
      input.icon as (typeof CATEGORY_ICON_KEYS)[number],
    )
  ) {
    throw new Error('customCategories.invalid');
  }

  return {
    name,
    normalizedName,
    type: input.type as TransactionType,
    icon: input.icon as string,
  };
}

const systemCategoriesByType = {
  Income: INCOME_CATEGORIES_LIST,
  Expense: EXPENSE_CATEGORIES_LIST,
  all: Array.from(
    new Map(
      [...EXPENSE_CATEGORIES_LIST, ...INCOME_CATEGORIES_LIST].map(
        (category) => [category.value, category],
      ),
    ).values(),
  ),
};

export function categoryOptions(
  custom: CategoryRecord[],
  type: TransactionType | 'all',
  creditEnabled: boolean,
  includeArchived = false,
  includeCustom = true,
) {
  const own = includeCustom
    ? custom.filter(
        (category) =>
          (type === 'all' || category.type === type) &&
          (includeArchived || !category.archived),
      )
    : [];

  return [
    ...systemCategoriesByType[type].filter(
      ({ value }) => creditEnabled || !isCreditCardCategory(value),
    ),
    ...own.map((category) => ({
      value: customCategoryKey(category.id),
      label: category.name,
    })),
  ];
}
