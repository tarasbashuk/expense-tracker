'use server';

import { currentUser } from '@clerk/nextjs/server';
import { Transaction, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';
import * as Sentry from '@sentry/nextjs';

import { db } from '@/lib/db';
import { decrypt, decryptFloat } from '@/lib/crypto';
import { dateKeyFromLocalDate, getUtcDate } from '@/lib/dateRange';
import { ExpenseCategory, IncomeCategory } from '@/constants/types';

export type HomeMonthlySummary = {
  income: number;
  expense: number;
  net: number;
  expenseChangePercent: number | null;
};

export type HomeDashboardData = {
  monthlySummary: HomeMonthlySummary;
  recentTransactions: Transaction[];
};

const isLegacyCreditEntry = (transaction: Transaction) =>
  transaction.category === IncomeCategory.CreditReceived ||
  transaction.category === ExpenseCategory.CCRepayment;

const getTotals = (transactions: Transaction[]) => {
  let income = new Decimal(0);
  let expense = new Decimal(0);

  for (const transaction of transactions) {
    if (isLegacyCreditEntry(transaction)) continue;
    const amount = new Decimal(transaction.amountDefaultCurrency);
    if (transaction.type === TransactionType.Income) {
      income = income.plus(amount);
    } else {
      expense = expense.plus(amount);
    }
  }

  return { income, expense };
};

export default async function getHomeDashboard(): Promise<{
  data?: HomeDashboardData;
  error?: string;
}> {
  const user = await currentUser();
  const userId = user?.id;
  const decryptKey = user?.primaryEmailAddressId;
  if (!userId) return { error: 'User not found' };

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  try {
    const [settings, monthlyTransactions, recentTransactions] =
      await Promise.all([
        db.settings.findUnique({
          where: { clerkUserId: userId },
          select: { encryptData: true },
        }),
        db.transaction.findMany({
          where: {
            userId,
            date: {
              gte: getUtcDate(dateKeyFromLocalDate(previousMonthStart)),
              lt: getUtcDate(dateKeyFromLocalDate(nextMonthStart)),
            },
          },
        }),
        db.transaction.findMany({
          where: {
            userId,
            NOT: {
              OR: [
                { category: IncomeCategory.CreditReceived },
                { category: ExpenseCategory.CCRepayment },
              ],
            },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        }),
      ]);

    const shouldDecrypt = Boolean(settings?.encryptData && decryptKey);
    const decryptTransaction = (transaction: Transaction): Transaction =>
      shouldDecrypt && decryptKey
        ? {
            ...transaction,
            text: decrypt(transaction.text, decryptKey),
            amount: decryptFloat(transaction.amount, decryptKey),
            amountDefaultCurrency: decryptFloat(
              transaction.amountDefaultCurrency,
              decryptKey,
            ),
          }
        : transaction;

    const readableMonthlyTransactions =
      monthlyTransactions.map(decryptTransaction);
    const currentMonthStartUtc = getUtcDate(
      dateKeyFromLocalDate(currentMonthStart),
    );
    const currentTransactions = readableMonthlyTransactions.filter(
      ({ date }) => date >= currentMonthStartUtc,
    );
    const previousTransactions = readableMonthlyTransactions.filter(
      ({ date }) => date < currentMonthStartUtc,
    );
    const currentTotals = getTotals(currentTransactions);
    const previousTotals = getTotals(previousTransactions);
    const expenseChangePercent = previousTotals.expense.isZero()
      ? null
      : currentTotals.expense
          .minus(previousTotals.expense)
          .div(previousTotals.expense)
          .mul(100)
          .toDecimalPlaces(0)
          .toNumber();

    return {
      data: {
        monthlySummary: {
          income: currentTotals.income.toNumber(),
          expense: currentTotals.expense.toNumber(),
          net: currentTotals.income.minus(currentTotals.expense).toNumber(),
          expenseChangePercent,
        },
        recentTransactions: recentTransactions.map(decryptTransaction),
      },
    };
  } catch (error) {
    Sentry.captureException(error);

    return { error: 'Unable to load dashboard' };
  }
}
