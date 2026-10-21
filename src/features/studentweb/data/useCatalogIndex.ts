import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/data/services/http';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { CATALOG_PAGE_LIMIT } from './studentWebData';

/** Most catalogue pages read when resolving bought items (a guard, not a business value). */
const MAX_PAGES = 20;

/**
 * Today's shop listing by id (`GET /catalog?kind=product`, commerce plane), so
 * Buy again shows the current price, stock and prescription rule rather than
 * what the student paid last time. Only shop items are read.
 */
export function useCatalogIndex(enabled: boolean) {
  const [items, setItems] = useState<Map<string, LiveCatalogItem> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(enabled);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return undefined; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    (async () => {
      const found = new Map<string, LiveCatalogItem>();
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await apiRequest<{ items: LiveCatalogItem[]; total: number }>(
          `/catalog?kind=product&limit=${CATALOG_PAGE_LIMIT}&offset=${page * CATALOG_PAGE_LIMIT}`,
          { signal: controller.signal },
        );
        for (const item of result.items) found.set(item.id, item);
        if ((page + 1) * CATALOG_PAGE_LIMIT >= result.total || !result.items.length) break;
      }
      return found;
    })().then((found) => {
      if (!controller.signal.aborted) setItems(found);
    }).catch((reason: Error) => {
      if (!controller.signal.aborted) setError(reason.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [enabled, version]);

  return { items, error, loading, reload };
}
