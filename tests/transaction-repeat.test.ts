// @vitest-environment jsdom

import { createElement, type ComponentProps } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const source = transaction();

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

vi.mock('react-toastify', () => ({
  toast: { success: mocks.success, error: vi.fn() },
}));

vi.mock('@/components/AddTransactionModal/AddTransactionModalView', () => ({
  default: ({
    isEditMode,
    isCopyMode,
    onSubmit,
  }: ComponentProps<typeof AddTransactionModalView>) =>
    createElement(
      'button',
      {
        onClick: onSubmit,
        'data-edit': String(isEditMode),
        'data-copy': String(isCopyMode),
      },
      'Submit',
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

    expect(mocks.save.mock.calls[0][2]).toBe(copy ? undefined : source.id);
    expect(mocks.success).toHaveBeenCalledWith(
      copy ? 'A transaction was added' : 'Changes were saved',
    );
  },
);
