'use server';
import { validateTransactionCategory } from '@/lib/categoryOwnership';
import { ownedTagConnections } from '@/lib/tagOwnership';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { TransactionType } from '@prisma/client';
import { Transaction } from '@/lib/tags';
import { IncomeCategory, TransactionFormData } from '@/constants/types';
import { decrypt, decryptFloat, encrypt, encryptFloat } from '@/lib/crypto';
import { isCreditCardCategory } from '@/constants/constants';

interface TransactionResult {
  data?: Transaction;
  error?: string;
}

export async function addUpdateTransaction(
  formData: TransactionFormData,
  isDefaultAmountRequired: boolean,
  transactionId?: string,
): Promise<TransactionResult> {
  const tagIds = formData.tagIds;
  // Accept only editable scalar fields; never trust client-supplied relations or ownership.
  formData = {
    text: formData.text,
    date: formData.date,
    amount: formData.amount,
    category: formData.category,
    currency: formData.currency,
    type: formData.type,
    amountDefaultCurrency: formData.amountDefaultCurrency,
    isCreditTransaction: formData.isCreditTransaction,
    isRecurring: formData.isRecurring,
    recurringEndDate: formData.recurringEndDate,
  };

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
  const encryptKey = user?.primaryEmailAddressId;

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

  // Credit-card tracking can be disabled without rewriting legacy records.
  const settings = await db.settings.findUnique({
    where: { clerkUserId: userId },
    select: { encryptData: true, creditCardTrackingEnabled: true },
  });

  if (!settings) {
    return { error: 'User settings not found' };
  }

  const existingTransaction = transactionId
    ? await db.transaction.findFirst({
        where: { id: transactionId, userId },
        select: { isCreditTransaction: true, category: true },
      })
    : null;

  if (transactionId && !existingTransaction) {
    return { error: 'Transaction not found' };
  }

  formData.isCreditTransaction = settings.creditCardTrackingEnabled
    ? formData.isCreditTransaction
    : Boolean(existingTransaction?.isCreditTransaction);

  if (
    !settings.creditCardTrackingEnabled &&
    isCreditCardCategory(formData.category) &&
    existingTransaction?.category !== formData.category
  ) {
    return { error: 'Credit card accounting is disabled' };
  }

  const shouldEncrypt = Boolean(settings.encryptData && encryptKey);

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
    const transactionData = await db.$transaction(async (tx) => {
      await validateTransactionCategory(tx, userId, category, formData.type, {
        existingCategory: existingTransaction?.category,
      });

      const tags = await ownedTagConnections(tx, userId, tagIds);
      let transactionData;

      if (transactionId) {
        transactionData = await tx.transaction.update({
          include: { tags: true },
          where: {
            id: transactionId,
            userId,
          },
          data: {
            ...formData,
            amountDefaultCurrency: amountDefaultCurrencyValue,
            tags: { set: tags },
            isRecurring: isRecurring || false,
            recurringEndDate: recurringEndDate || null,
          },
        });

        const expenseTransaction = await tx.transaction.findUnique({
          where: {
            CCExpenseTransactionId: transactionId,
            userId,
          },
        });
        const isExpenseTransactionExist = expenseTransaction !== null;

        const transactionBecomeNonCredit =
          !formData.isCreditTransaction && isExpenseTransactionExist;

        //If CC is used we update a credit income transaction under the hood
        if (isCreditExpenseTransaction && !transactionBecomeNonCredit) {
          // This could happen when a user first create a non-credit transaction, but than change it to a credit one
          if (isExpenseTransactionExist) {
            await tx.transaction.update({
              where: {
                CCExpenseTransactionId: transactionId,
                userId,
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
            await tx.transaction.create({
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
          await tx.transaction.delete({
            where: {
              CCExpenseTransactionId: transactionId,
              userId,
            },
          });
        }
      } else {
        transactionData = await tx.transaction.create({
          include: { tags: true },
          data: {
            ...formData,
            userId,
            amountDefaultCurrency: amountDefaultCurrencyValue,
            tags: { connect: tags },
            isRecurring: isRecurring || false,
            recurringEndDate: recurringEndDate || null,
          },
        });

        //If CC is used we create a credit income transaction under the hood
        if (isCreditExpenseTransaction) {
          await tx.transaction.create({
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

      return transactionData;
    });

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

    return {
      error:
        error instanceof Error &&
        (error.message.startsWith('tags.') ||
          error.message.startsWith('customCategories.'))
          ? error.message
          : 'Unable to save transaction',
    };
  }
}
