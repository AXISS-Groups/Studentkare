import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { SessionResponse } from '@/data/types/workflowTypes';
import type { Lang, MessageKey } from '@/i18n';
import { PASSWORD_MAX_LENGTH } from './AuthViewModel';
import { SignupConsentState } from './signupConsent';

/** POST /auth/invite/lookup: what the claim page may say before anything is typed. */
export interface InviteSummary {
  firstName: string;
  university: string;
  sentTo: string;
  minLength: number;
  expiresAt: number;
}

export type ClaimStep = 'temp' | 'password' | 'dob' | 'consent';
export const CLAIM_STEPS: readonly ClaimStep[] = ['temp', 'password', 'dob', 'consent'];
const TEMP_MAX_LENGTH = 64;
const HTTP_TOO_MANY = 429;
const HTTP_UNPROCESSABLE = 422;

/** Reads the token from the link's fragment (#token=…): it never reaches a server log. */
export function tokenFromHash(hash: string): string {
  const match = /(?:^#|&)token=([A-Za-z0-9_-]{10,100})/.exec(hash);
  return match ? match[1] : '';
}

function codeOf(error: unknown): string {
  if (!(error instanceof ApiError) || !error.detail || typeof error.detail !== 'object') return '';
  const code = (error.detail as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/**
 * Claim a college's invite (B2B; plan tier1-auth-password-2026-10-22, amendment b).
 *
 * The link opens this; the temporary password came separately from the college.
 * The student then sets a password of their own, gives their own date of birth
 * and their own consent. Everything goes in one request, and nothing opens a
 * session until the server accepts it all. The server decides every rule; this
 * holds what is typed, says what came back, and sends the student to the step it
 * concerns. Typed passwords are cleared on success and when the screen goes.
 */
export class ClaimInviteViewModel {
  phase: 'loading' | 'ready' | 'invalid' = 'loading';
  summary: InviteSummary | null = null;
  step: ClaimStep = 'temp';
  tempPassword = '';
  password = '';
  again = '';
  dob = '';
  consent = new SignupConsentState();
  busy = false;
  problem: { key: MessageKey; message?: string } | null = null;
  private token = '';

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<ClaimInviteViewModel, 'request' | 'token'>(this, { request: false, token: false }, { autoBind: true });
  }

  get position(): number { return CLAIM_STEPS.indexOf(this.step) + 1; }
  get minLength(): number { return this.summary?.minLength ?? 0; }

  async load(token: string): Promise<void> {
    this.token = token;
    this.phase = 'loading';
    if (!token) { this.phase = 'invalid'; return; }
    try {
      const summary = await this.request<InviteSummary>('/auth/invite/lookup', { method: 'POST', body: JSON.stringify({ token }) });
      runInAction(() => { this.summary = summary; this.phase = 'ready'; });
    } catch {
      runInAction(() => { this.phase = 'invalid'; });
    }
  }

  setTemp(value: string): void { this.tempPassword = value.slice(0, TEMP_MAX_LENGTH); this.problem = null; }
  setPassword(value: string): void { this.password = value.slice(0, PASSWORD_MAX_LENGTH); this.problem = null; }
  setAgain(value: string): void { this.again = value.slice(0, PASSWORD_MAX_LENGTH); this.problem = null; }
  setDob(value: string): void { this.dob = value; this.problem = null; }

  back(): void {
    const index = CLAIM_STEPS.indexOf(this.step);
    if (index > 0) { this.step = CLAIM_STEPS[index - 1]; this.problem = null; }
  }

  /** Each step's Continue: only shape checks here; the server checks everything at the end. */
  next(): void {
    this.problem = null;
    if (this.step === 'temp') {
      if (!this.tempPassword.trim()) return;
      this.step = 'password';
    } else if (this.step === 'password') {
      if (this.password.length < this.minLength) { this.problem = { key: 'authpw.length' }; return; }
      if (this.password !== this.again) { this.problem = { key: 'authpw.mismatch' }; this.again = ''; return; }
      if (this.password === this.tempPassword) { this.problem = { key: 'claim.samePassword' }; return; }
      this.step = 'dob';
    } else if (this.step === 'dob') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.dob)) { this.problem = { key: 'claim.dobNeeded' }; return; }
      this.step = 'consent';
    }
  }

  async claim(language: Lang, onAccept: (response: SessionResponse) => void): Promise<void> {
    const consent = this.consent.payload(language);
    if (!consent) { this.problem = { key: 'claim.consentNeeded' }; return; }
    this.busy = true;
    this.problem = null;
    try {
      const response = await this.request<SessionResponse>('/auth/invite/claim', {
        method: 'POST',
        body: JSON.stringify({ token: this.token, tempPassword: this.tempPassword, password: this.password, dob: this.dob, consent }),
      });
      runInAction(() => { this.clear(); });
      onAccept(response);
    } catch (error) {
      runInAction(() => { this.refused(error); });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** Back to the step the refusal is about, with the server's words where it gave its own. */
  private refused(error: unknown): void {
    const code = codeOf(error);
    const message = error instanceof Error ? error.message : undefined;
    if (code === 'INVITE_INVALID') { this.phase = 'invalid'; return; }
    if (code === 'INVITE_FAILED' || (error instanceof ApiError && error.status === HTTP_TOO_MANY)) {
      this.tempPassword = '';
      this.step = 'temp';
      this.problem = { key: 'claim.tempFailed', message };
      return;
    }
    if (code.startsWith('PASSWORD_') || code === 'INVITE_SAME_PASSWORD') {
      this.password = '';
      this.again = '';
      this.step = 'password';
      this.problem = { key: code === 'INVITE_SAME_PASSWORD' ? 'claim.samePassword' : code === 'PASSWORD_WEAK' ? 'authpw.weak'
        : code === 'PASSWORD_CHARACTERS' ? 'authpw.characters' : 'authpw.length' };
      return;
    }
    if (error instanceof ApiError && error.status === HTTP_UNPROCESSABLE) {
      // The birth date (18+) or the consent wording: the server's own message says which.
      this.step = 'dob';
      this.problem = { key: 'claim.refused', message };
      return;
    }
    this.problem = { key: 'claim.failed' };
  }

  private clear(): void {
    this.tempPassword = '';
    this.password = '';
    this.again = '';
  }

  dispose(): void { this.clear(); }
}
