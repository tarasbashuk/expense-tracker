// @vitest-environment jsdom

import { createElement } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import { CategoryCatalogProvider } from '@/components/categories/useCategoryCatalog';
import CategoryManager from '@/components/categories/CategoryManager';
import CategoryIcon from '@/components/history/CategoryIcon';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import {
  archiveCustomCategory,
  getCustomCategories,
  saveCustomCategory,
} from '@/app/actions/customCategories';
import { messages } from '@/locales';

vi.mock('@/app/actions/customCategories', () => ({
  getCustomCategories: vi.fn(),
  saveCustomCategory: vi.fn(),
  archiveCustomCategory: vi.fn(),
}));

const category = {
  id: 'one',
  userId: 'owner',
  name: 'Pottery',
  normalizedName: 'pottery',
  type: 'Expense' as const,
  icon: 'palette',
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.mocked(getCustomCategories).mockResolvedValue({ categories: [category] });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function Label() {
  const { getLabel } = useCategoryI18n();

  return createElement(
    'output',
    null,
    getLabel('custom:one'),
    createElement(CategoryIcon, { category: 'custom:one' }),
  );
}

function tree(content = createElement(CategoryManager), userId = 'owner') {
  return createElement(
    IntlProvider,
    { locale: 'en-US', messages: messages['en-US'] },
    createElement(CategoryCatalogProvider, { key: userId }, content),
  );
}

test('settings creates a category with an accessible monochrome icon choice and refreshes the catalog', async () => {
  vi.mocked(getCustomCategories).mockResolvedValue({ categories: [] });
  vi.mocked(saveCustomCategory).mockImplementation(async () => {
    vi.mocked(getCustomCategories).mockResolvedValue({
      categories: [category],
    });

    return { category };
  });
  const user = userEvent.setup();
  render(tree());
  await screen.findByText('No custom categories yet.');

  await user.click(screen.getByRole('button', { name: 'Add category' }));
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Pottery');
  await user.click(screen.getByRole('button', { name: 'Palette' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  await screen.findByText('Pottery');
  expect(saveCustomCategory).toHaveBeenCalledWith({
    id: undefined,
    name: 'Pottery',
    type: 'Expense',
    icon: 'palette',
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('rename updates existing labels and icons without changing the stored key; archives remain readable', async () => {
  const view = render(tree(createElement(Label)));
  await screen.findByText('Pottery');
  expect(view.container.querySelector('svg.lucide-palette')).toBeTruthy();
  vi.mocked(getCustomCategories).mockResolvedValue({
    categories: [{ ...category, name: 'Clay', icon: 'baby', archived: true }],
  });

  act(() => window.dispatchEvent(new Event('categories-updated')));

  await screen.findByText('Clay');
  expect(view.container.querySelector('svg.lucide-baby')).toBeTruthy();
  expect(view.container.querySelector('svg')?.getAttribute('stroke')).toBe(
    'currentColor',
  );
});

test('archive and restore refresh settings without deleting categories', async () => {
  const user = userEvent.setup();
  vi.mocked(archiveCustomCategory).mockImplementation(async (_, archived) => {
    const updated = { ...category, archived };
    vi.mocked(getCustomCategories).mockResolvedValue({ categories: [updated] });

    return { category: updated };
  });
  render(tree());
  await screen.findByText('Pottery');

  await user.click(screen.getByRole('button', { name: 'Archive: Pottery' }));
  await screen.findByText('Archived');
  await user.click(screen.getByRole('button', { name: 'Restore: Pottery' }));

  await waitFor(() => expect(screen.queryByText('Archived')).toBeNull());
  expect(archiveCustomCategory).toHaveBeenNthCalledWith(1, 'one', true);
  expect(archiveCustomCategory).toHaveBeenNthCalledWith(2, 'one', false);
});

test('switching users discards the previous catalog and ignores late responses', async () => {
  let finish!: (_value: { categories: (typeof category)[] }) => void;
  vi.mocked(getCustomCategories).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(tree(createElement(Label), 'first'));
  vi.mocked(getCustomCategories).mockResolvedValue({
    categories: [{ ...category, userId: 'second', name: 'Second' }],
  });
  view.rerender(tree(createElement(Label), 'second'));
  await screen.findByText('Second');

  await act(async () => finish({ categories: [category] }));

  expect(screen.getByText('Second')).toBeTruthy();
  expect(screen.queryByText('Pottery')).toBeNull();
});
