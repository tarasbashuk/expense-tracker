// @vitest-environment jsdom

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

// TagPicker imports TagEditor even when only filter controls are rendered.
// Keep its server actions (Clerk/Prisma/Next) outside this UI test module graph.
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
    screen.getByRole('textbox', { name: 'Search descriptions' }),
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

test('desktop reset clears search and extra filters without changing the selected period or refetching', async () => {
  const user = userEvent.setup();
  show();
  await screen.findByText('Loaded transaction');
  await user.click(screen.getByRole('button', { name: 'Next month' }));
  await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(2));
  await screen.findByText('Loaded transaction');
  const search = screen.getByRole('textbox', { name: 'Search descriptions' });

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
  expect(getTransactions).toHaveBeenCalledTimes(2);
});
