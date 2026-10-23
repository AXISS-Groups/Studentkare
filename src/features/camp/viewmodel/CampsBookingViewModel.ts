import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MessageKey } from '@/i18n';
import { Resource } from '@/features/m2health/resource';
import { campsApi, refusalKey } from '../data/campsApi';
import type { CampBookingView, CampConfirmation, CampListing, CampSlotView, CampsApi } from '../data/campsApi';

export type SubmitKind = 'book' | 'waitlist' | 'change';
export interface CampNotice { key: MessageKey; tone: 'success' | 'error' }

/**
 * Health camps for a student (M2Camps; new screen, no canvas board — Mobile 2.0
 * language). Upcoming camps for their campus (GET /camps), their bookings
 * (GET /camps/bookings/me), a camp's slots when one is opened, and the four
 * actions: book a slot, wait for a full one, change the slot, cancel. Nothing is
 * kept on the device; every figure is the server's reply.
 */
export class CampsBookingViewModel implements ViewModel {
  readonly camps: Resource<CampListing[]>;
  readonly bookings: Resource<CampBookingView[]>;
  slots: Resource<CampSlotView[]> | null = null;
  openCampId: string | null = null;
  /** The booking being moved to another slot, when the camp was opened to change it. */
  changing: CampBookingView | null = null;
  chosenSlotId: string | null = null;
  busy = false;
  notice: CampNotice | null = null;
  /** A booking made just now: the result moment shows it until dismissed. */
  confirmation: CampConfirmation | null = null;
  cancelTarget: CampBookingView | null = null;

  constructor(private readonly api: CampsApi = campsApi) {
    this.camps = new Resource(() => api.list());
    this.bookings = new Resource(() => api.mine());
    makeAutoObservable<CampsBookingViewModel, 'api'>(this, { camps: false, bookings: false, api: false }, { autoBind: true });
  }

  load(): void {
    void this.camps.load();
    void this.bookings.load();
  }

  dispose(): void {
    this.camps.cancel();
    this.bookings.cancel();
    this.slots?.cancel();
  }

  /** Bookings and waitlist places still ahead, soonest first. */
  get active(): CampBookingView[] {
    return (this.bookings.data ?? [])
      .filter((b) => (b.status === 'BOOKED' || b.status === 'WAITLISTED') && !b.campCancelled)
      .sort((a, b) => a.camp.date.localeCompare(b.camp.date));
  }

  /** Cancelled bookings and camps that were called off, newest first (the server's order). */
  get ended(): CampBookingView[] {
    return (this.bookings.data ?? []).filter((b) => b.status === 'CANCELLED' || b.campCancelled);
  }

  get openCamp(): CampListing | null {
    return (this.camps.data ?? []).find((c) => c.id === this.openCampId) ?? null;
  }

  get chosenSlot(): CampSlotView | null {
    return (this.slots?.data ?? []).find((s) => s.id === this.chosenSlotId) ?? null;
  }

  /** What the main button does with the chosen slot, or null when it can't do anything yet. */
  get submitKind(): SubmitKind | null {
    const slot = this.chosenSlot;
    if (!slot || slot.started) return null;
    if (this.changing) return slot.available && slot.id !== this.changing.slot?.id ? 'change' : null;
    if (slot.available) return 'book';
    return slot.waitlistOpen ? 'waitlist' : null;
  }

  open(campId: string, changing: CampBookingView | null = null): void {
    this.slots?.cancel();
    this.openCampId = campId;
    this.changing = changing;
    this.chosenSlotId = null;
    this.notice = null;
    this.slots = new Resource(() => this.api.slots(campId));
    void this.slots.load();
  }

  close(): void {
    this.slots?.cancel();
    this.openCampId = null;
    this.changing = null;
    this.chosenSlotId = null;
    this.slots = null;
  }

  choose(slotId: string): void {
    this.chosenSlotId = slotId;
  }

  async submit(): Promise<void> {
    const kind = this.submitKind;
    const campId = this.openCampId;
    const slotId = this.chosenSlotId;
    if (!kind || !campId || !slotId || this.busy) return;
    this.busy = true;
    this.notice = null;
    try {
      const run = kind === 'book' ? this.api.book : kind === 'waitlist' ? this.api.waitlist : this.api.reschedule;
      const result = await run(campId, slotId);
      runInAction(() => {
        this.close();
        if (kind === 'book') this.confirmation = result;
        else this.notice = { key: kind === 'waitlist' ? 'camps.done.waitlist' : 'camps.done.changed', tone: 'success' };
      });
      this.load();
    } catch (error) {
      runInAction(() => { this.notice = { key: refusalKey(error), tone: 'error' }; });
      void this.slots?.load();
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  askCancel(booking: CampBookingView): void {
    this.cancelTarget = booking;
  }

  dismissCancel(): void {
    if (!this.busy) this.cancelTarget = null;
  }

  async confirmCancel(): Promise<void> {
    const target = this.cancelTarget;
    if (!target || this.busy) return;
    this.busy = true;
    try {
      await this.api.cancel(target.camp.id);
      runInAction(() => {
        this.cancelTarget = null;
        this.notice = { key: 'camps.done.cancelled', tone: 'success' };
      });
      this.load();
    } catch (error) {
      runInAction(() => {
        this.cancelTarget = null;
        this.notice = { key: refusalKey(error), tone: 'error' };
      });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  clearConfirmation(): void {
    this.confirmation = null;
  }

  clearNotice(): void {
    this.notice = null;
  }

  reset(): void {
    this.close();
    this.notice = null;
    this.confirmation = null;
    this.cancelTarget = null;
    this.busy = false;
  }
}
