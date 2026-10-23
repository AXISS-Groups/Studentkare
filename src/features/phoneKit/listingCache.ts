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

/**
 * Listings the student opened (a product page), newest first, for Mobile 2.0
 * Home's "Recently viewed". Public catalogue data only (commerce plane), in
 * memory for the page's life; never written to the device, never sent anywhere.
 */
let viewed: string[] = [];

export function rememberViewed(item: LiveCatalogItem): void {
  listings.set(item.id, item);
  viewed = [item.id, ...viewed.filter((id) => id !== item.id)];
}

/** At most `limit` listings opened this session, newest first. */
export function recentlyViewed(limit: number): LiveCatalogItem[] {
  return viewed.slice(0, Math.max(0, limit)).map((id) => listings.get(id)).filter((item): item is LiveCatalogItem => Boolean(item));
}

/** Test seam. */
export function forgetListings(): void {
  listings.clear();
  viewed = [];
}
