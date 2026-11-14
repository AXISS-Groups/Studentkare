import type { apiRequest } from '@/data/services/http';
import type { MessageKey } from '@/i18n';

/**
 * Delivery by area (backend services/delivery_areas.py).
 *
 * A pincode can cover several areas, and a provider may deliver to only some
 * of them. The checkout offers the areas the postal directory lists for the
 * pincode; the server decides whether the provider delivers there. This is
 * public postal reference data, not anything about a person.
 */

export const PINCODE = /^[1-9]\d{5}$/;

/** Why the server refused home delivery (POST /api/cart/validate `deliveryRefusal`). */
type DeliveryRefusal = 'NO_PINCODE' | 'AREA_NEEDED' | 'NO_AREA' | '';

const REFUSAL_KEYS: Record<Exclude<DeliveryRefusal, ''>, MessageKey> = {
  NO_PINCODE: 'cart.refusal.noPincode',
  AREA_NEEDED: 'cart.refusal.areaNeeded',
  NO_AREA: 'cart.refusal.noArea',
};

/** Our own words for a refusal, or null when the server sent a reason we do not know. */
export function refusalKey(code: string | undefined): MessageKey | null {
  return code && Object.prototype.hasOwnProperty.call(REFUSAL_KEYS, code) ? REFUSAL_KEYS[code as Exclude<DeliveryRefusal, ''>] : null;
}

/** GET /api/pincodes/{pincode}/areas. An empty list means the directory has none: ask for no area. */
export async function fetchAreas(request: typeof apiRequest, pincode: string): Promise<string[]> {
  if (!PINCODE.test(pincode)) return [];
  const found = await request<{ areas?: unknown }>(`/pincodes/${pincode}/areas`);
  return Array.isArray(found.areas) ? found.areas.filter((a): a is string => typeof a === 'string' && a.trim().length > 0) : [];
}

/** The delivery part of an order: the area is sent only for home delivery, and only when chosen. */
export function withArea<T extends { mode: 'pickup' | 'delivery' }>(delivery: T, area: string): T | (T & { area: string }) {
  return delivery.mode === 'delivery' && area ? { ...delivery, area } : delivery;
}
