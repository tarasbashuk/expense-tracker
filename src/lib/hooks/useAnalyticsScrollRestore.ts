'use client';

import { useEffect } from 'react';

export function rememberAnalyticsScroll() {
  window.history.replaceState(
    {
      ...window.history.state,
      analyticsScroll: { url: window.location.href, y: window.scrollY },
    },
    '',
  );
}

export default function useAnalyticsScrollRestore(ready: boolean) {
  useEffect(() => {
    const saved = window.history.state?.analyticsScroll;

    if (
      !ready ||
      saved?.url !== window.location.href ||
      !Number.isFinite(saved?.y)
    ) {
      return;
    }

    // Wait for the loaded chart and list to establish their page height.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: saved.y, behavior: 'instant' });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [ready]);
}
