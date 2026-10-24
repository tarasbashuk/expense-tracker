'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import type { TransactionType } from '@prisma/client';
import { db } from '@/lib/db';
import { validateCustomCategory } from '@/lib/customCategories';

function categoryError(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'P2002') return 'customCategories.duplicate';

  if (code === 'P2025') return 'customCategories.notFound';

  if (error instanceof Error && error.message.startsWith('customCategories.'))
    return error.message;

  return 'customCategories.saveError';
}

export async function getCustomCategories() {
  const user = await currentUser();

  if (!user) return { error: 'customCategories.unauthorized' };

  try {
    const categories = await db.customCategory.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    return { categories };
  } catch {
    return { error: 'customCategories.loadError' };
  }
}

export async function saveCustomCategory(input: {
  id?: string;
  name: string;
  type: TransactionType;
  icon: string;
}) {
  const user = await currentUser();

  if (!user) return { error: 'customCategories.unauthorized' };

  try {
    const data = validateCustomCategory(input);

    // The type is immutable: existing transactions must keep their original meaning.
    const category = input.id
      ? await db.customCategory.update({
          where: { id: input.id, userId: user.id, type: data.type },
          data: {
            name: data.name,
            normalizedName: data.normalizedName,
            icon: data.icon,
          },
        })
      : await db.customCategory.create({ data: { ...data, userId: user.id } });

    revalidatePath('/', 'layout');

    return { category };
  } catch (error) {
    return { error: categoryError(error) };
  }
}

export async function archiveCustomCategory(id: string, archived: boolean) {
  const user = await currentUser();

  if (!user) return { error: 'customCategories.unauthorized' };

  if (typeof archived !== 'boolean')
    return { error: 'customCategories.invalid' };

  try {
    const category = await db.customCategory.update({
      where: { id, userId: user.id },
      data: { archived },
    });

    revalidatePath('/', 'layout');

    return { category };
  } catch (error) {
    return { error: categoryError(error) };
  }
}
