'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';

async function getIncomeExpense(): Promise<{
  income?: number;
  expense?: number;
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

    const income = transactions
      .filter((item) => item.type === TransactionType.Income)
      .reduce((acc, item) => acc + item.amount, 0);

    const expense = transactions
      .filter((item) => item.type === TransactionType.Expense)
      .reduce((acc, item) => acc + item.amount, 0);

    return { income, expense: Math.abs(expense) };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getIncomeExpense;
