// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, expect, test, vi } from 'vitest';
import type { QuickTransactionTemplate } from '@/lib/tags';
import QuickTransactions from '@/components/home/QuickTransactions';
import HomeMonthlySummary from '@/components/home/HomeMonthlySummary';
import BalanceView from '@/components/BalanceView';
import WelcomeMessage from '@/components/WelcomeMessage';
import { appTheme } from '@/theme';
import { messages } from '@/locales';

const mocks = vi.hoisted(() => ({
  setTransactionId: vi.fn(),
  setTransactionDraft: vi.fn(),
  setIsCopyTransactionFlow: vi.fn(),
  setIsTransactionModalOpen: vi.fn(),
}));

vi.mock('@/app/actions/tags', () => ({
  getTags: vi.fn().mockResolvedValue({ tags: [] }),
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => mocks,
}));

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({
    settings: { defaultCurrency: 'EUR', creditCardTrackingEnabled: false },
    locale: 'en-US',
  }),
}));

vi.mock('@/app/actions/quickTransactionTemplates', () => ({
  saveQuickTransactionTemplate: vi.fn(),
  deleteQuickTransactionTemplate: vi.fn(),
  reorderQuickTransactionTemplates: vi.fn(),
}));

vi.mock('@/components/ImportStatementModal', () => ({ default: () => null }));

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: ReactNode }) => children,
}));

const template: QuickTransactionTemplate = {
  tags: [
    {
      id: 'trip',
      name: 'Trip',
      normalizedName: 'trip',
      color: 'blue',
      userId: 'user',
    },
  ],
  id: 'one',
  userId: 'user',
  label: 'Donation 💙',
  text: 'For the fundraiser',
  amount: 300,
  currency: 'UAH',
  category: 'donations',
  type: 'Expense',
  position: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderHomeComponent = (element: ReactNode) =>
  render(
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

afterEach(() => {
  cleanup();
});

test('quick shortcut opens the original amount and currency draft without submitting it', async () => {
  const user = userEvent.setup();
  renderHomeComponent(
    createElement(QuickTransactions, { initialTemplates: [template] }),
  );

  await user.click(screen.getByRole('button', { name: /Donation 💙.*300 ₴/ }));

  expect(mocks.setTransactionDraft).toHaveBeenCalledExactlyOnceWith({
    text: template.text,
    amount: 300,
    currency: 'UAH',
    category: 'donations',
    type: 'Expense',
    tagIds: ['trip'],
  });
  expect(mocks.setTransactionId).toHaveBeenCalledWith(null);
  expect(mocks.setIsCopyTransactionFlow).toHaveBeenCalledWith(false);
  expect(mocks.setIsTransactionModalOpen).toHaveBeenCalledWith(true);
  expect(screen.queryByRole('menu')).toBeNull();
});

test('new transaction opens an empty draft even when there are no shortcuts', async () => {
  const user = userEvent.setup();
  renderHomeComponent(
    createElement(QuickTransactions, { initialTemplates: [] }),
  );

  expect(
    screen.getByRole('button', { name: 'Create your first shortcut' }),
  ).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'New transaction' }));

  expect(mocks.setTransactionDraft).toHaveBeenCalledExactlyOnceWith(null);
  expect(mocks.setIsTransactionModalOpen).toHaveBeenCalledWith(true);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('all shortcuts remain available and templates without an amount keep it optional', async () => {
  const user = userEvent.setup();
  const templates = Array.from({ length: 12 }, (_, index) => ({
    ...template,
    id: String(index),
    label: `Shortcut ${index}`,
    amount: null,
  }));
  renderHomeComponent(
    createElement(QuickTransactions, { initialTemplates: templates }),
  );

  expect(screen.getAllByRole('button', { name: /^Shortcut/ })).toHaveLength(12);

  await user.click(screen.getByRole('button', { name: 'Shortcut 11' }));

  expect(mocks.setTransactionDraft.mock.calls[0][0].amount).toBeUndefined();
});

test('balance keeps the full account amount and starting balance separate from month totals', () => {
  renderHomeComponent(
    createElement(BalanceView, {
      balance: '-1656.19',
      initialAmount: '500',
      defaultCurrency: 'EUR',
    }),
  );

  expect(screen.getByText('-1 656.19 €')).toBeTruthy();
  expect(screen.getByText(/Initial balance: 500 €/)).toBeTruthy();
});

test('monthly summary retains large formatted totals, comparison and history link', () => {
  renderHomeComponent(
    createElement(HomeMonthlySummary, {
      summary: {
        income: 105412.48,
        expense: 100000,
        net: 5412.48,
        expenseChangePercent: -10,
      },
    }),
  );

  expect(screen.getByText('105 412.48 €')).toBeTruthy();
  expect(screen.getByText('100 000 €')).toBeTruthy();
  expect(screen.getByText('+5 412.48 €')).toBeTruthy();
  expect(screen.getByText(/10% less/)).toBeTruthy();
  expect(
    screen
      .getByRole('link', { name: 'Open monthly transactions' })
      .getAttribute('href'),
  ).toBe('/transactions');
});

test('greeting uses the supplied long name and retains both header actions', () => {
  const name = 'Олександра-Марія ДужеДовгеІм’я';
  renderHomeComponent(createElement(WelcomeMessage, { firstName: name }));

  expect(
    screen.getByRole('heading', { name: `Welcome, ${name}` }),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add transaction' })).toBeTruthy();
});
