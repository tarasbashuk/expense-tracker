'use server';
import { decryptFloat } from '@/lib/crypto';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';
import { ExpenseCategory, IncomeCategory } from '@/constants/types';
import * as Sentry from '@sentry/nextjs';
import {
  dateKeyFromLocalDate,
  getExclusiveEndDate,
  getUtcDate,
} from '@/lib/dateRange';

async function getIncomeExpense(
  yearOrStartDate?: number | string,
  monthOrEndDate?: number | string,
): Promise<{
  income?: number;
  expense?: number;
  creditReturned?: number;
  creditReceived?: number;
  error?: string;
}> {
  // const { userId } = auth();
  let formattedStart, formattedEnd;
  const user = await currentUser();
  const userId = user?.id;
  const decryptKey = user?.primaryEmailAddressId;

  if (!userId) {
    return { error: 'User not found' };
  }

  // Get encryptData setting from user settings
  const settings = await db.settings.findUnique({
    where: { clerkUserId: userId },
    select: { encryptData: true },
  });

  const shouldDecrypt = Boolean(settings?.encryptData && decryptKey);

  if (
    typeof yearOrStartDate === 'string' &&
    typeof monthOrEndDate === 'string'
  ) {
    formattedStart = getUtcDate(yearOrStartDate);
    formattedEnd = getExclusiveEndDate(monthOrEndDate);
  } else if (
    typeof yearOrStartDate === 'number' &&
    typeof monthOrEndDate === 'number'
  ) {
    const startDate = dateKeyFromLocalDate(
      new Date(yearOrStartDate, monthOrEndDate, 1),
    );
    const endDate = dateKeyFromLocalDate(
      new Date(yearOrStartDate, monthOrEndDate + 1, 0),
    );
    formattedStart = getUtcDate(startDate);
    formattedEnd = getExclusiveEndDate(endDate);
  }

  try {
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: formattedStart,
          lt: formattedEnd,
        },
      },
    });
    const decryptedTransactions =
      shouldDecrypt && decryptKey
        ? transactions.map((tr) => ({
            ...tr,
            amountDefaultCurrency: decryptFloat(
              tr.amountDefaultCurrency,
              decryptKey,
            ),
          }))
        : transactions;

    let income = new Decimal(0);
    let expense = new Decimal(0);
    let creditReceived = new Decimal(0);
    let creditReturned = new Decimal(0);

    decryptedTransactions.forEach((tr) => {
      const amount = new Decimal(tr.amountDefaultCurrency);

      if (
        tr.type === TransactionType.Income &&
        tr.category !== IncomeCategory.CreditReceived
      ) {
        income = income.plus(amount);
      }

      if (
        tr.type === TransactionType.Expense &&
        tr.category !== ExpenseCategory.CCRepayment
      ) {
        expense = expense.plus(amount);
      }

      if (tr.category === IncomeCategory.CreditReceived) {
        creditReceived = creditReceived.plus(amount);
      }

      if (tr.category === ExpenseCategory.CCRepayment) {
        creditReturned = creditReturned.plus(amount);
      }
    });

    return {
      income: income.toNumber(),
      expense: expense.toNumber(),
      creditReturned: creditReturned.toNumber(),
      creditReceived: creditReceived.toNumber(),
    };
  } catch (error) {
    console.error('Error getting income/expense:', error);
    Sentry.captureException(error);

    return { error: 'Database error' };
  }
}

export default getIncomeExpense;
