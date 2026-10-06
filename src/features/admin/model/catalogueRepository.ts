import { apiRequest } from '@/data/http';
import type { LiveCatalogItem } from '@/data/workflowTypes';
import type { CatalogEntryChange, CatalogListQuery, CatalogPage, NewCatalogEntry } from './types';

/** The marketplace catalogue for Super Admin. The only place that knows the /ops/catalog endpoints. */
export interface CatalogueRepository {
  /** The first `limit` entries, unfiltered, for the summary. */
  sample(limit: number, signal?: AbortSignal): Promise<CatalogPage>;
  list(query: CatalogListQuery, signal?: AbortSignal): Promise<CatalogPage>;
  create(entry: NewCatalogEntry): Promise<LiveCatalogItem>;
  update(itemId: string, change: CatalogEntryChange): Promise<unknown>;
  /** Sends the image as multipart form data, in a field named "file". */
  uploadImage(itemId: string, image: Blob): Promise<unknown>;
  removeImage(itemId: string): Promise<unknown>;
}

/** /ops/catalog?limit=…&offset=…[&query=…] */
const listPath = ({ limit, offset, query }: CatalogListQuery) =>
  `/ops/catalog?limit=${limit}&offset=${offset}${query ? `&query=${encodeURIComponent(query)}` : ''}`;

export const catalogueRepository: CatalogueRepository = {
  sample: (limit, signal) => apiRequest<CatalogPage>(`/ops/catalog?limit=${limit}`, { signal }),
  list: (query, signal) => apiRequest<CatalogPage>(listPath(query), { signal }),
  create: entry => apiRequest<LiveCatalogItem>('/ops/catalog', { method: 'POST', body: JSON.stringify(entry) }),
  update: (itemId, change) => apiRequest(`/ops/catalog/${itemId}`, { method: 'PATCH', body: JSON.stringify(change) }),
  uploadImage: (itemId, image) => {
    const formData = new FormData();
    formData.append('file', image);
    return apiRequest(`/ops/catalog/${itemId}/image`, { method: 'POST', body: formData });
  },
  removeImage: itemId => apiRequest(`/ops/catalog/${itemId}/image`, { method: 'DELETE' }),
};
