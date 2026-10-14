// @vitest-environment jsdom

import { createElement, type ComponentProps } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import SettingsPage from '@/app/settings/page';
import { SettingsProvider } from '@/context/SettingsContexts';
import { DEFAULT_SETTINGS } from '@/constants/constants';
import { messages } from '@/locales';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  saveTag: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  empty: false,
}));

vi.mock('@/app/actions/updateSettings', () => ({ default: mocks.update }));

vi.mock('@/app/actions/tags', () => ({
  saveTag: mocks.saveTag,
  deleteTag: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('react-toastify', () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

vi.mock('@/components/history/HistoryHeaderActions', () => ({
  default: () => null,
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => ({ requestTransactionsRefresh: vi.fn() }),
}));

vi.mock('@/components/tags/useTagCatalog', () => ({
  useTagCatalog: () => ({
    loading: false,
    error: '',
    tags: mocks.empty
      ? []
      : [
          {
            id: 'trip',
            userId: 'owner',
            name: 'Trip 🏖️',
            normalizedName: 'trip',
            color: 'blue',
          },
        ],
  }),
}));

function show(encryptData = false) {
  const providerProps: ComponentProps<typeof SettingsProvider> = {
    initialSettings: {
      ...DEFAULT_SETTINGS,
      language: 'ENG',
      defaultCurrency: 'EUR',
      initialAmount: -1530,
      encryptData,
    },
    children: createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(SettingsPage),
    ),
  };

  return render(createElement(SettingsProvider, providerProps));
}

beforeEach(() => {
  mocks.empty = false;
  mocks.update.mockResolvedValue({
    settings: {
      ...DEFAULT_SETTINGS,
      language: 'ENG',
      defaultCurrency: 'USD',
      initialAmount: 42,
    },
  });
  mocks.saveTag.mockResolvedValue({
    tag: { id: 'new', name: 'New tag', color: 'blue' },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test.each([false, true])(
  'encryption is a factual status and not an editable switch: %s',
  (enabled) => {
    show(enabled);

    expect(screen.getByText(enabled ? 'Enabled' : 'Disabled')).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Tags (1)' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  },
);

test('draft survives language changes and independent tag creation; currency warning precedes saving', async () => {
  const user = userEvent.setup();
  show(true);
  const amount = screen.getByRole('spinbutton');
  await user.clear(amount);
  await user.type(amount, '42');
  await user.click(screen.getByRole('combobox', { name: 'Default Currency' }));
  await user.click(screen.getByRole('option', { name: 'USD' }));
  await user.click(screen.getByRole('switch'));
  await user.click(screen.getByRole('combobox', { name: 'Language' }));
  await user.click(screen.getByRole('option', { name: 'Українська' }));

  expect(screen.getByRole('alert')).toBeTruthy();
  expect((amount as HTMLInputElement).value).toBe('42');

  await user.click(screen.getByRole('button', { name: 'Manage' }));
  await user.click(screen.getByRole('button', { name: 'Create tag' }));
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New tag');
  await user.click(screen.getByRole('button', { name: 'Create tag' }));
  await waitFor(() => expect(mocks.saveTag).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  expect(mocks.update).not.toHaveBeenCalled();
  expect((amount as HTMLInputElement).value).toBe('42');
  expect(
    screen.getByRole('combobox', { name: 'Default Currency' }).textContent,
  ).toBe('USD');

  await user.click(screen.getByRole('button', { name: 'Save Settings' }));

  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith({
      defaultCurrency: 'USD',
      initialAmount: 42,
      language: 'UKR',
      encryptData: true,
      creditCardTrackingEnabled: !DEFAULT_SETTINGS.creditCardTrackingEnabled,
    }),
  );
  expect(mocks.success).toHaveBeenCalledOnce();
});

test('empty tag preview offers creation; a settings save error keeps the draft', async () => {
  mocks.empty = true;
  mocks.update.mockResolvedValue({ error: 'Database error' });
  const user = userEvent.setup();
  show();

  expect(screen.getByRole('heading', { name: 'Tags (0)' })).toBeTruthy();
  expect(screen.getByText('No tags yet')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create tag' })).toBeTruthy();

  await user.clear(screen.getByRole('spinbutton'));
  await user.type(screen.getByRole('spinbutton'), '77');
  await user.click(screen.getByRole('button', { name: 'Save Settings' }));

  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Database error'),
  );
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('77');
});
