import type { LiveCatalogItem } from '@/data/types/workflowTypes';

/**
 * Whether a catalogue listing matches what the shopper typed.
 *
 * Name, brand, category, description, or a salt in the listing's composition
 * (the server already matches salts; this keeps the instant results in step,
 * so "paracetamol" finds every brand of it).
 */
export function matchesCatalogQuery(item: LiveCatalogItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.brand, item.category, item.description, item.composition ?? '']
    .some(field => field.toLowerCase().includes(q));
}
