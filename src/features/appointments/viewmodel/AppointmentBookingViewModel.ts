import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** A bookable consultation (GET /api/catalog?kind=consultation). */
export interface BookableService {
  id: string;
  name: string;
  brand: string;
  pricePaise: number;
}

/** GET /api/appointments/availability → slots[]. */
export interface AvailabilitySlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  available: number;
}

/** POST /api/appointments → 201. A request, not a confirmation: the provider still has to accept. */
export interface AppointmentRequest {
  id: string;
  slotStart: string;
  slotEnd: string;
  status: 'REQUESTED';
}

/**
 * Appointment booking for the native app, on the same contract as the web
 * Appointments panel (backend/services/workflow_api.py): pick a consultation,
 * pick one of its published slots, request it. This used to call
 * /appointments/providers, /appointments/slots and /appointments/book, none of
 * which exist, so booking could never work.
 */
export class AppointmentBookingViewModel implements ViewModel {
  services: BookableService[] = [];
  selectedServiceId = '';
  slots: AvailabilitySlot[] = [];
  selectedSlotId = '';

  loadingServices = false;
  servicesFailed = false;
  loadingSlots = false;
  slotsFailed = false;
  submitting = false;
  error: string | null = null;
  request: AppointmentRequest | null = null;
  private disposed = false;

  constructor(private readonly api: typeof apiRequest = apiRequest) {
    makeAutoObservable<AppointmentBookingViewModel, 'disposed' | 'api'>(this, { disposed: false, api: false }, { autoBind: true });
  }

  get selectedService(): BookableService | undefined {
    return this.services.find((s) => s.id === this.selectedServiceId);
  }

  get canSubmit(): boolean {
    const slot = this.slots.find((s) => s.id === this.selectedSlotId);
    return Boolean(slot && slot.available > 0) && !this.submitting;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadingServices = true;
    this.servicesFailed = false;
    try {
      const response = await this.api<{ items: BookableService[] }>('/catalog?kind=consultation&limit=50');
      if (this.disposed) return;
      runInAction(() => {
        this.services = response.items;
        this.loadingServices = false;
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.servicesFailed = true; this.loadingServices = false; });
    }
  }

  async selectService(serviceId: string): Promise<void> {
    this.selectedServiceId = serviceId;
    this.selectedSlotId = '';
    this.slots = [];
    this.error = null;
    await this.loadSlots();
  }

  async loadSlots(): Promise<void> {
    const serviceId = this.selectedServiceId;
    if (!serviceId) return;
    this.loadingSlots = true;
    this.slotsFailed = false;
    try {
      const response = await this.api<{ slots: AvailabilitySlot[] }>(
        `/appointments/availability?catalogItemId=${encodeURIComponent(serviceId)}&date=`,
      );
      // Ignore an answer for a service the student has since moved away from.
      if (this.disposed || serviceId !== this.selectedServiceId) return;
      runInAction(() => { this.slots = response.slots; this.loadingSlots = false; });
    } catch {
      if (!this.disposed) runInAction(() => { this.slotsFailed = true; this.loadingSlots = false; });
    }
  }

  selectSlot(slotId: string): void {
    this.selectedSlotId = slotId;
  }

  async submit(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.submitting = true;
    this.error = null;
    try {
      const result = await this.api<AppointmentRequest>('/appointments', {
        method: 'POST',
        body: JSON.stringify({ slotId: this.selectedSlotId }),
      });
      runInAction(() => { this.request = result; this.submitting = false; });
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        // Nothing was booked; say so plainly. The server's message (e.g. slot just taken) is the most useful one.
        this.error = err instanceof Error && err.message ? err.message : 'Your request wasn’t sent. Nothing was booked — try again.';
        this.submitting = false;
      });
      void this.loadSlots();
      return false;
    }
  }

  reset(): void {
    this.selectedServiceId = '';
    this.slots = [];
    this.selectedSlotId = '';
    this.request = null;
    this.error = null;
  }

  dispose(): void {
    this.disposed = true;
  }
}
