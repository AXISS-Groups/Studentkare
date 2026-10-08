import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest, ApiError } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type DepartureReason = 'GRADUATING' | 'TRANSFERRING' | 'PAUSING';
export type DepartureStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

/** GET /api/campus/departure (backend/services/campus_departure.py). */
export interface Departure {
  id: string;
  university: string;
  reason: DepartureReason;
  destination: string | null;
  effectiveOn: string;
  status: DepartureStatus;
}

export interface DepartureState {
  departure: Departure | null;
  campus: { university: string; status: string } | null;
  collegePlan: { organization: string; planId: string } | null;
  signsInWithCollegeEmail: boolean;
  today: string;
}

/** What the screen is showing. Derived, so the view never decides it. */
export type LeaveCampusStage = 'loading' | 'failed' | 'notLinked' | 'form' | 'scheduled' | 'completed';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD, not just the right shape. */
export function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Leaving campus (design page 2, LeaveCampus, Tier 3). The server decides
 * everything that matters — whether there is a campus to leave, the date
 * rules, and what changes — and this view model only reflects it.
 */
export class LeaveCampusViewModel implements ViewModel {
  state: DepartureState | null = null;
  loadFailed = false;
  reason: DepartureReason | null = null;
  effectiveOn = '';
  destination = '';
  busy = false;
  error = '';
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<LeaveCampusViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get stage(): LeaveCampusStage {
    if (this.loadFailed) return 'failed';
    if (!this.state) return 'loading';
    const status = this.state.departure?.status;
    if (status === 'SCHEDULED') return 'scheduled';
    if (status === 'COMPLETED' && !this.state.campus) return 'completed';
    if (!this.state.campus) return 'notLinked';
    return 'form';
  }

  get needsDate(): boolean {
    return this.reason === 'GRADUATING' || this.reason === 'TRANSFERRING';
  }

  get dateError(): string {
    if (!this.needsDate || this.effectiveOn === '') return '';
    if (!isRealDate(this.effectiveOn)) return 'Use a real date as YYYY-MM-DD, like 2027-05-31.';
    if (this.state && this.effectiveOn < this.state.today) return "That date has passed. Choose today or later.";
    return '';
  }

  get canSubmit(): boolean {
    if (this.busy || !this.reason) return false;
    if (this.needsDate) return this.effectiveOn !== '' && !this.dateError;
    return true;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    this.state = null;
    try {
      const state = await this.request<DepartureState>('/campus/departure');
      if (!this.disposed) runInAction(() => { this.state = state; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  setReason(reason: DepartureReason): void {
    this.reason = reason;
    this.error = '';
  }

  setEffectiveOn(value: string): void {
    this.effectiveOn = value.trim();
  }

  setDestination(value: string): void {
    this.destination = value;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit || !this.reason) return;
    this.busy = true;
    this.error = '';
    const body = {
      reason: this.reason,
      effectiveOn: this.needsDate ? this.effectiveOn : undefined,
      destination: this.reason === 'TRANSFERRING' && this.destination.trim() ? this.destination.trim() : undefined,
    };
    try {
      await this.request('/campus/departure', { method: 'POST', body: JSON.stringify(body) });
      await this.load();
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.error = error instanceof ApiError ? error.message : "That didn't go through. Nothing has changed — try again."; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  async undo(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await this.request('/campus/departure/cancel', { method: 'POST' });
      await this.load();
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.error = error instanceof ApiError ? error.message : "Couldn't undo. Try again."; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.state = null;
    this.loadFailed = false;
    this.reason = null;
    this.effectiveOn = '';
    this.destination = '';
    this.busy = false;
    this.error = '';
  }
}
