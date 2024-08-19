'use server';
import { DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decryptFloat } from '@/lib/crypto';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

async function getIncomeExpense(): Promise<{
  income?: string;
  expense?: string;
  error?: string;
}> {
  // const { userId } = auth();
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const decryptKey = user?.primaryEmailAddressId;
  const shouldDecrypt = !DO_NOT_ENCRYPT_LIST.includes(userEmail!);

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const transactions = await db.transaction.findMany({
      where: { userId },
    });
    const income = transactions
      .filter((item) => item.type === TransactionType.Income)
      .reduce((acc, item) => {
        const amountDefaultCurrency =
          shouldDecrypt && decryptKey
            ? decryptFloat(item.amountDefaultCurrency, decryptKey)
            : item.amountDefaultCurrency;

        return acc.plus(new Decimal(amountDefaultCurrency));
      }, new Decimal(0));

    const expense = transactions
      .filter((item) => item.type === TransactionType.Expense)
      .reduce((acc, item) => {
        const amountDefaultCurrency =
          shouldDecrypt && decryptKey
            ? decryptFloat(item.amountDefaultCurrency, decryptKey)
            : item.amountDefaultCurrency;

        return acc.plus(new Decimal(amountDefaultCurrency));
      }, new Decimal(0));

    return { income: income.toFixed(2), expense: expense.toFixed(2) };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getIncomeExpense;
