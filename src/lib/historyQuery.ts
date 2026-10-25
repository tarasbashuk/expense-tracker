import { TransactionType } from '@prisma/client';
import {
  ExpenseCategory,
  IncomeCategory,
  NavigationPath,
} from '@/constants/types';
import {
  dateKeyFromLocalDate,
  DateRangeValue,
  getPeriodRange,
  getUtcDate,
  PeriodMode,
} from './dateRange';

export interface HistoryFilters {
  type: TransactionType | 'all';
  category: string;
  recurringOnly: boolean;
  search: string;
  tagIds?: string[];
}

export interface HistoryQuery extends HistoryFilters {
  periodMode: PeriodMode;
  anchorDate: string;
  customRange: DateRangeValue;
}

const categories = new Set<string>([
  ...Object.values(ExpenseCategory),
  ...Object.values(IncomeCategory),
]);
const modes = new Set(['month', 'quarter', 'year', 'custom']);

export const emptyHistoryFilters: HistoryFilters = {
  type: 'all',
  category: 'all',
  recurringOnly: false,
  search: '',
  tagIds: [],
};

export function defaultHistoryQuery(now = new Date()): HistoryQuery {
  const anchorDate = dateKeyFromLocalDate(now);
  const range = getPeriodRange('month', anchorDate, {
    start: anchorDate,
    end: anchorDate,
  });

  return {
    ...emptyHistoryFilters,
    periodMode: 'month',
    anchorDate,
    customRange: { start: range.start, end: anchorDate },
  };
}

export function validDateKey(value: string | null): value is string {
  if (!value || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = getUtcDate(value);

  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function parseHistoryQuery(
  query: string,
  now = new Date(),
): HistoryQuery {
  const params = new URLSearchParams(query);
  const defaults = defaultHistoryQuery(now);
  const date = params.get('date');
  const start = params.get('start');
  const end = params.get('end');
  const type = params.get('type');
  const category = params.get('category');
  const mode = params.get('period');
  const tagIds = [
    ...new Set(params.getAll('tag').filter((id) => /^[\w-]{1,128}$/.test(id))),
  ];

  return {
    periodMode: modes.has(mode ?? '') ? (mode as PeriodMode) : 'month',
    anchorDate: validDateKey(date) ? date : defaults.anchorDate,
    customRange:
      validDateKey(start) && validDateKey(end) && start <= end
        ? { start, end }
        : defaults.customRange,
    type:
      type === TransactionType.Income || type === TransactionType.Expense
        ? type
        : 'all',
    category:
      category &&
      (categories.has(category) || /^custom:[\w-]{1,128}$/.test(category))
        ? category
        : 'all',
    search: params.get('q') ?? '',
    recurringOnly: params.get('recurring') === '1',
    tagIds,
  };
}

export function serializeHistoryQuery(value: HistoryQuery): string {
  const params = new URLSearchParams({
    period: value.periodMode,
    date: value.anchorDate,
    start: value.customRange.start,
    end: value.customRange.end,
  });

  if (value.type !== 'all') {
    params.set('type', value.type);
  }

  if (value.category !== 'all') {
    params.set('category', value.category);
  }

  if (value.search) {
    params.set('q', value.search);
  }

  if (value.recurringOnly) {
    params.set('recurring', '1');
  }

  for (const id of [...new Set(value.tagIds ?? [])]) {
    params.append('tag', id);
  }

  return params.toString();
}

export function historyMonthHref(
  year: number,
  month: number,
  type: HistoryFilters['type'] = 'all',
  category: HistoryFilters['category'] = 'all',
): string {
  const anchorDate = dateKeyFromLocalDate(new Date(year, month, 1));
  const customRange = getPeriodRange('month', anchorDate, {
    start: anchorDate,
    end: anchorDate,
  });
  const query = serializeHistoryQuery({
    ...emptyHistoryFilters,
    periodMode: 'month',
    anchorDate,
    customRange,
    type,
    category,
  });

  return `${NavigationPath.Transactions}?${query}`;
}
