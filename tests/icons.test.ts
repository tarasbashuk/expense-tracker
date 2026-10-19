// @vitest-environment jsdom

import { createElement, createRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import {
  Alert,
  Checkbox,
  Select,
  MenuItem,
  ThemeProvider,
} from '@mui/material';
import { DownloadIcon } from '@/components/shared/icons';
import { appTheme } from '@/theme';

afterEach(cleanup);

test('Lucide adapter preserves refs, stroke artwork, sizing, and theme colors', () => {
  const ref = createRef<SVGSVGElement>();

  render(
    createElement(
      ThemeProvider,
      { theme: appTheme },
      createElement(DownloadIcon, {
        ref,
        color: 'error',
        sx: { fontSize: 22 },
      }),
    ),
  );

  const icon = ref.current!;
  const style = getComputedStyle(icon);

  expect(icon.classList.contains('lucide-download')).toBe(true);
  expect(icon.getAttribute('stroke-width')).toBe('1.75');
  expect(['none', 'rgba(0, 0, 0, 0)']).toContain(style.fill);
  expect(style.fontSize).toBe('22px');
  expect(style.color).toBe('rgb(211, 47, 47)');
  expect(icon.getAttribute('aria-hidden')).toBe('true');
});

test('theme replaces built-in select, checkbox, and alert icons with Lucide', () => {
  const view = render(
    createElement(
      ThemeProvider,
      { theme: appTheme },
      createElement(
        Select,
        { value: 'all' },
        createElement(MenuItem, { value: 'all' }, 'All'),
      ),
      createElement(Checkbox, { checked: true, readOnly: true }),
      createElement(Alert, { severity: 'success' }, 'Saved'),
    ),
  );

  expect(view.container.querySelector('.lucide-chevron-down')).toBeTruthy();
  expect(view.container.querySelector('.lucide-square-check')).toBeTruthy();
  expect(view.container.querySelector('.lucide-circle-check')).toBeTruthy();
});
