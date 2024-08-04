'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Transaction } from '@prisma/client';
import { TransactionFormData } from '@/constants/types';

interface TransactionResult {
  data?: Transaction;
  error?: string;
}

async function addUpdateTransaction(
  formData: TransactionFormData,
  isDefaultAmmountRequired: boolean,
  transacionId?: string,
): Promise<TransactionResult> {
  const { text, date, amount, category, currency, amountDefaultCurrency } =
    formData;

  const { userId } = auth();

  if (
    !text ||
    !amount ||
    !category ||
    !currency ||
    !date ||
    (isDefaultAmmountRequired && !amountDefaultCurrency)
  ) {
    return { error: 'Category, text or amount is missing' };
  }

  if (!userId) {
    return { error: 'User not found' };
  }

  const amountDefaultCurrencyValue = amountDefaultCurrency
    ? amountDefaultCurrency
    : amount;

  try {
    let transacionData;

    if (transacionId) {
      transacionData = await db.transaction.update({
        where: {
          id: transacionId,
        },
        data: {
          ...formData,
          amountDefaultCurrency: amountDefaultCurrencyValue,
        },
      });
    } else {
      transacionData = await db.transaction.create({
        data: {
          ...formData,
          userId,
          amountDefaultCurrency: amountDefaultCurrencyValue,
        },
      });
    }

    revalidatePath('/');
    revalidatePath('transactions');
    revalidatePath('/transactions');
    revalidatePath('*');

    return {
      data: transacionData,
    };
  } catch (error: any) {
    console.log('error', error);

    return { error: error?.response?.message || 'Unable to save transaction' };
  }
}

export default addUpdateTransaction;
