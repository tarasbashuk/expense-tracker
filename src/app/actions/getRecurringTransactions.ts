'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { Transaction, TransactionType } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { decrypt, decryptFloat } from '@/lib/crypto';

async function getRecurringTransactions(): Promise<{
  transactions?: Transaction[];
  totalExpense?: number;
  error?: string;
}> {
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

  try {
    // Get last month's date range
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    // Find all recurring transactions from last month
    // Exclude income transactions with CCExpenseTransactionId - they are created automatically for credit transactions
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        isRecurring: true,
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
        // Check if the recurrence period hasn't ended
        OR: [
          { recurringEndDate: null }, // Infinite
          { recurringEndDate: { gt: new Date() } }, // Not ended yet
        ],
        // Don't process income transactions that are linked to credit transactions
        CCExpenseTransactionId: null,
      },
      orderBy: [
        {
          date: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    if (shouldDecrypt && decryptKey) {
      const decryptedTransactions = transactions.map((transaction) => {
        return {
          ...transaction,
          text: decrypt(transaction.text, decryptKey),
          amount: decryptFloat(transaction.amount, decryptKey),
          amountDefaultCurrency: decryptFloat(
            transaction.amountDefaultCurrency,
            decryptKey,
          ),
        };
      });

      // Filter only expenses
      const expenseTransactions = decryptedTransactions.filter(
        (t) => t.type === TransactionType.Expense,
      );

      // Calculate total expenses
      const totalExpense = expenseTransactions.reduce(
        (sum, t) => sum + (t.amountDefaultCurrency || 0),
        0,
      );

      return {
        transactions: expenseTransactions,
        totalExpense,
      };
    }

    // Filter only expenses
    const expenseTransactions = transactions.filter(
      (t) => t.type === TransactionType.Expense,
    );

    // Calculate total expenses
    const totalExpense = expenseTransactions.reduce(
      (sum, t) => sum + (Number(t.amountDefaultCurrency) || 0),
      0,
    );

    return {
      transactions: expenseTransactions,
      totalExpense,
    };
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);

    return { error: 'Database error' };
  }
}

export default getRecurringTransactions;

