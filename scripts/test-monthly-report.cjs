// Run with: node --test scripts/test-monthly-report.cjs
// Load application TS without adding a test framework or touching real services.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const originalLoad = Module._load;
let responseFactory;
let lastRequest;
let sentMessages = [];
let stored = [];
let userSettings = {
  defaultCurrency: 'EUR',
  language: 'UKR',
  encryptData: false,
};
let query;
const mocks = {
  openai: class {
    constructor(options) {
      assert.equal(options.maxRetries, 0);
      assert.equal(options.timeout, 35000);
      this.responses = {
        create: async (request) => {
          lastRequest = request;
          return responseFactory();
        },
      };
    }
  },
  '@sentry/nextjs': { captureMessage() {}, captureException() {} },
  '@clerk/nextjs/server': {
    clerkClient: async () => ({
      users: { getUser: async () => ({ primaryEmailAddressId: 'test-key' }) },
    }),
  },
  '@/lib/db': {
    db: {
      user: {
        findMany: async () => [
          {
            clerkUserId: 'user-1',
            email: 'test@example.invalid',
            firstName: 'Test',
            settings: userSettings,
          },
        ],
      },
      transaction: {
        findMany: async (args) => {
          query = args;
          return stored;
        },
      },
    },
  },
  '../yearly-report/processYearlyReport': {
    processYearlyReportForUsers: async () => ({ reportsSent: [] }),
  },
  nodemailer: {
    createTransport: () => ({
      sendMail: async (mail) => {
        sentMessages.push(mail);
      },
    }),
  },
};
Module._load = function (request, parent, isMain) {
  if (Object.hasOwn(mocks, request)) return mocks[request];
  if (request.startsWith('@/'))
    request = path.resolve(__dirname, '../src', request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
};
const {
  buildAnalysisInput,
  summarizeMonth,
  getReportPeriods,
  getReportTransactions,
  decodeReportTransactions,
} = require('../src/lib/monthlyReport/data.ts');
const {
  getMonthlyAnalysis,
  validateAnalysis,
} = require('../src/lib/monthlyReport/analysis.ts');
const {
  renderMonthlyAnalysis,
} = require('../src/lib/monthlyReport/renderAnalysis.ts');
const { encrypt, encryptFloat } = require('../src/lib/crypto.ts');
const transaction = (overrides = {}) => ({
  id: 'private-id',
  userId: 'private-user',
  text: 'Groceries',
  amount: 10,
  amountDefaultCurrency: 10,
  currency: 'EUR',
  type: 'Expense',
  category: 'groceries',
  date: new Date('2026-08-12T00:00:00Z'),
  ...overrides,
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
  assert.equal(january.start.toISOString(), '2025-12-01T00:00:00.000Z');
  assert.equal(january.previousStart.toISOString(), '2025-11-01T00:00:00.000Z');
  const march = getReportPeriods(new Date('2024-03-01T09:00:00Z'));
  assert.equal((march.end - march.start) / 86400000, 29);
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
  assert.equal(summary.totalExpenses, 0.3);
  assert.equal(summary.totalIncomes, 100);
  assert.equal(summary.categories[0].count, 2);
  assert.equal(summary.categories[0].sharePercent, 100);
});

test('comparison includes vanished categories, zero baselines and no private IDs', () => {
  const result = buildAnalysisInput(
    [transaction()],
    [transaction({ category: 'dining', amountDefaultCurrency: 20 })],
    'EUR',
    '2026-08',
  );
  assert.equal(result.summary.expenseChangePercent, -50);
  assert.equal(
    result.summary.categories.find((c) => c.category === 'dining')
      .changePercent,
    -100,
  );
  assert.equal(
    result.summary.categories.find((c) => c.category === 'groceries')
      .changePercent,
    null,
  );
  assert.equal(input().previousMonthHasRecords, false);
  assert.equal(JSON.stringify(result).includes('private-'), false);
});

test('encrypted descriptions and both amounts are decoded before analysis', () => {
  const encrypted = transaction({
    text: encrypt('Food', 'test-key'),
    amount: encryptFloat(10, 'test-key'),
    amountDefaultCurrency: encryptFloat(9, 'test-key'),
  });
  const [decoded] = decodeReportTransactions([encrypted], true, 'test-key');
  assert.equal(decoded.text, 'Food');
  assert.equal(decoded.amount, 10);
  assert.equal(decoded.amountDefaultCurrency, 9);
  assert.throws(() => decodeReportTransactions([encrypted], true));
});

test('validation rejects hallucinated, repeated and mixed-type references', () => {
  assert.deepEqual(validateAnalysis(valid(), input()), valid());
  for (const refs of [[1, 99], [1, 1], [1], ['1', 2]]) {
    assert.throws(() =>
      validateAnalysis(
        { ...valid(), duplicates: [{ refs, reason: 'Test' }] },
        input(),
      ),
    );
  }
  assert.throws(() =>
    validateAnalysis({ insights: 'wrong', duplicates: [] }, input()),
  );
  const mixed = input();
  mixed.transactions[1].type = 'Income';
  assert.throws(() => validateAnalysis(valid(), mixed));
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
  assert.ok(html.includes('Можливі дублікати'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('PLN'));
  assert.equal(renderMonthlyAnalysis(null, [], 'ENG'), '');
});

test('AI success uses structured response; failures, refusals and missing key fall back', async () => {
  process.env.OPENAI_API_KEY = 'fake-test-key';
  responseFactory = () => ({
    status: 'completed',
    output_text: JSON.stringify(valid()),
  });
  assert.deepEqual(await getMonthlyAnalysis(input(), 'UKR'), valid());
  assert.equal(lastRequest.store, false);
  assert.equal(lastRequest.text.format.strict, true);
  assert.match(lastRequest.instructions, /Ukrainian/);
  for (const response of [
    { status: 'incomplete' },
    { status: 'completed', output_text: '' },
    { status: 'completed', output_text: '{broken' },
  ]) {
    responseFactory = () => response;
    assert.equal(await getMonthlyAnalysis(input(), 'ENG'), null);
  }
  responseFactory = () => {
    throw new Error('timeout');
  };
  assert.equal(await getMonthlyAnalysis(input(), 'ENG'), null);
  delete process.env.OPENAI_API_KEY;
  assert.equal(await getMonthlyAnalysis(input(), 'ENG'), null);
});

test('cron sends standard report on AI failure and decrypted AI report on success', async () => {
  process.env.OPENAI_API_KEY = 'fake-test-key';
  process.env.CRON_SECRET = 'test-secret';
  process.env.APP_EMAIL = 'test@example.invalid';
  process.env.APP_EMAIL_PASS = 'fake-test-password';
  const { GET } = require('../src/app/api/cron/monthly-report/route.ts');
  const periods = getReportPeriods(new Date());
  const request = () =>
    new Request('http://localhost/api/cron/monthly-report', {
      headers: { authorization: 'Bearer test-secret' },
    });
  stored = [transaction({ date: periods.start })];
  responseFactory = () => {
    throw new Error('timeout');
  };
  sentMessages = [];
  let result = await GET(request());
  assert.equal(result.status, 200);
  assert.equal(sentMessages.length, 1);
  assert.ok(!sentMessages[0].html.includes('Місяць очима AI'));
  assert.equal(query.where.date.lt.toISOString(), periods.end.toISOString());
  userSettings = { ...userSettings, encryptData: true };
  stored = [
    transaction({
      date: periods.start,
      text: encrypt('Decoded food', 'test-key'),
      amount: encryptFloat(10, 'test-key'),
      amountDefaultCurrency: encryptFloat(10, 'test-key'),
    }),
  ];
  responseFactory = () => ({
    status: 'completed',
    output_text: JSON.stringify({
      insights: ['Смачний місяць.'],
      duplicates: [],
    }),
  });
  sentMessages = [];
  result = await GET(request());
  assert.equal(result.status, 200);
  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].html.includes('Місяць очима AI'));
  assert.ok(sentMessages[0].html.includes('Decoded food'));
  const payload = JSON.parse(lastRequest.input[0].content);
  assert.equal(payload.transactions[0].amount, 10);
  assert.equal(payload.summary.totalExpenses, 10);
  delete process.env.CRON_SECRET;
  const denied = await GET(
    new Request('http://localhost/api/cron/monthly-report', {
      headers: { authorization: 'Bearer undefined' },
    }),
  );
  assert.equal(denied.status, 401);
});

test('credit setting hides legacy records when disabled and preserves them when enabled', () => {
  const normal = transaction();
  const credit = transaction({ type: 'Income', category: 'creditReceived' });
  const repayment = transaction({ category: 'CCRepayment' });
  const all = [normal, credit, repayment];
  const disabled = getReportTransactions(all, false);
  assert.deepEqual(disabled, [normal]);
  assert.deepEqual(getReportTransactions(all, true), all);
  assert.equal(
    buildAnalysisInput(
      disabled,
      getReportTransactions([credit], false),
      'EUR',
      '2026-08',
    ).previousMonthHasRecords,
    false,
  );
  assert.equal(
    buildAnalysisInput(disabled, [], 'EUR', '2026-08').transactions.length,
    1,
  );
  assert.equal(
    buildAnalysisInput(getReportTransactions(all, true), [], 'EUR', '2026-08')
      .transactions.length,
    3,
  );
  assert.equal(
    summarizeMonth(disabled).totalExpenses,
    summarizeMonth(all).totalExpenses,
  );
  assert.equal(
    summarizeMonth(disabled).totalIncomes,
    summarizeMonth(all).totalIncomes,
  );
});
