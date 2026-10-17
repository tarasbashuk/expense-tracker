// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import PeriodBalance from '@/components/history/PeriodBalance';
import { messages } from '@/locales';

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({ settings: { defaultCurrency: 'EUR' } }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function show(desktop: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches: desktop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  return render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(PeriodBalance, { income: 12, expense: 5 }),
    ),
  );
}

test('wider screens always show all totals without a collapse control or transition', () => {
  const view = show(true);

  expect(screen.getByText('Income')).toBeTruthy();
  expect(screen.getByText('Expense')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(view.container.querySelector('.MuiCollapse-root')).toBeNull();
  expect(view.container.querySelector('svg')).toBeNull();
});

test('mobile totals can still be expanded and collapsed', async () => {
  const user = userEvent.setup();
  show(false);
  const toggle = screen.getByRole('button');

  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('Income')).toBeNull();

  await user.click(toggle);

  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByText('Income')).toBeTruthy();
  expect(screen.getByText('Expense')).toBeTruthy();

  await user.click(toggle);

  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  await waitFor(() => expect(screen.queryByText('Income')).toBeNull());
});
