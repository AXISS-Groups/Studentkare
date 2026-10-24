import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { liveEntry, passSecondsLeft, REFRESH_BELOW_STEPS, stepsLeft } from './livePass';
import type { LivePassEntry } from './livePass';

/**
 * Member ID for the native app, on the same endpoints as the web Digital ID
 * panel: GET /api/identity, POST to issue or replace the QR, DELETE to revoke.
 *
 * This used to call /digital-id/me and /digital-id/refresh-qr, which do not
 * exist, and showed a "VERIFIED CAMPUS MEMBER" badge and a blood group. The
 * card now shows only what the server returns, and campus status as the
 * server reports it.
 */
/** Which change failed; the view says it in the student's language (AGENTS.md rule 11: no copy in code). */
export type DigitalIdError = 'issue' | 'revoke';

export class DigitalIdViewModel implements ViewModel {
  identity: MemberIdentity | null = null;
  loadFailed = false;
  busy = false;
  error: DigitalIdError | null = null;
  confirmingRevoke = false;
  /** The last top-up of codes failed (offline or the server): the view says so instead of silently running down. */
  refreshFailed = false;
  /** Clock for the 30 s pass: a code outside its step is refused at the counter, so it is hidden. */
  now = Date.now();
  private disposed = false;
  private clock: ReturnType<typeof setInterval> | null = null;
  private lastAsked = 0;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<DigitalIdViewModel, 'disposed' | 'request' | 'clock' | 'lastAsked'>(this,
      { disposed: false, request: false, clock: false, lastAsked: false }, { autoBind: true });
  }

  /** The code for this 30 s step: the server's current one, or from the in-memory window. */
  get entry(): LivePassEntry | null {
    return liveEntry(this.identity, this.now);
  }

  get live(): boolean {
    return this.entry !== null;
  }

  get secondsLeft(): number | null {
    return passSecondsLeft(this.entry, this.now);
  }

  tick(now: number = Date.now()): void {
    this.now = now;
    // Top the window up in good time; offline, keep showing what memory still holds.
    if (this.identity?.issued && !this.disposed && stepsLeft(this.identity, now) < REFRESH_BELOW_STEPS && now - this.lastAsked >= 30_000) {
      this.lastAsked = now;
      void this.refresh();
    }
  }

  /** More codes, in place. Never persisted; on failure the window runs down and the view says so (never a stale code). */
  private async refresh(): Promise<void> {
    try {
      const identity = await this.request<MemberIdentity>('/identity');
      if (!this.disposed) runInAction(() => { this.identity = identity; this.refreshFailed = false; });
    } catch {
      if (!this.disposed) runInAction(() => { this.refreshFailed = true; });
    }
  }

  private startClock(): void {
    if (this.clock === null) this.clock = setInterval(() => this.tick(), 1000);
  }

  get loading(): boolean {
    return this.identity === null && !this.loadFailed;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const identity = await this.request<MemberIdentity>('/identity');
      if (!this.disposed) runInAction(() => { this.identity = identity; });
      if (!this.disposed) this.startClock();
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  /** Create the QR, or replace it (the old one stops verifying). */
  async issue(): Promise<void> {
    await this.change('POST', 'issue');
  }

  askRevoke(): void {
    this.confirmingRevoke = true;
  }

  cancelRevoke(): void {
    this.confirmingRevoke = false;
  }

  async revoke(): Promise<void> {
    await this.change('DELETE', 'revoke');
    if (!this.error) runInAction(() => { this.confirmingRevoke = false; });
  }

  private async change(method: 'POST' | 'DELETE', failure: DigitalIdError): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = null;
    try {
      const identity = await this.request<MemberIdentity>('/identity', { method });
      runInAction(() => { this.identity = identity; this.busy = false; });
    } catch {
      runInAction(() => { this.error = failure; this.busy = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.clock !== null) clearInterval(this.clock);
    this.clock = null;
  }

  reset(): void {
    this.identity = null;
    this.loadFailed = false;
    this.error = null;
    this.confirmingRevoke = false;
    this.refreshFailed = false;
  }
}
