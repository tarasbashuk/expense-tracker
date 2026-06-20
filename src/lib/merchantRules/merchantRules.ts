import { db } from '@/lib/db';

const COUNTRY_PREFIX_PATTERN =
  /^(AD|AE|AL|AM|AR|AT|AU|BE|BG|BR|CA|CH|CN|CY|CZ|DE|DK|EE|ES|FI|FR|GB|GE|GR|HK|HR|HU|IE|IL|IN|IS|IT|JP|KR|LT|LU|LV|MA|MC|MD|ME|MT|MX|NL|NO|PL|PT|RO|RS|SE|SG|SI|SK|TR|UA|UK|US)\s+/;

export const normalizeMerchantPattern = (value: string): string => {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[*#]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(COUNTRY_PREFIX_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
};

export const getMerchantCategoryRules = async (userId: string) => {
  return db.merchantCategoryRule.findMany({
    where: { userId },
    orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
    take: 50,
  });
};

export const formatMerchantRulesForPrompt = (
  rules: Array<{ merchantPattern: string; category: string }>,
) => {
  if (!rules.length) {
    return 'No user-specific merchant rules yet.';
  }

  return rules
    .map((rule) => `- ${rule.merchantPattern} -> ${rule.category}`)
    .join('\n');
};

export const findMerchantRuleMatch = (
  merchant: string,
  rules: Array<{ merchantPattern: string; category: string }>,
) => {
  const normalizedMerchant = normalizeMerchantPattern(merchant);

  if (!normalizedMerchant) {
    return undefined;
  }

  return rules.find((rule) => {
    const normalizedRule = normalizeMerchantPattern(rule.merchantPattern);

    if (!normalizedRule) {
      return false;
    }

    return (
      normalizedMerchant === normalizedRule ||
      normalizedMerchant.includes(normalizedRule) ||
      normalizedRule.includes(normalizedMerchant)
    );
  });
};

export const upsertMerchantCategoryRule = async ({
  userId,
  merchant,
  category,
}: {
  userId: string;
  merchant: string;
  category: string;
}) => {
  const merchantPattern = normalizeMerchantPattern(merchant);

  if (!merchantPattern || !category) {
    return null;
  }

  return db.merchantCategoryRule.upsert({
    where: {
      userId_merchantPattern: {
        userId,
        merchantPattern,
      },
    },
    update: {
      category,
      useCount: { increment: 1 },
    },
    create: {
      userId,
      merchantPattern,
      category,
    },
  });
};
