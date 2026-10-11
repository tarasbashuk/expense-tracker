// @vitest-environment jsdom

import { createElement, useState, type ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, expect, test, vi } from 'vitest';
import TransactionsDataGrid from '@/components/TransactionsDataGrid';
import { Button, DialogActions, DialogContent, TextField } from '@mui/material';
import ResponsiveDialog, {
  FormTitle,
} from '@/components/shared/ResponsiveDialog';
import { fitTagPreview } from '@/components/tags/TagPreview';
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
  vi.unstubAllGlobals();
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

  expect(first.getAttribute('aria-checked')).toBe('false');
  expect(getComputedStyle(first).backgroundColor).toBe('rgb(219, 234, 254)');
  expect(getComputedStyle(first).color).toBe('rgb(30, 58, 138)');

  await user.click(first);
  await user.click(second);

  expect(first.getAttribute('aria-checked')).toBe('true');
  expect(second.getAttribute('aria-checked')).toBe('true');
  expect(third.disabled).toBe(true);

  await user.click(first);

  expect(first.getAttribute('aria-checked')).toBe('false');
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
      screen
        .getByRole('checkbox', { name: 'Trip 🏖️' })
        .getAttribute('aria-checked'),
    ).toBe('false');

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

  await user.click(screen.getByRole('button', { name: 'Manage' }));
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
    screen.getByText('Organize transactions with your own tags.'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create tag' })).toBeTruthy();
});

test('editing a tag sends its name and palette color and keeps duplicate errors visible', async () => {
  mocks.save.mockResolvedValue({ error: 'tags.duplicate' });
  const user = userEvent.setup();
  render(translated(createElement(TagManager)));

  await user.click(screen.getByRole('button', { name: 'Manage' }));
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

function TransactionDraftForm({ initial = [] }: { initial?: string[] }) {
  const [ids, setIds] = useState(initial);
  const [text, setText] = useState('Rent 💙');
  const [open, setOpen] = useState(true);

  return createElement(
    ResponsiveDialog,
    { open, desktop: false, onClose: () => setOpen(false) },
    createElement(
      FormTitle,
      { onClose: () => setOpen(false) },
      'Transaction draft',
    ),
    createElement(
      DialogContent,
      null,
      createElement(TextField, {
        label: 'Description',
        value: text,
        onChange: (event) => setText(event.target.value),
      }),
      createElement(TagPicker, { value: ids, onChange: setIds }),
    ),
    createElement(
      DialogActions,
      null,
      createElement(Button, { onClick: () => setOpen(false) }, 'Done'),
    ),
  );
}

test('inline tag creation is a single panel step; cancellation retains draft and selection', async () => {
  const user = userEvent.setup();
  render(translated(createElement(TransactionDraftForm, { initial: ['0'] })));
  await user.type(
    screen.getByRole('textbox', { name: 'Description' }),
    ' apartment',
  );
  await user.click(screen.getByRole('button', { name: 'Create tag' }));

  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.queryByRole('textbox', { name: 'Description' })).toBeNull();

  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Unfinished');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveProperty(
    'value',
    'Rent 💙 apartment',
  );
  expect(
    screen
      .getByRole('checkbox', { name: 'Trip 🏖️' })
      .getAttribute('aria-checked'),
  ).toBe('true');
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
});

test.each([0, 1, 2])(
  'created tag is immediately available, auto-selected only below the limit: %s',
  async (count) => {
    const user = userEvent.setup();
    const initial = ['0', '1'].slice(0, count);
    mocks.save.mockResolvedValue({
      tag: {
        id: 'new',
        name: 'New tag',
        normalizedName: 'new tag',
        color: 'blue',
        userId: 'owner',
      },
    });
    render(translated(createElement(TransactionDraftForm, { initial })));

    await user.click(screen.getByRole('button', { name: 'Create tag' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New tag');

    expect(screen.getByText('New tag')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Create tag' }));
    const created = await screen.findByRole('checkbox', { name: 'New tag' });

    expect(created.getAttribute('aria-checked')).toBe(String(count < 2));
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveProperty(
      'value',
      'Rent 💙',
    );

    for (const id of initial) {
      expect(
        screen
          .getByRole('checkbox', { name: tags[Number(id)].name })
          .getAttribute('aria-checked'),
      ).toBe('true');
    }

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  },
);

test('mobile panel follows the visual viewport and restores the previous body overflow', async () => {
  const user = userEvent.setup();
  const viewport = Object.assign(new EventTarget(), {
    height: 500,
    offsetTop: 0,
  });
  vi.stubGlobal('visualViewport', viewport);
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'auto';
  render(translated(createElement(TransactionDraftForm)));

  expect(document.body.style.overflow).toBe('hidden');
  const dialog = screen.getByRole('dialog');

  act(() => {
    viewport.height = 350;
    viewport.dispatchEvent(new Event('resize'));
  });

  await waitFor(() =>
    expect(getComputedStyle(dialog).bottom).toBe(
      `${window.innerHeight - 350}px`,
    ),
  );
  expect(getComputedStyle(dialog).margin).toBe('0px');

  await user.click(screen.getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(document.body.style.overflow).toBe('auto'));
  document.body.style.overflow = previous;
});

test.each([390, 393, 402])(
  'home preview reserves room for create and More within two rows at %s px',
  (viewport) => {
    const available = viewport - 32;
    const count = fitTagPreview(
      available,
      [160, 160, 160, 160, 160, 160],
      64,
      80,
    );

    expect(count).toBe(3);
    expect(fitTagPreview(available, [600, 600, 600], 64, 80)).toBe(1);
  },
);

test.each([0, 1, 2])(
  'transaction descriptions allow two lines only without tags; tags=%s',
  (count) => {
    render(
      translated(
        createElement(MobileTransactionItem, {
          transaction: transaction({
            text: 'A long description with emoji 🏖️',
            tags: tags.slice(0, count),
          }),
          handleEdit: vi.fn(),
          handleDelete: vi.fn(),
        }),
      ),
    );
    const description = screen.getByText('A long description with emoji 🏖️');
    const style = getComputedStyle(description);
    const editButton = description.closest('button')!;

    expect(style.whiteSpace).toBe(count ? 'nowrap' : 'normal');
    expect(style.display).toBe(count ? 'block' : '-webkit-box');
    expect(getComputedStyle(editButton).alignItems).toBe('center');
    expect(getComputedStyle(editButton.lastElementChild!).alignSelf).toBe('center');
  },
);
