'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

interface TransactionFormValues {
  text: string;
  amount: number;
}

interface TransactionResult {
  data?: TransactionFormValues;
  error?: string;
}

async function addTransaction(formData: FormData): Promise<TransactionResult> {
  const textValue = formData.get('text');
  const amountValue = formData.get('amount');
  const { userId } = auth();

  if (!textValue || !amountValue) {
    return { error: 'Text or amount is missing' };
  }

  if (!userId) {
    return { error: 'User not found' };
  }

  const text = textValue.toString();
  const amount = parseFloat(amountValue.toString());

  try {
    const transacionData = await db.transaction.create({
      data: {
        text,
        amount,
        userId,
        category: 'misc',
      },
    });

    revalidatePath('/');

    return {
      data: transacionData,
    };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.message || 'Unable to save transaction' };
  }
}

export default addTransaction;
