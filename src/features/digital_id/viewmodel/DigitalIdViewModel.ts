import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { passIsLive, passSecondsLeft } from './livePass';

/**
 * Member ID for the native app, on the same endpoints as the web Digital ID
 * panel: GET /api/identity, POST to issue or replace the QR, DELETE to revoke.
 *
 * This used to call /digital-id/me and /digital-id/refresh-qr, which do not
 * exist, and showed a "VERIFIED CAMPUS MEMBER" badge and a blood group. The
 * card now shows only what the server returns, and campus status as the
 * server reports it.
 */
export class DigitalIdViewModel implements ViewModel {
  identity: MemberIdentity | null = null;
  loadFailed = false;
  busy = false;
  error: string | null = null;
  confirmingRevoke = false;
  /** Clock for the 30 s pass: a code past expiresAt is refused at the counter, so it is hidden. */
  now = Date.now();
  private disposed = false;
  private clock: ReturnType<typeof setInterval> | null = null;
  private refreshingFor: number | undefined;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<DigitalIdViewModel, 'disposed' | 'request' | 'clock' | 'refreshingFor'>(this,
      { disposed: false, request: false, clock: false, refreshingFor: false }, { autoBind: true });
  }

  /** The QR and code are shown only while the server's signature for them is live. */
  get live(): boolean {
    return passIsLive(this.identity?.expiresAt, this.now);
  }

  get secondsLeft(): number | null {
    return passSecondsLeft(this.identity?.expiresAt, this.now);
  }

  tick(now: number = Date.now()): void {
    this.now = now;
    const expiresAt = this.identity?.expiresAt;
    if (expiresAt && !this.live && this.refreshingFor !== expiresAt && !this.disposed) {
      this.refreshingFor = expiresAt;
      void this.refresh();
    }
  }

  /** Next step's code, in place. On failure the old one simply stops being shown. */
  private async refresh(): Promise<void> {
    try {
      const identity = await this.request<MemberIdentity>('/identity');
      if (!this.disposed) runInAction(() => { this.identity = identity; });
    } catch {
      // Offline: no live code. The view says so; nothing stale is shown.
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
    await this.change('POST', 'Your QR wasn’t created. Try again.');
  }

  askRevoke(): void {
    this.confirmingRevoke = true;
  }

  cancelRevoke(): void {
    this.confirmingRevoke = false;
  }

  async revoke(): Promise<void> {
    await this.change('DELETE', 'Your QR wasn’t revoked. It still works — try again.');
    if (!this.error) runInAction(() => { this.confirmingRevoke = false; });
  }

  private async change(method: 'POST' | 'DELETE', failure: string): Promise<void> {
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
  }
}
