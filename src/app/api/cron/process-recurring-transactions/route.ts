export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateTransactionCategory } from '@/lib/categoryOwnership';
import { isCustomCategory } from '@/lib/customCategories';
import { db } from '@/lib/db';
import { startOfDay, subMonths, endOfMonth, startOfMonth } from 'date-fns';
import * as Sentry from '@sentry/nextjs';
import Decimal from 'decimal.js';

import { getCurrenciesFromMap } from '@/lib/currenciesRate.utils';
import { CURRENCY_ISO_MAP } from '@/constants/constants';
import { Currency, TransactionType, Prisma } from '@prisma/client';
import { getMonobankRates } from '@/lib/monobankRatesCache';
import { sendRecurringTransactionsEmail } from '@/lib/email';
import { getNextPaymentDate, hasRemainingPayments } from '@/lib/recurrence';
import { IncomeCategory } from '@/constants/types';

export async function GET(request: NextRequest) {
  try {
    Sentry.captureMessage(
      'Cron job started: processing recurring transactions',
      'info',
    );

    // Verify secret key for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const oneMonthAgo = subMonths(today, 1);

    // A February payment may be due on March 31. Search the previous month
    // and filter by each series' persisted monthly rule, not its last date.
    const searchStartDate = startOfMonth(oneMonthAgo);
    const searchEndDate = endOfMonth(oneMonthAgo);

    // Fetch Monobank rates ONCE for all transactions (with cache)
    let rates;
    let currenciesMap: Record<string, number> = {};
    try {
      rates = await getMonobankRates();
      currenciesMap = getCurrenciesFromMap(rates);
    } catch (error) {
      console.warn(
        'Failed to fetch Monobank rates, continuing without currency conversion:',
        error,
      );
      Sentry.captureMessage(
        'Monobank API rate limit reached, skipping currency conversion',
        'warning',
      );
    }

    // Find recurring transactions based on the determined date range.
    // Credit income rows are generated from credit expense rows and must never
    // become recurring sources themselves, including legacy unlinked rows.
    const recurringTransactions = await db.transaction.findMany({
      include: { tags: true },
      where: {
        isRecurring: true,
        date: {
          gte: searchStartDate,
          lte: searchEndDate,
        },
        // Check if the recurrence period hasn't ended
        OR: [
          { recurringEndDate: null }, // Infinite
          { recurringEndDate: { gte: startOfDay(new Date()) } }, // Not ended yet
        ],
        NOT: {
          category: IncomeCategory.CreditReceived,
        },
      },
    });

    // Optimization: fetch default currency and user emails for all unique userIds in a single query
    const userIds = Array.from(
      new Set(recurringTransactions.map((t) => t.userId)),
    );
    const settingsList = await db.settings.findMany({
      where: { clerkUserId: { in: userIds } },
      select: {
        clerkUserId: true,
        defaultCurrency: true,
        creditCardTrackingEnabled: true,
      },
    });
    const userSettingsMap = new Map(
      settingsList.map((settings) => [settings.clerkUserId, settings]),
    );

    // Get user emails from our database
    const userEmails = await db.user.findMany({
      where: { clerkUserId: { in: userIds } },
      select: { clerkUserId: true, email: true },
    });

    const createdTransactions = [];

    for (const transaction of recurringTransactions) {
      if (!hasRemainingPayments(transaction)) continue;

      if (isCustomCategory(transaction.category)) {
        try {
          // Archiving hides new choices; it does not cancel an existing schedule.
          await validateTransactionCategory(
            db,
            transaction.userId,
            transaction.category,
            transaction.type,
            {
              existingCategory: transaction.category,
            },
          );
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.startsWith('customCategories.')
          )
            throw error;

          Sentry.captureMessage(
            `Skipping recurring transaction with an unavailable category: id=${transaction.id}`,
            'warning',
          );

          continue;
        }
      }

      const nextMonthDate = getNextPaymentDate(transaction.date, transaction);

      if (
        startOfDay(nextMonthDate).getTime() !== startOfDay(today).getTime() ||
        (transaction.recurringEndDate &&
          startOfDay(nextMonthDate) > startOfDay(transaction.recurringEndDate))
      ) {
        continue;
      }

      const userSettings = userSettingsMap.get(transaction.userId);
      const defaultCurrency = userSettings?.defaultCurrency;
      const creditCardTrackingEnabled = Boolean(
        userSettings?.creditCardTrackingEnabled,
      );

      if (transaction.isCreditTransaction && !creditCardTrackingEnabled) {
        Sentry.captureMessage(
          `Skipping recurring credit transaction because credit card tracking is disabled: id=${transaction.id}, userId=${transaction.userId}`,
          'info',
        );

        continue;
      }

      const createPayment = async (tx: Prisma.TransactionClient) => {
        let current = transaction;

        if (transaction.recurringSeriesId) {
          const latest = await tx.transaction.findFirst({
            include: { tags: true },
            where: {
              userId: transaction.userId,
              recurringSeriesId: transaction.recurringSeriesId,
            },
            orderBy: { recurringPaymentNumber: 'desc' },
          });

          // Only the current tail may generate a successor. Recheck edits in the
          // same transaction; the unique series/number key also protects retries.
          if (
            !latest ||
            latest.id !== transaction.id ||
            !latest.isRecurring ||
            !hasRemainingPayments(latest)
          )
            return null;

          current = latest;
        }

        const paymentDate = getNextPaymentDate(current.date, current);

        if (
          startOfDay(paymentDate).getTime() !== startOfDay(today).getTime() ||
          (current.recurringEndDate &&
            startOfDay(paymentDate) > startOfDay(current.recurringEndDate))
        ) {
          return null;
        }

        let amountDefaultCurrency = current.amountDefaultCurrency;

        // --- If currency differs, recalc by actual rate ---
        if (defaultCurrency && current.currency !== defaultCurrency) {
          const from = CURRENCY_ISO_MAP[current.currency];
          const to = CURRENCY_ISO_MAP[defaultCurrency];
          const rateKey = `${from}-${to}`;
          const rate = currenciesMap[rateKey];

          if (rate) {
            if (
              current.currency === Currency.UAH ||
              defaultCurrency === Currency.UAH
            ) {
              amountDefaultCurrency = new Decimal(current.amount)
                .div(rate)
                .toDecimalPlaces(2)
                .toNumber();
            } else {
              amountDefaultCurrency = new Decimal(current.amount)
                .mul(rate)
                .toDecimalPlaces(2)
                .toNumber();
            }

            Sentry.captureMessage(
              `Recurring transaction currency conversion: userId=${current.userId}, from=${current.currency}, to=${defaultCurrency}, rate=${rate}, originalAmount=${current.amount}, convertedAmount=${amountDefaultCurrency}`,
              'info',
            );
          }
        }

        const newTransaction = await tx.transaction.create({
          data: {
            tags: {
              connect: (current.tags || [])
                .filter((tag) => tag.userId === current.userId)
                .slice(0, 2)
                .map(({ id }) => ({ id })),
            },
            text: current.text,
            amount: current.amount,
            amountDefaultCurrency,
            date: paymentDate,
            category: current.category,
            currency: current.currency,
            type: current.type,
            isCreditTransaction:
              creditCardTrackingEnabled && current.isCreditTransaction,
            isRecurring: true,
            recurringEndDate: current.recurringEndDate,
            isLastDayOfMonth: current.isLastDayOfMonth,
            dayOfMonth: current.dayOfMonth,
            recurringSeriesId: current.recurringSeriesId,
            recurrenceEndMode: current.recurrenceEndMode,
            recurringPaymentCount: current.recurringPaymentCount,
            recurringPaymentNumber: current.recurringSeriesId
              ? (current.recurringPaymentNumber ?? 0) + 1
              : null,
            userId: current.userId,
          },
        });

        // If this is a credit expense transaction, create corresponding income transaction
        const isCreditExpenseTransaction =
          creditCardTrackingEnabled &&
          current.isCreditTransaction &&
          current.type === TransactionType.Expense;

        if (isCreditExpenseTransaction) {
          const creditIncomeText = `Credit income for: ${current.text}`;

          await tx.transaction.create({
            data: {
              text: creditIncomeText,
              amount: current.amount,
              amountDefaultCurrency,
              date: paymentDate,
              category: IncomeCategory.CreditReceived,
              currency: current.currency,
              type: TransactionType.Income,
              isCreditTransaction: true,
              isRecurring: false,
              recurringEndDate: null,
              userId: current.userId,
              CCExpenseTransactionId: newTransaction.id,
            },
          });
        }

        return newTransaction;
      };

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const created = await db.$transaction(createPayment, {
            isolationLevel: 'Serializable',
          });

          if (created) createdTransactions.push(created);

          break;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') break;

            if (error.code === 'P2034' && attempt < 2) continue;
          }

          throw error;
        }
      }
    }

    Sentry.captureMessage(
      `Cron job processed. Created: ${createdTransactions.length}, Processed: ${recurringTransactions.length}`,
      'info',
    );

    if (createdTransactions.length > 0) {
      Sentry.captureMessage(
        `Created transactions: ${createdTransactions
          .map(
            (t) =>
              `id=${t.id}, userId=${t.userId}, date=${t.date.toISOString()}, amount=${t.amount}, text=${t.text}`,
          )
          .join(' | ')}`,
        'info',
      );
    }

    // Send email notification about recurring transactions
    await sendRecurringTransactionsEmail(createdTransactions, userEmails);

    return NextResponse.json({
      success: true,
      processed: recurringTransactions.length,
      created: createdTransactions.length,
      date: oneMonthAgo.toISOString().split('T')[0], // Log which date was processed
      searchRange: {
        from: searchStartDate.toISOString().split('T')[0],
        to: searchEndDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error processing recurring transactions:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
