/**
 * Pure helpers behind the signed-in student web screens (canvas page 3b,
 * WP-08). Everything here is derived from what the API returns: no invented
 * rows, timings or counts (DESIGN.md §2.7).
 *
 * Rule L: orders, catalogue items and buy-again come from commerce endpoints
 * only (`/orders`, `/catalog`). Nothing here reads a clinical record, and the
 * buy-again list is ordered by when the student bought, never by anything
 * about their health.
 */
import type { LiveCatalogItem, LiveOrder, RequestStatus } from '@/data/types/workflowTypes';

/** Seconds since the epoch (the API's order and line clock) to milliseconds. */
export const SECOND_MS = 1000;
/** Orders the Buy again page reads (the API's page cap). */
export const BUY_AGAIN_ORDER_LIMIT = 100;
/** Catalogue page size when resolving bought items against today's listing (the API's cap). */
export const CATALOG_PAGE_LIMIT = 100;

const ACTIVE: readonly RequestStatus[] = ['REQUESTED', 'ACCEPTED', 'DISPATCHED'];

/**
 * One status for a whole order, from its lines: the least advanced live line
 * wins (an order is out for delivery only when nothing is still waiting), then
 * completed, then the closed states.
 */
export function orderStatus(order: Pick<LiveOrder, 'lines'>): RequestStatus {
  const statuses = order.lines.map((line) => line.status);
  if (!statuses.length) return 'REQUESTED';
  for (const live of ACTIVE) if (statuses.includes(live)) return live;
  if (statuses.includes('COMPLETED')) return 'COMPLETED';
  if (statuses.includes('DECLINED')) return 'DECLINED';
  return 'CANCELLED';
}

export const isActiveOrder = (order: Pick<LiveOrder, 'lines'>): boolean => ACTIVE.includes(orderStatus(order));

export type OrderTab = 'all' | 'active' | 'lab' | 'past';
export const ORDER_TABS: readonly OrderTab[] = ['all', 'active', 'lab', 'past'];

export function filterOrders(orders: readonly LiveOrder[], tab: OrderTab): LiveOrder[] {
  switch (tab) {
    case 'active': return orders.filter(isActiveOrder);
    case 'lab': return orders.filter((order) => order.lines.some((line) => line.kind === 'lab'));
    case 'past': return orders.filter((order) => !isActiveOrder(order));
    default: return [...orders];
  }
}

/** The short reference the student sees ("SK-1A2B3C4D"), from the order id. */
export const orderRef = (id: string): string => `SK-${id.slice(0, 8).toUpperCase()}`;

/** Tracking steps for one order, in order; `done` up to where its lines have reached. */
export type TrackStep = 'placed' | 'accepted' | 'dispatched' | 'completed';
export const TRACK_STEPS: readonly TrackStep[] = ['placed', 'accepted', 'dispatched', 'completed'];

/** How many tracking steps are done (1 = placed only). Closed orders (cancelled, declined) return 0. */
export function trackProgress(order: Pick<LiveOrder, 'lines'>): number {
  switch (orderStatus(order)) {
    case 'REQUESTED': return 1;
    case 'ACCEPTED': return 2;
    case 'DISPATCHED': return 3;
    case 'COMPLETED': return 4;
    default: return 0;
  }
}

export interface BuyAgainEntry {
  itemId: string;
  name: string;
  /** Units bought across delivered orders. */
  units: number;
  /** Seconds since the epoch of the latest delivered order with this item. */
  lastBoughtAt: number;
}

/**
 * Shop items the student has received, most recent first. Lab tests,
 * consultations and vaccines are bookings, not things to "buy again", and
 * only delivered (COMPLETED) lines count.
 */
export function buyAgainEntries(orders: readonly LiveOrder[]): BuyAgainEntry[] {
  const byItem = new Map<string, BuyAgainEntry>();
  for (const order of orders) {
    for (const line of order.lines) {
      if (line.kind !== 'product' || line.status !== 'COMPLETED') continue;
      const seen = byItem.get(line.itemId);
      if (seen) {
        seen.units += line.quantity;
        seen.lastBoughtAt = Math.max(seen.lastBoughtAt, order.createdAt);
      } else {
        byItem.set(line.itemId, { itemId: line.itemId, name: line.name, units: line.quantity, lastBoughtAt: order.createdAt });
      }
    }
  }
  return [...byItem.values()].sort((a, b) => b.lastBoughtAt - a.lastBoughtAt);
}

/** Why a bought item cannot go straight back into the cart today, or null when it can. */
export type BuyAgainBlock = 'unlisted' | 'prescription' | 'outOfStock';
export function buyAgainBlock(item: LiveCatalogItem | undefined): BuyAgainBlock | null {
  if (!item || !item.active) return 'unlisted';
  if (item.requiresPrescription) return 'prescription';
  if (item.stock < 1) return 'outOfStock';
  return null;
}

/** Catalogue counts per kind for the search sidebar. */
export type SearchKind = 'all' | 'product' | 'lab' | 'consultation';
export const SEARCH_KINDS: readonly SearchKind[] = ['all', 'product', 'lab', 'consultation'];

export type SortOrder = 'name' | 'priceLow' | 'priceHigh';
export const SORT_ORDERS: readonly SortOrder[] = ['name', 'priceLow', 'priceHigh'];

/** Sorts one loaded page. The server lists by name; price orders only re-sort what is on screen. */
export function sortItems(items: readonly LiveCatalogItem[], order: SortOrder): LiveCatalogItem[] {
  const copy = [...items];
  if (order === 'priceLow') copy.sort((a, b) => a.pricePaise - b.pricePaise);
  else if (order === 'priceHigh') copy.sort((a, b) => b.pricePaise - a.pricePaise);
  return copy;
}

/** Cart lines a student can still change the quantity of: shop items, up to stock and the cart's cap. */
export const CART_LINE_CAP = 10;
export const maxQuantity = (item: Pick<LiveCatalogItem, 'kind' | 'stock'>): number =>
  item.kind === 'product' ? Math.max(0, Math.min(item.stock, CART_LINE_CAP)) : 1;

// ---- Your Care (WebDashboard) ----

export interface StudentAppointment { id: string; slotStart: string; slotEnd: string; status: string }
export interface StudentLabOrder { id: string; status: string; slotStart: string | null; collectionMode: string; createdAt: number; updatedAt: number; paymentStatus: string | null }
export interface RecordShareSummary { active: boolean }

export type NeedKind = 'payOrder' | 'reportReady' | 'recollect';
export interface NeedItem { kind: NeedKind; id: string; at: number }

export type UpcomingKind = 'consult' | 'collection';
export interface UpcomingItem { kind: UpcomingKind; id: string; at: Date; status: string }

const CLOSED_APPOINTMENT = new Set(['CANCELLED', 'COMPLETED', 'NO_SHOW']);
const LAB_BEFORE_COLLECTION = new Set(['BOOKED', 'ASSIGNED', 'RECOLLECTION_REQUIRED']);
const LAB_PENDING_REPORT = new Set(['SAMPLE_COLLECTED', 'IN_TRANSIT', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY']);
const DAY_MS = 86_400_000;

export interface CareSummary {
  needs: NeedItem[];
  upcoming: UpcomingItem[];
  reportsPending: number;
  nextConsult: Date | null;
  recordsShared: number;
  consultsBooked: number;
  labTestsBooked: number;
}

const parse = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The "Your Care" summary. Counts and dates only: a report shows as ready,
 * never what is in it (the lab payload hides everything before a doctor
 * releases it, and this never reads the report).
 */
export function careSummary(input: {
  now: Date;
  orders: readonly LiveOrder[];
  appointments: readonly StudentAppointment[];
  labOrders: readonly StudentLabOrder[];
  shares: readonly RecordShareSummary[];
  /** How long a released report stays under Needs you (settings registry studentweb.report_ready_days). */
  reportReadyDays: number;
}): CareSummary {
  const { now, orders, appointments, labOrders, shares, reportReadyDays } = input;
  const needs: NeedItem[] = [];
  for (const order of orders) {
    if (order.paymentStatus !== 'PAID' && isActiveOrder(order)) needs.push({ kind: 'payOrder', id: order.id, at: order.createdAt });
  }
  for (const lab of labOrders) {
    if (lab.status === 'REPORT_RELEASED' && now.getTime() - lab.updatedAt * SECOND_MS <= reportReadyDays * DAY_MS) needs.push({ kind: 'reportReady', id: lab.id, at: lab.updatedAt });
    if (lab.status === 'RECOLLECTION_REQUIRED') needs.push({ kind: 'recollect', id: lab.id, at: lab.updatedAt });
  }
  needs.sort((a, b) => b.at - a.at);

  const upcoming: UpcomingItem[] = [];
  for (const appt of appointments) {
    const at = parse(appt.slotStart);
    if (at && at >= now && !CLOSED_APPOINTMENT.has(appt.status)) upcoming.push({ kind: 'consult', id: appt.id, at, status: appt.status });
  }
  for (const lab of labOrders) {
    const at = parse(lab.slotStart);
    if (at && at >= now && LAB_BEFORE_COLLECTION.has(lab.status)) upcoming.push({ kind: 'collection', id: lab.id, at, status: lab.status });
  }
  upcoming.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    needs,
    upcoming,
    reportsPending: labOrders.filter((lab) => LAB_PENDING_REPORT.has(lab.status)).length,
    nextConsult: upcoming.find((item) => item.kind === 'consult')?.at ?? null,
    recordsShared: shares.filter((share) => share.active).length,
    consultsBooked: appointments.filter((appt) => appt.status !== 'CANCELLED').length,
    labTestsBooked: labOrders.filter((lab) => lab.status !== 'CANCELLED').length,
  };
}

/** True when the student has nothing yet: the first-time state. */
export const isFirstTime = (summary: CareSummary): boolean =>
  !summary.needs.length && !summary.upcoming.length && !summary.consultsBooked && !summary.labTestsBooked && !summary.recordsShared;
