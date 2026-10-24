import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import {
  readBackupData,
  restoreBackupData,
  validateBackupData,
} from '../scripts/backup-data.js';

const tag = {
  id: 'tag',
  userId: 'owner',
  name: 'Trip',
  normalizedName: 'trip',
  color: 'blue',
};
const oldData = {
  users: [{ clerkUserId: 'owner' }],
  settings: [],
  transactions: [
    {
      id: 'transaction',
      userId: 'owner',
      date: '2026-10-11T00:00:00Z',
      amount: 12,
    },
  ],
  quickTransactionTemplates: [{ id: 'template', userId: 'owner' }],
};
const data = {
  ...oldData,
  tags: [tag],
  transactionTags: [{ transactionId: 'transaction', tagId: 'tag' }],
  templateTags: [{ templateId: 'template', tagId: 'tag' }],
};

function database() {
  const tx = Object.fromEntries(
    [
      'customCategory',
      'user',
      'settings',
      'transaction',
      'quickTransactionTemplate',
      'tag',
      'merchantCategoryRule',
    ].map((model) => [
      model,
      {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
      },
    ]),
  );
  const prisma = { $transaction: vi.fn(async (callback) => callback(tx)) };

  return { tx, prisma };
}

test('v2 snapshot includes all model rows and both sets of tag connections', async () => {
  const { tx, prisma } = database();
  tx.user.findMany.mockResolvedValue(data.users);
  tx.transaction.findMany.mockResolvedValue([
    { ...data.transactions[0], tags: [tag] },
  ]);
  tx.quickTransactionTemplate.findMany.mockResolvedValue([
    { ...data.quickTransactionTemplates[0], tags: [tag] },
  ]);
  tx.tag.findMany.mockResolvedValue([tag]);

  const snapshot = await readBackupData(prisma);
  const parsed = JSON.parse(JSON.stringify(snapshot));

  expect(validateBackupData(parsed)).toEqual({
    ...data,
    merchantCategoryRules: [],
    customCategories: [],
  });
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: 'RepeatableRead',
    timeout: 120000,
  });
  expect(parsed.transactions[0]).not.toHaveProperty('tags');
});

test('old backups without tags restore without altering scalar financial values', async () => {
  const { tx, prisma } = database();

  await restoreBackupData(prisma, oldData);

  expect(tx.transaction.createMany).toHaveBeenCalledWith({
    data: [
      {
        ...oldData.transactions[0],
        date: new Date(oldData.transactions[0].date),
      },
    ],
  });
  expect(tx.tag.createMany).not.toHaveBeenCalled();
  expect(tx.transaction.update).not.toHaveBeenCalled();
  expect(prisma.$transaction).toHaveBeenCalledOnce();
});

test('tag restore recreates links only after model rows, in one atomic transaction', async () => {
  const { tx, prisma } = database();

  await restoreBackupData(prisma, data);

  expect(tx.tag.createMany).toHaveBeenCalledWith({ data: [tag] });
  expect(tx.transaction.update).toHaveBeenCalledWith({
    where: { id: 'transaction' },
    data: { tags: { connect: { id: 'tag' } } },
  });
  expect(tx.quickTransactionTemplate.update).toHaveBeenCalledWith({
    where: { id: 'template' },
    data: { tags: { connect: { id: 'tag' } } },
  });
  expect(tx.tag.createMany.mock.invocationCallOrder[0]).toBeLessThan(
    tx.transaction.update.mock.invocationCallOrder[0],
  );
});

test.each([
  { ...data, templateTags: undefined },
  { ...data, tags: [{ ...tag, userId: 'foreign' }] },
  { ...data, transactionTags: [{ transactionId: 'missing', tagId: 'tag' }] },
  {
    ...data,
    transactionTags: [...data.transactionTags, ...data.transactionTags],
  },
])(
  'incomplete or invalid relation backups fail before deleting anything',
  async (invalid) => {
    const { tx, prisma } = database();

    await expect(restoreBackupData(prisma, invalid)).rejects.toThrow();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.transaction.deleteMany).not.toHaveBeenCalled();
  },
);

test('migration only creates tag structures and cascades from tags to links', () => {
  const sql = readFileSync(
    new URL(
      '../prisma/migrations/20261011160000_transaction_tags/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );

  expect(sql).not.toMatch(
    /\b(DROP|TRUNCATE|DELETE FROM|UPDATE "Transaction")\b/,
  );
  expect(sql).toContain('REFERENCES "Tag"("id") ON DELETE CASCADE');
  expect(sql).not.toMatch(/ALTER TABLE "Transaction"/);
  expect(sql).toContain('UNIQUE INDEX "Tag_userId_normalizedName_key"');
});

test('custom category backup restores archived labels before transactions and rejects broken ownership', async () => {
  const category = {
    id: 'custom-id',
    userId: 'owner',
    name: 'Pottery',
    type: 'Expense',
    icon: 'palette',
    archived: true,
  };
  const snapshot = {
    ...data,
    customCategories: [category],
    transactions: [
      {
        ...data.transactions[0],
        category: 'custom:custom-id',
        type: 'Expense',
      },
    ],
  };
  const { tx, prisma } = database();

  await restoreBackupData(prisma, snapshot);

  expect(tx.customCategory.createMany).toHaveBeenCalledWith({
    data: [category],
  });
  expect(tx.customCategory.createMany.mock.invocationCallOrder[0]).toBeLessThan(
    tx.transaction.createMany.mock.invocationCallOrder[0],
  );
  expect(() =>
    validateBackupData({ ...snapshot, customCategories: [] }),
  ).toThrow('Invalid custom category relation');
  expect(() =>
    validateBackupData({
      ...snapshot,
      customCategories: [{ ...category, userId: 'foreign' }],
    }),
  ).toThrow('Invalid category owner');
});

test('custom shortcut categories are restored and their owner/type links are checked before writes', async () => {
  const category = {
    id: 'custom-id',
    userId: 'owner',
    name: 'Pottery',
    type: 'Expense',
    icon: 'palette',
    archived: true,
  };
  const snapshot = {
    ...data,
    customCategories: [category],
    quickTransactionTemplates: [
      {
        ...data.quickTransactionTemplates[0],
        category: 'custom:custom-id',
        type: 'Expense',
      },
    ],
  };
  const { tx, prisma } = database();

  await restoreBackupData(prisma, snapshot);

  expect(tx.quickTransactionTemplate.createMany).toHaveBeenCalledWith({
    data: snapshot.quickTransactionTemplates,
  });
  expect(tx.customCategory.createMany.mock.invocationCallOrder[0]).toBeLessThan(
    tx.quickTransactionTemplate.createMany.mock.invocationCallOrder[0],
  );
  expect(() =>
    validateBackupData({ ...snapshot, customCategories: [] }),
  ).toThrow('Invalid custom category relation');
  expect(() =>
    validateBackupData({
      ...snapshot,
      customCategories: [{ ...category, type: 'Income' }],
    }),
  ).toThrow('Invalid custom category relation');
});
