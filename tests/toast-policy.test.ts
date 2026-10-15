import { afterEach, expect, test, vi } from 'vitest';
import type { ToastOptions } from 'react-toastify';
import { toast } from '@/lib/toast';

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock('react-toastify', () => ({ toast: mocks }));

afterEach(() => {
  for (const mock of Object.values(mocks)) {
    for (const [, options] of mock.mock.calls) {
      (options as ToastOptions).onClose?.();
    }
  }

  vi.clearAllMocks();
});

test.each(['success', 'info', 'warning', 'error'] as const)(
  '%s uses a single announcement, correct timeout, and deduplicates even before display',
  (kind) => {
    toast[kind]('Message');
    toast[kind]('Message');

    expect(mocks[kind]).toHaveBeenCalledOnce();
    const options = mocks[kind].mock.calls[0][1] as ToastOptions;
    expect(options.role).toBe(kind === 'error' ? 'alert' : 'status');
    expect(options.autoClose).toBe(kind === 'error' ? false : 4000);

    options.onClose?.();
    toast[kind]('Message');

    expect(mocks[kind]).toHaveBeenCalledTimes(2);
  },
);
