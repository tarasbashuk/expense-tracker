// @vitest-environment jsdom

import { createElement, type ComponentProps } from 'react';
import type DatePeriodFilter from '@/components/shared/DatePeriodFilter';
import { dateKeyFromLocalDate, getPeriodRange } from '@/lib/dateRange';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { messages } from '@/locales';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { Transaction } from '@prisma/client';
import TransactionItem from '@/components/TransactionItem';
import TransactionList from '@/components/TransactionList';
import RecentTransactions from '@/components/home/RecentTransactions';

const mocks = vi.hoisted(() => ({
  saveTemplate: vi.fn(),
  setTransactions: vi.fn(),
  setTransactionDraft: vi.fn(),
  setTransactionId: vi.fn(),
  setIsCopyTransactionFlow: vi.fn(),
  setIsTransactionModalOpen: vi.fn(),
  requestTransactionsRefresh: vi.fn(),
  refresh: vi.fn(),
  getTransactions: vi.fn(),
  getIncomeExpense: vi.fn(),
  deleteTransaction: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({ settings: { defaultCurrency: 'EUR' } }),
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => ({
    ...mocks,
    transactions: [transaction],
    transactionsRefreshKey: 0,
  }),
}));

vi.mock('@/app/actions/quickTransactionTemplates', () => ({
  saveQuickTransactionTemplate: mocks.saveTemplate,
}));

vi.mock('@/app/actions/getTransactions', () => ({
  default: mocks.getTransactions,
}));

vi.mock('@/app/actions/getIncomeExpense', () => ({
  default: mocks.getIncomeExpense,
}));

vi.mock('@/components/shared/DatePeriodFilter', () => ({
  default: ({
    mode,
    range,
    onModeChange,
    onPrevious,
    onCustomRangeChange,
  }: ComponentProps<typeof DatePeriodFilter>) =>
    createElement(
      'div',
      null,
      createElement(
        'output',
        { 'data-testid': 'selected-period' },
        `${mode}:${range.start}:${range.end}`,
      ),
      createElement(
        'button',
        { onClick: () => onModeChange('quarter') },
        'Quarter period',
      ),
      createElement(
        'button',
        { onClick: () => onModeChange('year') },
        'Year period',
      ),
      createElement('button', { onClick: onPrevious }, 'Previous period'),
      createElement(
        'button',
        {
          onClick: () => {
            onModeChange('custom');
            onCustomRangeChange({ start: '2025-02-03', end: '2025-02-15' });
          },
        },
        'Custom period',
      ),
    ),
}));

vi.mock('@/components/AdditionalBalanceInfo', () => ({ default: () => null }));

vi.mock('@/components/TransactionsDataGrid', () => ({ default: () => null }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/app/actions/deleteTransaction', () => ({
  default: mocks.deleteTransaction,
}));

vi.mock('react-toastify', () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

const transaction: Transaction = {
  id: 'transaction-1',
  userId: 'user-1',
  text: 'Coffee',
  amount: 20,
  amountDefaultCurrency: 5,
  currency: 'PLN',
  type: 'Expense',
  category: 'dining',
  date: new Date('2026-09-27T12:00:00Z'),
  createdAt: new Date('2026-09-27T12:00:00Z'),
  updatedAt: new Date('2026-09-27T12:00:00Z'),
  isRecurring: false,
  recurringEndDate: null,
  isCreditTransaction: false,
  CCExpenseTransactionId: null,
};

const renderWithIntl = (element: ReturnType<typeof createElement>) =>
  render(
    createElement(
      IntlProvider,
      {
        locale: 'en-US',
        messages: messages['en-US'],
        onError: (error) => {
          throw error;
        },
      },
      element,
    ),
  );

const renderRecent = () =>
  renderWithIntl(
    createElement(RecentTransactions, { transactions: [transaction] }),
  );

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  mocks.deleteTransaction.mockResolvedValue({ message: 'Transaction deleted' });
  mocks.getTransactions.mockResolvedValue({ transactions: [transaction] });
  mocks.getIncomeExpense.mockResolvedValue({ income: 0, expense: 5 });
});

afterEach(() => {
  cleanup();
});

test('list item menu exposes transaction actions with accessible labels and the correct transaction ID', async () => {
  const user = userEvent.setup();
  const handleEdit = vi.fn();
  const handleCopy = vi.fn();
  const handleDelete = vi.fn();
  renderWithIntl(
    createElement(TransactionItem, {
      transaction,
      handleEdit,
      handleCopy,
      handleDelete,
    }),
  );

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(
    screen.getByRole('menuitem', { name: 'Repeat transaction' }),
  );
  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

  expect(handleEdit).toHaveBeenCalledExactlyOnceWith(transaction.id);
  expect(handleCopy).toHaveBeenCalledExactlyOnceWith(transaction.id);
  expect(handleDelete).toHaveBeenCalledExactlyOnceWith(transaction.id);
  expect(screen.getByText('20 zł')).toBeTruthy();
});

test.each([
  ['Edit', false],
  ['Repeat transaction', true],
] as const)(
  'dashboard %s opens the selected transaction with the appropriate mode',
  async (name, copy) => {
    const user = userEvent.setup();
    renderRecent();

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' }),
    );
    await user.click(screen.getByRole('menuitem', { name }));

    expect(mocks.setTransactions).toHaveBeenCalledWith([transaction]);
    expect(mocks.setTransactionDraft).toHaveBeenCalledWith(null);
    expect(mocks.setTransactionId).toHaveBeenCalledWith(transaction.id);
    expect(mocks.setIsCopyTransactionFlow).toHaveBeenCalledWith(copy);
    expect(mocks.setIsTransactionModalOpen).toHaveBeenCalledWith(true);
  },
);

test('cancelling deletion keeps the transaction and does not contact the server', async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  const user = userEvent.setup();
  renderRecent();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

  expect(window.confirm).toHaveBeenCalledOnce();
  expect(mocks.deleteTransaction).not.toHaveBeenCalled();
  expect(mocks.setTransactions).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test('successful deletion removes only the selected transaction and refreshes dashboard data', async () => {
  const user = userEvent.setup();
  renderRecent();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());

  expect(mocks.deleteTransaction).toHaveBeenCalledExactlyOnceWith(
    transaction.id,
  );
  expect(mocks.success).toHaveBeenCalledWith('Transaction deleted');
  expect(mocks.requestTransactionsRefresh).toHaveBeenCalledOnce();
  const update = mocks.setTransactions.mock.calls[0][0];
  const other = { ...transaction, id: 'transaction-2' };

  expect(update([transaction, other])).toEqual([other]);
});

test('failed deletion shows an error without removing the transaction or reporting success', async () => {
  mocks.deleteTransaction.mockResolvedValue({ error: 'Database error' });
  const user = userEvent.setup();
  renderRecent();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Database error'),
  );

  expect(screen.getByText('Coffee')).toBeTruthy();
  expect(mocks.setTransactions).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.requestTransactionsRefresh).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test('empty dashboard list shows an empty state without transaction actions', () => {
  renderWithIntl(createElement(RecentTransactions, { transactions: [] }));

  expect(screen.getByText('No transactions yet')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

const renderHistory = async () => {
  renderWithIntl(createElement(TransactionList));
  await waitFor(() => expect(mocks.setTransactions).toHaveBeenCalled());
  mocks.setTransactions.mockClear();
};

test.each(['Edit', 'Repeat transaction'])(
  'transaction history exposes %s through the list item',
  async (name) => {
    const user = userEvent.setup();
    await renderHistory();

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' }),
    );
    await user.click(screen.getByRole('menuitem', { name }));

    expect(mocks.setTransactionId).toHaveBeenCalledWith(transaction.id);
    expect(mocks.setIsTransactionModalOpen).toHaveBeenCalledWith(true);

    if (name === 'Repeat transaction') {
      expect(mocks.setIsCopyTransactionFlow).toHaveBeenCalledWith(true);
    }
  },
);

test('transaction history keeps the record when deletion fails', async () => {
  mocks.deleteTransaction.mockResolvedValue({ error: 'Database error' });
  const user = userEvent.setup();
  await renderHistory();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Database error'),
  );

  expect(mocks.setTransactions).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.requestTransactionsRefresh).not.toHaveBeenCalled();
});

test('description search filters locally and clearing restores results without another fetch', async () => {
  const user = userEvent.setup();
  await renderHistory();
  const calls = mocks.getTransactions.mock.calls.length;

  await user.type(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
    'missing',
  );

  expect(screen.queryByText('Coffee')).toBeNull();
  expect(
    screen.getByText('No matching transactions in this period'),
  ).toBeTruthy();
  expect(mocks.getTransactions).toHaveBeenCalledTimes(calls);

  await user.click(screen.getByRole('button', { name: 'Clear search' }));

  expect(screen.getByText('Coffee')).toBeTruthy();
  expect(mocks.getTransactions).toHaveBeenCalledTimes(calls);
});

test('saving a shortcut copies original currency and amount rather than the converted amount', async () => {
  mocks.saveTemplate.mockResolvedValue({ template: { id: 'new-template' } });
  const user = userEvent.setup();
  renderRecent();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Save as shortcut' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(mocks.saveTemplate).toHaveBeenCalledExactlyOnceWith({
    label: 'Coffee',
    text: 'Coffee',
    amount: 20,
    currency: 'PLN',
    category: 'dining',
    type: 'Expense',
  });
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
});

test('shortcut can omit the amount and preserves the dialog on failure', async () => {
  mocks.saveTemplate.mockResolvedValue({ error: 'Template limit reached' });
  const user = userEvent.setup();
  renderRecent();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Save as shortcut' }));
  await user.click(
    screen.getByRole('checkbox', { name: 'Keep amount: 20 zł' }),
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(mocks.saveTemplate.mock.calls[0][0].amount).toBeUndefined();
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Template limit reached',
  );
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test('search is the last expandable filter and counts as an active filter', async () => {
  const user = userEvent.setup();
  await renderHistory();
  const filters = document.getElementById('history-filters')!;
  const search = screen.getByRole('textbox', { name: 'Search descriptions' });

  expect(filters.contains(search)).toBe(true);
  expect(filters.lastElementChild?.contains(search)).toBe(true);
  expect(screen.queryByText('Entire selected period')).toBeNull();

  await user.type(search, 'Coffee');

  expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeTruthy();
});

test('transaction actions stay hidden until the menu opens and Escape dismisses it', async () => {
  const user = userEvent.setup();
  renderRecent();

  expect(screen.queryByRole('menuitem')).toBeNull();
  expect(screen.getAllByRole('button')).toHaveLength(1);

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));

  expect(screen.getAllByRole('menuitem')).toHaveLength(4);

  await user.keyboard('{Escape}');

  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  expect(mocks.deleteTransaction).not.toHaveBeenCalled();
});

test.each([
  'Quarter period',
  'Year period',
  'Previous period',
  'Custom period',
])(
  '%s counts as one filter and resets to the current month',
  async (period) => {
    const user = userEvent.setup();
    await renderHistory();
    const today = dateKeyFromLocalDate(new Date());
    const expected = getPeriodRange('month', today, {
      start: today,
      end: today,
    });

    await user.click(screen.getByRole('button', { name: period }));

    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeTruthy();

    await user.type(
      screen.getByRole('textbox', { name: 'Search descriptions' }),
      'Coffee',
    );

    expect(screen.getByRole('button', { name: 'Filters (2)' })).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Reset search and filters' }),
    );

    expect(screen.getByRole('button', { name: 'Filters (0)' })).toBeTruthy();
    expect(screen.getByTestId('selected-period').textContent).toBe(
      `month:${expected.start}:${expected.end}`,
    );
    expect(
      screen.getByRole('textbox', { name: 'Search descriptions' }),
    ).toHaveProperty('value', '');
    expect(
      screen.queryByRole('button', { name: 'Reset search and filters' }),
    ).toBeNull();
    await waitFor(() =>
      expect(mocks.getTransactions).toHaveBeenLastCalledWith(
        expected.start,
        expected.end,
        true,
      ),
    );
  },
);

test('recurring-only filters locally and reset restores the list and checkbox', async () => {
  const user = userEvent.setup();

  await renderHistory();

  const calls = mocks.getTransactions.mock.calls.length;
  const checkbox = screen.getByRole('checkbox', {
    name: 'Recurring only',
  }) as HTMLInputElement;

  await user.click(checkbox);

  expect(checkbox.checked).toBe(true);
  expect(screen.queryByText('Coffee')).toBeNull();
  expect(
    screen.getByText('No matching transactions in this period'),
  ).toBeTruthy();
  expect(mocks.getTransactions).toHaveBeenCalledTimes(calls);

  await user.click(
    screen.getByRole('button', { name: 'Reset search and filters' }),
  );

  expect(checkbox.checked).toBe(false);
  expect(screen.getByText('Coffee')).toBeTruthy();
  expect(mocks.getTransactions).toHaveBeenCalledTimes(calls);
});
