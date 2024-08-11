'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Currency, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

async function getUserBalance(): Promise<{
  balance?: string;
  defaultCurrency?: Currency;
  error?: string;
}> {
  const { userId } = auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const settings = await db.settings.findUnique({
      where: { clerkUserId: userId },
      select: {
        initialAmount: true,
        defaultCurrency: true,
      },
    });
    const transactions = await db.transaction.findMany({
      where: { userId },
    });
    const initialAmount = new Decimal(Number(settings?.initialAmount || 0));
    const defaultCurrency = settings?.defaultCurrency;

    const balance = transactions.reduce((sum, transaction) => {
      const amount = new Decimal(transaction.amountDefaultCurrency);

      if (transaction.type === TransactionType.Income) {
        return sum.plus(amount);
      } else {
        return sum.minus(amount);
      }
    }, initialAmount);

    return { balance: balance.toFixed(2), defaultCurrency };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getUserBalance;
