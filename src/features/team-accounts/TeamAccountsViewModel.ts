import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import { ApiError } from '@/data/services/http';
import { STAFF_PIN_LENGTH } from '@/features/auth/viewmodel/AuthViewModel';
import type { TeamAccount, TeamAccountList, TeamAccountsRepository } from './teamAccountsRepository';

/** The server's code when your own PIN is rotated without the right current PIN. */
const ROTATE_SELF_REFUSED = 'ROTATE_SELF_NEEDS_CURRENT_PIN';

export type RotateFailure = 'selfRefused' | 'other';

/** A PIN that has just been made: shown once, then forgotten. */
export interface ShownPin { name: string; pin: string }

/**
 * Super admin → Team accounts: the list, and Rotate PIN / Unlock / Disable.
 *
 * A new PIN lives only in `shownPin` until the dialog is closed; it is never put
 * in the list, storage or a log. Rotating your own account asks for its current
 * PIN (the server checks it). Loads are version-guarded and abortable, and an
 * action finishing after the screen has gone changes nothing.
 */
export class TeamAccountsViewModel {
  data: TeamAccountList | null = null;
  // True before the first load, so the first render shows loading rather than an empty list.
  loading = true;
  error = '';
  /** A short "done" line after Unlock or Disable. */
  notice: { kind: 'unlocked' | 'disabled'; name: string } | null = null;
  actionError = '';
  busyId = '';

  rotateTarget: TeamAccount | null = null;
  currentPin = '';
  rotating = false;
  rotateFailure: RotateFailure | null = null;
  shownPin: ShownPin | null = null;

  disableTarget: TeamAccount | null = null;
  disabling = false;

  private version = 0;
  private controller: AbortController | null = null;
  private generation = 0;

  constructor(private readonly repository: TeamAccountsRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, generation: false, data: observableRef, notice: observableRef, rotateTarget: observableRef, disableTarget: observableRef, shownPin: observableRef },
      { autoBind: true },
    );
  }

  get items(): TeamAccount[] { return this.data?.items ?? []; }
  get rotatingSelf(): boolean { return this.rotateTarget?.isSelf === true; }
  get canRotate(): boolean { return !this.rotating && (!this.rotatingSelf || this.currentPin.length === STAFF_PIN_LENGTH); }

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
        const code = error instanceof ApiError && error.detail && typeof error.detail === 'object' ? (error.detail as { code?: unknown }).code : null;
        this.rotateFailure = code === ROTATE_SELF_REFUSED ? 'selfRefused' : 'other';
      });
    } finally {
      runInAction(() => { this.rotating = false; });
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
