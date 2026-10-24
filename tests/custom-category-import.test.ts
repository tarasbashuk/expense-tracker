import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import analyzeStatementScreenshots from '@/app/actions/analyzeStatementScreenshots';
import saveImportedTransaction from '@/app/actions/saveImportedTransaction';

const mocks = vi.hoisted(() => ({
  response: vi.fn(),
  categories: { findMany: vi.fn(), findFirst: vi.fn() },
  create: vi.fn(),
  rules: vi.fn(),
  learn: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    responses = { create: mocks.response };
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: async () => ({ id: 'owner' }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/monobankRatesCache', () => ({ getMonobankRates: vi.fn() }));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    settings: {
      findUnique: async () => ({
        defaultCurrency: 'EUR',
        language: 'ENG',
        encryptData: false,
        creditCardTrackingEnabled: false,
      }),
    },
    customCategory: mocks.categories,
    transaction: { create: mocks.create },
  },
}));

vi.mock('@/lib/importDuplicateMatching/importDuplicateMatching', () => ({
  applyDuplicateMatches: async (_user: string, rows: unknown[]) => rows,
}));

vi.mock('@/lib/merchantRules/merchantRules', () => ({
  getMerchantCategoryRules: mocks.rules,
  formatMerchantRulesForPrompt: (rules: unknown[]) => JSON.stringify(rules),
  findMerchantRuleMatch: (_text: string, rules: { category: string }[]) =>
    rules[0],
  isAmbiguousMerchant: () => false,
  normalizeMerchantPattern: (text: string) => text.toLowerCase(),
  upsertMerchantCategoryRule: mocks.learn,
}));

const category = {
  id: 'one',
  userId: 'owner',
  name: 'Pottery',
  type: 'Expense',
  icon: 'palette',
  archived: false,
};
const candidate = {
  sourceFileIndex: 0,
  status: 'new',
  date: '2026-10-24',
  text: 'Class',
  rawDescription: 'Class',
  amount: 10,
  currency: 'EUR',
  type: 'Expense',
  category: 'custom:one',
  confidence: 1,
  warnings: [],
  receiptGroupId: null,
  receiptTotal: null,
  isReceiptCategorySplit: false,
  receiptLineItems: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENAI_API_KEY', 'test-only');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.categories.findMany.mockResolvedValue([category]);
  mocks.categories.findFirst.mockResolvedValue(category);
  mocks.rules.mockResolvedValue([]);
  mocks.response.mockResolvedValue({
    id: 'response',
    output_text: JSON.stringify({ transactions: [candidate], warnings: [] }),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function files() {
  const form = new FormData();
  form.append(
    'files',
    new File(['fake image'], 'receipt.png', { type: 'image/png' }),
  );

  return form;
}

test('AI receives only the current user’s active categories and returns their stable keys', async () => {
  const result = await analyzeStatementScreenshots(files());

  expect(result.rows?.[0].category).toBe('custom:one');
  expect(mocks.categories.findMany).toHaveBeenCalledWith({
    where: { userId: 'owner', archived: false },
  });
  expect(mocks.response.mock.calls[0][0].input[0].content[0].text).toContain(
    'custom:one: "Pottery"',
  );
});

test('archived merchant rules and hallucinated or wrong-type categories cannot survive analysis', async () => {
  mocks.rules.mockResolvedValue([{ category: 'custom:archived' }]);
  mocks.response.mockResolvedValue({
    id: 'response',
    output_text: JSON.stringify({
      transactions: [
        { ...candidate, category: 'custom:missing' },
        { ...candidate, type: 'Income' },
      ],
      warnings: [],
    }),
  });

  const result = await analyzeStatementScreenshots(files());

  expect(result.rows?.map((row) => row.category)).toEqual(['others', 'others']);
  expect(
    mocks.response.mock.calls[0][0].input[0].content[0].text,
  ).not.toContain('custom:archived');
});

test('custom expense categories participate in reconciled receipt splits', async () => {
  mocks.response.mockResolvedValue({
    id: 'response',
    output_text: JSON.stringify({
      transactions: [
        {
          ...candidate,
          amount: 15,
          receiptTotal: 15,
          receiptLineItems: [
            { description: 'Clay', amount: 10, category: 'custom:one' },
            { description: 'Food', amount: 5, category: 'groceries' },
          ],
        },
      ],
      warnings: [],
    }),
  });

  const result = await analyzeStatementScreenshots(files());

  expect(
    result.rows?.map((row) => [
      row.category,
      row.amount,
      row.isReceiptCategorySplit,
    ]),
  ).toEqual([
    ['custom:one', 10, true],
    ['groceries', 5, true],
  ]);
});

test('import saves validate ownership and archive status before writing or learning a merchant rule', async () => {
  mocks.categories.findFirst.mockResolvedValue({ ...category, archived: true });
  const result = await saveImportedTransaction({
    date: '2026-10-24',
    text: 'Class',
    amount: 10,
    currency: 'EUR',
    type: 'Expense',
    category: 'custom:one',
  });

  expect(result.error).toBe('Category is unavailable for this transaction');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.learn).not.toHaveBeenCalled();
});
