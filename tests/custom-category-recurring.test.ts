import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/process-recurring-transactions/route';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  categories: vi.fn(),
  sources: vi.fn(),
  create: vi.fn(),
  email: vi.fn(),
  warning: vi.fn(),
  settings: vi.fn(),
  latest: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    customCategory: { findFirst: mocks.categories },
    transaction: { findMany: mocks.sources, create: mocks.create },
    $transaction: async (callback: any) =>
      callback({
        transaction: { findFirst: mocks.latest, create: mocks.create },
      }),
    settings: { findMany: mocks.settings },
    user: {
      findMany: async () => [
        { clerkUserId: 'owner', email: 'test@example.com' },
      ],
    },
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: mocks.warning,
  captureException: vi.fn(),
}));

vi.mock('@/lib/monobankRatesCache', () => ({
  getMonobankRates: async () => [],
}));

vi.mock('@/lib/email', () => ({ sendRecurringTransactionsEmail: mocks.email }));

const source = transaction({
  id: 'source',
  userId: 'owner',
  category: 'custom:one',
  isRecurring: true,
  date: new Date('2026-09-24T00:00:00Z'),
  tags: [
    {
      id: 'tag',
      name: 'Class',
      normalizedName: 'class',
      color: 'blue',
      userId: 'owner',
    },
  ],
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-24T12:00:00Z'));
  vi.stubEnv('CRON_SECRET', 'test-secret');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.sources.mockResolvedValue([source]);
  mocks.settings.mockResolvedValue([
    {
      clerkUserId: 'owner',
      defaultCurrency: 'EUR',
      creditCardTrackingEnabled: false,
    },
  ]);
  mocks.create.mockImplementation(async ({ data }) => ({
    ...source,
    ...data,
    id: 'created',
  }));
  mocks.categories.mockResolvedValue({
    id: 'one',
    userId: 'owner',
    type: 'Expense',
    archived: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request() {
  return new NextRequest(
    'https://example.com/api/cron/process-recurring-transactions',
    { headers: { authorization: 'Bearer test-secret' } },
  );
}

test.each([false, true])(
  'cron preserves active and archived custom category keys (archived=%s)',
  async (archived) => {
    mocks.categories.mockResolvedValue({
      id: 'one',
      userId: 'owner',
      type: 'Expense',
      archived,
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect((await response.json()).created).toBe(1);
    expect(mocks.categories).toHaveBeenCalledWith({
      where: { id: 'one', userId: 'owner', type: 'Expense' },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: 'custom:one',
        userId: 'owner',
        isRecurring: true,
        amount: 10,
        date: new Date('2026-10-24T00:00:00Z'),
        tags: { connect: [{ id: 'tag' }] },
      }),
    });
    expect(mocks.email).toHaveBeenCalledOnce();
  },
);

test('invalid custom categories are skipped without stopping other users’ recurring payments', async () => {
  mocks.categories.mockResolvedValue(null);
  mocks.sources.mockResolvedValue([
    source,
    transaction({
      id: 'system',
      userId: 'owner',
      isRecurring: true,
      date: source.date,
    }),
  ]);

  const response = await GET(request());

  expect((await response.json()).created).toBe(1);
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(mocks.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ category: 'groceries' }),
  });
  expect(mocks.warning).toHaveBeenCalledWith(
    expect.stringContaining('unavailable category'),
    'warning',
  );
});

test('income recurring categories are validated as income and retain their type', async () => {
  mocks.sources.mockResolvedValue([{ ...source, type: 'Income' }]);
  mocks.categories.mockResolvedValue({
    id: 'one',
    userId: 'owner',
    type: 'Income',
    archived: false,
  });

  const response = await GET(request());

  expect((await response.json()).created).toBe(1);
  expect(mocks.categories).toHaveBeenCalledWith({
    where: { id: 'one', userId: 'owner', type: 'Income' },
  });
  expect(mocks.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ category: 'custom:one', type: 'Income' }),
  });
});

test('a custom credit expense still creates its linked system credit income', async () => {
  mocks.sources.mockResolvedValue([{ ...source, isCreditTransaction: true }]);
  mocks.settings.mockResolvedValue([
    {
      clerkUserId: 'owner',
      defaultCurrency: 'EUR',
      creditCardTrackingEnabled: true,
    },
  ]);

  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.create).toHaveBeenNthCalledWith(1, {
    data: expect.objectContaining({ category: 'custom:one', type: 'Expense' }),
  });
  expect(mocks.create).toHaveBeenNthCalledWith(2, {
    data: expect.objectContaining({
      category: 'creditReceived',
      type: 'Income',
      CCExpenseTransactionId: 'created',
    }),
  });
});

test('database failures remain errors instead of silently dropping payments', async () => {
  mocks.categories.mockRejectedValue(new Error('Database unavailable'));

  const response = await GET(request());

  expect(response.status).toBe(500);
  expect(mocks.create).not.toHaveBeenCalled();
});

test('unauthorized requests never read or create transactions', async () => {
  const response = await GET(
    new NextRequest(
      'https://example.com/api/cron/process-recurring-transactions',
    ),
  );

  expect(response.status).toBe(401);
  expect(mocks.sources).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

test('cron includes the final payment on its end date', async () => {
  mocks.sources.mockResolvedValue([
    { ...source, recurringEndDate: new Date('2026-10-24T00:00:00Z') },
  ]);

  const response = await GET(request());

  expect((await response.json()).created).toBe(1);
  expect(mocks.sources.mock.calls[0][0].where.OR).toContainEqual({
    recurringEndDate: { gte: new Date(2026, 9, 24) },
  });
});

test('cron does not create a payment after the end date', async () => {
  mocks.sources.mockResolvedValue([
    { ...source, recurringEndDate: new Date('2026-10-23T00:00:00Z') },
  ]);

  const response = await GET(request());

  expect((await response.json()).created).toBe(0);
  expect(mocks.create).not.toHaveBeenCalled();
});

const seriesSource = {
  ...source,
  recurringSeriesId: 'series',
  recurrenceEndMode: 'count' as const,
  recurringPaymentCount: 10,
  recurringPaymentNumber: 3,
};

test('cron advances the payment number within its original series', async () => {
  mocks.sources.mockResolvedValue([seriesSource]);
  mocks.latest.mockResolvedValue(seriesSource);

  const response = await GET(request());

  expect((await response.json()).created).toBe(1);
  expect(mocks.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      recurringSeriesId: 'series',
      recurringPaymentNumber: 4,
      recurringPaymentCount: 10,
      recurrenceEndMode: 'count',
    }),
  });
});

test('cron does not generate an eleventh payment', async () => {
  mocks.sources.mockResolvedValue([
    { ...seriesSource, recurringPaymentNumber: 10 },
  ]);

  const response = await GET(request());

  expect((await response.json()).created).toBe(0);
  expect(mocks.create).not.toHaveBeenCalled();
});

test('cron retry skips a source that already has a successor', async () => {
  mocks.sources.mockResolvedValue([seriesSource]);
  mocks.latest.mockResolvedValue({
    ...seriesSource,
    id: 'successor',
    recurringPaymentNumber: 4,
  });

  const response = await GET(request());

  expect((await response.json()).created).toBe(0);
  expect(mocks.create).not.toHaveBeenCalled();
});

test('cron rechecks stopped series inside the creation transaction', async () => {
  mocks.sources.mockResolvedValue([seriesSource]);
  mocks.latest.mockResolvedValue({ ...seriesSource, isRecurring: false });

  const response = await GET(request());

  expect((await response.json()).created).toBe(0);
  expect(mocks.create).not.toHaveBeenCalled();
});

test('month end includes January 29–31 and creates February 28 payments', async () => {
  vi.setSystemTime(new Date(2026, 1, 28, 12));
  mocks.sources.mockResolvedValue([{ ...source, date: new Date(2026, 0, 31) }]);

  const response = await GET(request());

  expect((await response.json()).created).toBe(1);
  expect(mocks.sources.mock.calls[0][0].where.date).toEqual({
    gte: new Date(2026, 0, 1),
    lte: new Date(2026, 0, 31, 23, 59, 59, 999),
  });
  expect(mocks.create.mock.calls[0][0].data.date).toEqual(
    new Date(2026, 1, 28),
  );
});

test('cron uses edits committed before its creation transaction', async () => {
  mocks.sources.mockResolvedValue([seriesSource]);
  mocks.latest.mockResolvedValue({
    ...seriesSource,
    amount: 99,
    text: 'Updated payment',
    updatedAt: new Date(),
  });

  const response = await GET(request());

  expect((await response.json()).created).toBe(1);
  expect(mocks.create.mock.calls[0][0].data).toMatchObject({
    amount: 99,
    text: 'Updated payment',
    recurringPaymentNumber: 4,
  });
});

test.each([
  [false, 31, new Date(2026, 2, 31, 12), new Date(2026, 1, 28)],
  [true, 30, new Date(2026, 4, 31, 12), new Date(2026, 3, 30)],
  [true, 31, new Date(2024, 1, 29, 12), new Date(2024, 0, 31)],
])(
  'cron generates payments using persisted rules (month-end=%s, anchor=%s)',
  async (isLastDayOfMonth, dayOfMonth, today, date) => {
    vi.setSystemTime(today);
    const current = { ...seriesSource, date, isLastDayOfMonth, dayOfMonth };
    mocks.sources.mockResolvedValue([current]);
    mocks.latest.mockResolvedValue(current);

    const response = await GET(request());

    expect((await response.json()).created).toBe(1);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      isLastDayOfMonth,
      dayOfMonth,
      recurringPaymentNumber: 4,
    });
  },
);

test('cron does not generate a month-end payment on March 28', async () => {
  vi.setSystemTime(new Date(2026, 2, 28, 12));
  const current = {
    ...seriesSource,
    date: new Date(2026, 1, 28),
    isLastDayOfMonth: true,
    dayOfMonth: 28,
  };
  mocks.sources.mockResolvedValue([current]);
  mocks.latest.mockResolvedValue(current);

  const response = await GET(request());

  expect((await response.json()).created).toBe(0);
  expect(mocks.create).not.toHaveBeenCalled();
});

test('cron respects an end date before the scheduled month-end day', async () => {
  vi.setSystemTime(new Date(2026, 2, 31, 12));
  mocks.sources.mockResolvedValue([
    {
      ...seriesSource,
      date: new Date(2026, 1, 28),
      isLastDayOfMonth: true,
      dayOfMonth: 31,
      recurringEndDate: new Date(2026, 2, 30),
    },
  ]);

  const response = await GET(request());

  expect((await response.json()).created).toBe(0);
  expect(mocks.create).not.toHaveBeenCalled();
});
