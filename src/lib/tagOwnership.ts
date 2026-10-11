import type { Prisma } from '@prisma/client';
import { validateTagIds } from './tags';

export async function ownedTagConnections(
  db: Prisma.TransactionClient,
  userId: string,
  value: unknown,
) {
  const ids = validateTagIds(value);

  if (!ids.length) return [];

  const tags = await db.tag.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });

  if (tags.length !== ids.length) throw new Error('tags.notFound');

  return tags;
}
