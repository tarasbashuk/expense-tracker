import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  buildAnalysisInput,
  summarizeMonth,
  getReportPeriods,
  getReportTransactions,
  decodeReportTransactions,
} from '@/lib/monthlyReport/data';
import {
  getMonthlyAnalysis,
  validateAnalysis,
} from '@/lib/monthlyReport/analysis';
import { renderMonthlyAnalysis } from '@/lib/monthlyReport/renderAnalysis';
import { encrypt, encryptFloat } from '@/lib/crypto';
import { GET, maxDuration } from '@/app/api/cron/monthly-report/route';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  createResponse: vi.fn(),
  getClerkUser: vi.fn(),
  findUsers: vi.fn(),
  findTransactions: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    responses = { create: mocks.createResponse };
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({
    users: { getUser: mocks.getClerkUser },
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findMany: mocks.findUsers },
    transaction: { findMany: mocks.findTransactions },
  },
}));

vi.mock('@/app/api/cron/yearly-report/processYearlyReport', () => ({
  processYearlyReportForUsers: async () => ({ reportsSent: [] }),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: mocks.sendMail }),
  },
}));

const reportUser = (encryptData = false) => ({
  clerkUserId: 'user-1',
  email: 'test@example.invalid',
  firstName: 'Test',
  settings: { defaultCurrency: 'EUR', language: 'UKR', encryptData },
});

const verifiedEmail = (emailAddress: string) => ({
  emailAddress,
  verification: { status: 'verified' },
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-01T09:00:00Z'));
  vi.stubEnv('OPENAI_API_KEY', 'fake-test-key');
  vi.stubEnv('MONTHLY_REPORT_AI_ENABLED', 'true');
  vi.stubEnv('CRON_SECRET', 'test-secret');
  vi.stubEnv('APP_EMAIL', 'test@example.invalid');
  vi.stubEnv('APP_EMAIL_PASS', 'fake-test-password');
  mocks.getClerkUser.mockResolvedValue({
    primaryEmailAddressId: 'test-key',
    emailAddresses: [verifiedEmail('test@example.invalid')],
  });
  mocks.createResponse.mockReset();
  mocks.findUsers.mockResolvedValue([reportUser()]);
  mocks.findTransactions.mockResolvedValue([]);
  mocks.sendMail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

const input = () =>
  buildAnalysisInput(
    [transaction(), transaction({ text: 'Food' })],
    [],
    'EUR',
    '2026-08',
  );

const valid = () => ({
  insights: ['Коротке спостереження.'],
  duplicates: [{ refs: [1, 2], reason: 'Однакова дата й сума, схожі описи.' }],
});

test('UTC report boundaries handle January and leap February', () => {
  const january = getReportPeriods(new Date('2026-01-01T09:00:00Z'));
  expect(january.start.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  expect(january.previousStart.toISOString()).toBe('2025-11-01T00:00:00.000Z');
  const march = getReportPeriods(new Date('2024-03-01T09:00:00Z'));
  expect((march.end.getTime() - march.start.getTime()) / 86400000).toBe(29);
});

test('summary excludes credit flows, counts income correctly and avoids float drift', () => {
  const summary = summarizeMonth([
    transaction({ amountDefaultCurrency: 0.1 }),
    transaction({ amountDefaultCurrency: 0.2 }),
    transaction({ category: 'CCRepayment', amountDefaultCurrency: 900 }),
    transaction({
      type: 'Income',
      category: 'creditReceived',
      amountDefaultCurrency: 800,
    }),
    transaction({
      type: 'Income',
      category: 'salary',
      amountDefaultCurrency: 100,
    }),
  ]);
  expect(summary.totalExpenses).toBe(0.3);
  expect(summary.totalIncomes).toBe(100);
  expect(summary.categories[0].count).toBe(2);
  expect(summary.categories[0].sharePercent).toBe(100);
});

test('comparison includes vanished categories, zero baselines and no private IDs', () => {
  const result = buildAnalysisInput(
    [transaction()],
    [transaction({ category: 'dining', amountDefaultCurrency: 20 })],
    'EUR',
    '2026-08',
  );
  expect(result.summary.expenseChangePercent).toBe(-50);
  expect(
    result.summary.categories.find((c) => c.category === 'dining')
      ?.changePercent,
  ).toBe(-100);
  expect(
    result.summary.categories.find((c) => c.category === 'groceries')
      ?.changePercent,
  ).toBe(null);
  expect(input().previousMonthHasRecords).toBe(false);
  expect(JSON.stringify(result).includes('private-')).toBe(false);
});

test('encrypted descriptions and both amounts are decoded before analysis', () => {
  const encrypted = transaction({
    text: encrypt('Food', 'test-key'),
    amount: encryptFloat(10, 'test-key'),
    amountDefaultCurrency: encryptFloat(9, 'test-key'),
  });
  const [decoded] = decodeReportTransactions([encrypted], true, 'test-key');
  expect(decoded.text).toBe('Food');
  expect(decoded.amount).toBe(10);
  expect(decoded.amountDefaultCurrency).toBe(9);
  expect(() => decodeReportTransactions([encrypted], true)).toThrow();
});

test.each([
  ['2026-08-11', true],
  ['2026-08-12', false],
  ['2026-08-26', false],
])('duplicate date limit for August 4 and %s', (date, expected) => {
  const data = input();
  data.transactions[0].date = '2026-08-04';
  data.transactions[1].date = date;

  const result = validateAnalysis(valid(), data);

  expect(result.duplicates).toEqual(expected ? valid().duplicates : []);
  expect(result.insights).toEqual(valid().insights);
});

test('duplicate date limit applies to the whole group and preserves valid groups', () => {
  const data = input();
  data.transactions[0].date = '2026-08-04';
  data.transactions[1].date = '2026-08-11';
  data.transactions.push({
    ...data.transactions[1],
    ref: 3,
    date: '2026-08-18',
  });
  const analysis = {
    ...valid(),
    duplicates: [
      { refs: [3, 2, 1], reason: 'A chain of nearby dates' },
      { refs: [2, 1], reason: 'Within a week' },
    ],
  };

  const result = validateAnalysis(analysis, data);

  expect(result.duplicates).toEqual([analysis.duplicates[1]]);
  expect(result.insights).toEqual(analysis.insights);
});

test('validation rejects hallucinated, repeated and mixed-type references', () => {
  expect(validateAnalysis(valid(), input())).toEqual(valid());
  for (const refs of [[1, 99], [1, 1], [1], ['1', 2]]) {
    expect(() =>
      validateAnalysis(
        { ...valid(), duplicates: [{ refs, reason: 'Test' }] },
        input(),
      ),
    ).toThrow();
  }
  expect(() =>
    validateAnalysis({ insights: 'wrong', duplicates: [] }, input()),
  ).toThrow();
  const mixed = input();
  mixed.transactions[1].type = 'Income';
  expect(() => validateAnalysis(valid(), mixed)).toThrow();
});

test('email escapes AI and transaction content and uses original currency', () => {
  const data = input();
  data.transactions[0].description = '<img src=x onerror=alert(1)>';
  data.transactions[0].currency = 'PLN';
  const html = renderMonthlyAnalysis(
    { ...valid(), insights: ['<script>bad</script>'] },
    data.transactions,
    'UKR',
  );
  expect(html.includes('Можливі дублікати')).toBeTruthy();
  expect(html.includes('&lt;script&gt;')).toBeTruthy();
  expect(!html.includes('<img')).toBeTruthy();
  expect(html.includes('PLN')).toBeTruthy();
  expect(renderMonthlyAnalysis(null, [], 'ENG')).toBe('');
});

test('AI success uses structured response; failures, refusals and missing key fall back', async () => {
  mocks.createResponse.mockResolvedValue({
    status: 'completed',
    output_text: JSON.stringify(valid()),
  });
  expect(await getMonthlyAnalysis(input(), 'UKR')).toEqual(valid());
  const [request] = mocks.createResponse.mock.calls[0];
  expect(request.store).toBe(false);
  expect(request.text.format.strict).toBe(true);
  expect(request.instructions).toMatch(/Ukrainian/);
  for (const response of [
    { status: 'incomplete' },
    { status: 'completed', output_text: '' },
    { status: 'completed', output_text: '{broken' },
  ]) {
    mocks.createResponse.mockResolvedValue(response);
    expect(await getMonthlyAnalysis(input(), 'ENG')).toBeNull();
  }
  mocks.createResponse.mockRejectedValue(new Error('timeout'));
  expect(await getMonthlyAnalysis(input(), 'ENG')).toBeNull();
  vi.stubEnv('OPENAI_API_KEY', undefined);
  expect(await getMonthlyAnalysis(input(), 'ENG')).toBeNull();
});

test('cron sends standard report on AI failure and decrypted AI report on success', async () => {
  const periods = getReportPeriods(new Date());
  const request = () =>
    new NextRequest('http://localhost/api/cron/monthly-report', {
      headers: { authorization: 'Bearer test-secret' },
    });
  mocks.findTransactions.mockResolvedValue([
    transaction({ date: periods.start }),
  ]);
  mocks.createResponse.mockRejectedValue(new Error('timeout'));
  const result = await GET(request());
  expect(result.status).toBe(200);
  expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  expect(mocks.sendMail.mock.calls[0][0].html).not.toContain('Місяць очима AI');
  expect(mocks.findTransactions.mock.calls[0][0].where.date.lt).toEqual(
    periods.end,
  );
  mocks.findUsers.mockResolvedValue([reportUser(true)]);
  mocks.findTransactions.mockResolvedValue([
    transaction({
      date: periods.start,
      text: encrypt('Decoded food', 'test-key'),
      amount: encryptFloat(10, 'test-key'),
      amountDefaultCurrency: encryptFloat(10, 'test-key'),
    }),
  ]);
  mocks.createResponse.mockResolvedValue({
    status: 'completed',
    output_text: JSON.stringify({
      insights: ['Смачний місяць.'],
      duplicates: [],
    }),
  });
  mocks.sendMail.mockClear();
  const encryptedResult = await GET(request());
  expect(encryptedResult.status).toBe(200);
  expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  const html = mocks.sendMail.mock.calls[0][0].html;
  expect(html).toContain('Місяць очима AI');
  expect(html).toContain('Decoded food');
  const payload = JSON.parse(
    mocks.createResponse.mock.lastCall![0].input[0].content,
  );
  expect(payload.transactions[0].amount).toBe(10);
  expect(payload.summary.totalExpenses).toBe(10);
  vi.stubEnv('CRON_SECRET', undefined);
  const denied = await GET(
    new NextRequest('http://localhost/api/cron/monthly-report', {
      headers: { authorization: 'Bearer undefined' },
    }),
  );
  expect(denied.status).toBe(401);
});

test('credit setting hides legacy records when disabled and preserves them when enabled', () => {
  const normal = transaction();
  const credit = transaction({ type: 'Income', category: 'creditReceived' });
  const repayment = transaction({ category: 'CCRepayment' });
  const all = [normal, credit, repayment];
  const disabled = getReportTransactions(all, false);
  expect(disabled).toEqual([normal]);
  expect(getReportTransactions(all, true)).toEqual(all);
  expect(
    buildAnalysisInput(
      disabled,
      getReportTransactions([credit], false),
      'EUR',
      '2026-08',
    ).previousMonthHasRecords,
  ).toBe(false);
  expect(
    buildAnalysisInput(disabled, [], 'EUR', '2026-08').transactions.length,
  ).toBe(1);
  expect(
    buildAnalysisInput(getReportTransactions(all, true), [], 'EUR', '2026-08')
      .transactions.length,
  ).toBe(3);
  expect(summarizeMonth(disabled).totalExpenses).toBe(
    summarizeMonth(all).totalExpenses,
  );
  expect(summarizeMonth(disabled).totalIncomes).toBe(
    summarizeMonth(all).totalIncomes,
  );
});

test('cron fits the Hobby duration limit and skips AI when setup consumes its budget', async () => {
  expect(maxDuration).toBeLessThanOrEqual(60);
  const periods = getReportPeriods(new Date());
  mocks.findUsers.mockImplementationOnce(async () => {
    vi.setSystemTime(Date.now() + 20_000);

    return [reportUser()];
  });
  mocks.findTransactions.mockResolvedValue([
    transaction({ date: periods.start }),
  ]);

  const response = await GET(
    new NextRequest('http://localhost/api/cron/monthly-report', {
      headers: { authorization: 'Bearer test-secret' },
    }),
  );

  expect(response.status).toBe(200);
  expect(mocks.createResponse).not.toHaveBeenCalled();
  expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  expect(mocks.sendMail.mock.calls[0][0].html).not.toContain('Місяць очима AI');
});

const monthlyRequest = () =>
  new NextRequest('http://localhost/api/cron/monthly-report', {
    headers: { authorization: 'Bearer test-secret' },
  });

test('monthly report reaches every unique verified Clerk email with one AI analysis', async () => {
  mocks.findTransactions.mockResolvedValue([transaction()]);
  mocks.getClerkUser.mockResolvedValue({
    primaryEmailAddressId: 'test-key',
    emailAddresses: [
      verifiedEmail('test@example.invalid'),
      verifiedEmail('wife@example.invalid'),
      verifiedEmail('WIFE@example.invalid'),
      {
        emailAddress: 'pending@example.invalid',
        verification: { status: 'unverified' },
      },
    ],
  });
  mocks.createResponse.mockResolvedValue({
    status: 'completed',
    output_text: JSON.stringify({
      insights: ['A shared report.'],
      duplicates: [],
    }),
  });

  const response = await GET(monthlyRequest());
  const result = await response.json();
  const messages = mocks.sendMail.mock.calls.map(([mail]) => mail);

  expect(mocks.getClerkUser).toHaveBeenCalledWith('user-1');
  expect(mocks.createResponse).toHaveBeenCalledTimes(1);
  expect(messages.map((mail) => mail.to)).toEqual([
    'test@example.invalid',
    'wife@example.invalid',
  ]);
  expect(messages[0].html).toBe(messages[1].html);
  expect(result.reportsSent).toBe(2);
});

test('a failed recipient does not prevent delivery to the other account email', async () => {
  const error = new Error('SMTP recipient rejected');
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  mocks.findTransactions.mockResolvedValue([transaction()]);
  mocks.getClerkUser.mockResolvedValue({
    primaryEmailAddressId: 'test-key',
    emailAddresses: [
      verifiedEmail('test@example.invalid'),
      verifiedEmail('wife@example.invalid'),
    ],
  });
  mocks.sendMail.mockRejectedValueOnce(error);

  const response = await GET(monthlyRequest());

  expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  expect((await response.json()).reportsSent).toBe(1);
  expect(consoleError).toHaveBeenCalledExactlyOnceWith(
    'Failed to send monthly report to test@example.invalid:',
    error,
  );
});

test('removed or unverified emails do not fall back to the stale database address', async () => {
  mocks.findTransactions.mockResolvedValue([transaction()]);
  mocks.getClerkUser.mockResolvedValue({
    emailAddresses: [
      { emailAddress: 'test@example.invalid', verification: null },
    ],
  });

  const response = await GET(monthlyRequest());

  expect(mocks.sendMail).not.toHaveBeenCalled();
  expect(mocks.createResponse).not.toHaveBeenCalled();
  expect((await response.json()).reportsSent).toBe(0);
});

test('Clerk lookup failure skips delivery rather than guessing recipients', async () => {
  const error = new Error('Clerk unavailable');
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  mocks.findTransactions.mockResolvedValue([transaction()]);
  mocks.getClerkUser.mockRejectedValue(error);

  const response = await GET(monthlyRequest());

  expect(mocks.sendMail).not.toHaveBeenCalled();
  expect((await response.json()).reportsSent).toBe(0);
  expect(consoleError).toHaveBeenCalledExactlyOnceWith(
    'Failed to process monthly report for test@example.invalid:',
    error,
  );
});
