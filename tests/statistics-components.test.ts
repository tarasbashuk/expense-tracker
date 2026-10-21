// @vitest-environment jsdom

import { createElement } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Stats from '@/components/Stats';
import YearlyStatsContent from '@/components/YearlyStatsContent';
import { messages } from '@/locales';

const mocks = vi.hoisted(() => ({
  stats: vi.fn(),
  totals: vi.fn(),
  yearly: vi.fn(),
  bar: vi.fn(),
  pie: vi.fn(),
}));

vi.mock('@/app/actions/getStats', () => ({ default: mocks.stats }));

vi.mock('@/app/actions/getIncomeExpense', () => ({ default: mocks.totals }));

vi.mock('@/app/actions/getYearlyStats', () => ({
  getYearlyStats: mocks.yearly,
}));

vi.mock('@/components/history/HistoryHeaderActions', () => ({
  default: () => null,
}));

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({
    settings: { defaultCurrency: 'EUR' },
    locale: 'en-US',
  }),
}));

vi.mock('@mui/x-charts/BarChart', () => ({
  BarChart: (props: unknown) => {
    mocks.bar(props);

    return null;
  },
}));

vi.mock('@mui/x-charts/PieChart', () => ({
  PieChart: (props: unknown) => {
    mocks.pie(props);

    return null;
  },
}));

function show(component: typeof Stats | typeof YearlyStatsContent) {
  return render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(component),
    ),
  );
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mocks.stats.mockResolvedValue({
    expenseChartData: [
      { id: 0, label: 'education', value: 75.25 },
      { id: 1, label: 'groceries', value: 24.75 },
    ],
    incomeChartData: [{ id: 0, label: 'salary', value: 150.5 }],
  });
  mocks.totals.mockResolvedValue({ income: 150.5, expense: 100 });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('both category modes expose exact amounts and shares, with collapsible totals', async () => {
  const user = userEvent.setup();
  const view = show(Stats);
  await screen.findByText('75.25 €');

  expect(screen.getByText('75.3%')).toBeTruthy();
  expect(screen.getByText('24.8%')).toBeTruthy();
  expect(view.container.querySelectorAll('li')).toHaveLength(2);

  await user.click(screen.getByRole('checkbox'));

  expect(screen.getByText('+50.5 €')).toBeTruthy();

  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Donut' }));

  expect(screen.queryByText('+50.5 €')).toBeNull();
  expect(screen.getByText('100 €')).toBeTruthy();
  expect(mocks.pie.mock.lastCall?.[0].series[0].innerRadius).toBeGreaterThan(0);

  act(() => mocks.pie.mock.lastCall?.[0].onItemClick(null, { dataIndex: 0 }));

  expect(view.container.querySelector('li[aria-current="true"]')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'INCOME' }));

  expect(screen.getAllByText('150.5 €')).toHaveLength(2);
  expect(screen.getByText('100.0%')).toBeTruthy();
});

test('zero categories show finite percentages and empty datasets keep period controls', async () => {
  mocks.stats.mockResolvedValue({
    expenseChartData: [{ label: 'others', value: 0 }],
    incomeChartData: [],
  });
  const user = userEvent.setup();
  show(Stats);
  await screen.findByText('0.0%');

  await user.click(screen.getByRole('button', { name: 'INCOME' }));

  expect(
    screen.getByText(messages['en-US']['stats.noDataForMonth']),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'previous' })).toBeTruthy();
});

test('failed statistics requests show an error without misleading totals', async () => {
  mocks.stats.mockRejectedValue(new Error('offline'));
  show(Stats);

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('mobile half-year changes only the six plotted months and keeps the annual axis and totals', async () => {
  const income = [10.25, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0];
  mocks.yearly.mockResolvedValue({
    data: {
      monthlyIncome: income,
      monthlyExpense: Array(12).fill(0),
      monthlyTransactionCounts: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    },
  });
  const user = userEvent.setup();
  show(YearlyStatsContent);
  await screen.findByText('By month');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Jan–Jun' }));

  const first = mocks.bar.mock.lastCall?.[0];
  expect(first.series[0].data).toHaveLength(6);
  expect(first.series[0].data[0]).toBe(10.25);
  expect(screen.getByText('210.25 €')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Jul–Dec' }));

  const second = mocks.bar.mock.lastCall?.[0];
  expect(second.series[0].data).toHaveLength(6);
  expect(second.series[0].data[0]).toBe(200);
  expect(second.yAxis[0].max).toBe(first.yAxis[0].max);
  expect(screen.getByText('210.25 €')).toBeTruthy();
  expect(screen.getByText('January')).toBeTruthy();
  expect(screen.getByText('July')).toBeTruthy();
  await waitFor(() => expect(mocks.yearly).toHaveBeenCalledTimes(1));
});

test('desktop yearly view renders all months and a non-navigating monthly table', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mocks.yearly.mockResolvedValue({
    data: {
      monthlyIncome: [100.25],
      monthlyExpense: [125.5],
      monthlyTransactionCounts: [2],
    },
  });
  const view = show(YearlyStatsContent);
  await screen.findByRole('table');

  expect(mocks.bar.mock.lastCall?.[0].series[0].data).toHaveLength(12);
  expect(screen.getByText('-25.25 €')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Jan–Jun' })).toBeNull();
  expect(view.container.querySelector('a')).toBeNull();
});
