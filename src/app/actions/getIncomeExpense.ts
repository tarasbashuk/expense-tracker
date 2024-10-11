'use server';
import { DATE_FORMATS, DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decryptFloat } from '@/lib/crypto';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';
import { endOfMonth, startOfMonth, format } from 'date-fns';
import { ExpenseCategory, IncomeCategory } from '@/constants/types';

async function getIncomeExpense(
  year?: number,
  month?: number,
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

      if (tr.type === TransactionType.Expense) {
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
    return { error: 'Database error' };
  }
}

export default getIncomeExpense;
