'use server';

import { currentUser } from '@clerk/nextjs/server';
import {
  Currency,
  QuickTransactionTemplate,
  TransactionType,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';

import { db } from '@/lib/db';
import { decrypt, decryptFloat, encrypt, encryptFloat } from '@/lib/crypto';
import {
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
  isCreditCardCategory,
} from '@/constants/constants';

export type QuickTransactionTemplateInput = {
  id?: string;
  label: string;
  text: string;
  amount?: number;
  category: string;
  currency: Currency;
  type: TransactionType;
};

const MAX_TEMPLATES = 12;

const isValidCategory = (category: string, type: TransactionType) => {
  const categories =
    type === TransactionType.Income
      ? INCOME_CATEGORIES_LIST
      : EXPENSE_CATEGORIES_LIST;

  return categories.some(({ value }) => value === category);
};

const getTemplateSettings = async (userId: string) =>
  db.settings.findUnique({
    where: { clerkUserId: userId },
    select: { encryptData: true, creditCardTrackingEnabled: true },
  });

const decryptTemplate = (
  template: QuickTransactionTemplate,
  decryptKey: string,
): QuickTransactionTemplate => ({
  ...template,
  label: decrypt(template.label, decryptKey),
  text: decrypt(template.text, decryptKey),
  amount:
    template.amount == null ? null : decryptFloat(template.amount, decryptKey),
});

export async function getQuickTransactionTemplates(): Promise<{
  templates?: QuickTransactionTemplate[];
  error?: string;
}> {
  const user = await currentUser();
  const userId = user?.id;
  const decryptKey = user?.primaryEmailAddressId;

  if (!userId) return { error: 'User not found' };

  try {
    const [settings, templates] = await Promise.all([
      getTemplateSettings(userId),
      db.quickTransactionTemplate.findMany({
        where: { userId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    if (settings?.encryptData && decryptKey) {
      return {
        templates: templates.map((template) =>
          decryptTemplate(template, decryptKey),
        ),
      };
    }

    return { templates };
  } catch (error) {
    Sentry.captureException(error);

    return { error: 'Unable to load quick transactions' };
  }
}

export async function saveQuickTransactionTemplate(
  input: QuickTransactionTemplateInput,
): Promise<{ template?: QuickTransactionTemplate; error?: string }> {
  const user = await currentUser();
  const userId = user?.id;
  const encryptKey = user?.primaryEmailAddressId;

  if (!userId) return { error: 'User not found' };

  const label = input.label.trim();
  const text = input.text.trim();
  if (!label || !text || label.length > 40 || text.length > 160) {
    return { error: 'Template name or transaction text is invalid' };
  }
  if (input.amount != null && input.amount <= 0) {
    return { error: 'Amount must be greater than zero' };
  }
  if (
    !Object.values(Currency).includes(input.currency) ||
    !Object.values(TransactionType).includes(input.type) ||
    !isValidCategory(input.category, input.type)
  ) {
    return { error: 'Template category, currency or type is invalid' };
  }

  try {
    const settings = await getTemplateSettings(userId);
    if (!settings) return { error: 'User settings not found' };
    if (
      !settings.creditCardTrackingEnabled &&
      isCreditCardCategory(input.category)
    ) {
      return { error: 'Credit card accounting is disabled' };
    }

    const shouldEncrypt = Boolean(settings.encryptData && encryptKey);
    const storedLabel = shouldEncrypt ? encrypt(label, encryptKey!) : label;
    const storedText = shouldEncrypt ? encrypt(text, encryptKey!) : text;
    const storedAmount =
      shouldEncrypt && input.amount != null
        ? encryptFloat(input.amount, encryptKey!)
        : input.amount;

    let template: QuickTransactionTemplate;
    if (input.id) {
      const existing = await db.quickTransactionTemplate.findFirst({
        where: { id: input.id, userId },
      });
      if (!existing) return { error: 'Template not found' };

      template = await db.quickTransactionTemplate.update({
        where: { id: input.id },
        data: {
          label: storedLabel,
          text: storedText,
          amount: storedAmount ?? null,
          category: input.category,
          currency: input.currency,
          type: input.type,
        },
      });
    } else {
      const templateStats = await db.quickTransactionTemplate.aggregate({
        where: { userId },
        _count: true,
        _max: { position: true },
      });
      if (templateStats._count >= MAX_TEMPLATES) {
        return { error: `You can create up to ${MAX_TEMPLATES} templates` };
      }

      template = await db.quickTransactionTemplate.create({
        data: {
          userId,
          label: storedLabel,
          text: storedText,
          amount: storedAmount ?? null,
          category: input.category,
          currency: input.currency,
          type: input.type,
          position: (templateStats._max.position ?? -1) + 1,
        },
      });
    }

    revalidatePath('/');

    return {
      template:
        shouldEncrypt && encryptKey
          ? decryptTemplate(template, encryptKey)
          : template,
    };
  } catch (error) {
    Sentry.captureException(error);

    return { error: 'Unable to save quick transaction' };
  }
}

export async function deleteQuickTransactionTemplate(
  id: string,
): Promise<{ success?: boolean; error?: string }> {
  const user = await currentUser();
  const userId = user?.id;
  if (!userId) return { error: 'User not found' };

  try {
    const result = await db.quickTransactionTemplate.deleteMany({
      where: { id, userId },
    });
    if (!result.count) return { error: 'Template not found' };

    revalidatePath('/');

    return { success: true };
  } catch (error) {
    Sentry.captureException(error);

    return { error: 'Unable to delete quick transaction' };
  }
}

export async function reorderQuickTransactionTemplates(
  ids: string[],
): Promise<{ success?: boolean; error?: string }> {
  const user = await currentUser();
  const userId = user?.id;
  if (!userId) return { error: 'User not found' };

  try {
    const ownedTemplates = await db.quickTransactionTemplate.findMany({
      where: { userId },
      select: { id: true },
    });
    const ownedIds = new Set(ownedTemplates.map(({ id }) => id));
    if (ids.length !== ownedIds.size || ids.some((id) => !ownedIds.has(id))) {
      return { error: 'Template order is invalid' };
    }

    await db.$transaction(
      ids.map((id, position) =>
        db.quickTransactionTemplate.update({
          where: { id },
          data: { position },
        }),
      ),
    );
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    Sentry.captureException(error);

    return { error: 'Unable to reorder quick transactions' };
  }
}
