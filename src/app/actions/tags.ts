'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { validateTag } from '@/lib/tags';

export async function getTags() {
  const user = await currentUser();

  if (!user) return { error: 'tags.unauthorized' };

  try {
    return {
      tags: await db.tag.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      }),
    };
  } catch {
    return { error: 'tags.loadError' };
  }
}

export async function saveTag(input: {
  id?: string;
  name: string;
  color: string;
}) {
  const user = await currentUser();

  if (!user) return { error: 'tags.unauthorized' };

  try {
    const data = validateTag(input.name, input.color);
    const tag = input.id
      ? await db.tag.update({ where: { id: input.id, userId: user.id }, data })
      : await db.tag.create({ data: { ...data, userId: user.id } });
    revalidatePath('/');
    revalidatePath('/transactions');

    return { tag };
  } catch (error) {
    const code = (error as { code?: string }).code;

    return {
      error:
        code === 'P2002'
          ? 'tags.duplicate'
          : code === 'P2025'
            ? 'tags.notFound'
            : error instanceof Error && error.message === 'tags.invalid'
              ? error.message
              : 'tags.saveError',
    };
  }
}

export async function deleteTag(id: string) {
  const user = await currentUser();

  if (!user) return { error: 'tags.unauthorized' };

  try {
    const result = await db.tag.deleteMany({ where: { id, userId: user.id } });

    if (!result.count) return { error: 'tags.notFound' };

    revalidatePath('/');
    revalidatePath('/transactions');

    return { success: true };
  } catch {
    return { error: 'tags.deleteError' };
  }
}
