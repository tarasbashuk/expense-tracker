'use server';
import { DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decryptFloat } from '@/lib/crypto';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { Currency, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

async function getUserBalance(): Promise<{
  balance?: string;
  defaultCurrency?: Currency;
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
      const amountDefaultCurrency =
        shouldDecrypt && decryptKey
          ? decryptFloat(transaction.amountDefaultCurrency, decryptKey)
          : transaction.amountDefaultCurrency;

      const amount = new Decimal(amountDefaultCurrency);

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
