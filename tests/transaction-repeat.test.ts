// @vitest-environment jsdom

import { createElement, type ComponentProps } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { messages } from '@/locales';
import { IntlProvider } from 'react-intl';
import { afterEach, expect, test, vi } from 'vitest';

import AddTransactionModal from '@/components/AddTransactionModal/AddTransactionModal';
import type AddTransactionModalView from '@/components/AddTransactionModal/AddTransactionModalView';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  copy: true,
  save: vi.fn(),
  success: vi.fn(),
}));
const source = transaction({
  tags: [
    {
      id: 'trip',
      name: 'Trip',
      normalizedName: 'trip',
      color: 'blue',
      userId: 'test-user',
    },
  ],
});

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({
    settings: { defaultCurrency: 'EUR', creditCardTrackingEnabled: false },
  }),
}));

vi.mock('@/context/CurrenciesContext', () => ({
  useCurrencies: () => ({ currencies: {} }),
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => ({
    transactions: [source],
    transactionId: source.id,
    transactionDraft: null,
    isCopyTransactionFlow: mocks.copy,
    setTransactions: vi.fn(),
    setTransactionId: vi.fn(),
    setTransactionDraft: vi.fn(),
    setIsCopyTransactionFlow: vi.fn(),
    requestTransactionsRefresh: vi.fn(),
    setIsTransactionModalOpen: vi.fn(),
  }),
}));

vi.mock('@/app/actions/addUpdateTransaction', () => ({
  addUpdateTransaction: mocks.save,
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: mocks.success, error: vi.fn() },
}));

vi.mock('@/components/AddTransactionModal/AddTransactionModalView', () => ({
  default: ({
    isEditMode,
    isCopyMode,
    onSubmit,
    isSubmitDisabled,
    saveError,
  }: ComponentProps<typeof AddTransactionModalView>) =>
    createElement(
      'div',
      null,
      createElement(
        'button',
        {
          onClick: () => {
            void onSubmit();
            void onSubmit();
          },
          'data-edit': String(isEditMode),
          'data-copy': String(isCopyMode),
          'aria-busy': isSubmitDisabled,
        },
        'Submit',
      ),
      saveError && createElement('div', { role: 'alert' }, saveError),
    ),
}));

afterEach(() => {
  cleanup();
});

test.each([true, false])(
  'copy=%s uses the correct display mode, save target and success message',
  async (copy) => {
    mocks.copy = copy;
    mocks.save.mockResolvedValue({ data: source });
    const user = userEvent.setup();
    render(
      createElement(
        IntlProvider,
        { locale: 'en' },
        createElement(AddTransactionModal),
      ),
    );
    const submit = screen.getByRole('button', { name: 'Submit' });

    expect(submit.getAttribute('data-edit')).toBe(String(!copy));
    expect(submit.getAttribute('data-copy')).toBe(String(copy));

    await user.click(submit);

    expect(mocks.save.mock.calls[0][0].tagIds).toEqual(['trip']);
    expect(mocks.save.mock.calls[0][2]).toBe(copy ? undefined : source.id);
    expect(mocks.success).toHaveBeenCalledWith(
      copy ? 'A transaction was added' : 'Changes were saved',
    );
  },
);

test('saving is guarded before rerender and rejected requests remain inline with retry available', async () => {
  let reject!: (_error: Error) => void;
  mocks.save.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const user = userEvent.setup();
  render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(AddTransactionModal),
    ),
  );
  const submit = screen.getByRole('button', { name: 'Submit' });

  await user.click(submit);

  expect(mocks.save).toHaveBeenCalledOnce();
  expect(submit.getAttribute('aria-busy')).toBe('true');

  await act(async () => reject(new Error('offline')));

  expect(screen.getByRole('alert').textContent).toBe(
    'Unable to save. Please try again.',
  );
  expect(submit.getAttribute('aria-busy')).toBe('false');
  expect(mocks.success).not.toHaveBeenCalled();

  mocks.save.mockResolvedValueOnce({ error: 'Validation error' });
  await user.click(submit);

  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('Validation error'),
  );
  expect(mocks.save).toHaveBeenCalledTimes(2);
});
