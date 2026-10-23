import { apiRequest } from '@/data/services/http';

/**
 * Refill reminders and the one-tap reorder. Two planes, two sets of calls:
 *
 * - `/refill-tracker/*` is clinical (backend/services/refill_tracker.py): the
 *   student's own pack sizes, dose counts and run-out dates.
 * - `/orders/{id}/reorder-quote`, `/orders`, `/catalog/{id}/stock-alert` are
 *   commerce (backend/services/reorder.py). They are called with an order id and
 *   item ids only: no refill id, label or count ever goes to the commerce side
 *   (Rule L, AGENTS.md guardrail 4).
 *
 * Nothing here is kept on the device (WP-07 D7-1).
 */

export type RefillSource = 'ORDER' | 'PLAN';

export interface Refill {
  id: string;
  source: RefillSource;
  label: string;
  planId: string | null;
  orderId: string | null;
  itemId: string | null;
  packSize: number;
  packs: number;
  unitsPerDose: number;
  dosesPerDay: number;
  unitsPerDay: number;
  unitsLeft: number;
  startedOn: string;
  runsOutOn: string;
  daysLeft: number;
  remindOn: string;
  remindDaysBefore: number;
  enabled: boolean;
  snoozedUntil: number | null;
  canReorder: boolean;
}

export interface TrackablePlan { id: string; name: string; timesPerDay: number | null }

export interface NewRefill {
  source: RefillSource;
  orderId?: string;
  itemId?: string;
  planId?: string;
  packSize: number;
  packs?: number;
  unitsPerDose: number;
  dosesPerDay: number;
  startedOn?: string;
  remindDaysBefore?: number;
}

export interface RxStatus { validCount: number; latestValidUntil: number | null }

/** One past order's product line the student can start a refill from (from GET /orders). */
export interface OrderedItem { orderId: string; itemId: string; name: string; quantity: number; orderedAt: number }

export interface Delivery { mode: 'delivery' | 'pickup'; address: string; city: string; pincode: string }

export type QuoteState = 'OK' | 'PRESCRIPTION' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'UNAVAILABLE';

export interface QuoteLine {
  itemId: string;
  name: string;
  pack: string;
  quantity: number;
  state: QuoteState;
  pricePaise: number | null;
  mrpPaise: number | null;
  stock: number;
  requiresPrescription: boolean;
  stockAlert: boolean;
}

export interface ReorderQuote { orderId: string; quotedAt: number; delivery: Delivery; lines: QuoteLine[]; totalPaise: number; ready: boolean }

export interface PlacedOrder { id: string; totalPaise: number }

interface OrdersPage { items: { id: string; createdAt: number; paymentStatus: string; lines: { itemId: string; name: string; kind: string; quantity: number; status: string }[] }[] }

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const path = (id: string) => `/refill-tracker/${encodeURIComponent(id)}`;

export interface RefillsApi {
  list(): Promise<Refill[]>;
  plans(): Promise<TrackablePlan[]>;
  orderedItems(): Promise<OrderedItem[]>;
  create(body: NewRefill): Promise<Refill>;
  update(id: string, body: Partial<Pick<Refill, 'enabled' | 'remindDaysBefore' | 'packSize' | 'unitsPerDose' | 'dosesPerDay'>>): Promise<Refill>;
  snooze(id: string): Promise<Refill>;
  adjust(id: string, unitsLeft: number): Promise<Refill>;
  restock(id: string, packs: number): Promise<Refill>;
  remove(id: string): Promise<void>;
  rxStatus(): Promise<RxStatus>;
  quote(orderId: string, itemIds: string[]): Promise<ReorderQuote>;
  placeOrder(items: { id: string; quantity: number }[], delivery: Delivery, expectedTotalPaise: number, key: string): Promise<PlacedOrder>;
  watchStock(itemId: string): Promise<void>;
  unwatchStock(itemId: string): Promise<void>;
}

export const refillsApi: RefillsApi = {
  async list() { return (await apiRequest<{ items: Refill[] }>('/refill-tracker')).items; },
  async plans() { return (await apiRequest<{ items: TrackablePlan[] }>('/refill-tracker/plans')).items; },
  async orderedItems() {
    // Past orders the student already sees on Orders: product lines that were not cancelled.
    const page = await apiRequest<OrdersPage>('/orders?limit=20');
    const seen = new Set<string>();
    const out: OrderedItem[] = [];
    for (const order of page.items) {
      for (const line of order.lines) {
        if (line.kind !== 'product' || line.status === 'CANCELLED' || seen.has(line.itemId)) continue;
        seen.add(line.itemId);
        out.push({ orderId: order.id, itemId: line.itemId, name: line.name, quantity: line.quantity, orderedAt: order.createdAt });
      }
    }
    return out;
  },
  async create(body) { return (await apiRequest<{ refill: Refill }>('/refill-tracker', json('POST', body))).refill; },
  async update(id, body) { return (await apiRequest<{ refill: Refill }>(path(id), json('PATCH', body))).refill; },
  async snooze(id) { return (await apiRequest<{ refill: Refill }>(`${path(id)}/snooze`, json('POST', {}))).refill; },
  async adjust(id, unitsLeft) { return (await apiRequest<{ refill: Refill }>(`${path(id)}/adjust`, json('POST', { unitsLeft }))).refill; },
  async restock(id, packs) { return (await apiRequest<{ refill: Refill }>(`${path(id)}/restock`, json('POST', { packs }))).refill; },
  async remove(id) { await apiRequest(path(id), { method: 'DELETE' }); },
  rxStatus() { return apiRequest<RxStatus>('/refill-tracker/rx-status'); },
  quote(orderId, itemIds) { return apiRequest<ReorderQuote>(`/orders/${encodeURIComponent(orderId)}/reorder-quote`, json('POST', { itemIds })); },
  placeOrder(items, delivery, expectedTotalPaise, key) {
    return apiRequest<PlacedOrder>('/orders', { ...json('POST', { items, delivery, expectedTotalPaise }), headers: { 'Idempotency-Key': key } });
  },
  async watchStock(itemId) { await apiRequest(`/catalog/${encodeURIComponent(itemId)}/stock-alert`, json('POST', {})); },
  async unwatchStock(itemId) { await apiRequest(`/catalog/${encodeURIComponent(itemId)}/stock-alert`, { method: 'DELETE' }); },
};
