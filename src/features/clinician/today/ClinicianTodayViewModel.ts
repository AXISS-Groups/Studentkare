import { makeAutoObservable, runInAction } from 'mobx';
import type { ClinicianTodaySource } from './todaySource';
import type { Availability, TodayData } from './todayModel';
import { countdown, countdownLabel, daySummary } from './todayModel';

/**
 * - `loading`: first load or a retry in flight
 * - `ready`: a day to show
 * - `empty`: connected, but nothing booked and no next consult
 * - `unconnected`: the source has no schedule behind it (production today)
 * - `error`: the load failed
 */
export type TodayStatus = 'loading' | 'ready' | 'empty' | 'unconnected' | 'error';

export class ClinicianTodayViewModel {
  status: TodayStatus = 'loading';
  data: TodayData | null = null;
  now: Date;
  toast: string | null = null;
  availabilityBusy = false;
  private clock: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly source: ClinicianTodaySource,
    private readonly nowFn: () => Date = () => new Date(),
  ) {
    this.now = nowFn();
    makeAutoObservable<ClinicianTodayViewModel, 'source' | 'clock' | 'nowFn'>(this, { source: false, clock: false, nowFn: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.status = 'loading';
    try {
      const data = await this.source.load();
      runInAction(() => {
        this.data = data;
        this.now = this.nowFn();
        if (data === null) this.status = 'unconnected';
        else if (data.slots.length === 0 && data.next === null) this.status = 'empty';
        else this.status = 'ready';
      });
    } catch {
      runInAction(() => {
        this.data = null;
        this.status = 'error';
      });
    }
  }

  /** Start the one-second clock that drives the countdown. Returns a stop function. */
  startClock(): () => void {
    this.stopClock();
    this.clock = setInterval(() => this.tick(), 1000);
    return this.stopClock;
  }

  stopClock(): void {
    if (this.clock !== null) clearInterval(this.clock);
    this.clock = null;
  }

  tick(): void {
    this.now = this.nowFn();
  }

  get summary(): string {
    return this.data ? daySummary(this.data) : '';
  }

  get msToNext(): number | null {
    const next = this.data?.next;
    return next ? next.startsAt.getTime() - this.now.getTime() : null;
  }

  get countdownText(): string {
    return this.msToNext === null ? '' : countdown(this.msToNext);
  }

  get countdownSpoken(): string {
    return this.msToNext === null ? '' : countdownLabel(this.msToNext);
  }

  get canChangeAvailability(): boolean {
    return this.status === 'ready' && typeof this.source.setAvailability === 'function';
  }

  /**
   * Taking consults ⇄ paused. The pill changes only once the source accepts
   * it; on failure the doctor is told and the pill stays where it was.
   */
  async toggleAvailability(): Promise<void> {
    const data = this.data;
    const set = this.source.setAvailability;
    if (!data || !set || this.availabilityBusy) return;
    const next: Availability = data.availability === 'taking' ? 'paused' : 'taking';
    this.availabilityBusy = true;
    try {
      await set(next);
      runInAction(() => {
        if (this.data) this.data = { ...this.data, availability: next };
        this.toast = next === 'paused' ? 'Paused — no new bookings' : 'Back online — taking consults';
      });
    } catch {
      runInAction(() => {
        this.toast = 'Couldn’t change your availability. Nothing changed — try again.';
      });
    } finally {
      runInAction(() => {
        this.availabilityBusy = false;
      });
    }
  }

  clearToast(): void {
    this.toast = null;
  }
}
