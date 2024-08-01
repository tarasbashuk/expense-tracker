'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Transaction } from '@prisma/client';
import { endOfMonth, startOfMonth } from 'date-fns';

async function getTransactions(
  year: number,
  month: number,
): Promise<{
  transactions?: Transaction[];
  error?: string;
}> {
  const { userId } = auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  const startDate = startOfMonth(new Date(year, month));
  const endDate = endOfMonth(new Date(year, month));

  try {
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { transactions };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getTransactions;
