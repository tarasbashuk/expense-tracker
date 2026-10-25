import { useMemo, useSyncExternalStore } from 'react';
import { vi } from 'vitest';

const changeEvent = 'test-url-change';

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener('popstate', callback);

  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener('popstate', callback);
  };
}

export function useTestSearchParams() {
  const query = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );

  return useMemo(() => new URLSearchParams(query), [query]);
}

// Emulate Next's native History API integration without replacing the real browser history.
export function installUrlTest(url: string) {
  window.history.replaceState(null, '', url);
  const replace = window.history.replaceState.bind(window.history);
  const push = window.history.pushState.bind(window.history);
  vi.spyOn(window.history, 'replaceState').mockImplementation(
    (data, unused, href) => {
      replace(data, unused, href);
      window.dispatchEvent(new Event(changeEvent));
    },
  );
  vi.spyOn(window.history, 'pushState').mockImplementation(
    (data, unused, href) => {
      push(data, unused, href);
      window.dispatchEvent(new Event(changeEvent));
    },
  );
}
