'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Currency, TransactionType } from '@prisma/client';

interface TransactionFormValues {
  text: string;
  amount: number;
}

interface TransactionResult {
  data?: TransactionFormValues;
  error?: string;
}

async function addTransaction(
  formData: FormData,
  transacionType: TransactionType,
): Promise<TransactionResult> {
  const textValue = formData.get('text');
  const amountValue = formData.get('amount');
  const categoryValue = formData.get('category');
  const currencyValue = formData.get('currency');
  console.log('textValue', textValue);
  console.log('amountValue', amountValue);
  console.log('categoryValue', categoryValue);
  console.log('currencyValue', currencyValue);
  const { userId } = auth();

  if (!textValue || !amountValue || !categoryValue || !currencyValue) {
    return { error: 'Category, text or amount is missing' };
  }

  if (!userId) {
    return { error: 'User not found' };
  }

  const text = textValue.toString();
  const category = categoryValue.toString();
  const currency = currencyValue.toString() as Currency;
  const amount = parseFloat(amountValue.toString());

  try {
    const transacionData = await db.transaction.create({
      data: {
        text,
        amount,
        currency,
        userId,
        category,
        type: transacionType,
      },
    });

    revalidatePath('/');

    return {
      data: transacionData,
    };
  } catch (error: any) {
    return { error: error?.response?.message || 'Unable to save transaction' };
  }
}

export default addTransaction;
