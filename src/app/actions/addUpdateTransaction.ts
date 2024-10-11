'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Transaction, TransactionType } from '@prisma/client';
import { IncomeCategory, TransactionFormData } from '@/constants/types';
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

  let amountDefaultCurrencyValue = amountDefaultCurrency || amount;
  let creditIncomeText = `Credit income for: ${text}`;
  const isCreditExpenseTransaction =
    formData.isCreditTransaction && formData.type === TransactionType.Expense;

  // When editing transaction in the default amount we need to set value manually
  if (!isDefaultAmmountRequired && transacionId) {
    amountDefaultCurrencyValue = amount;
  }

  if (shouldEncrypt && encryptKey) {
    formData.amount = encryptFloat(formData.amount, encryptKey);
    formData.text = encrypt(formData.text, encryptKey);
    creditIncomeText = encrypt(creditIncomeText, encryptKey);
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

      const expenseTransaction = await db.transaction.findUnique({
        where: {
          CCExpenseTransactionId: transacionId,
        },
      });
      const isExpenseTransactionExist = expenseTransaction !== null;

      const transactionBecomeNonCredit =
        !formData.isCreditTransaction && isExpenseTransactionExist;

      //If CC is used we update a credit income transaction under the hood
      if (isCreditExpenseTransaction && !transactionBecomeNonCredit) {
        // This could happened when a user first create a non-credit transaction, but than change it to a credit one
        if (isExpenseTransactionExist) {
          await db.transaction.update({
            where: {
              CCExpenseTransactionId: transacionId,
            },
            data: {
              currency: formData.currency,
              amount: formData.amount,
              date: formData.date,
              text: creditIncomeText,
              amountDefaultCurrency: amountDefaultCurrencyValue,
            },
          });
        } else {
          await db.transaction.create({
            data: {
              ...formData,
              userId,
              category: IncomeCategory.CreditReceived,
              type: TransactionType.Income,
              text: creditIncomeText,
              CCExpenseTransactionId: transacionId,
              amountDefaultCurrency: amountDefaultCurrencyValue,
            },
          });
        }
      }

      // if a user change transaction for a non-credit we need to delete income counterpart
      if (transactionBecomeNonCredit) {
        await db.transaction.delete({
          where: {
            CCExpenseTransactionId: transacionId,
            userId,
          },
        });
      }
    } else {
      transacionData = await db.transaction.create({
        data: {
          ...formData,
          userId,
          amountDefaultCurrency: amountDefaultCurrencyValue,
        },
      });

      //If CC is used we create a credit income transaction under the hood
      if (isCreditExpenseTransaction) {
        await db.transaction.create({
          data: {
            ...formData,
            userId,
            category: IncomeCategory.CreditReceived,
            type: TransactionType.Income,
            text: creditIncomeText,
            CCExpenseTransactionId: transacionData.id,
            amountDefaultCurrency: amountDefaultCurrencyValue,
          },
        });
      }
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
