// @vitest-environment jsdom

import { createElement, useState, type ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import type { TransactionType } from '@prisma/client';
import AddTransactionModalView from '@/components/AddTransactionModal/AddTransactionModalView';
import QuickTransactions from '@/components/home/QuickTransactions';
import TransactionActionsMenu from '@/components/TransactionActionsMenu';
import { appTheme } from '@/theme';
import { messages } from '@/locales';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  archived: false,
  submit: vi.fn(),
  save: vi.fn(),
  draft: vi.fn(),
  loading: false,
}));

// Component tests must never load server-side authentication or database modules.
vi.mock('@clerk/nextjs/server', () => {
  throw new Error('Server-side Clerk was imported by a component test');
});

vi.mock('@/lib/db', () => {
  throw new Error('The database was imported by a component test');
});

vi.mock('@/components/categories/useCategoryCatalog', () => ({
  useCategoryCatalog: () => ({
    categories: [
      {
        id: 'one',
        name: 'Pottery',
        type: 'Expense',
        icon: 'palette',
        archived: mocks.archived,
      },
      {
        id: 'income',
        name: 'Tutoring',
        type: 'Income',
        icon: 'book',
        archived: false,
      },
    ],
    loading: mocks.loading,
    error: '',
  }),
}));

vi.mock('@/app/actions/tags', () => ({
  getTags: vi.fn().mockResolvedValue({ tags: [] }),
  saveTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock('@/components/tags/useTagCatalog', () => ({
  useTagCatalog: () => ({ tags: [], loading: false, error: '' }),
}));

vi.mock('@/app/actions/quickTransactionTemplates', () => ({
  saveQuickTransactionTemplate: mocks.save,
  deleteQuickTransactionTemplate: vi.fn(),
  reorderQuickTransactionTemplates: vi.fn(),
}));

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({
    settings: { defaultCurrency: 'EUR', creditCardTrackingEnabled: false },
  }),
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => ({
    setTransactionDraft: mocks.draft,
    setTransactionId: vi.fn(),
    setIsCopyTransactionFlow: vi.fn(),
    setIsTransactionModalOpen: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn() } }));

vi.mock('@mui/x-date-pickers', () => ({ DatePicker: () => null }));

const template = {
  id: 'template',
  userId: 'owner',
  label: 'Class',
  text: 'Pottery class',
  category: 'custom:one',
  type: 'Expense' as const,
  currency: 'EUR' as const,
  amount: 10,
  position: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.archived = false;
  mocks.loading = false;
  mocks.save.mockResolvedValue({ template });
});

afterEach(cleanup);

function show(element: ReactNode) {
  return render(
    createElement(
      ThemeProvider,
      { theme: appTheme },
      createElement(
        IntlProvider,
        { locale: 'en-US', messages: messages['en-US'] },
        element,
      ),
    ),
  );
}

function TransactionForm({
  edit = false,
  initialRecurring = false,
}: {
  edit?: boolean;
  initialRecurring?: boolean;
}) {
  const [category, setCategory] = useState('custom:one');
  const [recurring, setRecurring] = useState(initialRecurring);
  const [type, setType] = useState<TransactionType>('Expense');

  return createElement(AddTransactionModalView, {
    date: new Date(),
    text: 'Class',
    amount: 10,
    category,
    currency: 'EUR',
    isEditMode: edit,
    isSubmitDisabled: false,
    isBaseAmountShown: false,
    isCreditTransaction: false,
    creditCardTrackingEnabled: false,
    isRecurring: recurring,
    transactionType: type,
    handleClose: vi.fn(),
    onSubmit: () => mocks.submit({ category, recurring, type }),
    handleTypeChange: (value) => {
      setType(value);
      setCategory('');
    },
    handleDateChange: vi.fn(),
    handleAmountChange: vi.fn(),
    handleCurrencyChange: vi.fn(),
    handleTextChange: vi.fn(),
    handleCategoryChange: (event) => setCategory(event.target.value),
    handleIsCreditChange: vi.fn(),
    handleIsRecurringChange: (event) => setRecurring(event.target.checked),
    handleRecurringEndDateChange: vi.fn(),
    handleAmountDefaultCurrencyChange: vi.fn(),
  });
}

test('a custom category remains selected when enabling monthly recurrence', async () => {
  const user = userEvent.setup();
  show(createElement(TransactionForm));

  await user.click(screen.getByRole('button', { name: /Tags and recurrence/ }));
  await user.click(screen.getByRole('switch', { name: 'Recurring (monthly)' }));
  await user.click(screen.getByRole('button', { name: 'Add transaction' }));

  expect(mocks.submit).toHaveBeenCalledWith({
    category: 'custom:one',
    recurring: true,
    type: 'Expense',
  });
  expect(
    screen.getByRole('combobox', { name: 'Category' }).textContent,
  ).toContain('Pottery');
});

test('an archived shortcut/copy category requires an active replacement for a new transaction', async () => {
  mocks.archived = true;
  const user = userEvent.setup();
  show(createElement(TransactionForm));

  expect(screen.getByRole('alert').textContent).toContain(
    'Choose an active category',
  );
  expect(
    (
      screen.getByRole('button', {
        name: 'Add transaction',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);

  await user.click(screen.getByRole('combobox', { name: 'Category' }));
  expect(
    screen
      .getByRole('option', { name: 'Pottery' })
      .getAttribute('aria-disabled'),
  ).toBe('true');
  await user.click(screen.getByRole('option', { name: 'Groceries' }));
  await user.click(screen.getByRole('button', { name: 'Add transaction' }));

  expect(mocks.submit).toHaveBeenCalledWith({
    category: 'groceries',
    recurring: false,
    type: 'Expense',
  });
});

test('an existing recurring transaction can retain its archived category or stop recurrence', async () => {
  mocks.archived = true;
  const user = userEvent.setup();
  show(createElement(TransactionForm, { edit: true, initialRecurring: true }));

  await user.click(screen.getByRole('switch', { name: 'Recurring (monthly)' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(mocks.submit).toHaveBeenCalledWith({
    category: 'custom:one',
    recurring: false,
    type: 'Expense',
  });
});

test('new shortcuts offer custom categories for the selected type and save the stable key', async () => {
  const user = userEvent.setup();
  show(createElement(QuickTransactions, { initialTemplates: [] }));

  await user.click(
    screen.getByRole('button', { name: 'Create your first shortcut' }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Button name' }),
    'Class',
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Text' }),
    'Pottery class',
  );
  await user.click(screen.getByRole('combobox', { name: 'Category' }));
  expect(screen.queryByRole('option', { name: 'Tutoring' })).toBeNull();
  await user.click(screen.getByRole('option', { name: 'Pottery' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'custom:one', type: 'Expense' }),
    ),
  );
});

test('archived shortcuts retain their category when edited and open a draft for review', async () => {
  mocks.archived = true;
  const user = userEvent.setup();
  show(createElement(QuickTransactions, { initialTemplates: [template] }));

  await user.click(screen.getByRole('button', { name: /Class.*10/ }));
  expect(mocks.draft).toHaveBeenCalledWith(
    expect.objectContaining({ category: 'custom:one' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Manage quick transactions' }),
  );
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByRole('alert').textContent).toContain(
    'new transactions require an active category',
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'template', category: 'custom:one' }),
    ),
  );
});

test('the transaction menu can save a custom category as a shortcut', async () => {
  const user = userEvent.setup();
  show(
    createElement(TransactionActionsMenu, {
      transaction: transaction({ category: 'custom:one' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    }),
  );

  await user.click(screen.getByRole('button', { name: 'Transaction actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Save as shortcut' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'custom:one' }),
    ),
  );
});
