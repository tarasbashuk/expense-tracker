'use client';

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { CategoryRecord } from '@/lib/customCategories';
import { getCustomCategories } from '@/app/actions/customCategories';

interface Catalog {
  categories: CategoryRecord[];
  error: string;
  loading: boolean;
}

const CategoryCatalogContext = createContext<Catalog>({
  categories: [],
  error: '',
  loading: false,
});

// Mount once per authenticated user, above all forms and filters.
export function CategoryCatalogProvider({
  children,
  enabled = true,
}: {
  children?: ReactNode;
  enabled?: boolean;
}) {
  const [catalog, setCatalog] = useState<Catalog>({
    categories: [],
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
        const result = await getCustomCategories();

        if (!active || request !== revision) return;

        setCatalog((current) => ({
          categories: result.categories || current.categories,
          error: result.error || '',
          loading: false,
        }));
      } catch {
        if (active && request === revision) {
          setCatalog((current) => ({
            ...current,
            error: 'customCategories.loadError',
            loading: false,
          }));
        }
      }
    };

    void load();
    window.addEventListener('categories-updated', load);

    return () => {
      active = false;
      window.removeEventListener('categories-updated', load);
    };
  }, [enabled]);

  return createElement(
    CategoryCatalogContext.Provider,
    { value: catalog },
    children,
  );
}

export function useCategoryCatalog() {
  const catalog = useContext(CategoryCatalogContext);

  return catalog;
}
