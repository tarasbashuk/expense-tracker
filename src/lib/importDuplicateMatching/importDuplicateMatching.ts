import {
  Currency,
  Language,
  Transaction,
  TransactionType,
} from '@prisma/client';

import { ExpenseCategory } from '@/constants/types';
import { db } from '@/lib/db';
import { normalizeMerchantPattern } from '@/lib/merchantRules/merchantRules';

type ImportCandidate = {
  status: string;
  date: string | null;
  text: string;
  amount: number | null;
  currency: Currency | null;
  type: TransactionType | null;
  category: string;
  allowWeakMerchantDateMatch?: boolean;
  matchReason?: string;
  warnings: string[];
};

type DuplicateMatchLevel = 'alreadyExists' | 'possibleDuplicate';

type DuplicateMatch = {
  level: DuplicateMatchLevel;
  transaction: Pick<
    Transaction,
    'id' | 'text' | 'amount' | 'currency' | 'type' | 'date' | 'category'
  >;
  reason: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DUPLICATE_DATE_WINDOW_DAYS = 2;
const MERCHANT_EXACT_AMOUNT_SCORE = 0.6;
const MERCHANT_POSSIBLE_AMOUNT_SCORE = 0.45;
const DINING_AMOUNT_TOLERANCE = 0.1;
const MIN_STRONG_MERCHANT_TOKEN_LENGTH = 5;
const GENERIC_MERCHANT_TOKENS = new Set([
  'CARD',
  'COMPRA',
  'PAYMENT',
  'PURCHASE',
  'ONLINE',
  'MARKET',
  'STORE',
  'SHOP',
  'WWW',
]);

const parseImportDate = (value: string | null) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const toDateOnlyTime = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const getDayDistance = (left: Date, right: Date) =>
  Math.abs(toDateOnlyTime(left) - toDateOnlyTime(right)) / MS_PER_DAY;

const formatTransactionDate = (date: Date) => date.toISOString().slice(0, 10);

const normalizeTokens = (value: string) =>
  normalizeMerchantPattern(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const getMerchantScore = (candidateText: string, transactionText: string) => {
  const candidate = normalizeMerchantPattern(candidateText);
  const existing = normalizeMerchantPattern(transactionText);

  if (!candidate || !existing) return 0;
  if (candidate === existing) return 1;
  if (candidate.includes(existing) || existing.includes(candidate)) return 0.9;

  const candidateTokens = normalizeTokens(candidate);
  const existingTokens = normalizeTokens(existing);

  if (!candidateTokens.length || !existingTokens.length) return 0;

  const matchingTokens = candidateTokens.filter((token) =>
    existingTokens.some(
      (existingToken) =>
        token === existingToken ||
        token.includes(existingToken) ||
        existingToken.includes(token),
    ),
  );

  const tokenScore =
    matchingTokens.length /
    Math.max(candidateTokens.length, existingTokens.length);
  const hasStrongSharedMerchantToken = matchingTokens.some(
    (token) =>
      token.length >= MIN_STRONG_MERCHANT_TOKEN_LENGTH &&
      !GENERIC_MERCHANT_TOKENS.has(token),
  );

  if (hasStrongSharedMerchantToken) {
    return Math.max(tokenScore, MERCHANT_EXACT_AMOUNT_SCORE);
  }

  return tokenScore;
};

const isExactAmountMatch = (
  candidateAmount: number,
  transactionAmount: number,
) => Math.abs(candidateAmount - transactionAmount) < 0.01;

const isRoundedAmountMatch = (
  candidateAmount: number,
  transactionAmount: number,
) =>
  Math.round(candidateAmount) === Math.round(transactionAmount) &&
  Math.abs(candidateAmount - transactionAmount) < 1;

const isDiningCategory = (category: string | null | undefined) =>
  category === ExpenseCategory.Dining;

const isAmountWithinDiningTolerance = (
  candidateAmount: number,
  transactionAmount: number,
) => {
  const largerAmount = Math.max(candidateAmount, transactionAmount);

  if (largerAmount <= 0) return false;

  return (
    Math.abs(candidateAmount - transactionAmount) / largerAmount <=
    DINING_AMOUNT_TOLERANCE
  );
};

const describeMatch = (
  transaction: DuplicateMatch['transaction'],
  level: DuplicateMatchLevel,
  details: string,
  language: Language,
) => {
  const prefix =
    level === 'alreadyExists'
      ? language === Language.UKR
        ? 'Знайдено наявну транзакцію'
        : 'Matched existing transaction'
      : language === Language.UKR
        ? 'Можливий дублікат наявної транзакції'
        : 'Possible duplicate of existing transaction';

  return `${prefix}: ${transaction.text}, ${formatTransactionDate(
    transaction.date,
  )}, ${transaction.amount} ${transaction.currency}. ${details}`;
};

export const findDuplicateMatch = (
  candidate: ImportCandidate,
  existingTransactions: DuplicateMatch['transaction'][],
  language: Language = Language.ENG,
): DuplicateMatch | null => {
  const candidateDate = parseImportDate(candidate.date);

  if (
    candidate.status === 'ignored' ||
    !candidateDate ||
    !candidate.amount ||
    candidate.amount <= 0 ||
    !candidate.currency ||
    !candidate.type
  ) {
    return null;
  }

  let bestPossibleMatch: DuplicateMatch | null = null;

  for (const transaction of existingTransactions) {
    if (
      transaction.currency !== candidate.currency ||
      transaction.type !== candidate.type
    ) {
      continue;
    }

    const dayDistance = getDayDistance(candidateDate, transaction.date);

    if (dayDistance > DUPLICATE_DATE_WINDOW_DAYS) {
      continue;
    }

    const merchantScore = getMerchantScore(candidate.text, transaction.text);
    const exactAmount = isExactAmountMatch(
      candidate.amount,
      transaction.amount,
    );
    const roundedAmount = isRoundedAmountMatch(
      candidate.amount,
      transaction.amount,
    );

    if (exactAmount && merchantScore >= MERCHANT_EXACT_AMOUNT_SCORE) {
      if (dayDistance > 0) {
        bestPossibleMatch = {
          level: 'possibleDuplicate',
          transaction,
          reason: describeMatch(
            transaction,
            'possibleDuplicate',
            language === Language.UKR
              ? `Дата відрізняється не більше ніж на ${DUPLICATE_DATE_WINDOW_DAYS} дні; валюта, тип і сума збігаються, а продавець схожий.`
              : `Date is within ${DUPLICATE_DATE_WINDOW_DAYS} days, with same currency, type, amount, and similar merchant.`,
            language,
          ),
        };

        continue;
      }

      return {
        level: 'alreadyExists',
        transaction,
        reason: describeMatch(
          transaction,
          'alreadyExists',
          language === Language.UKR
            ? 'Дата, валюта, тип і сума збігаються, а продавець схожий.'
            : 'Same date, currency, type, amount, and similar merchant.',
          language,
        ),
      };
    }

    if (exactAmount && dayDistance === 0) {
      bestPossibleMatch = {
        level: 'possibleDuplicate',
        transaction,
        reason: describeMatch(
          transaction,
          'possibleDuplicate',
          language === Language.UKR
            ? 'Дата, валюта, тип і сума збігаються, але продавець не має надійного збігу.'
            : 'Same date, currency, type, and amount; merchant is not a strong match.',
          language,
        ),
      };
    }

    if (
      exactAmount &&
      dayDistance > 0 &&
      candidate.allowWeakMerchantDateMatch
    ) {
      bestPossibleMatch = {
        level: 'possibleDuplicate',
        transaction,
        reason: describeMatch(
          transaction,
          'possibleDuplicate',
          language === Language.UKR
            ? `Транзакція з виписки має ту саму валюту, тип і точну суму в межах ${DUPLICATE_DATE_WINDOW_DAYS} днів; продавець відсутній або не має надійного збігу.`
            : `Statement transaction has the same currency, type, and exact amount within ${DUPLICATE_DATE_WINDOW_DAYS} days; merchant is unavailable or not a strong match.`,
          language,
        ),
      };
    }

    if (!exactAmount && roundedAmount && dayDistance === 0) {
      const details =
        merchantScore >= MERCHANT_POSSIBLE_AMOUNT_SCORE
          ? language === Language.UKR
            ? 'Дата, валюта й тип збігаються, а сума збігається після округлення до цілого.'
            : 'Same date, currency, type, and amount matches when rounded to whole units.'
          : language === Language.UKR
            ? 'Дата, валюта й тип збігаються, а сума збігається після округлення до цілого, але продавець не має надійного збігу.'
            : 'Same date, currency, and type; amount matches when rounded to whole units, but merchant is not a strong match.';

      bestPossibleMatch = {
        level: 'possibleDuplicate',
        transaction,
        reason: describeMatch(
          transaction,
          'possibleDuplicate',
          details,
          language,
        ),
      };
    }

    const diningAmountMatch =
      dayDistance === 0 &&
      !exactAmount &&
      !roundedAmount &&
      (isDiningCategory(candidate.category) ||
        isDiningCategory(transaction.category)) &&
      merchantScore >= MERCHANT_POSSIBLE_AMOUNT_SCORE &&
      isAmountWithinDiningTolerance(candidate.amount, transaction.amount);

    if (diningAmountMatch) {
      bestPossibleMatch = {
        level: 'possibleDuplicate',
        transaction,
        reason: describeMatch(
          transaction,
          'possibleDuplicate',
          language === Language.UKR
            ? `Та сама дата й схожий заклад харчування; сума відрізняється не більше ніж на ${Math.round(
                DINING_AMOUNT_TOLERANCE * 100,
              )}% і може включати чайові або ручне округлення.`
            : `Same date and similar dining merchant; amount is within ${Math.round(
                DINING_AMOUNT_TOLERANCE * 100,
              )}% of an existing transaction, which may include tips or manual rounding.`,
          language,
        ),
      };
    }
  }

  return bestPossibleMatch;
};

export const getExistingTransactionsForImport = async (
  userId: string,
  candidates: ImportCandidate[],
) => {
  const parsedDates = candidates
    .map((candidate) => parseImportDate(candidate.date))
    .filter((date): date is Date => Boolean(date));

  if (!parsedDates.length) {
    return [];
  }

  const minTime = Math.min(...parsedDates.map((date) => date.getTime()));
  const maxTime = Math.max(...parsedDates.map((date) => date.getTime()));
  const dateWindowMs = DUPLICATE_DATE_WINDOW_DAYS * MS_PER_DAY;
  const startDate = new Date(minTime - dateWindowMs);
  const endDate = new Date(maxTime + dateWindowMs);

  return db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      text: true,
      amount: true,
      currency: true,
      type: true,
      date: true,
      category: true,
    },
  });
};

export const applyDuplicateMatches = async <T extends ImportCandidate>(
  userId: string,
  candidates: T[],
  language: Language = Language.ENG,
) => {
  const existingTransactions = await getExistingTransactionsForImport(
    userId,
    candidates,
  );

  return candidates.map((candidate) => {
    const match = findDuplicateMatch(candidate, existingTransactions, language);

    if (!match) {
      return candidate;
    }

    return {
      ...candidate,
      status: match.level,
      matchReason: candidate.matchReason
        ? `${candidate.matchReason} ${match.reason}`
        : match.reason,
      warnings:
        match.level === 'possibleDuplicate'
          ? [...candidate.warnings, match.reason]
          : candidate.warnings,
    };
  });
};
