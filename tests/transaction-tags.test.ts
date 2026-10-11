import { beforeEach, expect, test, vi } from 'vitest';
import { getTags, saveTag, deleteTag } from '@/app/actions/tags';
import { addUpdateTransaction } from '@/app/actions/addUpdateTransaction';
import {
  getQuickTransactionTemplates,
  saveQuickTransactionTemplate,
} from '@/app/actions/quickTransactionTemplates';
import { validateTag, validateTagIds } from '@/lib/tags';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  tag: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  transaction: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  template: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  settings: { findUnique: vi.fn() },
  atomic: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ currentUser: mocks.currentUser }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: {
    tag: mocks.tag,
    transaction: mocks.transaction,
    quickTransactionTemplate: mocks.template,
    settings: mocks.settings,
    $transaction: mocks.atomic,
  },
}));

const tag = {
  id: 'tag-one',
  name: 'Trip 🏖️',
  normalizedName: 'trip 🏖️',
  color: 'blue',
  userId: 'owner',
};
const input = {
  text: 'Coffee',
  date: new Date(),
  amount: 10,
  category: 'dining',
  currency: 'EUR' as const,
  type: 'Expense' as const,
  isCreditTransaction: false,
  tagIds: [tag.id],
};
const templateInput = {
  label: 'Coffee',
  text: 'Coffee',
  category: 'dining',
  currency: 'EUR' as const,
  type: 'Expense' as const,
  tagIds: [tag.id],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({ id: 'owner' });
  mocks.settings.findUnique.mockResolvedValue({
    encryptData: false,
    creditCardTrackingEnabled: false,
  });
  mocks.tag.findMany.mockResolvedValue([{ id: tag.id }]);
  mocks.tag.create.mockResolvedValue(tag);
  mocks.tag.update.mockResolvedValue(tag);
  mocks.tag.deleteMany.mockResolvedValue({ count: 1 });
  mocks.transaction.findFirst.mockResolvedValue(
    transaction({ userId: 'owner' }),
  );
  mocks.transaction.findUnique.mockResolvedValue(null);
  mocks.transaction.create.mockResolvedValue({ ...transaction(), tags: [tag] });
  mocks.transaction.update.mockResolvedValue({ ...transaction(), tags: [] });
  mocks.template.aggregate.mockResolvedValue({
    _count: 0,
    _max: { position: 2 },
  });
  mocks.template.create.mockResolvedValue({
    ...templateInput,
    id: 'template',
    tags: [tag],
  });
  mocks.template.findFirst.mockResolvedValue(null);
  mocks.atomic.mockImplementation(async (callback) =>
    callback({
      tag: mocks.tag,
      transaction: mocks.transaction,
      quickTransactionTemplate: mocks.template,
    }),
  );
});

test('trims names, normalizes case and Unicode, and validates palette and length', () => {
  expect(validateTag('  ВІДПУСТКА 🏖️  ', 'blue')).toEqual({
    name: 'ВІДПУСТКА 🏖️',
    normalizedName: 'відпустка 🏖️',
    color: 'blue',
  });
  expect(validateTag('Cafe\u0301', 'green').normalizedName).toBe('café');

  for (const name of ['', '  ', 'x'.repeat(41), null]) {
    expect(() => validateTag(name, 'blue')).toThrow('tags.invalid');
  }

  expect(() => validateTag('Trip', '#fff')).toThrow('tags.invalid');
  expect(() => validateTagIds(['a', 'b', 'c'])).toThrow('tags.maxTwo');
  expect(() => validateTagIds('a')).toThrow('tags.maxTwo');
});

test('CRUD reads and writes always constrain the current owner', async () => {
  await getTags();
  await saveTag({ name: ' Trip 🏖️ ', color: 'blue' });
  await saveTag({ id: tag.id, name: 'Holiday', color: 'green' });
  await deleteTag(tag.id);

  expect(mocks.tag.findMany).toHaveBeenCalledWith({
    where: { userId: 'owner' },
    orderBy: { name: 'asc' },
  });
  expect(mocks.tag.create).toHaveBeenCalledWith({
    data: {
      name: tag.name,
      normalizedName: tag.normalizedName,
      color: 'blue',
      userId: 'owner',
    },
  });
  expect(mocks.tag.update).toHaveBeenCalledWith({
    where: { id: tag.id, userId: 'owner' },
    data: { name: 'Holiday', normalizedName: 'holiday', color: 'green' },
  });
  expect(mocks.tag.deleteMany).toHaveBeenCalledWith({
    where: { id: tag.id, userId: 'owner' },
  });
  expect(mocks.transaction.update).not.toHaveBeenCalled();
});

test('duplicate conflicts and missing or foreign tags return useful errors', async () => {
  mocks.tag.create.mockRejectedValue({ code: 'P2002' });
  mocks.tag.update.mockRejectedValue({ code: 'P2025' });
  mocks.tag.deleteMany.mockResolvedValue({ count: 0 });

  expect(await saveTag({ name: 'TRIP', color: 'blue' })).toEqual({
    error: 'tags.duplicate',
  });
  expect(await saveTag({ id: 'foreign', name: 'Trip', color: 'blue' })).toEqual(
    { error: 'tags.notFound' },
  );
  expect(await deleteTag('foreign')).toEqual({ error: 'tags.notFound' });
});

test('unauthenticated tag actions do not reach the database', async () => {
  mocks.currentUser.mockResolvedValue(null);

  expect(await getTags()).toEqual({ error: 'tags.unauthorized' });
  expect(await saveTag({ name: 'Trip', color: 'blue' })).toEqual({
    error: 'tags.unauthorized',
  });
  expect(await deleteTag(tag.id)).toEqual({ error: 'tags.unauthorized' });
  expect(mocks.tag.findMany).not.toHaveBeenCalled();
  expect(mocks.tag.create).not.toHaveBeenCalled();
  expect(mocks.tag.deleteMany).not.toHaveBeenCalled();
});

test('assigns owned tags atomically and returns real labels', async () => {
  const result = await addUpdateTransaction({ ...input }, false);

  expect(mocks.atomic).toHaveBeenCalledOnce();
  expect(mocks.tag.findMany).toHaveBeenCalledWith({
    where: { userId: 'owner', id: { in: [tag.id] } },
    select: { id: true },
  });
  expect(mocks.transaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        tags: { connect: [{ id: tag.id }] },
        amount: 10,
        userId: 'owner',
      }),
    }),
  );
  expect(result.data?.tags).toEqual([tag]);
});

test('unchecks all tags using an atomic set without changing financial fields', async () => {
  await addUpdateTransaction({ ...input, tagIds: [] }, false, 'existing');

  expect(mocks.transaction.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'existing', userId: 'owner' },
      data: expect.objectContaining({
        tags: { set: [] },
        amount: 10,
        amountDefaultCurrency: 10,
      }),
    }),
  );
});

test.each([['a', 'b', 'c'], ['foreign']])(
  'rejects invalid tag assignments before any transaction write: %j',
  async (...ids) => {
    mocks.tag.findMany.mockResolvedValue([]);

    const result = await addUpdateTransaction({ ...input, tagIds: ids }, false);

    expect(result.error).toMatch(/^tags\./);
    expect(mocks.transaction.create).not.toHaveBeenCalled();
    expect(mocks.transaction.update).not.toHaveBeenCalled();
  },
);

test('cannot edit another owner’s transaction or inject relations and ownership', async () => {
  mocks.transaction.findFirst.mockResolvedValue(null);

  expect(await addUpdateTransaction({ ...input }, false, 'foreign')).toEqual({
    error: 'Transaction not found',
  });
  expect(mocks.atomic).not.toHaveBeenCalled();

  await addUpdateTransaction(
    {
      ...input,
      userId: 'foreign',
      tags: { connect: { id: 'foreign' } },
    } as typeof input,
    false,
  );

  expect(mocks.transaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        userId: 'owner',
        tags: { connect: [{ id: tag.id }] },
      }),
    }),
  );
});

test('quick templates retain tags and ordering and reject foreign owners', async () => {
  const result = await saveQuickTransactionTemplate(templateInput);

  expect(result.template?.tags).toEqual([tag]);
  expect(mocks.template.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        tags: { connect: [{ id: tag.id }] },
        position: 3,
      }),
    }),
  );
  expect(
    await saveQuickTransactionTemplate({ ...templateInput, id: 'foreign' }),
  ).toEqual({ error: 'Template not found' });
  expect(mocks.template.findFirst).toHaveBeenCalledWith({
    where: { id: 'foreign', userId: 'owner' },
  });
  expect(mocks.template.update).not.toHaveBeenCalled();
});

test('template tag limits and foreign tag validation run on the server', async () => {
  expect(
    (
      await saveQuickTransactionTemplate({
        ...templateInput,
        tagIds: ['a', 'b', 'c'],
      })
    ).error,
  ).toBe('tags.maxTwo');
  mocks.tag.findMany.mockResolvedValue([]);

  expect((await saveQuickTransactionTemplate(templateInput)).error).toBe(
    'tags.notFound',
  );
  expect(mocks.template.create).not.toHaveBeenCalled();
});

test('deleted tag leaves a readable, usable template with no tag connections', async () => {
  mocks.template.findMany.mockResolvedValue([
    { ...templateInput, id: 'template', tags: [] },
  ]);

  const result = await getQuickTransactionTemplates();

  expect(result.templates?.[0].tags).toEqual([]);
  expect(mocks.template.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { userId: 'owner' },
      include: { tags: { where: { userId: 'owner' } } },
    }),
  );
  expect(
    (await saveQuickTransactionTemplate({ ...templateInput, tagIds: [] }))
      .error,
  ).toBeUndefined();
});
