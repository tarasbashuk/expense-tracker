'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Transaction } from '@prisma/client';
import { TransactionFormData } from '@/constants/types';
import { DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decrypt, decryptFloat, encrypt, encryptFloat } from '@/lib/crypto';

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

  // const { userId } = auth();
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const encryptKey = user?.primaryEmailAddressId;
  const shouldEncrypt = !DO_NOT_ENCRYPT_LIST.includes(userEmail!);

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

  let amountDefaultCurrencyValue = amountDefaultCurrency
    ? amountDefaultCurrency
    : amount;

  if (shouldEncrypt && encryptKey) {
    formData.amount = encryptFloat(formData.amount, encryptKey);
    formData.text = encrypt(formData.text, encryptKey);
    amountDefaultCurrencyValue = encryptFloat(
      amountDefaultCurrencyValue,
      encryptKey,
    );
  }

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
    revalidatePath('/transactions');

    return {
      data:
        shouldEncrypt && encryptKey
          ? {
              ...transacionData,
              text: decrypt(transacionData.text, encryptKey),
              amount: decryptFloat(transacionData.amount, encryptKey),
              amountDefaultCurrency: decryptFloat(
                transacionData.amountDefaultCurrency,
                encryptKey,
              ),
            }
          : transacionData,
    };
  } catch (error: any) {
    console.log('error', error);

    return { error: error?.response?.message || 'Unable to save transaction' };
  }
}

export default addUpdateTransaction;
