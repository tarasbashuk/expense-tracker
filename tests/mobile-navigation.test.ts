// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, expect, test, vi } from 'vitest';

import MobileAppBar from '@/components/MobileAppBar';
import { messages } from '@/locales';

const mocks = vi.hoisted(() => ({ push: vi.fn(), openTransaction: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/transactions',
}));

vi.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: () => null,
  UserButton: () => createElement('button', null, 'Account'),
  SignInButton: () => null,
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => ({
    isTransactionModalOpen: false,
    setIsTransactionModalOpen: mocks.openTransaction,
  }),
}));

vi.mock('@/components/AddTransactionModal/AddTransactionModal', () => ({
  default: () => null,
}));

vi.mock('@/components/WelcomeModal/WelcomeModal', () => ({
  default: () => null,
}));

vi.mock('@/components/ImportStatementModal', () => ({
  default: () => createElement('div', { role: 'dialog' }, 'Import statement'),
}));

const renderNavigation = () =>
  render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(MobileAppBar),
    ),
  );

afterEach(() => {
  cleanup();
});

test('primary navigation opens history directly and marks the active page', async () => {
  const user = userEvent.setup();
  renderNavigation();

  const history = screen.getByRole('button', { name: 'History' });
  await user.click(history);

  expect(history.getAttribute('aria-current')).toBe('page');
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/transactions');
});

test('more menu preserves access to recurring payments, yearly stats, settings and account', async () => {
  const user = userEvent.setup();
  renderNavigation();

  await user.click(screen.getByRole('button', { name: 'More' }));

  expect(screen.getByRole('menuitem', { name: 'Yearly stats' })).toBeTruthy();
  expect(screen.getByRole('menuitem', { name: 'Recurring' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy();

  await user.click(screen.getByRole('menuitem', { name: 'Settings' }));

  expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/settings');
});

test('add and labelled import remain directly accessible', async () => {
  const user = userEvent.setup();
  renderNavigation();

  await user.click(screen.getByRole('button', { name: 'Add transaction' }));
  await user.click(screen.getByRole('button', { name: 'Import' }));

  expect(mocks.openTransaction).toHaveBeenCalledExactlyOnceWith(true);
  expect(screen.getByRole('dialog').textContent).toBe('Import statement');
});
