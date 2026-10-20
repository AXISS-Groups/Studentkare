import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { LiveOrder, OrderLine } from '@/data/types/workflowTypes';

/**
 * The student's orders on the phone (canvas OrderHistory and OrderTracking):
 * GET /api/orders, newest first, on the commerce plane. An order is what was
 * bought — names, quantities, prices, line states — never a result or a
 * report: a lab test here is a booking, and its report lives in the health
 * record, not in this list (Rule L).
 *
 * Every state shown is derived from the server's line states; nothing is
 * estimated (no arrival times, no runner, no live location).
 */

export type OrdersTab = 'all' | 'active' | 'labs' | 'past';
export type OrderState = 'awaitingPayment' | 'requested' | 'accepted' | 'dispatched' | 'completed' | 'declined' | 'cancelled';
export type StepState = 'done' | 'active' | 'todo';
export type OrderKind = 'product' | 'lab' | 'consultation' | 'vaccine';

export interface TrackStep { key: 'placed' | 'paid' | 'accepted' | 'dispatched' | 'completed'; state: StepState }

const PAID = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);
const live = (lines: OrderLine[]) => lines.filter((l) => l.status !== 'CANCELLED' && l.status !== 'DECLINED');

export const isPaid = (order: LiveOrder) => PAID.has(order.paymentStatus);

/** The order's state, from its lines: the least advanced line that is still going decides. */
export function orderState(order: LiveOrder): OrderState {
  const going = live(order.lines);
  if (going.length === 0) return order.lines.every((l) => l.status === 'CANCELLED') ? 'cancelled' : 'declined';
  if (going.every((l) => l.status === 'COMPLETED')) return 'completed';
  if (going.some((l) => l.status === 'REQUESTED')) return isPaid(order) ? 'requested' : 'awaitingPayment';
  if (going.some((l) => l.status === 'ACCEPTED')) return 'accepted';
  return 'dispatched';
}

export const isActive = (order: LiveOrder) => {
  const s = orderState(order);
  return s !== 'completed' && s !== 'cancelled' && s !== 'declined';
};

/** What the order mostly is, for its icon: a product order unless every line is one kind of service. */
export function orderKind(order: LiveOrder): OrderKind {
  const kinds = new Set(order.lines.map((l) => l.kind));
  if (kinds.size === 1) return order.lines[0]?.kind ?? 'product';
  return kinds.has('product') ? 'product' : (order.lines[0]?.kind ?? 'product');
}

/** The tracking timeline. "Dispatched" only exists for products; a service goes accepted, then completed. */
export function trackSteps(order: LiveOrder): TrackStep[] {
  const going = live(order.lines);
  const has = (s: OrderLine['status'][]) => going.length > 0 && going.every((l) => s.includes(l.status));
  const paid = isPaid(order);
  const accepted = has(['ACCEPTED', 'DISPATCHED', 'COMPLETED']);
  const products = going.some((l) => l.kind === 'product');
  const dispatched = has(['DISPATCHED', 'COMPLETED']);
  const completed = has(['COMPLETED']);
  const steps: TrackStep[] = [
    { key: 'placed', state: 'done' },
    { key: 'paid', state: paid ? 'done' : 'active' },
    { key: 'accepted', state: accepted ? 'done' : paid ? 'active' : 'todo' },
  ];
  if (products) steps.push({ key: 'dispatched', state: dispatched ? 'done' : accepted ? 'active' : 'todo' });
  steps.push({ key: 'completed', state: completed ? 'done' : (products ? dispatched : accepted) ? 'active' : 'todo' });
  return steps;
}

/** The server lets an order be cancelled while it is unpaid and no provider has acted (POST /orders/{id}/cancel). */
export const canCancel = (order: LiveOrder) => order.paymentStatus === 'UNPAID' && order.lines.every((l) => l.status === 'REQUESTED');

type Requester = typeof apiRequest;

export class OrdersViewModel implements ViewModel {
  phase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  items: LiveOrder[] = [];
  total = 0;
  page = 0;
  tab: OrdersTab = 'all';
  cancelling = false;
  cancelFailed = false;
  private disposed = false;

  constructor(private readonly request: Requester = apiRequest) {
    makeAutoObservable<OrdersViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.page = 0;
    await this.fetch();
  }

  private async fetch(): Promise<void> {
    const size = getSetting('shop.orders_page_size');
    this.phase = 'loading';
    try {
      const res = await this.request<{ items: LiveOrder[]; total?: number }>(`/orders?limit=${size}&offset=${this.page * size}`);
      if (this.disposed) return;
      runInAction(() => {
        this.items = this.page === 0 ? res.items : [...this.items, ...res.items.filter((o) => !this.items.some((i) => i.id === o.id))];
        this.total = res.total ?? this.items.length;
        this.phase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  get canLoadMore(): boolean {
    return this.phase === 'ready' && this.items.length < this.total;
  }

  async loadMore(): Promise<void> {
    if (!this.canLoadMore) return;
    this.page += 1;
    await this.fetch();
  }

  /** Make sure an order is loaded (a tracking link can name one past the first page). */
  async find(orderId: string): Promise<LiveOrder | null> {
    this.disposed = false;
    if (this.phase !== 'ready' || !this.byId(orderId)) await this.load();
    while (!this.byId(orderId) && this.canLoadMore && !this.disposed) await this.loadMore();
    return this.byId(orderId);
  }

  byId(orderId: string): LiveOrder | null {
    return this.items.find((o) => o.id === orderId) ?? null;
  }

  setTab(tab: OrdersTab): void {
    this.tab = tab;
  }

  get shown(): LiveOrder[] {
    if (this.tab === 'active') return this.items.filter(isActive);
    if (this.tab === 'past') return this.items.filter((o) => !isActive(o));
    if (this.tab === 'labs') return this.items.filter((o) => o.lines.some((l) => l.kind === 'lab'));
    return this.items;
  }

  async cancel(order: LiveOrder): Promise<void> {
    if (!canCancel(order) || this.cancelling) return;
    this.cancelling = true;
    this.cancelFailed = false;
    try {
      await this.request(`/orders/${encodeURIComponent(order.id)}/cancel`, { method: 'POST' });
      if (this.disposed) return;
      await this.load();
    } catch {
      if (!this.disposed) runInAction(() => { this.cancelFailed = true; });
    } finally {
      if (!this.disposed) runInAction(() => { this.cancelling = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.items = [];
    this.total = 0;
    this.page = 0;
    this.phase = 'idle';
    this.tab = 'all';
  }
}
