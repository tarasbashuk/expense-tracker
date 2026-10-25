// @vitest-environment jsdom

import { installUrlTest } from './url-test-helpers';
import { createElement, type ComponentProps } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import TransactionList from '@/components/TransactionList';
import {
  TransactionsProvider,
  useTransactions,
} from '@/context/TranasctionsContext';
import getTransactions from '@/app/actions/getTransactions';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import type DatePeriodFilter from '@/components/shared/DatePeriodFilter';
import { messages } from '@/locales';
import { transaction } from './fixtures';

vi.mock('next/navigation', async () => ({
  useSearchParams: (await import('./url-test-helpers')).useTestSearchParams,
}));

// TagPicker imports TagEditor even when only filter controls are rendered.
// Keep its server actions (Clerk/Prisma/Next) outside this UI test module graph.
// Keep server-only Prisma and Clerk dependencies out of component tests.
vi.mock('@/app/actions/customCategories', () => ({
  getCustomCategories: vi.fn().mockResolvedValue({ categories: [] }),
  saveCustomCategory: vi.fn(),
  archiveCustomCategory: vi.fn(),
}));

vi.mock('@/app/actions/tags', () => ({
  getTags: vi.fn(),
  saveTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock('@/components/tags/useTagCatalog', () => ({
  useTagCatalog: () => ({ tags: [], loading: false, error: '' }),
}));

vi.mock('@/app/actions/getTransactions', () => ({ default: vi.fn() }));

vi.mock('@/app/actions/getIncomeExpense', () => ({ default: vi.fn() }));

vi.mock('@/app/actions/deleteTransaction', () => ({ default: vi.fn() }));

vi.mock('@/components/TransactionActionsMenu', () => ({ default: () => null }));

vi.mock('@/components/history/HistoryHeaderActions', () => ({
  default: () => createElement('button', null, 'Add transaction'),
}));

vi.mock('@/components/TransactionsDataGrid', () => ({ default: () => null }));

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({ settings: { defaultCurrency: 'EUR' } }),
}));

vi.mock('@/components/shared/DatePeriodFilter', () => ({
  default: ({ onNext }: ComponentProps<typeof DatePeriodFilter>) =>
    createElement('button', { onClick: onNext }, 'Next month'),
}));

function Refresh() {
  const { requestTransactionsRefresh } = useTransactions();

  return createElement(
    'button',
    { onClick: requestTransactionsRefresh },
    'Refresh',
  );
}

function show() {
  const props: ComponentProps<typeof TransactionsProvider> = {
    initialSettings: [],
    children: createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(TransactionList),
      createElement(Refresh),
    ),
  };

  return render(createElement(TransactionsProvider, props));
}

function deferred<T>() {
  let resolve!: (_value: T) => void;
  let reject!: (_error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  installUrlTest('/transactions');
  vi.mocked(getTransactions).mockResolvedValue({
    transactions: [transaction({ text: 'Loaded transaction' })],
  });
  vi.mocked(getIncomeExpense).mockResolvedValue({ income: 12, expense: 5 });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('first load keeps controls, hides skeleton from readers and never presents a false zero or empty result', async () => {
  const request = deferred<Awaited<ReturnType<typeof getTransactions>>>();
  vi.mocked(getTransactions).mockReturnValue(request.promise);
  const user = userEvent.setup();
  const view = show();

  expect(screen.getByRole('heading', { name: 'History' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add transaction' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Loading transactions');
  expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy();
  expect(
    view.container.querySelectorAll('.MuiSkeleton-root').length,
  ).toBeGreaterThan(10);
  expect(screen.queryByText('No records for selected period')).toBeNull();

  await user.type(
    screen.getByRole('textbox', { name: 'Search by description or amount' }),
    'coffee',
  );
  await user.click(screen.getByRole('button', { name: 'Show balance info' }));

  expect(screen.queryByText(/\+0\.00/)).toBeNull();
  expect(
    view.container.querySelector('[aria-hidden="true"] .MuiSkeleton-root'),
  ).toBeTruthy();

  await act(async () => request.resolve({ transactions: [] }));

  expect(
    await screen.findByText('No matching transactions in this period'),
  ).toBeTruthy();
  expect(view.container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(0);
  expect(screen.getByRole('status').textContent).toBe('');
});

test('new periods hide previous results immediately and late responses cannot overwrite the latest period', async () => {
  const user = userEvent.setup();
  const view = show();
  await screen.findByText('Loaded transaction');
  const old = deferred<Awaited<ReturnType<typeof getTransactions>>>();
  const latest = deferred<Awaited<ReturnType<typeof getTransactions>>>();
  vi.mocked(getTransactions)
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(latest.promise);

  await user.click(screen.getByRole('button', { name: 'Next month' }));

  expect(screen.queryByText('Loaded transaction')).toBeNull();
  expect(view.container.querySelector('.MuiSkeleton-root')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Next month' }));
  await act(async () =>
    latest.resolve({ transactions: [transaction({ text: 'Latest result' })] }),
  );
  await screen.findByText('Latest result');
  await act(async () =>
    old.resolve({ transactions: [transaction({ text: 'Stale result' })] }),
  );

  expect(screen.getByText('Latest result')).toBeTruthy();
  expect(screen.queryByText('Stale result')).toBeNull();
});

test('background refresh retains the list node, totals and scroll, including on failure', async () => {
  const user = userEvent.setup();
  const view = show();
  const row = await screen.findByText('Loaded transaction');
  const request = deferred<Awaited<ReturnType<typeof getTransactions>>>();
  vi.mocked(getTransactions).mockReturnValueOnce(request.promise);
  const scroll = window.scrollY;

  await user.click(screen.getByRole('button', { name: 'Refresh' }));

  expect(screen.getByText('Loaded transaction')).toBe(row);
  expect(screen.getByRole('status').textContent).toBe('Refreshing…');
  expect(view.container.querySelector('.MuiSkeleton-root')).toBeNull();
  expect(window.scrollY).toBe(scroll);

  await act(async () => request.reject(new Error('offline')));

  expect(screen.getByRole('alert').textContent).toContain(
    'Previously loaded data is shown',
  );
  expect(screen.getByText('Loaded transaction')).toBe(row);
  expect(view.container.querySelector('[aria-busy="true"]')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Try again' }));

  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

test('initial request or summary failure offers retry and never masquerades as an empty result', async () => {
  vi.mocked(getIncomeExpense).mockResolvedValueOnce({
    error: 'Database error',
  });
  const user = userEvent.setup();
  const view = show();

  expect((await screen.findByRole('alert')).textContent).toContain(
    'Unable to load transactions',
  );
  expect(screen.queryByText('No records for selected period')).toBeNull();
  expect(view.container.querySelector('.MuiSkeleton-root')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('Loaded transaction')).toBeTruthy();
});

test('desktop reset clears search and extra filters without changing the selected period while reloading the matching results', async () => {
  const user = userEvent.setup();
  show();
  await screen.findByText('Loaded transaction');
  await user.click(screen.getByRole('button', { name: 'Next month' }));
  await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(2));
  await screen.findByText('Loaded transaction');
  const periodRequest = vi.mocked(getTransactions).mock.calls.at(-1);
  const search = screen.getByRole('textbox', {
    name: 'Search by description or amount',
  });

  await user.type(search, 'unmatched');
  await waitFor(() =>
    expect(screen.queryByText('Loaded transaction')).toBeNull(),
  );

  expect(document.activeElement).toBe(search);
  await user.click(
    screen.getByRole('button', { name: 'Reset search and filters' }),
  );

  expect(await screen.findByText('Loaded transaction')).toBeTruthy();
  expect((search as HTMLInputElement).value).toBe('');
  expect(vi.mocked(getTransactions).mock.calls.at(-1)).toEqual(periodRequest);
  expect(new URLSearchParams(window.location.search).get('q')).toBeNull();
});

test('desktop CSV export downloads the loaded filtered history and releases its URL', async () => {
  const createObjectURL = vi.fn(() => 'blob:transactions');
  const revokeObjectURL = vi.fn();
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL, revokeObjectURL }),
  );
  const frames: FrameRequestCallback[] = [];
  const animationFrame = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      frames.push(callback);

      return frames.length;
    });
  const user = userEvent.setup();

  try {
    show();
    await screen.findByText('Loaded transaction');
    const exportButton = screen.getByRole('button', { name: 'Export CSV' });

    expect(exportButton.closest('.MuiToggleButtonGroup-root')).toBeNull();
    expect(exportButton.textContent).toBe('');
    await user.click(exportButton);

    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
    expect(exportButton.getAttribute('aria-busy')).toBe('true');
    expect(exportButton.querySelector('[role="progressbar"]')).toBeTruthy();
    expect(createObjectURL).not.toHaveBeenCalled();

    (exportButton as HTMLButtonElement).click();
    await act(async () => {
      frames.shift()?.(0);
      frames.shift()?.(16);
    });

    expect((exportButton as HTMLButtonElement).disabled).toBe(false);
    expect(exportButton.querySelector('[role="progressbar"]')).toBeNull();

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0]).toHaveLength(1);
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();

    await waitFor(
      () => expect(revokeObjectURL).toHaveBeenCalledWith('blob:transactions'),
      { timeout: 2000 },
    );
  } finally {
    animationFrame.mockRestore();
    click.mockRestore();
    vi.unstubAllGlobals();
  }
});

test('a direct category link loads its period first and never displays other transaction types or categories', async () => {
  window.history.replaceState(
    null,
    '',
    '/transactions?period=month&date=2025-08-01&type=Expense&category=education',
  );
  vi.mocked(getTransactions).mockResolvedValue({
    transactions: [
      transaction({
        id: 'school',
        text: 'School',
        category: 'education',
        type: 'Expense',
        amountDefaultCurrency: 42.25,
      }),
      transaction({
        id: 'income',
        text: 'Income row',
        category: 'education',
        type: 'Income',
      }),
      transaction({
        id: 'other',
        text: 'Other row',
        category: 'dining',
        type: 'Expense',
      }),
    ],
  });
  const view = show();

  expect(screen.queryByText('Other row')).toBeNull();
  expect(await screen.findByText('School')).toBeTruthy();
  expect(getTransactions).toHaveBeenCalledExactlyOnceWith(
    '2025-08-01',
    '2025-08-31',
    true,
  );
  expect(screen.queryByText('Income row')).toBeNull();
  expect(screen.queryByText('Other row')).toBeNull();
  expect(
    screen.getByRole('combobox', { name: 'Category' }).textContent,
  ).toContain('Education');

  view.unmount();
  show();

  expect(await screen.findByText('School')).toBeTruthy();
  expect(vi.mocked(getTransactions).mock.calls.at(-1)).toEqual([
    '2025-08-01',
    '2025-08-31',
    true,
  ]);
});

test('an explicit credit category remains visible and selectable even when credit tracking is off', async () => {
  window.history.replaceState(
    null,
    '',
    '/transactions?period=month&date=2025-08-01&type=Expense&category=CCRepayment',
  );
  vi.mocked(getTransactions).mockResolvedValue({
    transactions: [
      transaction({ text: 'Credit repayment', category: 'CCRepayment' }),
    ],
  });
  show();

  expect(await screen.findByText('Credit repayment')).toBeTruthy();
  expect(getTransactions).toHaveBeenCalledExactlyOnceWith(
    '2025-08-01',
    '2025-08-31',
    false,
  );
  expect(
    screen.getByRole('combobox', { name: 'Category' }).textContent,
  ).toContain('Credit Card Repayment');
  expect(new URLSearchParams(window.location.search).get('category')).toBe(
    'CCRepayment',
  );
});
