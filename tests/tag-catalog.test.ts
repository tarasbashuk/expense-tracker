// @vitest-environment jsdom

import { createElement, useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import {
  TagCatalogProvider,
  useTagCatalog,
} from '@/components/tags/useTagCatalog';
import TagsAndRecurrence from '@/components/AddTransactionModal/TagsAndRecurrence';
import { messages } from '@/locales';
import { getTags } from '@/app/actions/tags';

vi.mock('@/app/actions/tags', () => ({ getTags: vi.fn() }));

const tag = {
  id: 'a',
  userId: 'owner',
  name: 'Trip',
  normalizedName: 'trip',
  color: 'blue',
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function Catalog() {
  const { tags, loading, error } = useTagCatalog();

  return createElement(
    'output',
    null,
    loading ? 'Loading' : tags.map((item) => item.name).join(',') + error,
  );
}

test('catalog is shared, survives closing consumers, and refreshes without clearing existing tags', async () => {
  vi.mocked(getTags).mockResolvedValue({ tags: [tag] });
  const tree = (open: boolean) =>
    createElement(
      TagCatalogProvider,
      null,
      open ? createElement(Catalog) : null,
    );
  const view = render(tree(true));

  await screen.findByText('Trip');
  view.rerender(tree(false));
  view.rerender(tree(true));

  expect(screen.getByText('Trip')).toBeTruthy();
  expect(getTags).toHaveBeenCalledTimes(1);

  let finish!: (_value: { tags: (typeof tag)[] }) => void;
  vi.mocked(getTags).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );

  act(() => {
    window.dispatchEvent(new Event('tags-updated'));
  });

  expect(screen.getByText('Trip')).toBeTruthy();

  await act(async () => {
    finish({ tags: [{ ...tag, name: 'Renamed' }] });
  });

  expect(screen.getByText('Renamed')).toBeTruthy();

  vi.mocked(getTags).mockResolvedValue({ tags: [] });
  act(() => {
    window.dispatchEvent(new Event('tags-updated'));
  });

  await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
});

test('switching user discards the previous catalog and ignores its late response', async () => {
  let finish!: (_value: { tags: (typeof tag)[] }) => void;
  vi.mocked(getTags).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const tree = (user: string) =>
    createElement(TagCatalogProvider, { key: user }, createElement(Catalog));
  const view = render(tree('first'));
  vi.mocked(getTags).mockResolvedValue({
    tags: [{ ...tag, userId: 'other', name: 'Other' }],
  });

  view.rerender(tree('other'));
  await screen.findByText('Other');
  await act(async () => {
    finish({ tags: [tag] });
  });

  expect(screen.queryByText('Trip')).toBeNull();
  expect(screen.getByText('Other')).toBeTruthy();
});

test('failed refresh keeps cached tags and allows a later successful refresh', async () => {
  vi.mocked(getTags).mockResolvedValue({ tags: [tag] });
  render(createElement(TagCatalogProvider, null, createElement(Catalog)));
  await screen.findByText('Trip');

  vi.mocked(getTags).mockRejectedValueOnce(new Error('offline'));
  act(() => {
    window.dispatchEvent(new Event('tags-updated'));
  });

  await screen.findByText('Triptags.loadError');

  act(() => {
    window.dispatchEvent(new Event('tags-updated'));
  });

  await screen.findByText('Trip');
});

function Options() {
  const [recurring, setRecurring] = useState(true);

  return createElement(
    TagsAndRecurrence,
    { tagCount: 1, recurring },
    createElement(
      'div',
      null,
      createElement('input', {
        'aria-label': 'End date',
        defaultValue: '2026-12-31',
      }),
      createElement('input', {
        type: 'checkbox',
        'aria-label': 'Monthly',
        checked: recurring,
        onChange: () => setRecurring(!recurring),
      }),
    ),
  );
}

test('collapsing preserves inputs and updates the Ukrainian summary', async () => {
  const user = userEvent.setup();
  render(
    createElement(
      IntlProvider,
      { locale: 'uk-UA', messages: messages['uk-UA'] },
      createElement(Options),
    ),
  );
  const heading = screen.getByRole('button', { name: /Теги та повторення/ });

  expect(heading.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByText('1 тег · Щомісяця')).toBeTruthy();

  await user.click(heading);
  await user.clear(screen.getByLabelText('End date'));
  await user.type(screen.getByLabelText('End date'), '2027-01-01');
  await user.click(screen.getByLabelText('Monthly'));
  await user.click(heading);

  expect(screen.getByText('1 тег · Без повторення')).toBeTruthy();

  await user.click(heading);

  expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe(
    '2027-01-01',
  );
  expect((screen.getByLabelText('Monthly') as HTMLInputElement).checked).toBe(
    false,
  );
});

test.each([
  [true, 0, false, false],
  [true, 1, false, true],
  [true, 0, true, true],
  [true, 2, true, true],
  [false, 1, true, false],
] as const)(
  'initial expansion for edit=%s, tags=%s, recurring=%s is %s',
  async (isEditMode, tagCount, recurring, expanded) => {
    const user = userEvent.setup();
    const tree = (count: number) =>
      createElement(
        IntlProvider,
        { locale: 'en-US', messages: messages['en-US'] },
        createElement(TagsAndRecurrence, {
          isEditMode,
          tagCount: count,
          recurring,
        }),
      );
    const view = render(tree(tagCount));
    const heading = screen.getByRole('button', { name: /Tags and recurrence/ });

    expect(heading.getAttribute('aria-expanded')).toBe(String(expanded));

    await user.click(heading);
    view.rerender(tree(tagCount + 1));

    expect(heading.getAttribute('aria-expanded')).toBe(String(!expanded));
  },
);
