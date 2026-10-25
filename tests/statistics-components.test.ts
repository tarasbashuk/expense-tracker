// @vitest-environment jsdom

import { installUrlTest } from './url-test-helpers';
import { createElement, ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Stats from '@/components/Stats';
import YearlyStatsContent from '@/components/YearlyStatsContent';
import { messages } from '@/locales';
import { EXPENSE_CATEGORIES_LIST } from '@/constants/constants';

vi.mock('next/navigation', async () => ({
  useSearchParams: (await import('./url-test-helpers')).useTestSearchParams,
}));

const mocks = vi.hoisted(() => ({
  stats: vi.fn(),
  totals: vi.fn(),
  yearly: vi.fn(),
  bar: vi.fn(),
  pie: vi.fn(),
}));

// Keep server-only Prisma and Clerk dependencies out of component tests.
vi.mock('@/app/actions/customCategories', () => ({
  getCustomCategories: vi.fn().mockResolvedValue({ categories: [] }),
  saveCustomCategory: vi.fn(),
  archiveCustomCategory: vi.fn(),
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

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@mui/x-date-pickers/DateCalendar', () => ({
  DateCalendar: ({ onChange }: { onChange: (_date: Date) => void }) =>
    createElement(
      'button',
      { onClick: () => onChange(new Date(2025, 7, 1)) },
      'Choose August 2025',
    ),
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

function show(
  component: typeof Stats | typeof YearlyStatsContent,
  locale: 'en-US' | 'uk-UA' = 'en-US',
) {
  return render(
    createElement(
      IntlProvider,
      { locale, messages: messages[locale] },
      createElement(component),
    ),
  );
}

beforeEach(() => {
  installUrlTest('/stats');
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

  await user.click(screen.getByRole('button', { name: 'Period summary' }));

  expect(screen.getByText('+50.50 €')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Period summary' }));
  await user.click(screen.getByRole('button', { name: 'Donut' }));

  await waitFor(() => expect(screen.queryByText('+50.50 €')).toBeNull());
  expect(screen.getByText('100.00 €')).toBeTruthy();
  expect(mocks.pie.mock.lastCall?.[0].series[0].innerRadius).toBeGreaterThan(0);

  act(() => mocks.pie.mock.lastCall?.[0].onItemClick(null, { dataIndex: 0 }));

  expect(view.container.querySelector('li[aria-current="true"]')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'INCOME' }));

  expect(screen.getAllByText('150.50 €')).toHaveLength(2);
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
  expect(screen.getByRole('button', { name: 'Previous period' })).toBeTruthy();
});

test('failed statistics requests show an error without misleading totals', async () => {
  mocks.stats.mockRejectedValue(new Error('offline'));
  show(Stats);

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Period summary' })).toBeNull();
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
  await user.click(screen.getByRole('button', { name: 'Period summary' }));
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
  expect(view.container.querySelector('a')?.getAttribute('href')).toContain(
    '/transactions?',
  );
});

test('all expense categories remain visible in both modes with a badge independent of summary visibility', async () => {
  const categories = EXPENSE_CATEGORIES_LIST.map(({ value }, index) => ({
    label: value,
    value: index + 0.25,
  }));
  mocks.stats.mockResolvedValue({
    expenseChartData: categories,
    incomeChartData: [],
  });
  const user = userEvent.setup();
  const view = show(Stats);
  await screen.findByRole('list');

  expect(view.container.querySelectorAll('li')).toHaveLength(categories.length);
  expect(screen.getByText('Incomplete month')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Period summary' }));
  await user.click(screen.getByRole('button', { name: 'Period summary' }));
  await user.click(screen.getByRole('button', { name: 'Donut' }));

  expect(view.container.querySelectorAll('li')).toHaveLength(categories.length);
  expect(mocks.pie.mock.lastCall?.[0].series[0].data).toHaveLength(
    categories.length,
  );
  expect(screen.getByText('Incomplete month')).toBeTruthy();
  expect(screen.getAllByRole('link')).toHaveLength(categories.length);
});

test('the month and year picker applies only on confirmation and preserves the expanded summary', async () => {
  const user = userEvent.setup();
  show(Stats);
  await screen.findByText('75.25 €');
  await user.click(screen.getByRole('button', { name: 'Period summary' }));
  await user.click(
    screen.getByRole('button', { name: /Choose month and year:/ }),
  );
  await user.click(screen.getByRole('button', { name: 'Choose August 2025' }));

  expect(mocks.stats).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole('button', { name: 'Apply' }));
  await waitFor(() => expect(mocks.stats).toHaveBeenLastCalledWith(2025, 7));

  expect(
    screen
      .getByRole('button', { name: 'Period summary' })
      .getAttribute('aria-expanded'),
  ).toBe('true');
  expect(screen.queryByText('Incomplete month')).toBeNull();
  expect(await screen.findByText('+50.50 €')).toBeTruthy();
});

test('Ukrainian analytics share the same two-decimal formatter across totals, categories and donut tooltip', async () => {
  mocks.stats.mockResolvedValue({
    expenseChartData: [{ label: 'education', value: 470 }],
    incomeChartData: [],
  });
  mocks.totals.mockResolvedValue({ income: 6772.56, expense: 470 });
  const user = userEvent.setup();
  show(Stats, 'uk-UA');
  await screen.findByText('470,00 €');
  await user.click(screen.getByRole('button', { name: 'Підсумки періоду' }));

  expect(screen.getByText('+6 302,56 €')).toBeTruthy();
  expect(screen.getAllByText('470,00 €')).toHaveLength(2);

  await user.click(screen.getByRole('button', { name: 'Donut' }));

  expect(screen.getAllByText('470,00 €')).toHaveLength(3);
  expect(
    mocks.pie.mock.lastCall?.[0].series[0].valueFormatter({ value: 470 }),
  ).toBe('470,00 €');
});

test('yearly chart labels incomplete and missing months and formats precise tooltip values without changing totals', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const currentMonth = new Date().getMonth();
  const income = Array<number>(12).fill(0);
  const counts = Array<number>(12).fill(0);
  income[currentMonth] = 100.125;
  counts[currentMonth] = 1;
  mocks.yearly.mockResolvedValue({
    data: {
      monthlyIncome: income,
      monthlyExpense: Array(12).fill(0),
      monthlyTransactionCounts: counts,
    },
  });
  show(YearlyStatsContent, 'uk-UA');
  await screen.findByRole('table');

  const chart = mocks.bar.mock.lastCall?.[0];
  expect(chart.series[0].data[currentMonth]).toBe(100.125);
  expect(chart.series[0].valueFormatter(100.125)).toBe('100,13 €');
  expect(chart.series[0].valueFormatter(null)).toBe('—');
  expect(
    chart.xAxis[0].valueFormatter(currentMonth, { location: 'tick' }),
  ).toMatch(/\*$/);
  expect(
    chart.xAxis[0].valueFormatter(currentMonth, { location: 'tooltip' }),
  ).toContain('Неповний місяць');
  expect(chart.yAxis[0].max).toBeCloseTo(110.1375);

  if (currentMonth < 11) {
    expect(chart.series[0].data[currentMonth + 1]).toBeNull();
    expect(
      chart.xAxis[0].valueFormatter(currentMonth + 1, { location: 'tick' }),
    ).toMatch(/—$/);
  }
});

test('category links carry the selected month, type and category while clicking a sector only selects it', async () => {
  window.history.replaceState(
    null,
    '',
    '/stats?year=2025&month=8&chart=pie&type=Expense',
  );
  show(Stats);
  const link = await screen.findByRole('link', { name: /Education/ });
  const destination = new URL(
    link.getAttribute('href')!,
    'https://example.test',
  );
  const source = window.location.href;

  expect(mocks.stats).toHaveBeenCalledExactlyOnceWith(2025, 7);
  expect(destination.pathname).toBe('/transactions');
  expect(destination.searchParams.get('date')).toBe('2025-08-01');
  expect(destination.searchParams.get('category')).toBe('education');
  expect(destination.searchParams.get('type')).toBe('Expense');
  expect(destination.searchParams.has('q')).toBe(false);
  expect(destination.searchParams.has('tag')).toBe(false);

  act(() => mocks.pie.mock.lastCall?.[0].onItemClick(null, { dataIndex: 0 }));

  expect(window.location.href).toBe(source);
  expect(mocks.pie.mock.lastCall?.[0].highlightedItem).toEqual({
    seriesId: 'categories',
    dataIndex: 0,
  });
});
