import { beforeEach, expect, test, vi } from 'vitest';
import getStats from '@/app/actions/getStats';
import getSettings from '@/app/actions/getSettings';
import getTransactions from '@/app/actions/getTransactions';
import { DEFAULT_SETTINGS, isCreditCardCategory } from '@/constants/constants';
import { transaction } from './fixtures';

vi.mock('@/app/actions/getSettings', () => ({ default: vi.fn() }));
vi.mock('@/app/actions/getTransactions', () => ({ default: vi.fn() }));

const records = [
  transaction({ amountDefaultCurrency: 25.75, isCreditTransaction: true }),
  transaction({ category: 'CCRepayment', amountDefaultCurrency: 100 }),
  transaction({
    type: 'Income',
    category: 'salary',
    amountDefaultCurrency: 500,
  }),
  transaction({
    type: 'Income',
    category: 'creditReceived',
    amountDefaultCurrency: 100,
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTransactions).mockImplementation(
    async (_start, _end, excludeCredit) => ({
      transactions: excludeCredit
        ? records.filter((record) => !isCreditCardCategory(record.category))
        : records,
    }),
  );
});

test.each([false, true])(
  'statistics respects credit tracking enabled=%s',
  async (enabled) => {
    vi.mocked(getSettings).mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, creditCardTrackingEnabled: enabled },
    });

    const result = await getStats(2026, 9);

    expect(
      result.expenseChartData?.reduce((sum, item) => sum + item.value, 0),
    ).toBe(enabled ? 125.75 : 25.75);
    expect(
      result.incomeChartData?.reduce((sum, item) => sum + item.value, 0),
    ).toBe(enabled ? 600 : 500);
    expect(getTransactions).toHaveBeenCalledWith(
      '2026-10-01',
      '2026-10-31',
      !enabled,
    );
  },
);

test('missing settings defaults to disabled credit tracking', async () => {
  vi.mocked(getSettings).mockResolvedValue({ settings: null });

  const result = await getStats(2026, 9);

  expect(result.expenseChartData?.map((item) => item.value)).toEqual([25.75]);
  expect(result.incomeChartData?.map((item) => item.value)).toEqual([500]);
});

test('settings errors do not produce misleading statistics', async () => {
  vi.mocked(getSettings).mockResolvedValue({ error: 'Database error' });

  const result = await getStats(2026, 9);

  expect(result).toEqual({ error: 'Database error' });
  expect(getTransactions).not.toHaveBeenCalled();
});
