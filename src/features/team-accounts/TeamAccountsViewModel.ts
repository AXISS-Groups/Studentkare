import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import { ApiError } from '@/data/services/http';
import { PASSWORD_MAX_LENGTH, STAFF_PIN_LENGTH } from '@/features/auth/viewmodel/AuthViewModel';
import { getSetting } from '@/data/services/config';
import type { CurrentSecret, TeamAccount, TeamAccountList, TeamAccountsRepository } from './teamAccountsRepository';

/** The server's code when your own PIN is rotated without the right current PIN. */
const ROTATE_SELF_REFUSED = 'ROTATE_SELF_NEEDS_CURRENT_PIN';
/** The server's codes for a password that can't be set (services/account_password.py). */
const PASSWORD_SELF_REFUSED = 'PASSWORD_SELF_NEEDS_CURRENT';
const PASSWORD_REFUSED = ['PASSWORD_LENGTH', 'PASSWORD_CHARACTERS', 'PASSWORD_WEAK'];
const PIN_ONLY = new RegExp(`^\\d{${STAFF_PIN_LENGTH}}$`);

export type RotateFailure = 'selfRefused' | 'other';
export type PasswordFailure = 'mismatch' | 'weak' | 'selfRefused' | 'other';

function errorCode(error: unknown): unknown {
  return error instanceof ApiError && error.detail && typeof error.detail === 'object' ? (error.detail as { code?: unknown }).code : null;
}

/** A PIN that has just been made: shown once, then forgotten. */
export interface ShownPin { name: string; pin: string }

/**
 * Super admin → Team accounts: the list, and Rotate PIN / Set password / Unlock / Disable.
 *
 * A new PIN lives only in `shownPin` until the dialog is closed; it is never put
 * in the list, storage or a log. A typed password lives only in the dialog's
 * fields and is cleared on every send, close and dispose; the server never
 * sends one back. Rotating your own account asks for its current
 * PIN (the server checks it). Loads are version-guarded and abortable, and an
 * action finishing after the screen has gone changes nothing.
 */
export class TeamAccountsViewModel {
  data: TeamAccountList | null = null;
  // True before the first load, so the first render shows loading rather than an empty list.
  loading = true;
  error = '';
  /** A short "done" line after Unlock or Disable. */
  notice: { kind: 'unlocked' | 'disabled' | 'passwordSet'; name: string } | null = null;
  actionError = '';
  busyId = '';

  rotateTarget: TeamAccount | null = null;
  currentPin = '';
  rotating = false;
  rotateFailure: RotateFailure | null = null;
  shownPin: ShownPin | null = null;

  passwordTarget: TeamAccount | null = null;
  newPassword = '';
  passwordAgain = '';
  /** Your own account only: the current PIN or password. */
  currentSecret = '';
  savingPassword = false;
  passwordFailure: PasswordFailure | null = null;

  disableTarget: TeamAccount | null = null;
  disabling = false;

  private version = 0;
  private controller: AbortController | null = null;
  private generation = 0;

  constructor(private readonly repository: TeamAccountsRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, generation: false, data: observableRef, notice: observableRef, rotateTarget: observableRef, passwordTarget: observableRef, disableTarget: observableRef, shownPin: observableRef },
      { autoBind: true },
    );
  }

  get items(): TeamAccount[] { return this.data?.items ?? []; }
  get rotatingSelf(): boolean { return this.rotateTarget?.isSelf === true; }
  get canRotate(): boolean { return !this.rotating && (!this.rotatingSelf || this.currentPin.length === STAFF_PIN_LENGTH); }
  get settingOwnPassword(): boolean { return this.passwordTarget?.isSelf === true; }
  /** The shortest password the server takes (public setting auth.password_min_length). */
  get passwordMinLength(): number { return getSetting('auth.password_min_length'); }
  get canSetPassword(): boolean {
    return !this.savingPassword && this.newPassword.length >= this.passwordMinLength && this.passwordAgain.length > 0
      && (!this.settingOwnPassword || this.currentSecret.length > 0);
  }

  reload() { void this.load(); }

  async load(): Promise<void> {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    try {
      const data = await this.repository.list(controller.signal);
      runInAction(() => { if (version === this.version) this.data = data; });
    } catch (error) {
      if (controller.signal.aborted) return;
      runInAction(() => { if (version === this.version) this.error = error instanceof Error ? error.message : ''; });
    } finally {
      runInAction(() => { if (version === this.version) this.loading = false; });
    }
  }

  dispose() {
    this.generation += 1;
    this.version += 1;
    this.controller?.abort();
    this.shownPin = null;
    this.currentPin = '';
    this.clearPasswordFields();
  }

  // --- rotate -----------------------------------------------------------------

  openRotate(account: TeamAccount) {
    this.rotateTarget = account;
    this.currentPin = '';
    this.rotateFailure = null;
    this.shownPin = null;
  }

  setCurrentPin(value: string) {
    this.currentPin = value.replace(/\D/g, '').slice(0, STAFF_PIN_LENGTH);
    this.rotateFailure = null;
  }

  closeRotate() {
    if (this.rotating) return;
    this.rotateTarget = null;
    this.currentPin = '';
    this.rotateFailure = null;
    this.shownPin = null;
  }

  async rotate(): Promise<void> {
    const target = this.rotateTarget;
    if (!target || !this.canRotate) return;
    const generation = this.generation;
    this.rotating = true;
    this.rotateFailure = null;
    const currentPin = this.rotatingSelf ? this.currentPin : undefined;
    this.currentPin = '';
    try {
      const rotated = await this.repository.rotate(target.id, currentPin);
      if (generation !== this.generation) return;
      runInAction(() => { this.shownPin = { name: target.fullName, pin: rotated.pin }; });
      void this.load();
    } catch (error) {
      if (generation !== this.generation) return;
      runInAction(() => {
        this.rotateFailure = errorCode(error) === ROTATE_SELF_REFUSED ? 'selfRefused' : 'other';
      });
    } finally {
      runInAction(() => { this.rotating = false; });
    }
  }

  // --- set password ------------------------------------------------------------

  openPassword(account: TeamAccount) {
    this.passwordTarget = account;
    this.clearPasswordFields();
    this.passwordFailure = null;
  }

  setNewPassword(value: string) { this.newPassword = value.slice(0, PASSWORD_MAX_LENGTH); this.passwordFailure = null; }
  setPasswordAgain(value: string) { this.passwordAgain = value.slice(0, PASSWORD_MAX_LENGTH); this.passwordFailure = null; }
  setCurrentSecret(value: string) { this.currentSecret = value.slice(0, PASSWORD_MAX_LENGTH); this.passwordFailure = null; }

  closePassword() {
    if (this.savingPassword) return;
    this.passwordTarget = null;
    this.clearPasswordFields();
    this.passwordFailure = null;
  }

  private clearPasswordFields() {
    this.newPassword = '';
    this.passwordAgain = '';
    this.currentSecret = '';
  }

  async savePassword(): Promise<void> {
    const target = this.passwordTarget;
    if (!target || !this.canSetPassword) return;
    if (this.newPassword !== this.passwordAgain) {
      this.passwordFailure = 'mismatch';
      this.passwordAgain = '';
      return;
    }
    const generation = this.generation;
    const password = this.newPassword;
    // A six-digit answer is the PIN; anything else is the current password (always longer).
    const current: CurrentSecret | undefined = !this.settingOwnPassword ? undefined
      : PIN_ONLY.test(this.currentSecret) ? { currentPin: this.currentSecret } : { currentPassword: this.currentSecret };
    this.clearPasswordFields();
    this.savingPassword = true;
    this.passwordFailure = null;
    try {
      const row = await this.repository.setPassword(target.id, password, current);
      if (generation !== this.generation) return;
      runInAction(() => {
        if (this.data) this.data = { ...this.data, items: this.data.items.map(item => item.id === row.id ? row : item) };
        this.notice = { kind: 'passwordSet', name: target.fullName };
        this.passwordTarget = null;
      });
    } catch (error) {
      if (generation !== this.generation) return;
      runInAction(() => {
        const code = errorCode(error);
        this.passwordFailure = code === PASSWORD_SELF_REFUSED ? 'selfRefused'
          : typeof code === 'string' && PASSWORD_REFUSED.includes(code) ? 'weak' : 'other';
      });
    } finally {
      runInAction(() => { this.savingPassword = false; });
    }
  }

  // --- unlock / disable ---------------------------------------------------------

  async unlock(account: TeamAccount): Promise<void> {
    await this.act(account, () => this.repository.unlock(account.id), 'unlocked');
  }

  openDisable(account: TeamAccount) { this.disableTarget = account; this.actionError = ''; }
  closeDisable() { if (!this.disabling) this.disableTarget = null; }

  async disable(): Promise<void> {
    const target = this.disableTarget;
    if (!target) return;
    this.disabling = true;
    await this.act(target, () => this.repository.disable(target.id), 'disabled');
    runInAction(() => { this.disabling = false; this.disableTarget = null; });
  }

  private async act(account: TeamAccount, call: () => Promise<TeamAccount>, done: 'unlocked' | 'disabled'): Promise<void> {
    const generation = this.generation;
    this.busyId = account.id;
    this.actionError = '';
    this.notice = null;
    try {
      const row = await call();
      if (generation !== this.generation) return;
      runInAction(() => {
        if (this.data) this.data = { ...this.data, items: this.data.items.map(item => item.id === row.id ? row : item) };
        this.notice = { kind: done, name: account.fullName };
      });
    } catch (error) {
      if (generation !== this.generation) return;
      runInAction(() => { this.actionError = error instanceof Error && error.message ? error.message : 'failed'; });
    } finally {
      runInAction(() => { this.busyId = ''; });
    }
  }

  dismissNotice() { this.notice = null; }
}
