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
  isDefaultAmountRequired: boolean,
  transactionId?: string,
): Promise<TransactionResult> {
  const {
    text,
    date,
    amount,
    category,
    currency,
    amountDefaultCurrency,
    isRecurring,
    recurringEndDate,
  } = formData;

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
    (isDefaultAmountRequired && !amountDefaultCurrency)
  ) {
    return { error: 'Category, text or amount is missing' };
  }

  // Validation for recurring transactions
  if (isRecurring && recurringEndDate && recurringEndDate <= date) {
    return { error: 'End date must be after start date' };
  }

  if (!userId) {
    return { error: 'User not found' };
  }

  let amountDefaultCurrencyValue = amountDefaultCurrency || amount;
  let creditIncomeText = `Credit income for: ${text}`;
  const isCreditExpenseTransaction =
    formData.isCreditTransaction && formData.type === TransactionType.Expense;

  // When editing transaction in the default amount we need to set value manually
  if (!isDefaultAmountRequired && transactionId) {
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
    let transactionData;

    if (transactionId) {
      transactionData = await db.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...formData,
          amountDefaultCurrency: amountDefaultCurrencyValue,
          isRecurring: isRecurring || false,
          recurringEndDate: recurringEndDate || null,
        },
      });

      const expenseTransaction = await db.transaction.findUnique({
        where: {
          CCExpenseTransactionId: transactionId,
        },
      });
      const isExpenseTransactionExist = expenseTransaction !== null;

      const transactionBecomeNonCredit =
        !formData.isCreditTransaction && isExpenseTransactionExist;

      //If CC is used we update a credit income transaction under the hood
      if (isCreditExpenseTransaction && !transactionBecomeNonCredit) {
        // This could happen when a user first create a non-credit transaction, but than change it to a credit one
        if (isExpenseTransactionExist) {
          await db.transaction.update({
            where: {
              CCExpenseTransactionId: transactionId,
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
              CCExpenseTransactionId: transactionId,
              amountDefaultCurrency: amountDefaultCurrencyValue,
            },
          });
        }
      }

      // if a user change transaction for a non-credit we need to delete income counterpart
      if (transactionBecomeNonCredit) {
        await db.transaction.delete({
          where: {
            CCExpenseTransactionId: transactionId,
            userId,
          },
        });
      }
    } else {
      transactionData = await db.transaction.create({
        data: {
          ...formData,
          userId,
          amountDefaultCurrency: amountDefaultCurrencyValue,
          isRecurring: isRecurring || false,
          recurringEndDate: recurringEndDate || null,
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
            CCExpenseTransactionId: transactionData.id,
            amountDefaultCurrency: amountDefaultCurrencyValue,
          },
        });
      }
    }

    revalidatePath('/');

    return {
      data:
        shouldEncrypt && encryptKey
          ? {
              ...transactionData,
              text: decrypt(transactionData.text, encryptKey),
              amount: decryptFloat(transactionData.amount, encryptKey),
              amountDefaultCurrency: decryptFloat(
                transactionData.amountDefaultCurrency,
                encryptKey,
              ),
            }
          : transactionData,
    };
  } catch (error: any) {
    console.log('error', error);

    return { error: error?.response?.message || 'Unable to save transaction' };
  }
}

export default addUpdateTransaction;
