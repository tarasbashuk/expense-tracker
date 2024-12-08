'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';

async function deleteTransaction(transactionId: string): Promise<{
  message?: string;
  error?: string;
}> {
  const { userId } = await auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const deletetTr = await db.transaction.delete({
      where: {
        id: transactionId,
        userId,
      },
    });

    const isCreditExpenseTr =
      deletetTr.isCreditTransaction &&
      deletetTr.type === TransactionType.Expense;

    // Deleting respective Income credit transaction
    if (isCreditExpenseTr) {
      await db.transaction.delete({
        where: {
          CCExpenseTransactionId: deletetTr.id,
          userId,
        },
      });
    }

    return { message: 'Transaction deleted' };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default deleteTransaction;
