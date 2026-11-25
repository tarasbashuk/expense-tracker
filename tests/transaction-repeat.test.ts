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
  view: vi.fn(),
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
  default: (props: ComponentProps<typeof AddTransactionModalView>) => {
    mocks.view(props);
    const { isEditMode, isCopyMode, onSubmit, isSaving, saveError } = props;

    return createElement(
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
          'aria-busy': isSaving,
        },
        'Submit',
      ),
      saveError && createElement('div', { role: 'alert' }, saveError),
    );
  },
}));

afterEach(() => {
  cleanup();
  source.isLastDayOfMonth = false;
  source.dayOfMonth = null;
  source.recurringSeriesId = null;
  source.recurrenceEndMode = null;
  source.recurringPaymentCount = null;
  source.recurringPaymentNumber = null;
  source.isRecurring = false;
  source.recurringEndDate = null;
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

test('payment count recomputes with the start date and unlimited mode saves no end date', async () => {
  mocks.save.mockResolvedValue({ data: source });
  render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(AddTransactionModal),
    ),
  );
  const latest = () =>
    mocks.view.mock.lastCall![0] as ComponentProps<
      typeof AddTransactionModalView
    >;

  act(() => {
    latest().handleIsRecurringChange({
      target: { checked: true },
    } as React.ChangeEvent<HTMLInputElement>);
    latest().onRecurrenceEndModeChange?.('count');
    latest().onPaymentCountChange?.('10');
    latest().handleDateChange(new Date(2026, 0, 15));
  });

  expect(latest().recurringEndDate).toEqual(
    new Date(2026, 9, 15, 23, 59, 59, 999),
  );

  act(() => latest().handleDateChange(new Date(2026, 1, 15)));

  expect(latest().recurringEndDate).toEqual(
    new Date(2026, 10, 15, 23, 59, 59, 999),
  );

  act(() => latest().onPaymentCountChange?.('0'));

  expect(latest().isSubmitDisabled).toBe(true);

  act(() => latest().onRecurrenceEndModeChange?.('never'));
  await act(async () => latest().onSubmit());

  expect(mocks.save.mock.lastCall![0].recurringEndDate).toBeUndefined();
});

test('choosing an end date blocks submission without starting a save', () => {
  render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(AddTransactionModal),
    ),
  );
  const latest = () =>
    mocks.view.mock.lastCall![0] as ComponentProps<
      typeof AddTransactionModalView
    >;

  act(() => {
    latest().handleIsRecurringChange({
      target: { checked: true },
    } as React.ChangeEvent<HTMLInputElement>);
    latest().onRecurrenceEndModeChange?.('date');
  });

  expect(latest().isSubmitDisabled).toBe(true);
  expect(latest().isSaving).toBe(false);

  act(() => latest().handleRecurringEndDateChange(new Date(2030, 0, 15)));

  expect(latest().isSubmitDisabled).toBe(false);
  expect(latest().isSaving).toBe(false);
});

test.each([false, true])(
  'editing restores count mode; copying starts a new series (copy=%s)',
  async (copy) => {
    mocks.copy = copy;
    Object.assign(source, {
      isRecurring: true,
      recurringSeriesId: 'series',
      recurrenceEndMode: 'count',
      recurringPaymentCount: 10,
      recurringPaymentNumber: 3,
    });
    mocks.save.mockResolvedValue({ data: source });
    render(
      createElement(
        IntlProvider,
        { locale: 'en-US', messages: messages['en-US'] },
        createElement(AddTransactionModal),
      ),
    );
    const latest = () =>
      mocks.view.mock.lastCall![0] as ComponentProps<
        typeof AddTransactionModalView
      >;

    expect(latest().recurrenceEndMode).toBe('count');
    expect(latest().paymentCount).toBe('10');
    expect(latest().paymentNumber).toBe(copy ? 1 : 3);

    await act(async () => latest().onSubmit());

    const saved = mocks.save.mock.lastCall![0];
    expect(saved.recurrenceEndMode).toBe('count');
    expect(saved.recurringPaymentCount).toBe(10);
    expect(saved).not.toHaveProperty('recurringSeriesId');
    expect(saved).not.toHaveProperty('recurringPaymentNumber');
  },
);

test('month-end opt-in updates the preview and persists through saving', async () => {
  mocks.copy = true;
  mocks.save.mockResolvedValue({ data: source });
  render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(AddTransactionModal),
    ),
  );
  const latest = () =>
    mocks.view.mock.lastCall![0] as ComponentProps<
      typeof AddTransactionModalView
    >;

  act(() => {
    latest().handleIsRecurringChange({
      target: { checked: true },
    } as React.ChangeEvent<HTMLInputElement>);
    latest().handleDateChange(new Date(2026, 3, 30));
    latest().onRecurrenceEndModeChange?.('count');
    latest().onPaymentCountChange?.('2');
  });

  expect(latest().isLastDayOfMonth).toBe(false);
  expect(latest().recurringEndDate).toEqual(
    new Date(2026, 4, 30, 23, 59, 59, 999),
  );

  act(() => latest().onLastDayOfMonthChange?.(true));

  expect(latest().recurringEndDate).toEqual(
    new Date(2026, 4, 31, 23, 59, 59, 999),
  );

  await act(async () => latest().onSubmit());

  expect(mocks.save.mock.lastCall![0].isLastDayOfMonth).toBe(true);
});

test('editing a clamped February installment restores its original day and monthly rule', () => {
  mocks.copy = false;
  Object.assign(source, {
    isRecurring: true,
    recurringSeriesId: 'series',
    recurrenceEndMode: 'count',
    recurringPaymentCount: 4,
    recurringPaymentNumber: 3,
    dayOfMonth: 31,
    isLastDayOfMonth: true,
  });
  render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(AddTransactionModal),
    ),
  );
  const latest = () =>
    mocks.view.mock.lastCall![0] as ComponentProps<
      typeof AddTransactionModalView
    >;

  act(() => latest().handleDateChange(new Date(2026, 1, 28)));

  expect(latest().isLastDayOfMonth).toBe(true);
  expect(latest().dayOfMonth).toBe(31);
  expect(latest().recurringEndDate).toEqual(
    new Date(2026, 2, 31, 23, 59, 59, 999),
  );
});
