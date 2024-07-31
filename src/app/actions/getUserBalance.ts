'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';

async function getUserBalance(): Promise<{
  balance?: number;
  error?: string;
}> {
  const { userId } = auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const transactions = await db.transaction.findMany({
      where: { userId },
    });

    const balance = transactions.reduce((sum, transaction) => {
      console.log('transaction', transaction);
      if (transaction.type === TransactionType.Income) {
        return sum + transaction.amount;
      } else {
        return sum - transaction.amount;
      }
    }, 0);

    return { balance };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getUserBalance;
