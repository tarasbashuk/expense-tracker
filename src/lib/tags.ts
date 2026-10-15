import type {
  Tag,
  Transaction as PrismaTransaction,
  QuickTransactionTemplate as PrismaTemplate,
} from '@prisma/client';

export type Transaction = PrismaTransaction & { tags?: Tag[] };
export type QuickTransactionTemplate = PrismaTemplate & { tags?: Tag[] };

export const TAG_COLORS = {
  blue: { background: '#dbeafe', text: '#1e3a8a' },
  green: { background: '#dcfce7', text: '#14532d' },
  purple: { background: '#f3e8ff', text: '#581c87' },
  amber: { background: '#fef3c7', text: '#78350f' },
  rose: { background: '#ffe4e6', text: '#881337' },
  slate: { background: '#e2e8f0', text: '#1e293b' },
} as const;

export const MAX_TAGS = 2;
export const MAX_TAG_NAME = 40;

export function validateTag(name: unknown, color: unknown) {
  if (typeof name !== 'string' || typeof color !== 'string') {
    throw new Error('tags.invalid');
  }

  const trimmed = name.trim().normalize('NFC');

  if (
    !trimmed ||
    trimmed.length > MAX_TAG_NAME ||
    !Object.hasOwn(TAG_COLORS, color)
  ) {
    throw new Error('tags.invalid');
  }

  return { name: trimmed, normalizedName: trimmed.toLowerCase(), color };
}

export function validateTagIds(value: unknown): string[] {
  if (value === undefined) return [];

  if (
    !Array.isArray(value) ||
    value.length > MAX_TAGS ||
    value.some((id) => typeof id !== 'string' || !id)
  ) {
    throw new Error('tags.maxTwo');
  }

  return [...new Set(value)];
}
