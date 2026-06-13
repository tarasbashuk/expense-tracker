import { Currency, Transaction, TransactionType } from '@prisma/client';

import { db } from '@/lib/db';
import { normalizeMerchantPattern } from '@/lib/merchantRules/merchantRules';

type ImportCandidate = {
  status: string;
  date: string | null;
  text: string;
  amount: number | null;
  currency: Currency | null;
  type: TransactionType | null;
  matchReason?: string;
  warnings: string[];
};

type DuplicateMatchLevel = 'alreadyExists' | 'possibleDuplicate';

type DuplicateMatch = {
  level: DuplicateMatchLevel;
  transaction: Pick<
    Transaction,
    'id' | 'text' | 'amount' | 'currency' | 'type' | 'date'
  >;
  reason: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

const formatTransactionDate = (date: Date) =>
  date.toISOString().slice(0, 10);

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

  return matchingTokens.length / Math.max(candidateTokens.length, existingTokens.length);
};

const isExactAmountMatch = (candidateAmount: number, transactionAmount: number) =>
  Math.abs(candidateAmount - transactionAmount) < 0.01;

const isRoundedAmountMatch = (
  candidateAmount: number,
  transactionAmount: number,
) =>
  Math.round(candidateAmount) === Math.round(transactionAmount) &&
  Math.abs(candidateAmount - transactionAmount) < 1;

const describeMatch = (
  transaction: DuplicateMatch['transaction'],
  level: DuplicateMatchLevel,
  details: string,
) => {
  const prefix =
    level === 'alreadyExists'
      ? 'Matched existing transaction'
      : 'Possible duplicate of existing transaction';

  return `${prefix}: ${transaction.text}, ${formatTransactionDate(
    transaction.date,
  )}, ${transaction.amount} ${transaction.currency}. ${details}`;
};

export const findDuplicateMatch = (
  candidate: ImportCandidate,
  existingTransactions: DuplicateMatch['transaction'][],
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

    if (dayDistance > 1) {
      continue;
    }

    const merchantScore = getMerchantScore(candidate.text, transaction.text);
    const exactAmount = isExactAmountMatch(candidate.amount, transaction.amount);
    const roundedAmount = isRoundedAmountMatch(
      candidate.amount,
      transaction.amount,
    );

    if (exactAmount && merchantScore >= 0.6) {
      return {
        level: 'alreadyExists',
        transaction,
        reason: describeMatch(
          transaction,
          'alreadyExists',
          dayDistance === 0
            ? 'Same date, currency, type, amount, and similar merchant.'
            : 'Date is within 1 day, with same currency, type, amount, and similar merchant.',
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
          'Same date, currency, type, and amount; merchant is not a strong match.',
        ),
      };
    }

    if (roundedAmount && merchantScore >= 0.45) {
      bestPossibleMatch = {
        level: 'possibleDuplicate',
        transaction,
        reason: describeMatch(
          transaction,
          'possibleDuplicate',
          'Date is within 1 day and amount matches when rounded to whole units.',
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
  const startDate = new Date(minTime - MS_PER_DAY);
  const endDate = new Date(maxTime + MS_PER_DAY);

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
    },
  });
};

export const applyDuplicateMatches = async <T extends ImportCandidate>(
  userId: string,
  candidates: T[],
) => {
  const existingTransactions = await getExistingTransactionsForImport(
    userId,
    candidates,
  );

  return candidates.map((candidate) => {
    const match = findDuplicateMatch(candidate, existingTransactions);

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
