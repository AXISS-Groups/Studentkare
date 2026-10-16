import { makeAutoObservable, runInAction } from 'mobx';
import type { MessageKey } from '@/i18n';
import { ApiError, apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** GET /api/auth/2fa/status (backend/services/integrations.py). */
export interface TwoFactorStatus {
  enabled: boolean;
  /** The account's role must use two-step sign-in (twofa.enforced_roles). */
  required: boolean;
  /** Required and not on yet: the session reaches nothing else until it is. */
  setupRequired: boolean;
}

/** POST /api/auth/2fa/setup. Held in this object's memory only and dropped on leave. */
export interface Enrolment {
  secret: string;
  otpauthUrl: string;
  qrMatrix: string[];
}

/** Server refusals, by status, as copy the student can act on. Never the server's own text. */
function codeFailure(error: unknown): MessageKey {
  if (!(error instanceof ApiError)) return 'sec.twofa.failed';
  if (error.status === 400) return 'sec.twofa.wrongCode';
  if (error.status === 429) return 'sec.twofa.tooMany';
  if (error.status === 503) return 'sec.twofa.unavailable';
  return 'sec.twofa.failed';
}

/**
 * Sign-in & security: two-step sign-in (design page 3b, WebSecurity, Tier 2).
 *
 * The TOTP secret only ever lives in `enrolment`, in memory: it is never put
 * in storage, analytics or logs, and `dispose()` (leaving the screen) and a
 * successful enable both clear it. Once 2FA is on the server will not show it
 * again.
 */
export class TwoFactorViewModel implements ViewModel {
  phase: 'loading' | 'ready' | 'failed' = 'loading';
  status: TwoFactorStatus | null = null;
  enrolment: Enrolment | null = null;
  code = '';
  confirmingOff = false;
  offCode = '';
  busy = false;
  /** A message key (translated by the view), or '' for none. */
  error: MessageKey | '' = '';
  /** A positive outcome to announce, or '' for none. */
  done: MessageKey | '' = '';
  private disposed = false;

  constructor(
    private readonly request: typeof apiRequest = apiRequest,
    /** Called after 2FA is turned on, so the app can re-read a held session. */
    private readonly onEnabled: () => void = () => undefined,
  ) {
    makeAutoObservable<TwoFactorViewModel, 'disposed' | 'request' | 'onEnabled'>(
      this, { disposed: false, request: false, onEnabled: false }, { autoBind: true },
    );
  }

  get canEnable(): boolean {
    return !this.busy && this.enrolment !== null && /^\d{6}$/.test(this.code);
  }

  get canDisable(): boolean {
    return !this.busy && /^\d{6}$/.test(this.offCode);
  }

  setCode(value: string): void {
    this.code = value.replace(/\D/g, '').slice(0, 6);
  }

  setOffCode(value: string): void {
    this.offCode = value.replace(/\D/g, '').slice(0, 6);
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const status = await this.request<TwoFactorStatus>('/auth/2fa/status');
      if (!this.disposed) runInAction(() => { this.status = status; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'failed'; });
    }
  }

  async startSetup(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.done = '';
    try {
      const res = await this.request<Enrolment>('/auth/2fa/setup', { method: 'POST' });
      if (!this.disposed) runInAction(() => {
        this.enrolment = { secret: res.secret, otpauthUrl: res.otpauthUrl, qrMatrix: Array.isArray(res.qrMatrix) ? res.qrMatrix : [] };
        this.code = '';
      });
    } catch (error) {
      if (this.disposed) return;
      // 409: it is already on (another tab). Show the truth rather than an error.
      if (error instanceof ApiError && error.status === 409) { await this.load(); return; }
      runInAction(() => { this.error = codeFailure(error); });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  cancelSetup(): void {
    this.enrolment = null;
    this.code = '';
    this.error = '';
  }

  async enable(): Promise<void> {
    if (!this.canEnable) return;
    this.busy = true;
    this.error = '';
    try {
      await this.request('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ token: this.code }) });
      if (this.disposed) return;
      runInAction(() => {
        this.enrolment = null;
        this.code = '';
        this.done = 'sec.twofa.enabled';
        if (this.status) this.status = { ...this.status, enabled: true, setupRequired: false };
      });
      this.onEnabled();
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.error = codeFailure(error); this.code = ''; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  askToDisable(): void {
    this.confirmingOff = true;
    this.offCode = '';
    this.error = '';
    this.done = '';
  }

  cancelDisable(): void {
    this.confirmingOff = false;
    this.offCode = '';
    this.error = '';
  }

  async disable(): Promise<void> {
    if (!this.canDisable) return;
    this.busy = true;
    this.error = '';
    try {
      await this.request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ token: this.offCode }) });
      if (this.disposed) return;
      runInAction(() => {
        this.confirmingOff = false;
        this.offCode = '';
        this.done = 'sec.twofa.disabled';
        if (this.status) this.status = { ...this.status, enabled: false };
      });
    } catch (error) {
      if (this.disposed) return;
      const roleLocked = error instanceof ApiError && error.status === 403;
      runInAction(() => {
        this.error = roleLocked ? 'sec.twofa.requiredOn' : codeFailure(error);
        this.offCode = '';
      });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  /** Leaving the screen: the secret and any typed code go with it. */
  dispose(): void {
    this.disposed = true;
    this.enrolment = null;
    this.code = '';
    this.offCode = '';
    this.confirmingOff = false;
  }

  reset(): void {
    this.phase = 'loading';
    this.status = null;
    this.enrolment = null;
    this.code = '';
    this.confirmingOff = false;
    this.offCode = '';
    this.busy = false;
    this.error = '';
    this.done = '';
  }
}
