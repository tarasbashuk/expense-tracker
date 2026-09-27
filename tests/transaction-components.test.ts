// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { Transaction } from '@prisma/client';
import TransactionItem from '@/components/TransactionItem';
import TransactionList from '@/components/TransactionList';
import RecentTransactions from '@/components/home/RecentTransactions';

const mocks = vi.hoisted(() => ({
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

vi.mock('@/app/actions/getTransactions', () => ({
  default: mocks.getTransactions,
}));

vi.mock('@/app/actions/getIncomeExpense', () => ({
  default: mocks.getIncomeExpense,
}));

vi.mock('@/components/shared/DatePeriodFilter', () => ({
  default: () => null,
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
    createElement(IntlProvider, { locale: 'en-US', messages: {} }, element),
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

test('list item exposes all three actions with accessible labels and the correct transaction ID', async () => {
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

  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.click(screen.getByRole('button', { name: 'Repeat transaction' }));
  await user.click(screen.getByRole('button', { name: 'Delete' }));

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

    await user.click(screen.getByRole('button', { name }));

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

  await user.click(screen.getByRole('button', { name: 'Delete' }));

  expect(window.confirm).toHaveBeenCalledOnce();
  expect(mocks.deleteTransaction).not.toHaveBeenCalled();
  expect(mocks.setTransactions).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test('successful deletion removes only the selected transaction and refreshes dashboard data', async () => {
  const user = userEvent.setup();
  renderRecent();

  await user.click(screen.getByRole('button', { name: 'Delete' }));
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

  await user.click(screen.getByRole('button', { name: 'Delete' }));
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

    await user.click(screen.getByRole('button', { name }));

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

  await user.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Database error'),
  );

  expect(mocks.setTransactions).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.requestTransactionsRefresh).not.toHaveBeenCalled();
});
