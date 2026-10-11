'use client';

import { useEffect, useState } from 'react';
import type { Tag } from '@prisma/client';
import { getTags } from '@/app/actions/tags';

export function useTagCatalog() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await getTags();

        if (!active) return;

        setTags(result.tags || []);
        setError(result.error || '');
      } catch {
        if (active) setError('tags.loadError');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    window.addEventListener('tags-updated', load);

    return () => {
      active = false;
      window.removeEventListener('tags-updated', load);
    };
  }, []);

  return { tags, error, loading };
}
