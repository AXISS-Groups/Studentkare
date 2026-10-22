import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { MessageKey } from '@/i18n';
import {
  PASSCODE_LENGTHS,
  PASSCODE_MAX_LENGTH,
  isPasscodeShape,
  localPasscodeProblem,
  passcodeStrength,
  saveProblemKey,
  type PasscodeStrength,
} from './passcodeRules';

/** GET /auth/passcode. Never the passcode or its hash. */
export interface PasscodeStatus {
  available: boolean;
  enabled: boolean;
  hasPasscode?: boolean;
  length?: number | null;
  updatedAt?: number | null;
  locked?: boolean;
  lengths?: number[];
  recommendedLength?: number;
  /** Until this time (server seconds) the passcode can be replaced without the current one: a fresh code sign-in. */
  replaceWithoutCurrentUntil?: number | null;
}

export type PasscodeMode = 'add' | 'change' | 'reset';

const MS_PER_SECOND = 1000;

/**
 * Set, change, reset or turn off the student's passcode (set-passcode screen,
 * Sign-in & security card). The server decides what is weak and whether the
 * current passcode is needed; this only holds what is typed, shows the length
 * and strength hint, and says what the server answered. Typed passcodes are
 * cleared after every try and never stored.
 */
export class PasscodeViewModel {
  phase: 'loading' | 'ready' | 'failed' = 'loading';
  status: PasscodeStatus | null = null;
  passcode = '';
  confirm = '';
  current = '';
  busy = false;
  problem: MessageKey | null = null;
  done: 'saved' | 'removed' | null = null;

  constructor(private readonly now: () => number = Date.now) {
    makeAutoObservable<PasscodeViewModel, 'now'>(this, { now: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.phase = 'loading';
    try {
      const status = await apiRequest<PasscodeStatus>('/auth/passcode');
      runInAction(() => {
        this.status = status;
        this.phase = 'ready';
      });
    } catch {
      runInAction(() => { this.phase = 'failed'; });
    }
  }

  get lengths(): readonly number[] {
    return this.status?.lengths?.length ? this.status.lengths : PASSCODE_LENGTHS;
  }

  get recommendedLength(): number {
    return this.status?.recommendedLength ?? PASSCODE_MAX_LENGTH;
  }

  /** Students only, with the switch on. */
  get usable(): boolean {
    return this.status?.available === true && this.status.enabled === true;
  }

  get hasPasscode(): boolean {
    return this.status?.hasPasscode === true;
  }

  /** A fresh code sign-in lets the student replace it without the old one ("forgot passcode"). */
  get freshCodeSignIn(): boolean {
    const until = this.status?.replaceWithoutCurrentUntil;
    return typeof until === 'number' && until * MS_PER_SECOND > this.now();
  }

  get mode(): PasscodeMode {
    if (!this.hasPasscode) return 'add';
    return this.freshCodeSignIn ? 'reset' : 'change';
  }

  get needsCurrent(): boolean {
    return this.mode === 'change';
  }

  get strength(): PasscodeStrength {
    return passcodeStrength(this.passcode);
  }

  /** Length or characters, once something is typed. */
  get shapeProblem(): MessageKey | null {
    return this.passcode ? localPasscodeProblem(this.passcode) : null;
  }

  get mismatch(): boolean {
    return this.confirm.length > 0 && this.confirm !== this.passcode;
  }

  get canSave(): boolean {
    return !this.busy && isPasscodeShape(this.passcode) && this.confirm === this.passcode
      && (!this.needsCurrent || this.current.length > 0);
  }

  get canRemove(): boolean {
    return !this.busy && this.hasPasscode && (!this.needsCurrent || this.current.length > 0);
  }

  setPasscode(value: string): void {
    this.passcode = value.slice(0, PASSCODE_MAX_LENGTH);
    this.problem = null;
    this.done = null;
  }

  setConfirm(value: string): void {
    this.confirm = value.slice(0, PASSCODE_MAX_LENGTH);
    this.problem = null;
  }

  setCurrent(value: string): void {
    this.current = value.slice(0, PASSCODE_MAX_LENGTH);
    this.problem = null;
  }

  private clearTyped(): void {
    this.passcode = '';
    this.confirm = '';
    this.current = '';
  }

  async save(): Promise<void> {
    if (!this.canSave) return;
    const body = { passcode: this.passcode, ...(this.needsCurrent ? { currentPasscode: this.current } : {}) };
    this.busy = true;
    this.problem = null;
    try {
      await apiRequest('/auth/passcode', { method: 'PUT', body: JSON.stringify(body) });
      runInAction(() => {
        this.clearTyped();
        this.done = 'saved';
      });
      await this.load();
    } catch (error) {
      runInAction(() => {
        this.problem = saveProblemKey(error);
        this.current = '';
      });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  async remove(): Promise<void> {
    if (!this.canRemove) return;
    const body = this.needsCurrent ? { currentPasscode: this.current } : {};
    this.busy = true;
    this.problem = null;
    try {
      await apiRequest('/auth/passcode/remove', { method: 'POST', body: JSON.stringify(body) });
      runInAction(() => {
        this.clearTyped();
        this.done = 'removed';
      });
      await this.load();
    } catch (error) {
      runInAction(() => {
        this.problem = saveProblemKey(error);
        this.current = '';
      });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  dispose(): void {
    this.clearTyped();
  }
}
