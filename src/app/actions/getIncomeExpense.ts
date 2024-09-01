'use server';
import { DATE_FORMATS, DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decryptFloat } from '@/lib/crypto';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';
import { endOfMonth, startOfMonth, format } from 'date-fns';

async function getIncomeExpense(
  year?: number,
  month?: number,
): Promise<{
  income?: number;
  expense?: number;
  error?: string;
}> {
  // const { userId } = auth();
  let formattedStart, formattedEnd;
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const decryptKey = user?.primaryEmailAddressId;
  const shouldDecrypt = !DO_NOT_ENCRYPT_LIST.includes(userEmail!);

  if (!userId) {
    return { error: 'User not found' };
  }

  if (year && month) {
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));
    formattedStart = new Date(format(startDate, DATE_FORMATS.YYYY_MM_DD));
    formattedEnd = new Date(format(endDate, DATE_FORMATS.YYYY_MM_DD));
  }

  try {
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: formattedStart,
          lte: formattedEnd,
        },
      },
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

    return { income: income.toNumber(), expense: expense.toNumber() };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getIncomeExpense;
