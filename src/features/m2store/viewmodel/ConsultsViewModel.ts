import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import type { AvailabilitySlot } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { toDate } from '@/features/phoneboards/format';

/**
 * Mobile 2.0 Doctor consults (M2Consults): the consultations a student can
 * book (GET /catalog?kind=consultation) and each one's next open slot (GET
 * /appointments/availability), on the same contract as the booking dialog and
 * the Expo booking screen. Prices are the catalogue's. Nothing here reads the
 * health record; a concern chip never reaches the server.
 */
export type ConsultsPhase = 'loading' | 'ready' | 'error';

export interface ConsultOption {
  service: LiveCatalogItem;
  /** The soonest slot with room, null when none is open, undefined while it loads or when it could not be read. */
  next: AvailabilitySlot | null | undefined;
}

/** The catalogue's page cap (GET /api/catalog). */
const CATALOG_PAGE_MAX = 100;

/** The soonest slot still ahead with a place left. */
export function soonestOpen(slots: readonly AvailabilitySlot[], now = Date.now()): AvailabilitySlot | null {
  return slots
    .filter((s) => s.available > 0 && (toDate(s.slotStart)?.getTime() ?? 0) > now)
    .sort((a, b) => (toDate(a.slotStart)?.getTime() ?? 0) - (toDate(b.slotStart)?.getTime() ?? 0))[0] ?? null;
}

export class ConsultsViewModel implements ViewModel {
  phase: ConsultsPhase = 'loading';
  options: ConsultOption[] = [];
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<ConsultsViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  /** Lowest listed consultation price (paise), or null when none is priced. */
  get fromPaise(): number | null {
    const prices = this.options.map((o) => o.service.pricePaise).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }

  /** How many consultations have an open slot later today. */
  get openToday(): number {
    const now = new Date();
    return this.options.filter((o) => {
      const at = o.next ? toDate(o.next.slotStart) : null;
      return at !== null && at.toDateString() === now.toDateString();
    }).length;
  }

  /** "Consult now": the consultation with the soonest open slot, else the first listed. */
  get soonest(): ConsultOption | null {
    const open = this.options.filter((o) => o.next);
    open.sort((a, b) => (toDate(a.next?.slotStart ?? '')?.getTime() ?? 0) - (toDate(b.next?.slotStart ?? '')?.getTime() ?? 0));
    return open[0] ?? this.options[0] ?? null;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const res = await this.request<{ items: LiveCatalogItem[] }>(`/catalog?kind=consultation&limit=${CATALOG_PAGE_MAX}&offset=0`);
      if (this.disposed) return;
      runInAction(() => {
        this.options = res.items.filter((item) => item.active !== false).map((service) => ({ service, next: undefined }));
        this.phase = 'ready';
      });
      await Promise.all(this.options.map((o) => this.loadNext(o.service.id)));
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  private async loadNext(serviceId: string): Promise<void> {
    let next: AvailabilitySlot | null | undefined;
    try {
      const res = await this.request<{ slots: AvailabilitySlot[] }>(`/appointments/availability?catalogItemId=${encodeURIComponent(serviceId)}&date=`);
      next = soonestOpen(res.slots);
    } catch {
      next = undefined;
    }
    if (this.disposed) return;
    runInAction(() => {
      this.options = this.options.map((o) => (o.service.id === serviceId ? { ...o, next } : o));
    });
  }

  reset(): void {
    this.phase = 'loading';
    this.options = [];
  }

  dispose(): void {
    this.disposed = true;
  }
}
