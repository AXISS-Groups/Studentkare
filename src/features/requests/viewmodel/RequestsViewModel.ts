import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest, ApiError } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** backend/services/student_requests.py */
export type RequestKind = 'ORDER' | 'APPOINTMENT' | 'RETURN' | 'HOSTEL_VISIT' | 'REFILL' | 'SUPPORT';

export interface RequestItem {
  kind: RequestKind;
  id: string;
  title: string;
  status: string;
  createdAt: number;
  detail?: {
    note?: string | null;
    decisionNote?: string | null;
    refundPaise?: number | null;
    refundStatus?: 'TO_ARRANGE' | null;
    windowStart?: number;
    windowEnd?: number;
    hostelBlock?: string;
    room?: string;
    pharmacy?: string;
    quantity?: number;
  };
}

export interface EligibleLine { orderLineId: string; orderId: string; item: string; quantity: number; pricePaise: number; orderedAt: number }
export interface Option { id: string; name: string; dosage?: string }

export type ReturnReason = 'WRONG_ITEM' | 'DAMAGED' | 'NOT_NEEDED' | 'OTHER';
export type VisitService = 'LAB_PICKUP' | 'NURSE_VISIT';

/** Plain-language status, the same on web and phone. */
export function statusLabel(item: Pick<RequestItem, 'kind' | 'status'>): string {
  const common: Record<string, string> = {
    REQUESTED: 'Requested', ACCEPTED: 'Accepted', DECLINED: 'Declined', CANCELLED: 'Cancelled', COMPLETED: 'Done',
    DISPATCHED: 'On its way', CONFIRMED: 'Confirmed', OPEN: 'Open', RESOLVED: 'Resolved',
  };
  if (item.kind === 'RETURN') return ({ APPROVED: 'Approved', PICKED_UP: 'Picked up' } as Record<string, string>)[item.status] ?? common[item.status] ?? item.status;
  if (item.kind === 'HOSTEL_VISIT') return ({ ASSIGNED: 'Partner assigned' } as Record<string, string>)[item.status] ?? common[item.status] ?? item.status;
  if (item.kind === 'REFILL') return ({ READY: 'Ready to collect' } as Record<string, string>)[item.status] ?? common[item.status] ?? item.status;
  return common[item.status] ?? item.status.replace(/_/g, ' ').toLowerCase();
}

const CANCEL_PATH: Partial<Record<RequestKind, (id: string) => string>> = {
  RETURN: (id) => `/returns/${encodeURIComponent(id)}/cancel`,
  HOSTEL_VISIT: (id) => `/hostel-visits/${encodeURIComponent(id)}/cancel`,
  REFILL: (id) => `/refills/${encodeURIComponent(id)}/cancel`,
};

export function canCancel(item: RequestItem): boolean {
  if (!CANCEL_PATH[item.kind]) return false;
  return item.kind === 'HOSTEL_VISIT' ? ['REQUESTED', 'ASSIGNED'].includes(item.status) : item.status === 'REQUESTED';
}

function message(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status > 0 && error.status < 500 ? error.message : fallback;
}

/** My requests (design page 2 MyRequests / page 3 WebRequests). */
export class MyRequestsViewModel implements ViewModel {
  items: RequestItem[] | null = null;
  loadFailed = false;
  busyId = '';
  error = '';
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<MyRequestsViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const res = await this.request<{ items: RequestItem[] }>('/my-requests');
      if (!this.disposed) runInAction(() => { this.items = res.items; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  async cancel(item: RequestItem): Promise<void> {
    const path = CANCEL_PATH[item.kind];
    if (!path || !canCancel(item)) return;
    this.busyId = item.id;
    this.error = '';
    try {
      await this.request(path(item.id), { method: 'POST' });
      await this.load();
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.error = message(error, "Couldn't cancel. Nothing changed — try again."); });
    } finally {
      if (!this.disposed) runInAction(() => { this.busyId = ''; });
    }
  }

  dispose(): void { this.disposed = true; }
  reset(): void { this.items = null; this.loadFailed = false; this.busyId = ''; this.error = ''; }
}

/** One form for the three new request types. `kind` picks the fields. */
export class NewRequestViewModel implements ViewModel {
  options: { lines: EligibleLine[]; plans: Option[]; pharmacies: Option[] } | null = null;
  loadFailed = false;
  busy = false;
  error = '';
  done = false;
  createdReturnId = '';

  // return
  orderLineId: string | null = null;
  reason: ReturnReason | null = null;
  note = '';
  // hostel visit
  service: VisitService | null = null;
  hostelBlock = '';
  room = '';
  date = '';
  startTime = '';
  hours: '1' | '2' | '3' | null = null;
  // refill
  planId: string | null = null;
  providerId: string | null = null;
  quantity = '1';

  private disposed = false;

  constructor(readonly kind: 'RETURN' | 'HOSTEL_VISIT' | 'REFILL', private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<NewRequestViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false, kind: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const [lines, plans, pharmacies] = await Promise.all([
        this.kind === 'RETURN' ? this.request<{ items: EligibleLine[] }>('/returns/eligible') : Promise.resolve({ items: [] }),
        this.kind === 'REFILL' ? this.request<{ items: Option[] }>('/refills/plans') : Promise.resolve({ items: [] }),
        this.kind === 'REFILL' ? this.request<{ items: Option[] }>('/refills/pharmacies') : Promise.resolve({ items: [] }),
      ]);
      if (!this.disposed) runInAction(() => { this.options = { lines: lines.items, plans: plans.items, pharmacies: pharmacies.items }; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  set<K extends 'orderLineId' | 'reason' | 'note' | 'service' | 'hostelBlock' | 'room' | 'date' | 'startTime' | 'hours' | 'planId' | 'providerId' | 'quantity'>(key: K, value: this[K]): void {
    this[key] = value;
    this.error = '';
  }

  /** Visit window as epoch seconds in the device's time zone, or null if the inputs aren't a real future time. */
  get window(): { start: number; end: number } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(this.startTime) || !this.hours) return null;
    const start = new Date(`${this.date}T${this.startTime}:00`).getTime() / 1000;
    if (Number.isNaN(start) || start < Date.now() / 1000) return null;
    return { start, end: start + Number(this.hours) * 3600 };
  }

  get canSubmit(): boolean {
    if (this.busy) return false;
    if (this.kind === 'RETURN') return Boolean(this.orderLineId && this.reason && (this.reason !== 'OTHER' || this.note.trim().length >= 3));
    if (this.kind === 'HOSTEL_VISIT') return Boolean(this.service && this.hostelBlock.trim() && this.room.trim() && this.window);
    const q = Number(this.quantity);
    return Boolean(this.planId && this.providerId && Number.isInteger(q) && q >= 1 && q <= 12);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) return;
    this.busy = true;
    this.error = '';
    try {
      if (this.kind === 'RETURN') {
        const res = await this.request<{ return: { id: string } }>('/returns', { method: 'POST', body: JSON.stringify({ orderLineId: this.orderLineId, reason: this.reason, note: this.note.trim() }) });
        runInAction(() => { this.createdReturnId = res.return.id; });
      } else if (this.kind === 'HOSTEL_VISIT') {
        const w = this.window;
        await this.request('/hostel-visits', { method: 'POST', body: JSON.stringify({ service: this.service, hostelBlock: this.hostelBlock.trim(), room: this.room.trim(), windowStart: w?.start, windowEnd: w?.end }) });
      } else {
        await this.request('/refills', { method: 'POST', body: JSON.stringify({ planId: this.planId, providerId: this.providerId, quantity: Number(this.quantity), note: this.note.trim() }) });
      }
      if (!this.disposed) runInAction(() => { this.done = true; });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.error = message(error, "That didn't go through. Nothing was sent — try again."); });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  dispose(): void { this.disposed = true; }
  reset(): void { this.done = false; this.error = ''; this.busy = false; }
}
