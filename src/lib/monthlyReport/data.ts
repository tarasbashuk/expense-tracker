import Decimal from 'decimal.js';
import type { MonthlyForecast } from './forecast';
import { Transaction, TransactionType } from '@prisma/client';
import { decrypt, decryptFloat } from '../crypto';
import { isCreditCardCategory } from '../../constants/constants';
import { ExpenseCategory, IncomeCategory } from '../../constants/types';

export const getReportTransactions = (
  transactions: Transaction[],
  creditCardTrackingEnabled: boolean,
) =>
  creditCardTrackingEnabled
    ? transactions
    : transactions.filter(
        (transaction) => !isCreditCardCategory(transaction.category),
      );

export const getReportPeriods = (now: Date) => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  return {
    previousStart: new Date(Date.UTC(year, month - 2, 1)),
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
};

export const decodeReportTransactions = (
  transactions: Transaction[],
  encryptData: boolean,
  key?: string | null,
): Transaction[] => {
  if (!encryptData) return transactions;
  if (!key) throw new Error('Missing monthly report decryption key');

  return transactions.map((transaction) => {
    const text = decrypt(transaction.text, key);
    if (transaction.text && !text) {
      throw new Error('Unable to decrypt monthly report transaction');
    }

    return {
      ...transaction,
      text,
      amount: decryptFloat(transaction.amount, key),
      amountDefaultCurrency: decryptFloat(
        transaction.amountDefaultCurrency,
        key,
      ),
    };
  });
};

const isExpense = (t: Transaction) =>
  t.type === TransactionType.Expense &&
  t.category !== ExpenseCategory.CCRepayment;
const isIncome = (t: Transaction) =>
  t.type === TransactionType.Income &&
  t.category !== IncomeCategory.CreditReceived;
const sum = (transactions: Transaction[]) =>
  transactions.reduce(
    (total, t) => total.plus(t.amountDefaultCurrency),
    new Decimal(0),
  );
const money = (value: Decimal) => value.toDecimalPlaces(2).toNumber();
const percentChange = (current: Decimal, previous: Decimal) =>
  previous.isZero()
    ? null
    : current
        .minus(previous)
        .div(previous)
        .mul(100)
        .toDecimalPlaces(1)
        .toNumber();

export const summarizeMonth = (transactions: Transaction[]) => {
  const expenses = transactions.filter(isExpense);
  const incomes = transactions.filter(isIncome);
  const expenseTotal = sum(expenses);
  const categories = new Map<string, { total: Decimal; count: number }>();
  for (const t of expenses) {
    const entry = categories.get(t.category) || {
      total: new Decimal(0),
      count: 0,
    };
    entry.total = entry.total.plus(t.amountDefaultCurrency);
    entry.count += 1;
    categories.set(t.category, entry);
  }

  return {
    totalTransactions: transactions.length,
    totalExpenses: money(expenseTotal),
    totalIncomes: money(sum(incomes)),
    totalDonations: money(
      sum(expenses.filter((t) => t.category === 'donations')),
    ),
    topExpenses: [...expenses]
      .sort((a, b) => b.amountDefaultCurrency - a.amountDefaultCurrency)
      .slice(0, 5),
    categories: Array.from(categories, ([category, entry]) => ({
      category,
      total: money(entry.total),
      count: entry.count,
      sharePercent: expenseTotal.isZero()
        ? 0
        : entry.total.div(expenseTotal).mul(100).toDecimalPlaces(1).toNumber(),
    })).sort((a, b) => b.total - a.total),
  };
};

export const buildAnalysisInput = (
  transactions: Transaction[],
  previousTransactions: Transaction[],
  currency: string,
  month: string,
  forecast: MonthlyForecast | null = null,
) => {
  const current = summarizeMonth(transactions);
  const previous = summarizeMonth(previousTransactions);
  const previousByCategory = new Map(
    previous.categories.map((c) => [c.category, c]),
  );
  const currentByCategory = new Map(
    current.categories.map((c) => [c.category, c]),
  );
  const categoryNames = new Set([
    ...currentByCategory.keys(),
    ...previousByCategory.keys(),
  ]);

  return {
    month,
    currency,
    forecast,
    previousMonthHasRecords: previousTransactions.length > 0,
    summary: {
      totalExpenses: current.totalExpenses,
      totalIncomes: current.totalIncomes,
      previousTotalExpenses: previous.totalExpenses,
      expenseChangePercent: percentChange(
        new Decimal(current.totalExpenses),
        new Decimal(previous.totalExpenses),
      ),
      categories: Array.from(categoryNames, (category) => {
        const currentCategory = currentByCategory.get(category);
        const previousCategory = previousByCategory.get(category);
        const total = currentCategory?.total || 0;
        const previousTotal = previousCategory?.total || 0;

        return {
          category,
          total,
          count: currentCategory?.count || 0,
          sharePercent: currentCategory?.sharePercent || 0,
          previousTotal,
          previousCount: previousCategory?.count || 0,
          changePercent: percentChange(
            new Decimal(total),
            new Decimal(previousTotal),
          ),
        };
      }),
    },
    // Only report-local references and fields needed for analysis leave the app.
    transactions: transactions.map((t, index) => ({
      ref: index + 1,
      description: t.text,
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      category: t.category,
      amount: t.amount,
      currency: t.currency,
      amountDefaultCurrency: t.amountDefaultCurrency,
      isRecurring: Boolean(t.isRecurring),
    })),
  };
};

export type AnalysisInput = ReturnType<typeof buildAnalysisInput>;
