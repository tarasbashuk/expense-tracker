// @vitest-environment jsdom

import { createElement, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import DesktopHistoryFilters from '@/components/history/DesktopHistoryFilters';
import type { HistoryFilters } from '@/components/history/HistoryFiltersSheet';
import { messages } from '@/locales';

// TagPicker imports TagEditor even when only filter controls are rendered.
// Keep its server actions (Clerk/Prisma/Next) outside this UI test module graph.
// Keep server-only Prisma and Clerk dependencies out of component tests.
vi.mock('@/app/actions/customCategories', () => ({
  getCustomCategories: vi.fn().mockResolvedValue({ categories: [] }),
  saveCustomCategory: vi.fn(),
  archiveCustomCategory: vi.fn(),
}));

vi.mock('@/app/actions/tags', () => ({
  getTags: vi.fn(),
  saveTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock('@/components/tags/useTagCatalog', () => ({
  useTagCatalog: () => ({
    tags: ['Alpha', 'Beta', 'Gamma'].map((name) => ({
      id: name,
      name,
      color: 'blue',
    })),
    loading: false,
    error: '',
  }),
}));

afterEach(cleanup);

function Harness() {
  const [value, setValue] = useState<HistoryFilters>({
    type: 'all',
    category: 'all',
    tagIds: [],
    recurringOnly: false,
    search: '',
  });

  return createElement(
    IntlProvider,
    { locale: 'en-US', messages: messages['en-US'] },
    createElement(DesktopHistoryFilters, {
      value,
      onChange: setValue,
      creditCardTrackingEnabled: false,
    }),
    createElement(
      'output',
      { 'data-testid': 'filters' },
      JSON.stringify(value),
    ),
  );
}

test('tags apply immediately, keep the dropdown open, and allow more than two selections', async () => {
  const user = userEvent.setup();
  render(createElement(Harness));

  await user.click(screen.getByRole('combobox', { name: 'Tags' }));
  await user.click(screen.getByRole('option', { name: 'Alpha' }));
  await user.click(screen.getByRole('option', { name: 'Beta' }));
  await user.click(screen.getByRole('option', { name: 'Gamma' }));

  expect(screen.getByRole('listbox')).toBeTruthy();
  expect(JSON.parse(screen.getByTestId('filters').textContent!).tagIds).toEqual(
    ['Alpha', 'Beta', 'Gamma'],
  );

  await user.click(screen.getByRole('option', { name: 'Beta' }));

  expect(JSON.parse(screen.getByTestId('filters').textContent!).tagIds).toEqual(
    ['Alpha', 'Gamma'],
  );
  await user.keyboard('{Escape}');

  expect(screen.getByRole('combobox', { name: 'Tags' }).textContent).toContain(
    'Tags: 2',
  );
});
