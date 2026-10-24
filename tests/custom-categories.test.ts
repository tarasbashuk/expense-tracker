import { beforeEach, expect, test, vi } from 'vitest';
import {
  archiveCustomCategory,
  getCustomCategories,
  saveCustomCategory,
} from '@/app/actions/customCategories';
import { saveQuickTransactionTemplate } from '@/app/actions/quickTransactionTemplates';
import { addUpdateTransaction } from '@/app/actions/addUpdateTransaction';
import { validateTransactionCategory } from '@/lib/categoryOwnership';
import {
  categoryOptions,
  validateCustomCategory,
} from '@/lib/customCategories';
import { transactionsToCsv } from '@/lib/transactionsCsv';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  categories: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  transactions: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  templates: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  settings: { findUnique: vi.fn() },
  atomic: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ currentUser: mocks.user }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: {
    customCategory: mocks.categories,
    transaction: mocks.transactions,
    quickTransactionTemplate: mocks.templates,
    settings: mocks.settings,
    $transaction: mocks.atomic,
  },
}));

const category = {
  id: 'one',
  userId: 'owner',
  name: 'Pottery',
  normalizedName: 'pottery',
  type: 'Expense' as const,
  icon: 'palette',
  archived: false,
};
const input = {
  text: 'Class',
  category: 'custom:one',
  type: 'Expense' as const,
  date: new Date(),
  amount: 10,
  currency: 'EUR' as const,
  isCreditTransaction: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'owner' });
  mocks.categories.findFirst.mockResolvedValue(category);
  mocks.categories.create.mockResolvedValue(category);
  mocks.categories.update.mockResolvedValue(category);
  mocks.settings.findUnique.mockResolvedValue({
    encryptData: false,
    creditCardTrackingEnabled: false,
  });
  mocks.transactions.create.mockResolvedValue(
    transaction({ category: 'custom:one' }),
  );
  mocks.transactions.update.mockResolvedValue(
    transaction({ category: 'custom:one' }),
  );
  mocks.transactions.findFirst.mockResolvedValue({
    category: 'custom:one',
    isCreditTransaction: false,
  });
  mocks.transactions.findUnique.mockResolvedValue(null);
  mocks.templates.findFirst.mockResolvedValue({
    id: 'template',
    category: 'custom:one',
  });
  mocks.templates.aggregate.mockResolvedValue({
    _count: 0,
    _max: { position: null },
  });
  mocks.templates.create.mockResolvedValue({
    id: 'template',
    category: 'custom:one',
  });
  mocks.templates.update.mockResolvedValue({
    id: 'template',
    category: 'custom:one',
  });
  mocks.atomic.mockImplementation(async (callback) =>
    callback({
      customCategory: mocks.categories,
      transaction: mocks.transactions,
      quickTransactionTemplate: mocks.templates,
    }),
  );
});

test('validates Unicode names, fixed icon keys, and supported types', () => {
  expect(
    validateCustomCategory({
      name: ' Cafe\u0301 ',
      type: 'Expense',
      icon: 'coffee',
    }),
  ).toEqual({
    name: 'Caf\u00e9',
    normalizedName: 'caf\u00e9',
    type: 'Expense',
    icon: 'coffee',
  });

  for (const changes of [
    { name: '' },
    { name: 'x'.repeat(41) },
    { icon: '__proto__' },
    { type: 'all' },
    { name: 'a\nb' },
  ]) {
    expect(() => validateCustomCategory({ ...category, ...changes })).toThrow(
      'customCategories.invalid',
    );
  }
});

test('catalog separates types, archives, and system-only recurrence choices', () => {
  const custom = [
    category,
    { ...category, id: 'old', archived: true },
    { ...category, id: 'income', type: 'Income' as const },
  ];

  expect(
    categoryOptions(custom, 'Expense', false).map((item) => item.value),
  ).toContain('custom:one');
  expect(
    categoryOptions(custom, 'Expense', false).map((item) => item.value),
  ).not.toEqual(
    expect.arrayContaining(['custom:old', 'custom:income', 'CCRepayment']),
  );
  expect(
    categoryOptions(custom, 'all', false, true).map((item) => item.value),
  ).toEqual(expect.arrayContaining(['custom:old', 'custom:income']));
  expect(
    categoryOptions(custom, 'Expense', false, false, false).some((item) =>
      item.value.startsWith('custom:'),
    ),
  ).toBe(false);
});

test('management reads and mutations scope every query to the authenticated owner and prevent type changes', async () => {
  await getCustomCategories();
  await saveCustomCategory({
    name: ' Pottery ',
    type: 'Expense',
    icon: 'palette',
  });
  await saveCustomCategory({
    id: 'one',
    name: 'Clay',
    type: 'Expense',
    icon: 'palette',
  });
  await archiveCustomCategory('one', true);

  expect(mocks.categories.findMany).toHaveBeenCalledWith({
    where: { userId: 'owner' },
    orderBy: { name: 'asc' },
  });
  expect(mocks.categories.create).toHaveBeenCalledWith({
    data: {
      userId: 'owner',
      name: 'Pottery',
      normalizedName: 'pottery',
      type: 'Expense',
      icon: 'palette',
    },
  });
  expect(mocks.categories.update).toHaveBeenCalledWith({
    where: { id: 'one', userId: 'owner', type: 'Expense' },
    data: { name: 'Clay', normalizedName: 'clay', icon: 'palette' },
  });
  expect(mocks.categories.update).toHaveBeenCalledWith({
    where: { id: 'one', userId: 'owner' },
    data: { archived: true },
  });
  expect(mocks.transactions.update).not.toHaveBeenCalled();
});

test('unauthenticated mutations never reach the database', async () => {
  mocks.user.mockResolvedValue(null);

  expect(await getCustomCategories()).toEqual({
    error: 'customCategories.unauthorized',
  });
  expect(await saveCustomCategory(category)).toEqual({
    error: 'customCategories.unauthorized',
  });
  expect(await archiveCustomCategory('one', true)).toEqual({
    error: 'customCategories.unauthorized',
  });
  expect(mocks.categories.create).not.toHaveBeenCalled();
  expect(mocks.categories.update).not.toHaveBeenCalled();
});

test('duplicate names and foreign/missing edits return useful errors', async () => {
  mocks.categories.create.mockRejectedValue({ code: 'P2002' });
  mocks.categories.update.mockRejectedValue({ code: 'P2025' });

  expect(
    await saveCustomCategory({
      name: 'Pottery',
      type: 'Expense',
      icon: 'palette',
    }),
  ).toEqual({ error: 'customCategories.duplicate' });
  expect(await archiveCustomCategory('foreign', true)).toEqual({
    error: 'customCategories.notFound',
  });
});

test('saving a transaction checks custom category ownership and type before writing', async () => {
  const result = await addUpdateTransaction(input, false);

  expect(result.data?.category).toBe('custom:one');
  expect(mocks.categories.findFirst).toHaveBeenCalledWith({
    where: { id: 'one', userId: 'owner', type: 'Expense' },
  });
  expect(mocks.transactions.create).toHaveBeenCalledOnce();
});

test.each([null, { ...category, archived: true }])(
  'foreign, missing, and archived categories cannot be assigned to new transactions',
  async (found) => {
    mocks.categories.findFirst.mockResolvedValue(found);

    const result = await addUpdateTransaction(input, false);

    expect(result.error).toBe('customCategories.unavailable');
    expect(mocks.transactions.create).not.toHaveBeenCalled();
  },
);

test('editing an existing archived category is allowed, but assigning it to another transaction is rejected', async () => {
  mocks.categories.findFirst.mockResolvedValue({ ...category, archived: true });

  expect(
    (await addUpdateTransaction(input, false, 'existing')).error,
  ).toBeUndefined();
  mocks.transactions.findFirst.mockResolvedValue({
    category: 'dining',
    isCreditTransaction: false,
  });
  expect((await addUpdateTransaction(input, false, 'another')).error).toBe(
    'customCategories.unavailable',
  );
  expect(mocks.transactions.update).toHaveBeenCalledOnce();
});

test('custom categories can create recurring transactions and reject mismatched system types', async () => {
  const recurringEndDate = new Date(input.date.getTime() + 86400000 * 90);

  expect(
    (
      await addUpdateTransaction(
        { ...input, isRecurring: true, recurringEndDate },
        false,
      )
    ).error,
  ).toBeUndefined();
  expect(mocks.transactions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        category: 'custom:one',
        isRecurring: true,
        recurringEndDate,
      }),
    }),
  );
  expect(
    (await addUpdateTransaction({ ...input, category: 'salary' }, false)).error,
  ).toBe('customCategories.unavailable');
  expect(mocks.transactions.create).toHaveBeenCalledOnce();
});

test('the shared validator checks the requested type and handles a missing match', async () => {
  mocks.categories.findFirst.mockResolvedValue(null);
  const tx = { customCategory: mocks.categories } as unknown as Parameters<
    typeof validateTransactionCategory
  >[0];

  await expect(
    validateTransactionCategory(tx, 'owner', 'custom:one', 'Income'),
  ).rejects.toThrow('customCategories.unavailable');

  expect(mocks.categories.findFirst).toHaveBeenCalledWith({
    where: { id: 'one', userId: 'owner', type: 'Income' },
  });
});

test('CSV uses current category names and escapes spreadsheet formulas', () => {
  const csv = transactionsToCsv(
    [transaction({ category: 'custom:one' })],
    'EUR',
    { 'custom:one': '=1+1' },
  );

  expect(csv).toContain('"\'=1+1"');
  expect(csv).not.toContain('custom:one');
});

const templateInput = {
  label: 'Class',
  text: 'Pottery class',
  amount: 10,
  currency: 'EUR' as const,
  type: 'Expense' as const,
  category: 'custom:one',
};

test('shortcuts accept active custom categories with owner and type validation', async () => {
  const result = await saveQuickTransactionTemplate(templateInput);

  expect(result.error).toBeUndefined();
  expect(mocks.categories.findFirst).toHaveBeenCalledWith({
    where: { id: 'one', userId: 'owner', type: 'Expense' },
  });
  expect(mocks.templates.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        category: 'custom:one',
        userId: 'owner',
        position: 0,
      }),
    }),
  );
});

test.each([null, { ...category, archived: true }])(
  'new shortcuts reject missing/foreign/wrong-type or archived categories',
  async (found) => {
    mocks.categories.findFirst.mockResolvedValue(found);

    const result = await saveQuickTransactionTemplate(templateInput);

    expect(result.error).toBe('customCategories.unavailable');
    expect(mocks.templates.create).not.toHaveBeenCalled();
  },
);

test('editing a shortcut preserves its archived category, but cannot assign a different archived one', async () => {
  mocks.categories.findFirst.mockResolvedValue({ ...category, archived: true });

  expect(
    (
      await saveQuickTransactionTemplate({
        ...templateInput,
        id: 'template',
        label: 'Renamed',
      })
    ).error,
  ).toBeUndefined();
  expect(
    (
      await saveQuickTransactionTemplate({
        ...templateInput,
        id: 'template',
        category: 'custom:other',
      })
    ).error,
  ).toBe('customCategories.unavailable');
  expect(mocks.templates.update).toHaveBeenCalledOnce();
  expect(mocks.templates.findFirst).toHaveBeenCalledWith({
    where: { id: 'template', userId: 'owner' },
  });
});

test('a forged template ID cannot bypass archived category checks or edit another owner’s shortcut', async () => {
  mocks.templates.findFirst.mockResolvedValue(null);

  expect(
    (await saveQuickTransactionTemplate({ ...templateInput, id: 'foreign' }))
      .error,
  ).toBe('Template not found');
  expect(mocks.templates.update).not.toHaveBeenCalled();
  expect(mocks.categories.findFirst).not.toHaveBeenCalled();
});

test('recurring edits retain archived categories but new recurring transactions must use active ones', async () => {
  mocks.categories.findFirst.mockResolvedValue({ ...category, archived: true });

  expect(
    (
      await addUpdateTransaction(
        { ...input, isRecurring: true },
        false,
        'existing',
      )
    ).error,
  ).toBeUndefined();
  expect(
    (await addUpdateTransaction({ ...input, isRecurring: true }, false)).error,
  ).toBe('customCategories.unavailable');
  expect(mocks.transactions.update).toHaveBeenCalledOnce();
  expect(mocks.transactions.create).not.toHaveBeenCalled();
});
