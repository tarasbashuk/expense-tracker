import { TransactionType, type Prisma } from '@prisma/client';
import { categoryOptions, isCustomCategory } from './customCategories';

export async function validateTransactionCategory(
  tx: Prisma.TransactionClient,
  userId: string,
  category: string,
  type: TransactionType,
  options: { existingCategory?: string } = {},
) {
  if (!Object.values(TransactionType).includes(type))
    throw new Error('customCategories.invalid');

  if (!isCustomCategory(category)) {
    if (
      !categoryOptions([], type, true).some(({ value }) => value === category)
    ) {
      throw new Error('customCategories.unavailable');
    }

    return;
  }

  const owned = await tx.customCategory.findFirst({
    where: { id: category.slice('custom:'.length), userId, type },
  });

  if (!owned || (owned.archived && category !== options.existingCategory)) {
    throw new Error('customCategories.unavailable');
  }
}
