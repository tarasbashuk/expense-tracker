'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Currency, Transaction, TransactionType } from '@prisma/client';

interface TransactionResult {
  data?: Transaction;
  error?: string;
}

async function addTransaction(
  formData: FormData,
  transacionType: TransactionType,
  isDefaultAmmountRequired: boolean,
): Promise<TransactionResult> {
  const textValue = formData.get('text');
  const dateValue = formData.get('date');
  const amountValue = formData.get('amount');
  const categoryValue = formData.get('category');
  const currencyValue = formData.get('currency');
  const amountDefaultCurrencyValue = formData.get('amountDefaultCurrency');

  const { userId } = auth();

  if (
    !textValue ||
    !amountValue ||
    !categoryValue ||
    !currencyValue ||
    !dateValue ||
    (isDefaultAmmountRequired && !amountDefaultCurrencyValue)
  ) {
    return { error: 'Category, text or amount is missing' };
  }

  if (!userId) {
    return { error: 'User not found' };
  }

  const text = textValue.toString();
  const date = dateValue.toString();
  const category = categoryValue.toString();
  const currency = currencyValue.toString() as Currency;
  const amount = parseFloat(amountValue.toString());
  const amountDefaultCurrency = amountDefaultCurrencyValue
    ? parseFloat(amountDefaultCurrencyValue.toString())
    : amount;

  try {
    const transacionData = await db.transaction.create({
      data: {
        text,
        amount,
        currency,
        userId,
        category,
        date: new Date(date),
        type: transacionType,
        amountDefaultCurrency,
      },
    });

    revalidatePath('/');
    revalidatePath('transactions');
    revalidatePath('/transactions');
    revalidatePath('*');

    return {
      data: transacionData,
    };
  } catch (error: any) {
    return { error: error?.response?.message || 'Unable to save transaction' };
  }
}

export default addTransaction;
