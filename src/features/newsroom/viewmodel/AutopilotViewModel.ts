import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import { ApiError } from '@/data/services/http';
import { AutopilotRepository } from '../data/AutopilotRepository';
import type { AutopilotStatus } from '../data/AutopilotRepository';

/**
 * Super admin, Posts, Autopilot (AdminPosts, the Autopilot tab).
 *
 * Every switch and number is a settings-registry value, changed with a reason
 * that the settings history keeps. Run now goes through the scheduler (its
 * lease and record); Check sources reads the feeds without posting; the kill
 * switch stops everything and can take every auto post off the site. Health
 * tips are never published from here: a clinician approves them.
 */
export type SettingValue = boolean | number | string;
export interface PendingChange { key: string; value: SettingValue; kind: 'bool' | 'int' | 'text' }
export type AutopilotNotice = 'saved' | 'ran' | 'checked' | 'stopped' | 'resumed' | 'published' | 'unpublished';

export class AutopilotViewModel implements ViewModel {
  phase: 'loading' | 'ready' | 'error' = 'loading';
  status: AutopilotStatus | null = null;
  busy = false;
  /** null: no error; '': failed without a reason from the server; else the server's reason. */
  error: string | null = null;
  notice: AutopilotNotice | null = null;
  lastRun: string | null = null;

  pending: PendingChange | null = null;
  reason = '';

  stopping = false;
  stopReason = '';
  takeDown = false;

  private disposed = false;

  constructor(private readonly repo: AutopilotRepository = new AutopilotRepository()) {
    makeAutoObservable<AutopilotViewModel, 'repo' | 'disposed'>(this, { repo: false, disposed: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    if (!this.status) this.phase = 'loading';
    try {
      const status = await this.repo.status();
      if (this.disposed) return;
      runInAction(() => { this.status = status; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.pending = null;
    this.reason = '';
    this.stopping = false;
    this.error = null;
    this.notice = null;
  }

  /** Start a change: the value, then a reason, then save. */
  propose(key: string, value: SettingValue, kind: PendingChange['kind']): void {
    this.pending = { key, value, kind };
    this.reason = '';
    this.error = null;
  }

  setPendingValue(raw: string): void {
    if (!this.pending) return;
    this.pending = { ...this.pending, value: this.pending.kind === 'int' ? Number(raw) : raw };
  }

  setReason(value: string): void {
    this.reason = value;
  }

  cancel(): void {
    this.pending = null;
    this.reason = '';
  }

  get canSave(): boolean {
    const p = this.pending;
    if (!p || !this.reason.trim() || this.busy) return false;
    return p.kind !== 'int' || (typeof p.value === 'number' && Number.isInteger(p.value));
  }

  async save(): Promise<void> {
    const p = this.pending;
    if (!p || !this.canSave) return;
    await this.act(async () => {
      await this.repo.changeSetting(p.key, p.value, this.reason.trim());
      runInAction(() => { this.pending = null; this.reason = ''; });
      return this.repo.status();
    }, 'saved');
  }

  async runNow(): Promise<void> {
    await this.act(async () => {
      const result = await this.repo.runNow();
      runInAction(() => { this.lastRun = result.run.status; });
      return result;
    }, 'ran');
  }

  async checkSources(): Promise<void> {
    await this.act(() => this.repo.checkSources(), 'checked');
  }

  async publish(postId: string): Promise<void> {
    await this.act(async () => { await this.repo.publish(postId); return this.repo.status(); }, 'published');
  }

  async unpublish(postId: string): Promise<void> {
    await this.act(async () => { await this.repo.unpublish(postId); return this.repo.status(); }, 'unpublished');
  }

  openStop(): void {
    this.stopping = true;
    this.stopReason = '';
    this.takeDown = false;
  }

  closeStop(): void {
    this.stopping = false;
  }

  setStopReason(value: string): void {
    this.stopReason = value;
  }

  setTakeDown(value: boolean): void {
    this.takeDown = value;
  }

  async stop(): Promise<void> {
    if (this.stopReason.trim().length < 3) return;
    await this.act(async () => {
      const result = await this.repo.killSwitch(true, this.stopReason.trim(), this.takeDown);
      runInAction(() => { this.stopping = false; });
      return result;
    }, 'stopped');
  }

  async resume(reason: string): Promise<void> {
    await this.act(() => this.repo.killSwitch(false, reason, false), 'resumed');
  }

  clearNotice(): void {
    this.notice = null;
  }

  private async act(work: () => Promise<AutopilotStatus>, notice: AutopilotNotice): Promise<void> {
    this.busy = true;
    this.error = null;
    try {
      const status = await work();
      if (this.disposed) return;
      runInAction(() => { this.status = status; this.notice = notice; });
    } catch (error) {
      // The server's reason when it gave one; '' is "it didn't work" in the view's words.
      if (!this.disposed) runInAction(() => { this.error = error instanceof ApiError && error.message ? error.message : ''; this.notice = null; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }
}
