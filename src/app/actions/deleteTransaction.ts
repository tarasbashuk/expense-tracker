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
    const deletedTr = await db.transaction.delete({
      where: {
        id: transactionId,
        userId,
      },
    });

    const isCreditExpenseTr =
      deletedTr.isCreditTransaction &&
      deletedTr.type === TransactionType.Expense;

    // Deleting respective Income credit transaction
    if (isCreditExpenseTr) {
      await db.transaction.delete({
        where: {
          CCExpenseTransactionId: deletedTr.id,
          userId,
        },
      });
    }

    return { message: 'Transaction deleted' };
  } catch (error) {
    console.error(error);

    return { error: 'Database error' };
  }
}

export default deleteTransaction;
