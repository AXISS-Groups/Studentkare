import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { MessageKey } from '@/i18n';
import { PASSWORD_MAX_LENGTH } from '@/features/auth/viewmodel/AuthViewModel';

/** GET /auth/password. Never the password or its hash. */
export interface PasswordStatus {
  enabled: boolean;
  hasPassword: boolean;
  locked: boolean;
  minLength: number;
  /** Until this time (server seconds) it can be replaced without the current one: a fresh code sign-in. */
  replaceWithoutCurrentUntil: number | null;
}

const MS_PER_SECOND = 1000;
const HTTP_TOO_MANY = 429;

function problemOf(error: unknown): MessageKey {
  const code = error instanceof ApiError && error.detail && typeof error.detail === 'object'
    ? (error.detail as { code?: unknown }).code : null;
  if (code === 'PASSWORD_PROOF_NEEDED') return 'authpw.card.proofNeeded';
  if (code === 'PASSWORD_WEAK') return 'authpw.weak';
  if (code === 'PASSWORD_LENGTH') return 'authpw.length';
  if (code === 'PASSWORD_CHARACTERS') return 'authpw.characters';
  if (error instanceof ApiError && error.status === HTTP_TOO_MANY) return 'authpw.card.locked';
  return 'authpw.card.failed';
}

/**
 * Sign-in & security, Password (plan tier1-auth-password-2026-10-22, C). Set one,
 * or change it with the current password, or without it just after a code sign-in
 * ("Forgot your password?"). The server decides what is weak and whether the
 * current one is needed. Typed passwords are cleared after every try.
 */
export class PasswordCardViewModel {
  phase: 'loading' | 'ready' | 'failed' = 'loading';
  status: PasswordStatus | null = null;
  editing = false;
  current = '';
  password = '';
  again = '';
  busy = false;
  problem: MessageKey | null = null;
  saved = false;

  constructor(private readonly request: typeof apiRequest = apiRequest, private readonly now: () => number = Date.now) {
    makeAutoObservable<PasswordCardViewModel, 'request' | 'now'>(this, { request: false, now: false }, { autoBind: true });
  }

  /** The current password is asked for only when one exists and no fresh code sign-in covers it. */
  get needsCurrent(): boolean {
    const until = this.status?.replaceWithoutCurrentUntil;
    return this.status?.hasPassword === true && !(until && until * MS_PER_SECOND > this.now());
  }

  get minLength(): number { return this.status?.minLength ?? 0; }

  get canSave(): boolean {
    return !this.busy && this.password.length >= this.minLength && this.again.length > 0
      && (!this.needsCurrent || this.current.length > 0);
  }

  async load(): Promise<void> {
    this.phase = 'loading';
    try {
      const status = await this.request<PasswordStatus>('/auth/password');
      runInAction(() => { this.status = status; this.phase = 'ready'; });
    } catch {
      runInAction(() => { this.phase = 'failed'; });
    }
  }

  open(): void { this.editing = true; this.saved = false; this.problem = null; this.clear(); }
  close(): void { if (!this.busy) { this.editing = false; this.problem = null; this.clear(); } }

  setCurrent(value: string): void { this.current = value.slice(0, PASSWORD_MAX_LENGTH); this.problem = null; }
  setPassword(value: string): void { this.password = value.slice(0, PASSWORD_MAX_LENGTH); this.problem = null; }
  setAgain(value: string): void { this.again = value.slice(0, PASSWORD_MAX_LENGTH); this.problem = null; }

  async save(): Promise<void> {
    if (!this.canSave) return;
    if (this.password !== this.again) {
      this.problem = 'authpw.mismatch';
      this.again = '';
      return;
    }
    const body = { password: this.password, ...(this.needsCurrent ? { currentPassword: this.current } : {}) };
    this.clear();
    this.busy = true;
    this.problem = null;
    try {
      await this.request('/auth/password', { method: 'POST', body: JSON.stringify(body) });
      runInAction(() => {
        this.editing = false;
        this.saved = true;
        if (this.status) this.status = { ...this.status, hasPassword: true };
      });
    } catch (error) {
      runInAction(() => { this.problem = problemOf(error); });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  private clear(): void {
    this.current = '';
    this.password = '';
    this.again = '';
  }

  dispose(): void { this.clear(); }
}
