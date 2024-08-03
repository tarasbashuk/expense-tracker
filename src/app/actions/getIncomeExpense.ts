'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

async function getIncomeExpense(): Promise<{
  income?: string;
  expense?: string;
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
      .reduce(
        (acc, item) => acc.plus(new Decimal(item.amountDefaultCurrency)),
        new Decimal(0),
      );

    const expense = transactions
      .filter((item) => item.type === TransactionType.Expense)
      .reduce(
        (acc, item) => acc.plus(new Decimal(item.amountDefaultCurrency)),
        new Decimal(0),
      );

    return { income: income.toFixed(2), expense: expense.toFixed(2) };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getIncomeExpense;
