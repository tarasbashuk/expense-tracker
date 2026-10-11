// @vitest-environment jsdom

import { createElement, useState, type ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, expect, test, vi } from 'vitest';
import TransactionsDataGrid from '@/components/TransactionsDataGrid';
import TagPicker from '@/components/tags/TagPicker';
import TagManager from '@/components/tags/TagManager';
import TagBadges from '@/components/tags/TagBadges';
import HistoryFiltersSheet, {
  HistoryFilters,
} from '@/components/history/HistoryFiltersSheet';
import MobileTransactionItem from '@/components/history/MobileTransactionItem';
import { messages } from '@/locales';
import { transaction } from './fixtures';

const mocks = vi.hoisted(() => ({
  empty: false,
  save: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  requestRefresh: vi.fn(),
}));
const tags = ['Trip 🏖️', 'Work', 'Family'].map((name, i) => ({
  id: String(i),
  name,
  normalizedName: name.toLowerCase(),
  color: 'blue',
  userId: 'owner',
}));

// Exercise our description-cell renderer without the grid's browser layout engine.
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: ({
    rows,
    columns,
  }: {
    rows: ReturnType<typeof transaction>[];
    columns: {
      field: string;
      renderCell?: (_params: {
        row: ReturnType<typeof transaction>;
      }) => ReactNode;
    }[];
  }) =>
    createElement(
      'div',
      null,
      rows.map((row) =>
        createElement(
          'div',
          { key: row.id },
          columns
            .find((column) => column.field === 'text')
            ?.renderCell?.({ row }),
        ),
      ),
    ),
  gridDateComparator: vi.fn(),
  GridFooter: () => null,
  gridPaginatedVisibleSortedGridRowEntriesSelector: vi.fn(),
  useGridApiContext: vi.fn(),
}));

vi.mock('@/components/tags/useTagCatalog', () => ({
  useTagCatalog: () => ({
    tags: mocks.empty ? [] : tags,
    error: '',
    loading: false,
  }),
}));

vi.mock('@/app/actions/tags', () => ({
  saveTag: mocks.save,
  deleteTag: mocks.remove,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/context/TranasctionsContext', () => ({
  useTransactions: () => ({ requestTransactionsRefresh: mocks.requestRefresh }),
}));

vi.mock('@/context/SettingsContexts', () => ({
  useSettings: () => ({ settings: { defaultCurrency: 'EUR' } }),
}));

vi.mock('@/components/TransactionActionsMenu', () => ({ default: () => null }));

function translated(element: ReactNode) {
  return createElement(
    IntlProvider,
    { locale: 'en-US', messages: messages['en-US'] },
    element,
  );
}

function Picker() {
  const [value, setValue] = useState<string[]>([]);

  return createElement(TagPicker, { value, onChange: setValue });
}

afterEach(() => {
  cleanup();
  mocks.empty = false;
});

test('picker allows zero, one, two and removal; a third selection is disabled', async () => {
  const user = userEvent.setup();
  render(translated(createElement(Picker)));
  const first = screen.getByRole('checkbox', {
    name: 'Trip 🏖️',
  }) as HTMLInputElement;
  const second = screen.getByRole('checkbox', {
    name: 'Work',
  }) as HTMLInputElement;
  const third = screen.getByRole('checkbox', {
    name: 'Family',
  }) as HTMLInputElement;

  expect(first.checked).toBe(false);

  await user.click(first);
  await user.click(second);

  expect(first.checked).toBe(true);
  expect(second.checked).toBe(true);
  expect(third.disabled).toBe(true);

  await user.click(first);

  expect(first.checked).toBe(false);
  expect(third.disabled).toBe(false);
});

test.each([false, true])(
  'tag filter draft cancels, applies and resets; desktop=%s',
  async (desktop) => {
    const user = userEvent.setup();
    const apply = vi.fn();
    const close = vi.fn();
    const value: HistoryFilters = {
      type: 'all',
      category: 'all',
      recurringOnly: false,
      search: 'Coffee',
      tagIds: [],
    };
    const element = () =>
      translated(
        createElement(HistoryFiltersSheet, {
          value,
          desktop,
          creditCardTrackingEnabled: false,
          onApply: apply,
          onClose: close,
        }),
      );
    const view = render(element());

    await user.click(screen.getByRole('checkbox', { name: 'Trip 🏖️' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(close).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
    expect(value.tagIds).toEqual([]);

    view.unmount();
    render(element());

    expect(
      (screen.getByRole('checkbox', { name: 'Trip 🏖️' }) as HTMLInputElement)
        .checked,
    ).toBe(false);

    await user.click(screen.getByRole('checkbox', { name: 'Trip 🏖️' }));
    await user.click(screen.getByRole('checkbox', { name: 'Work' }));
    await user.click(screen.getByRole('checkbox', { name: 'Family' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(apply).toHaveBeenLastCalledWith({
      ...value,
      tagIds: ['0', '1', '2'],
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(apply).toHaveBeenLastCalledWith({
      ...value,
      tagIds: [],
      search: desktop ? 'Coffee' : '',
    });
  },
);

test.each([false, true])(
  'a newer external search survives tag edits, desktop=%s',
  async (desktop) => {
    const user = userEvent.setup();
    const apply = vi.fn();
    const element = (search: string) =>
      translated(
        createElement(HistoryFiltersSheet, {
          value: {
            type: 'all',
            category: 'all',
            recurringOnly: false,
            search,
            tagIds: [],
          },
          desktop,
          creditCardTrackingEnabled: false,
          onApply: apply,
          onClose: vi.fn(),
        }),
      );
    const view = render(element('old'));

    await user.click(screen.getByRole('checkbox', { name: 'Trip 🏖️' }));
    view.rerender(element('new'));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'new', tagIds: ['0'] }),
    );
  },
);

test('deletion requires confirmation and refreshes transactions and templates after success', async () => {
  mocks.remove.mockResolvedValue({ success: true });
  const user = userEvent.setup();
  render(translated(createElement(TagManager)));

  await user.click(screen.getByRole('button', { name: 'Delete “Trip 🏖️”?' }));

  expect(mocks.remove).not.toHaveBeenCalled();
  expect(
    screen.getByText(
      'Only the tag and its links will be removed. Transactions and shortcuts will remain.',
    ),
  ).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Delete' }));

  expect(mocks.remove).toHaveBeenCalledWith('0');
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  expect(mocks.requestRefresh).toHaveBeenCalledOnce();
});

test('real tag badges retain emoji, currency and recurrence; empty tags add no row', () => {
  const source = transaction({
    text: 'Coffee ☕',
    tags: tags.slice(0, 2),
    currency: 'PLN',
    amount: 20,
    amountDefaultCurrency: 5,
    isRecurring: true,
  });
  render(
    translated(
      createElement(MobileTransactionItem, {
        transaction: source,
        handleEdit: vi.fn(),
        handleDelete: vi.fn(),
      }),
    ),
  );

  expect(screen.getByText('Trip 🏖️')).toBeTruthy();
  expect(screen.getByText('Work')).toBeTruthy();
  expect(screen.getByText('Coffee ☕')).toBeTruthy();
  expect(screen.getByText('20 zł')).toBeTruthy();
  expect(screen.getByLabelText('Recurring transaction')).toBeTruthy();

  const view = render(createElement(TagBadges, { tags: [] }));

  expect(view.container.childElementCount).toBe(0);
});

test('empty tag manager explains how to start and exposes creation', () => {
  mocks.empty = true;
  render(translated(createElement(TagManager)));

  expect(
    screen.getByText(
      'Create tags to organize transactions by trip, project or purpose.',
    ),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create tag' })).toBeTruthy();
});

test('editing a tag sends its name and palette color and keeps duplicate errors visible', async () => {
  mocks.save.mockResolvedValue({ error: 'tags.duplicate' });
  const user = userEvent.setup();
  render(translated(createElement(TagManager)));

  await user.click(screen.getByRole('button', { name: 'Edit “Trip 🏖️”' }));
  await user.clear(screen.getByRole('textbox', { name: 'Name' }));
  await user.type(screen.getByRole('textbox', { name: 'Name' }), ' Holiday ');
  await user.click(screen.getByRole('button', { name: 'Green' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ id: '0', name: ' Holiday ', color: 'green' }),
  );
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'A tag with this name already exists.',
  );
  expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
});

test('history table renders real tags under descriptions', async () => {
  const row = transaction({ tags: tags.slice(0, 2) });
  render(
    translated(
      createElement(TransactionsDataGrid, {
        rows: [row],
        handleCopy: vi.fn(),
        handleEdit: vi.fn(),
        handleDelete: vi.fn(),
      }),
    ),
  );

  expect(await screen.findByText('Trip 🏖️')).toBeTruthy();
  expect(screen.getByText('Work')).toBeTruthy();
});
