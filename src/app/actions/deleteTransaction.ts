'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

async function deleteTransaction(transactionId: string): Promise<{
  message?: string;
  error?: string;
}> {
  const { userId } = await auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    await db.$transaction(async (transactionDb) => {
      await transactionDb.transaction.deleteMany({
        where: {
          CCExpenseTransactionId: transactionId,
          userId,
        },
      });

      await transactionDb.transaction.delete({
        where: {
          id: transactionId,
          userId,
        },
      });
    });

    return { message: 'Transaction deleted' };
  } catch (error) {
    console.error(error);

    return { error: 'Database error' };
  }
}

export default deleteTransaction;
