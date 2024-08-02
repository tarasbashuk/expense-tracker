'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Transaction } from '@prisma/client';
import { endOfMonth, startOfMonth, format } from 'date-fns';
import { DATE_FORMATS } from '@/constants/constants';

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
  const formattedStart = new Date(format(startDate, DATE_FORMATS.YYYY_MM_DD));
  const formattedEnd = new Date(format(endDate, DATE_FORMATS.YYYY_MM_DD));

  try {
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: formattedStart,
          lte: formattedEnd,
        },
      },
      orderBy: [
        {
          date: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return { transactions };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getTransactions;
