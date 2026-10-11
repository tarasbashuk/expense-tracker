// @vitest-environment jsdom

import { createElement, type ReactNode, type ComponentProps } from 'react';
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
import TransactionRows from '@/components/TransactionRows';
import MobileTransactionItem from '@/components/history/MobileTransactionItem';
import PeriodBalance from '@/components/history/PeriodBalance';
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

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ImportStatementModal', () => ({
  default: () =>
    createElement('div', { role: 'dialog', 'aria-label': 'Import statement' }),
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
  vi.unstubAllGlobals();
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

test('desktop search is the last filter and exposes a reset action', async () => {
  const user = userEvent.setup();
  await renderHistory();
  const filters = document.getElementById('history-filters')!;
  const search = screen.getByRole('textbox', { name: 'Search descriptions' });

  expect(filters.contains(search)).toBe(true);
  expect(filters.lastElementChild?.contains(search)).toBe(true);
  expect(screen.queryByText('Entire selected period')).toBeNull();

  await user.type(search, 'Coffee');

  expect(
    screen.getByRole('button', { name: 'Reset search and filters' }),
  ).toBeTruthy();
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
])('desktop %s resets to the current month', async (period) => {
  const user = userEvent.setup();
  await renderHistory();
  const today = dateKeyFromLocalDate(new Date());
  const expected = getPeriodRange('month', today, {
    start: today,
    end: today,
  });

  await user.click(screen.getByRole('button', { name: period }));

  expect(
    screen.getByRole('button', { name: 'Reset search and filters' }),
  ).toBeTruthy();

  await user.type(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
    'Coffee',
  );

  expect(
    screen.getByRole('button', { name: 'Reset search and filters' }),
  ).toBeTruthy();

  await user.click(
    screen.getByRole('button', { name: 'Reset search and filters' }),
  );

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
});

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

test('date groups share a heading per day and preserve transaction order and amounts', () => {
  const transactions = [
    {
      ...transaction,
      id: 'first',
      text: 'First',
      date: new Date(2026, 9, 11, 18),
    },
    {
      ...transaction,
      id: 'second',
      text: 'Second',
      date: new Date(2026, 9, 11, 8),
    },
    {
      ...transaction,
      id: 'third',
      text: 'Third',
      date: new Date(2026, 9, 10, 12),
    },
  ];

  const { container, rerender } = renderWithIntl(
    createElement(TransactionRows, {
      transactions,
      handleEdit: vi.fn(),
      handleDelete: vi.fn(),
    }),
  );

  expect(
    Array.from(container.querySelectorAll('time')).map((time) => time.dateTime),
  ).toEqual(['2026-10-11', '2026-10-10']);
  expect(
    screen
      .getAllByText(/^(First|Second|Third)$/)
      .map((item) => item.textContent),
  ).toEqual(['First', 'Second', 'Third']);
  expect(screen.getAllByText('20 zł')).toHaveLength(3);
  expect(
    screen.getAllByRole('button', { name: 'Transaction actions' }),
  ).toHaveLength(3);

  rerender(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(TransactionRows, {
        transactions: [transactions[2]],
        handleEdit: vi.fn(),
        handleDelete: vi.fn(),
      }),
    ),
  );

  expect(
    Array.from(container.querySelectorAll('time')).map((time) => time.dateTime),
  ).toEqual(['2026-10-10']);
  expect(screen.queryByText('First')).toBeNull();
});

const useMobileViewport = (width = 390) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('max-width') && width < 600,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
};

test('mobile filter drafts are discarded on close and apply updates results without refetching', async () => {
  useMobileViewport();
  const user = userEvent.setup();

  await renderHistory();

  const calls = mocks.getTransactions.mock.calls.length;

  await user.click(screen.getByRole('button', { name: 'Filters (0)' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
    'missing',
  );

  expect(screen.getByText('Coffee')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Close' }));
  await user.click(screen.getByRole('button', { name: 'Filters (0)' }));

  expect(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
  ).toHaveProperty('value', '');

  await user.type(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
    'missing',
  );
  await user.click(screen.getByRole('button', { name: 'Apply' }));

  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('Coffee')).toBeNull();
  expect(
    screen.getByText('No matching transactions in this period'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeTruthy();
  expect(mocks.getTransactions).toHaveBeenCalledTimes(calls);

  await user.click(screen.getByRole('button', { name: 'Filters (1)' }));

  expect(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
  ).toHaveProperty('value', 'missing');

  await user.click(screen.getByRole('button', { name: 'Reset' }));

  expect(screen.queryByText('Coffee')).toBeNull();

  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: 'Filters (1)' }));

  expect(
    screen.getByRole('textbox', { name: 'Search descriptions' }),
  ).toHaveProperty('value', 'missing');

  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await user.click(screen.getByRole('button', { name: 'Apply' }));

  expect(screen.getByText('Coffee')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Filters (0)' })).toBeTruthy();
});

test('mobile category menu does not edit, while description and amount edit the same record', async () => {
  const user = userEvent.setup();
  const handleEdit = vi.fn();
  const handleCopy = vi.fn();
  const text = '🛒 ES ESTEPONA MP**CARREFOUR very long description';
  renderWithIntl(
    createElement(MobileTransactionItem, {
      transaction: { ...transaction, text, isRecurring: true },
      handleEdit,
      handleCopy,
      handleDelete: vi.fn(),
      tags: ['Family', 'Groceries'],
    }),
  );

  expect(screen.getByText(text)).toBeTruthy();
  expect(screen.getByText('Family')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('20 zł')).toBeTruthy();
  expect(screen.getAllByRole('button')).toHaveLength(2);

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));

  expect(handleEdit).not.toHaveBeenCalled();
  expect(
    screen
      .getByRole('button', { name: 'Transaction actions', hidden: true })
      .getAttribute('aria-expanded'),
  ).toBe('true');

  await user.click(
    screen.getByRole('menuitem', { name: 'Repeat transaction' }),
  );

  expect(handleCopy).toHaveBeenCalledExactlyOnceWith(transaction.id);

  await user.click(screen.getByText(text));
  await user.click(screen.getByText('-5 €'));

  expect(handleEdit).toHaveBeenCalledTimes(2);
  expect(handleEdit).toHaveBeenLastCalledWith(transaction.id);
});

test.each([390, 393, 402])(
  'mobile history at %s px selects the mobile layout and opens header actions',
  async (width) => {
    useMobileViewport(width);
    const user = userEvent.setup();

    await renderHistory();
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(mocks.setTransactionId).toHaveBeenCalledWith(null);
    expect(mocks.setTransactionDraft).toHaveBeenCalledWith(null);
    expect(mocks.setIsCopyTransactionFlow).toHaveBeenCalledWith(false);
    expect(mocks.setIsTransactionModalOpen).toHaveBeenCalledWith(true);
    expect(
      screen.getByRole('button', { name: 'Edit transaction: Coffee' }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(
      screen.getByRole('dialog', { name: 'Import statement' }),
    ).toBeTruthy();
  },
);

test('period balance hides all amounts when collapsed and displays base currency when expanded', async () => {
  const user = userEvent.setup();
  renderWithIntl(createElement(PeriodBalance, { income: 100, expense: 250 }));

  expect(screen.queryByText('-150 €')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Show balance info' }));

  expect(screen.getByText('-150 €')).toBeTruthy();
  expect(screen.getByText('100 €')).toBeTruthy();
  expect(screen.getByText('250 €')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: /Period balance/ }));
  await waitFor(() => expect(screen.queryByText('100 €')).toBeNull());

  expect(screen.queryByText('-150 €')).toBeNull();
});

test('mobile type changes reset the category and applying recurring-only retains the period', async () => {
  useMobileViewport();
  const user = userEvent.setup();

  await renderHistory();
  await user.click(screen.getByRole('button', { name: 'Quarter period' }));

  const selectedPeriod = screen.getByTestId('selected-period').textContent;

  await user.click(screen.getByRole('button', { name: 'Filters (1)' }));
  await user.click(screen.getByRole('combobox', { name: 'Category' }));

  expect(screen.getAllByRole('option', { name: /Gifts/ })).toHaveLength(1);
  expect(screen.queryByRole('option', { name: /Credit Received/ })).toBeNull();

  await user.click(screen.getByRole('option', { name: /Groceries/ }));
  await user.click(screen.getByRole('button', { name: /^income$/i }));

  expect(screen.getByRole('combobox', { name: 'Category' }).textContent).toBe(
    'All categories',
  );

  await user.click(screen.getByRole('checkbox', { name: 'Recurring only' }));
  await user.click(screen.getByRole('button', { name: 'Apply' }));

  expect(screen.getByRole('button', { name: 'Filters (3)' })).toBeTruthy();
  expect(screen.getByTestId('selected-period').textContent).toBe(
    selectedPeriod,
  );
  expect(
    screen.getByText('No matching transactions in this period'),
  ).toBeTruthy();
});

test('mobile income preserves large amounts and unknown categories have a usable menu', async () => {
  const user = userEvent.setup();
  const handleDelete = vi.fn();
  renderWithIntl(
    createElement(MobileTransactionItem, {
      transaction: {
        ...transaction,
        type: 'Income',
        category: '__proto__',
        amount: 105412.48,
        amountDefaultCurrency: 105412.48,
        currency: 'EUR',
      },
      handleEdit: vi.fn(),
      handleDelete,
    }),
  );

  expect(screen.getByText('+105 412.48 €')).toBeTruthy();
  expect(screen.queryByText('20 zł')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Transaction actions' }),
  ).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

  expect(handleDelete).toHaveBeenCalledExactlyOnceWith(transaction.id);
});

test('mobile header actions remain available when loading history fails', async () => {
  useMobileViewport();
  mocks.getTransactions.mockResolvedValue({ error: 'Database error' });

  await renderHistory();

  expect(screen.getByRole('alert').textContent).toBe('Database error');
  expect(screen.getByRole('button', { name: 'Add transaction' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
  expect(screen.queryByText('Coffee')).toBeNull();
});
