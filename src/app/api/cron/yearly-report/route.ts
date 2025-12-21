export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { processYearlyReportForUsers } from './processYearlyReport';

export async function GET(request: NextRequest) {
  try {
    Sentry.captureMessage('Yearly report cron job started', 'info');

    // Verify secret key for security
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with their settings
    const users = await db.user.findMany({
      select: {
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        settings: {
          select: {
            defaultCurrency: true,
          },
        },
      },
    });

    const { reportsSent, year } = await processYearlyReportForUsers(users);

    Sentry.captureMessage(
      `Yearly report processed. Reports sent: ${reportsSent.length}`,
      'info',
    );

    return NextResponse.json({
      success: true,
      reportsSent: reportsSent.length,
      year,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error processing yearly report:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

