'use client';

import { createElement } from 'react';
import { toast as notifications, type ToastOptions } from 'react-toastify';

type Kind = 'success' | 'error' | 'warning' | 'info';
const pending = new Set<string>();

function notify(kind: Kind, message?: string) {
  if (!message) return;

  const id = `${kind}:${message}`;

  if (pending.has(id)) return;

  pending.add(id);
  const options: ToastOptions = {
    toastId: id,
    autoClose: kind === 'error' ? false : 4000,
    role: kind === 'error' ? 'alert' : 'status',
    onClose: () => {
      pending.delete(id);
    },
  };

  return notifications[kind](
    createElement('span', { className: 'app-toast-message' }, message),
    options,
  );
}

export const toast = {
  success: (message?: string) => notify('success', message),
  error: (message?: string) => notify('error', message),
  warning: (message?: string) => notify('warning', message),
  info: (message?: string) => notify('info', message),
};
