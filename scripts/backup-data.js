/** JSON format v2: scalar model rows plus explicit relation records. */
export async function readBackupData(prisma) {
  return prisma.$transaction(
    async (tx) => {
      const users = await tx.user.findMany();
      const settings = await tx.settings.findMany();
      const merchantCategoryRules = await tx.merchantCategoryRule.findMany();
      const tags = await tx.tag.findMany();
      const taggedTransactions = await tx.transaction.findMany({
        include: { tags: { select: { id: true } } },
      });
      const taggedTemplates = await tx.quickTransactionTemplate.findMany({
        include: { tags: { select: { id: true } } },
      });
      const transactionTags = taggedTransactions.flatMap((row) =>
        row.tags.map((tag) => ({ transactionId: row.id, tagId: tag.id })),
      );
      const templateTags = taggedTemplates.flatMap((row) =>
        row.tags.map((tag) => ({ templateId: row.id, tagId: tag.id })),
      );
      const transactions = taggedTransactions.map(
        ({ tags: _tags, ...row }) => row,
      );
      const quickTransactionTemplates = taggedTemplates.map(
        ({ tags: _tags, ...row }) => row,
      );

      return {
        users,
        transactions,
        settings,
        merchantCategoryRules,
        quickTransactionTemplates,
        tags,
        transactionTags,
        templateTags,
      };
    },
    { isolationLevel: 'RepeatableRead', timeout: 120000 },
  );
}

export function validateBackupData(data) {
  if (
    !data ||
    !['users', 'transactions', 'settings'].every((key) =>
      Array.isArray(data[key]),
    )
  ) {
    throw new Error('Invalid backup: missing core models');
  }

  for (const key of [
    'merchantCategoryRules',
    'quickTransactionTemplates',
    'tags',
    'transactionTags',
    'templateTags',
  ]) {
    if (data[key] !== undefined && !Array.isArray(data[key]))
      throw new Error(`Invalid backup: ${key}`);
  }

  const hasTags = ['tags', 'transactionTags', 'templateTags'].some(
    (key) => data[key] !== undefined,
  );

  if (
    hasTags &&
    !['tags', 'transactionTags', 'templateTags'].every((key) =>
      Array.isArray(data[key]),
    )
  ) {
    throw new Error('Incomplete tag backup');
  }

  const tags = new Map((data.tags || []).map((tag) => [tag.id, tag]));
  const users = new Set(data.users.map((user) => user.clerkUserId));

  for (const tag of tags.values()) {
    if (!users.has(tag.userId)) throw new Error('Invalid tag owner');
  }

  for (const [links, rows, idKey] of [
    [data.transactionTags || [], data.transactions, 'transactionId'],
    [
      data.templateTags || [],
      data.quickTransactionTemplates || [],
      'templateId',
    ],
  ]) {
    const owners = new Map(rows.map((row) => [row.id, row.userId]));
    const counts = new Map();
    const pairs = new Set();

    for (const link of links) {
      const owner = owners.get(link[idKey]);
      const pair = `${link[idKey]}:${link.tagId}`;

      if (!owner || tags.get(link.tagId)?.userId !== owner || pairs.has(pair))
        throw new Error('Invalid tag relation');

      pairs.add(pair);
      counts.set(link[idKey], (counts.get(link[idKey]) || 0) + 1);

      if (counts.get(link[idKey]) > 2) throw new Error('Too many tags');
    }
  }

  return data;
}

const restoreDates = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      ['date', 'createdAt', 'updatedAt', 'recurringEndDate'].includes(key) &&
      value
        ? new Date(value)
        : value,
    ]),
  );

export async function restoreBackupData(prisma, data) {
  validateBackupData(data);

  await prisma.$transaction(
    async (tx) => {
      for (const model of [
        'tag',
        'quickTransactionTemplate',
        'merchantCategoryRule',
        'transaction',
        'settings',
        'user',
      ]) {
        await tx[model].deleteMany();
      }

      for (const [model, key] of [
        ['user', 'users'],
        ['settings', 'settings'],
        ['transaction', 'transactions'],
        ['merchantCategoryRule', 'merchantCategoryRules'],
        ['quickTransactionTemplate', 'quickTransactionTemplates'],
        ['tag', 'tags'],
      ]) {
        const rows = data[key] || [];

        for (let offset = 0; offset < rows.length; offset += 100) {
          await tx[model].createMany({
            data: rows.slice(offset, offset + 100).map(restoreDates),
          });
        }
      }

      for (const [links, model, idKey] of [
        [data.transactionTags || [], 'transaction', 'transactionId'],
        [data.templateTags || [], 'quickTransactionTemplate', 'templateId'],
      ]) {
        for (const link of links) {
          await tx[model].update({
            where: { id: link[idKey] },
            data: { tags: { connect: { id: link.tagId } } },
          });
        }
      }
    },
    { timeout: 120000 },
  );
}
