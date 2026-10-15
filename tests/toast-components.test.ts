// @vitest-environment jsdom

import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import { toast as notifications } from 'react-toastify';
import { toast } from '@/lib/toast';
import AppToasts from '@/components/AppToasts';
import { messages } from '@/locales';

function show() {
  return render(
    createElement(
      IntlProvider,
      { locale: 'en-US', messages: messages['en-US'] },
      createElement(AppToasts),
    ),
  );
}

afterEach(() => {
  act(() => {
    notifications.dismiss();
    notifications.clearWaitingQueue();
  });
  cleanup();
  vi.restoreAllMocks();
});

test('one toast at a time, no duplicate queued messages, close target and one live region', async () => {
  const view = show();

  act(() => {
    toast.success('First message');
    toast.info('Second message');
    toast.info('Second message');
    toast.error('Action required');
  });

  const first = await screen.findByRole('status');
  expect(first.textContent).toBe('First message');
  expect(screen.queryByText('Second message')).toBeNull();
  expect(
    view.container.querySelector('.Toastify')?.hasAttribute('aria-live'),
  ).toBe(false);
  expect(
    getComputedStyle(screen.getByRole('button', { name: 'Close' })).width,
  ).toBe('44px');

  fireEvent.animationEnd(first);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.animationEnd(first);

  const second = await screen.findByText('Second message');
  const secondToast = second.closest('.Toastify__toast')!;
  fireEvent.animationEnd(secondToast);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.animationEnd(secondToast);

  expect((await screen.findByRole('alert')).textContent).toBe(
    'Action required',
  );
  expect(screen.queryByText('Second message')).toBeNull();
});

test('uses measured navigation height once and pauses while a form or toast focus is active', async () => {
  const navigation = document.createElement('div');
  navigation.dataset.bottomNavigation = '';
  vi.spyOn(navigation, 'getBoundingClientRect').mockReturnValue({
    height: 83,
  } as DOMRect);
  document.body.append(navigation);
  const view = show();
  const pause = vi.spyOn(notifications, 'pause');

  act(() => toast.success('Focus message'));

  const notification = await screen.findByRole('status');
  expect(view.container.firstElementChild?.getAttribute('style')).toContain(
    '--toast-bottom: 95px',
  );

  fireEvent.focus(screen.getByRole('button', { name: 'Close' }));

  expect(pause).toHaveBeenCalled();

  const modal = document.createElement('div');
  modal.setAttribute('aria-modal', 'true');

  await act(async () => {
    document.body.append(modal);
  });

  await waitFor(() =>
    expect(getComputedStyle(notification).visibility).toBe('hidden'),
  );

  await act(async () => {
    modal.remove();
  });

  await waitFor(() =>
    expect(getComputedStyle(notification).visibility).toBe('visible'),
  );
  navigation.remove();
});

test('long messages wrap without a height cap and do not steal focus', async () => {
  const input = document.createElement('input');
  document.body.append(input);
  input.focus();
  show();
  const message = 'A long explanatory message with details. '.repeat(12);

  act(() => toast.info(message));

  const notification = await screen.findByRole('status');

  expect(notification.textContent).toBe(message);
  expect(getComputedStyle(notification).maxHeight).toBe('none');
  expect(getComputedStyle(notification).width).toBe('100%');
  expect(getComputedStyle(notification).overflowWrap).toBe('anywhere');
  expect(document.activeElement).toBe(input);
  input.remove();
});
