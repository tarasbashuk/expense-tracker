export type PeriodMode = 'month' | 'quarter' | 'year' | 'custom';

export interface DateRangeValue {
  start: string;
  end: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => value.toString().padStart(2, '0');

const dateKeyFromUtcDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const utcDateFromKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

export const dateKeyFromLocalDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const localDateFromKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

export const getPeriodRange = (
  mode: PeriodMode,
  anchorDate: string,
  customRange: DateRangeValue,
): DateRangeValue => {
  if (mode === 'custom') return customRange;

  const anchor = utcDateFromKey(anchorDate);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();

  if (mode === 'year') {
    return {
      start: dateKeyFromUtcDate(new Date(Date.UTC(year, 0, 1))),
      end: dateKeyFromUtcDate(new Date(Date.UTC(year, 12, 0))),
    };
  }

  const startMonth = mode === 'quarter' ? Math.floor(month / 3) * 3 : month;
  const monthCount = mode === 'quarter' ? 3 : 1;

  return {
    start: dateKeyFromUtcDate(new Date(Date.UTC(year, startMonth, 1))),
    end: dateKeyFromUtcDate(
      new Date(Date.UTC(year, startMonth + monthCount, 0)),
    ),
  };
};

export const shiftPeriod = (
  mode: PeriodMode,
  anchorDate: string,
  customRange: DateRangeValue,
  direction: -1 | 1,
): { anchorDate: string; customRange: DateRangeValue } => {
  if (mode === 'custom') {
    const start = utcDateFromKey(customRange.start);
    const end = utcDateFromKey(customRange.end);
    const inclusiveDayCount =
      Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1;
    const offset = inclusiveDayCount * direction;

    start.setUTCDate(start.getUTCDate() + offset);
    end.setUTCDate(end.getUTCDate() + offset);

    return {
      anchorDate,
      customRange: {
        start: dateKeyFromUtcDate(start),
        end: dateKeyFromUtcDate(end),
      },
    };
  }

  const anchor = utcDateFromKey(anchorDate);

  if (mode === 'year') {
    anchor.setUTCFullYear(anchor.getUTCFullYear() + direction);
  } else {
    anchor.setUTCMonth(
      anchor.getUTCMonth() + (mode === 'quarter' ? 3 : 1) * direction,
      1,
    );
  }

  return { anchorDate: dateKeyFromUtcDate(anchor), customRange };
};

export const getExclusiveEndDate = (inclusiveEndDate: string) => {
  const endDate = utcDateFromKey(inclusiveEndDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return endDate;
};

export const getUtcDate = (dateKey: string) => utcDateFromKey(dateKey);
