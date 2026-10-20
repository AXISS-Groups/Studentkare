import type { LiveCatalogItem } from '@/data/types/workflowTypes';

/**
 * Listings the phone boards have already read from the public catalogue, by
 * id, so a product opened from search (another route) shows at once without
 * a second request. Catalogue data only (commerce plane, public); it is held
 * in memory for the page's life and never written to the device.
 */
const listings = new Map<string, LiveCatalogItem>();

export function rememberListing(item: LiveCatalogItem): void {
  listings.set(item.id, item);
}

export function recallListing(id: string): LiveCatalogItem | null {
  return listings.get(id) ?? null;
}

/** Test seam. */
export function forgetListings(): void {
  listings.clear();
}
