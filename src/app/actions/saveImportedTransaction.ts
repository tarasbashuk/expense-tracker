'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { Currency, Transaction, TransactionType } from '@prisma/client';

import { db } from '@/lib/db';
import { IncomeCategory } from '@/constants/types';
import { getMonobankRates } from '@/lib/monobankRatesCache';
import { getCurrenciesFromMap } from '@/lib/currenciesRate.utils';
import { convertAmountToDefaultCurrency } from '@/lib/currency/convertAmountToDefaultCurrency';
import {
  findDuplicateMatch,
  getExistingTransactionsForImport,
} from '@/lib/importDuplicateMatching/importDuplicateMatching';
import { upsertMerchantCategoryRule } from '@/lib/merchantRules/merchantRules';
import { encrypt, encryptFloat } from '@/lib/crypto';

type SaveImportedTransactionInput = {
  date: string | null;
  text: string;
  amount: number | null;
  amountDefaultCurrency?: number | null;
  currency: Currency | null;
  type: TransactionType | null;
  category: string;
  isCreditTransaction?: boolean;
};

type SaveImportedTransactionResult = {
  data?: Transaction;
  error?: string;
};

const isCurrency = (value: unknown): value is Currency =>
  Object.values(Currency).includes(value as Currency);

const isTransactionType = (value: unknown): value is TransactionType =>
  Object.values(TransactionType).includes(value as TransactionType);

export default async function saveImportedTransaction(
  input: SaveImportedTransactionInput,
): Promise<SaveImportedTransactionResult> {
  const user = await currentUser();
  const userId = user?.id;
  const encryptKey = user?.primaryEmailAddressId;

  if (!userId) {
    return { error: 'User not found' };
  }

  const {
    date,
    text,
    amount,
    amountDefaultCurrency,
    currency,
    type,
    category,
    isCreditTransaction,
  } = input;

  if (
    !date ||
    !text?.trim() ||
    !amount ||
    amount <= 0 ||
    !isCurrency(currency) ||
    !isTransactionType(type) ||
    !category
  ) {
    return { error: 'Imported transaction is missing required fields' };
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return { error: 'Imported transaction has invalid date' };
  }

  const duplicateMatch = findDuplicateMatch(
    {
      status: 'new',
      date,
      text,
      amount,
      currency,
      type,
      category,
      warnings: [],
    },
    await getExistingTransactionsForImport(userId, [
      {
        status: 'new',
        date,
        text,
        amount,
        currency,
        type,
        category,
        warnings: [],
      },
    ]),
  );

  if (duplicateMatch?.level === 'alreadyExists') {
    return { error: duplicateMatch.reason };
  }

  const settings = await db.settings.findUnique({
    where: { clerkUserId: userId },
    select: { defaultCurrency: true, encryptData: true },
  });

  if (!settings) {
    return { error: 'User settings not found' };
  }

  if (settings.encryptData) {
    return {
      error: 'AI import is unavailable while data encryption is enabled',
    };
  }

  const hasProvidedDefaultAmount =
    typeof amountDefaultCurrency === 'number' && amountDefaultCurrency > 0;
  let amountDefaultCurrencyValue = hasProvidedDefaultAmount
    ? amountDefaultCurrency
    : amount;

  if (currency !== settings.defaultCurrency && !hasProvidedDefaultAmount) {
    try {
      const rates = await getMonobankRates();
      const currenciesMap = getCurrenciesFromMap(rates);
      const convertedAmount = convertAmountToDefaultCurrency({
        amount,
        fromCurrency: currency,
        defaultCurrency: settings.defaultCurrency,
        currenciesMap,
      });

      if (!convertedAmount) {
        return { error: 'Unable to convert amount to base currency' };
      }

      amountDefaultCurrencyValue = convertedAmount;
    } catch (error) {
      console.error('Currency conversion failed for imported transaction:', error);

      return { error: 'Unable to fetch currency rates' };
    }
  }

  const shouldEncrypt = Boolean(settings.encryptData && encryptKey);
  const storedText = shouldEncrypt && encryptKey ? encrypt(text, encryptKey) : text;
  const creditIncomeText = `Credit income for: ${text}`;
  const storedCreditIncomeText =
    shouldEncrypt && encryptKey ? encrypt(creditIncomeText, encryptKey) : creditIncomeText;
  const storedAmount =
    shouldEncrypt && encryptKey ? encryptFloat(amount, encryptKey) : amount;
  const storedAmountDefaultCurrency =
    shouldEncrypt && encryptKey
      ? encryptFloat(amountDefaultCurrencyValue, encryptKey)
      : amountDefaultCurrencyValue;

  try {
    const transaction = await db.transaction.create({
      data: {
        userId,
        text: storedText,
        amount: storedAmount,
        amountDefaultCurrency: storedAmountDefaultCurrency,
        date: parsedDate,
        category,
        currency,
        type,
        isCreditTransaction: Boolean(
          isCreditTransaction && type === TransactionType.Expense,
        ),
        isRecurring: false,
        recurringEndDate: null,
      },
    });

    if (isCreditTransaction && type === TransactionType.Expense) {
      await db.transaction.create({
        data: {
          userId,
          text: storedCreditIncomeText,
          amount: storedAmount,
          amountDefaultCurrency: storedAmountDefaultCurrency,
          date: parsedDate,
          category: IncomeCategory.CreditReceived,
          currency,
          type: TransactionType.Income,
          isCreditTransaction: true,
          isRecurring: false,
          recurringEndDate: null,
          CCExpenseTransactionId: transaction.id,
        },
      });
    }

    await upsertMerchantCategoryRule({
      userId,
      merchant: text,
      category,
    });

    revalidatePath('/');
    revalidatePath('/transactions');

    return { data: transaction };
  } catch (error) {
    console.error('Error saving imported transaction:', error);

    return { error: 'Unable to save imported transaction' };
  }
}
