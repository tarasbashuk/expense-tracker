'use server';
import { DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { ExpenseCategory, IncomeCategory } from '@/constants/types';
import { decryptFloat } from '@/lib/crypto';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { Currency, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

async function getUserBalance(): Promise<{
  balance?: string;
  initialAmount?: string;
  defaultCurrency?: Currency;
  error?: string;
}> {
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
        encryptData: true,
      },
    });

    const transactions = await db.transaction.findMany({
      where: { userId },
    });

    let initialAmountValue = settings?.initialAmount || 0;
    if (settings?.encryptData && decryptKey && settings.initialAmount != null) {
      initialAmountValue = decryptFloat(settings.initialAmount, decryptKey);
    }

    const initialAmount = new Decimal(initialAmountValue);
    const defaultCurrency = settings?.defaultCurrency;

    const balance = transactions.reduce((sum, tr) => {
      const amountDefaultCurrency =
        shouldDecrypt && decryptKey
          ? decryptFloat(tr.amountDefaultCurrency, decryptKey)
          : tr.amountDefaultCurrency;

      const amount = new Decimal(amountDefaultCurrency);

      if (
        tr.type === TransactionType.Income &&
        tr.category !== IncomeCategory.CreditReceived
      ) {
        return sum.plus(amount);
      }
      if (
        tr.type === TransactionType.Expense &&
        tr.category !== ExpenseCategory.CCRepayment
      ) {
        return sum.minus(amount);
      }

      return sum;
    }, initialAmount);

    return {
      defaultCurrency,
      balance: balance.toFixed(2),
      initialAmount: initialAmount.toFixed(2),
    };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getUserBalance;
