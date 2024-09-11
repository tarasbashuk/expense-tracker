'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { Transaction } from '@prisma/client';
import { endOfMonth, startOfMonth, format } from 'date-fns';
import { DATE_FORMATS, DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decrypt, decryptFloat } from '@/lib/crypto';
import { IncomeCategory } from '@/constants/types';

async function getTransactions(
  year: number,
  month: number,
  excludeCreditIncome = false,
): Promise<{
  transactions?: Transaction[];
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

  const startDate = startOfMonth(new Date(year, month));
  const endDate = endOfMonth(new Date(year, month));
  const formattedStart = new Date(format(startDate, DATE_FORMATS.YYYY_MM_DD));
  const formattedEnd = new Date(format(endDate, DATE_FORMATS.YYYY_MM_DD));

  try {
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: formattedStart,
          lte: formattedEnd,
        },
        AND: [
          excludeCreditIncome
            ? {
                NOT: {
                  category: IncomeCategory.CreditReceived,
                },
              }
            : {},
        ],
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
      const decryptTransactions = transactions.map((transaction) => {
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

      return { transactions: decryptTransactions };
    }

    return { transactions };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getTransactions;
