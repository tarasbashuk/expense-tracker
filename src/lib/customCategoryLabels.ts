import { db } from './db';
import { customCategoryKey, isCustomCategory } from './customCategories';

export async function customCategoryLabels(
  userId: string,
  transactions: { category: string }[],
) {
  const keys = [
    ...new Set(
      transactions.map(({ category }) => category).filter(isCustomCategory),
    ),
  ];

  if (!keys.length) return {} as Record<string, string>;

  const categories = await db.customCategory.findMany({
    where: {
      userId,
      id: { in: keys.map((key) => key.slice('custom:'.length)) },
    },
  });

  return Object.fromEntries(
    categories.map(({ id, name }) => [customCategoryKey(id), name]),
  );
}
