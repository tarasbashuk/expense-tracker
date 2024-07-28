'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Transaction } from '@prisma/client';

async function getSettings(): Promise<{
  settings?: {
    language: string;
    theme: string;
    transactions?: Transaction[];
  };
  error?: string;
}> {
  const { userId } = auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const settings = {
      transactions,
      language: 'en',
      theme: 'light',
    };

    return { settings };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getSettings;
