import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { MessageKey } from '@/i18n';

export type ContactKind = 'EMAIL' | 'WHATSAPP';

/** One row of GET /auth/contacts: the account's own email or WhatsApp number. */
export interface Contact {
  kind: ContactKind;
  value: string;
  verified: boolean;
  /** The sign-in ID: it can't be changed or removed here. */
  primary: boolean;
}

export const CONTACT_KINDS: readonly ContactKind[] = ['EMAIL', 'WHATSAPP'];

const HTTP_UNPROCESSABLE = 422;
const HTTP_TOO_MANY = 429;
const HTTP_UNAVAILABLE = 503;
const CODE_LENGTH = 6;

const PROBLEMS: Record<string, MessageKey> = {
  CONTACT_IN_USE: 'contacts.inUse',
  CONTACT_PRIMARY: 'contacts.primary',
  CONTACT_CODE_FAILED: 'contacts.codeFailed',
};

function problemOf(error: unknown): MessageKey {
  if (!(error instanceof ApiError)) return 'contacts.failed';
  const code = error.detail && typeof error.detail === 'object' ? (error.detail as { code?: unknown }).code : null;
  if (typeof code === 'string' && PROBLEMS[code]) return PROBLEMS[code];
  if (error.status === HTTP_UNPROCESSABLE) return 'contacts.invalid';
  if (error.status === HTTP_TOO_MANY) return 'contacts.tooMany';
  if (error.status === HTTP_UNAVAILABLE) return 'contacts.unavailable';
  return 'contacts.failed';
}

/**
 * Sign-in & security, your email and WhatsApp (plan tier1-auth-password-2026-10-22, A).
 *
 * Adding or verifying a contact is two steps: send a code to it, then type the
 * code. Only the server marks a contact verified; this holds what is typed and
 * says what the server answered. The code field empties after every try.
 */
export class ContactsViewModel {
  phase: 'loading' | 'ready' | 'failed' = 'loading';
  items: Contact[] = [];
  /** The contact being added or verified, if any. */
  editing: ContactKind | null = null;
  step: 'enter' | 'code' = 'enter';
  value = '';
  code = '';
  sentTo = '';
  busy = false;
  problem: MessageKey | null = null;
  done: { key: 'contacts.doneVerified' | 'contacts.doneRemoved'; kind: ContactKind } | null = null;
  removing: ContactKind | null = null;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<ContactsViewModel, 'request'>(this, { request: false }, { autoBind: true });
  }

  contact(kind: ContactKind): Contact | undefined {
    return this.items.find(item => item.kind === kind);
  }

  get canSend(): boolean {
    return !this.busy && this.value.trim().length > 0;
  }

  get canVerify(): boolean {
    return !this.busy && this.code.length === CODE_LENGTH;
  }

  async load(): Promise<void> {
    this.phase = 'loading';
    try {
      const list = await this.request<{ items: Contact[] }>('/auth/contacts');
      runInAction(() => { this.items = list.items; this.phase = 'ready'; });
    } catch {
      runInAction(() => { this.phase = 'failed'; });
    }
  }

  /** Add the missing contact, or verify one that is there but not verified (its value prefilled). */
  start(kind: ContactKind): void {
    const existing = this.contact(kind);
    this.editing = kind;
    this.step = 'enter';
    this.value = existing && !existing.verified ? existing.value : '';
    this.code = '';
    this.problem = null;
    this.done = null;
  }

  cancel(): void {
    if (this.busy) return;
    this.editing = null;
    this.value = '';
    this.code = '';
    this.problem = null;
  }

  setValue(value: string): void {
    this.value = value;
    this.problem = null;
  }

  setCode(value: string): void {
    this.code = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    this.problem = null;
  }

  async sendCode(): Promise<void> {
    const kind = this.editing;
    if (!kind || !this.canSend) return;
    this.busy = true;
    this.problem = null;
    try {
      const sent = await this.request<{ alreadyVerified: boolean; targetMasked?: string; items?: Contact[] }>(
        '/auth/contacts/send-code', { method: 'POST', body: JSON.stringify({ kind, value: this.value.trim() }) });
      runInAction(() => {
        if (sent.alreadyVerified) {
          if (sent.items) this.items = sent.items;
          this.finish(kind);
          return;
        }
        this.sentTo = sent.targetMasked ?? '';
        this.step = 'code';
      });
    } catch (error) {
      runInAction(() => { this.problem = problemOf(error); });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  async verify(): Promise<void> {
    const kind = this.editing;
    if (!kind || !this.canVerify) return;
    const otp = this.code;
    this.code = '';
    this.busy = true;
    this.problem = null;
    try {
      const list = await this.request<{ items: Contact[] }>('/auth/contacts/verify', { method: 'POST', body: JSON.stringify({ otp }) });
      runInAction(() => { this.items = list.items; this.finish(kind); });
    } catch (error) {
      runInAction(() => { this.problem = problemOf(error); });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  askRemove(kind: ContactKind): void { this.removing = kind; this.problem = null; this.done = null; }
  cancelRemove(): void { if (!this.busy) this.removing = null; }

  async remove(): Promise<void> {
    const kind = this.removing;
    if (!kind) return;
    this.busy = true;
    try {
      const list = await this.request<{ items: Contact[] }>(`/auth/contacts/${kind}`, { method: 'DELETE' });
      runInAction(() => { this.items = list.items; this.done = { key: 'contacts.doneRemoved', kind }; this.removing = null; });
    } catch (error) {
      runInAction(() => { this.problem = problemOf(error); this.removing = null; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  private finish(kind: ContactKind): void {
    this.editing = null;
    this.value = '';
    this.code = '';
    this.done = { key: 'contacts.doneVerified', kind };
  }

  dispose(): void {
    this.value = '';
    this.code = '';
  }
}
