import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  addMonths,
  startOfDay,
  endOfDay,
  isLastDayOfMonth,
  endOfMonth,
} from 'date-fns';
import * as Sentry from '@sentry/nextjs';

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
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Determine search date range based on whether today is the last day of the month
    let searchStartDate, searchEndDate;

    if (isLastDayOfMonth(today)) {
      // Last day of month: search from current day to end of previous month
      searchStartDate = new Date(
        oneMonthAgo.getFullYear(),
        oneMonthAgo.getMonth(),
        today.getDate(),
      );
      searchEndDate = endOfMonth(oneMonthAgo);
    } else {
      // Regular day: search only for the specific day
      searchStartDate = startOfDay(oneMonthAgo);
      searchEndDate = endOfDay(oneMonthAgo);
    }

    // Find recurring transactions based on the determined date range
    const recurringTransactions = await db.transaction.findMany({
      where: {
        isRecurring: true,
        date: {
          gte: searchStartDate,
          lte: searchEndDate,
        },
        // Check if the recurrence period hasn't ended
        OR: [
          { recurringEndDate: null }, // Infinite
          { recurringEndDate: { gt: new Date() } }, // Not ended yet
        ],
      },
    });

    const createdTransactions = [];

    for (const transaction of recurringTransactions) {
      // Create a new transaction for the next month
      let nextMonthDate = addMonths(transaction.date, 1);

      // Handle different number of days in months
      // If the original date was at the end of the month (28, 29, 30, 31),
      // and the next month has fewer days, we take the last day of the month
      const originalDay = transaction.date.getDate();
      const nextMonthLastDay = new Date(
        nextMonthDate.getFullYear(),
        nextMonthDate.getMonth() + 1,
        0,
      ).getDate();

      if (originalDay > nextMonthLastDay) {
        // If the original day is greater than the number of days in the next month
        nextMonthDate = new Date(
          nextMonthDate.getFullYear(),
          nextMonthDate.getMonth(),
          nextMonthLastDay,
        );
      }

      // Check if we haven't exceeded the end date
      if (
        transaction.recurringEndDate &&
        nextMonthDate > transaction.recurringEndDate
      ) {
        continue;
      }

      const newTransaction = await db.transaction.create({
        data: {
          text: transaction.text,
          amount: transaction.amount,
          amountDefaultCurrency: transaction.amountDefaultCurrency,
          date: nextMonthDate,
          category: transaction.category,
          currency: transaction.currency,
          type: transaction.type,
          isCreditTransaction: transaction.isCreditTransaction,
          isRecurring: true,
          recurringEndDate: transaction.recurringEndDate,
          userId: transaction.userId,
        },
      });

      createdTransactions.push(newTransaction);
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

    return NextResponse.json({
      success: true,
      processed: recurringTransactions.length,
      created: createdTransactions.length,
      date: oneMonthAgo.toISOString().split('T')[0], // Log which date was processed
      isLastDayOfMonth: isLastDayOfMonth(today),
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
