'use client';

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Tag } from '@prisma/client';
import { getTags } from '@/app/actions/tags';

interface Catalog {
  tags: Tag[];
  error: string;
  loading: boolean;
}

const TagCatalogContext = createContext<Catalog | null>(null);

// Mount once per authenticated user, above all forms and filters.
export function TagCatalogProvider({
  children,
  enabled = true,
}: {
  children?: ReactNode;
  enabled?: boolean;
}) {
  const [catalog, setCatalog] = useState<Catalog>({
    tags: [],
    error: '',
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let revision = 0;
    const load = async () => {
      const request = ++revision;

      try {
        const result = await getTags();

        if (!active || request !== revision) return;

        setCatalog((current) => ({
          tags: result.tags || current.tags,
          error: result.error || '',
          loading: false,
        }));
      } catch {
        if (active && request === revision) {
          setCatalog((current) => ({
            ...current,
            error: 'tags.loadError',
            loading: false,
          }));
        }
      }
    };

    void load();
    window.addEventListener('tags-updated', load);

    return () => {
      active = false;
      window.removeEventListener('tags-updated', load);
    };
  }, [enabled]);

  return createElement(
    TagCatalogContext.Provider,
    { value: catalog },
    children,
  );
}

export function useTagCatalog() {
  const catalog = useContext(TagCatalogContext);

  if (!catalog) throw new Error('useTagCatalog requires TagCatalogProvider');

  return catalog;
}
