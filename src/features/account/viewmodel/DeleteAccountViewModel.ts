import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** GET/POST/DELETE /api/records/deletion-request (backend/services/erasure.py). */
export interface DeletionStatus {
  status: 'NONE' | 'PENDING' | 'CANCELLED' | string;
  requestedAt: number | null;
  scheduledFor: number | null;
  /** Days the sealed copy is kept; null if the server has not been configured. */
  archiveRetentionDays: number | null;
}

export const CONFIRM_WORD = 'DELETE';

/**
 * Delete my account (design page 2/3: DeleteAccount, Tier 1 — approved by the
 * repository owner as named reviewer). Everything shown comes from the server,
 * including how long the sealed copy is kept.
 */
export class DeleteAccountViewModel implements ViewModel {
  state: DeletionStatus | null = null;
  loadFailed = false;
  confirmText = '';
  busy = false;
  error = '';
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<DeleteAccountViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get scheduled(): boolean {
    return this.state?.status === 'PENDING';
  }

  get canConfirm(): boolean {
    return !this.busy && this.confirmText.trim().toUpperCase() === CONFIRM_WORD;
  }

  setConfirmText(value: string): void {
    this.confirmText = value;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const state = await this.request<DeletionStatus>('/records/deletion-request');
      if (!this.disposed) runInAction(() => { this.state = state; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  async confirm(): Promise<void> {
    if (!this.canConfirm) return;
    await this.run(() => this.request<DeletionStatus>('/records/deletion-request', { method: 'POST' }), "Your request wasn't recorded. Nothing has changed — try again.");
    if (this.scheduled) runInAction(() => { this.confirmText = ''; });
  }

  async cancel(): Promise<void> {
    await this.run(() => this.request<DeletionStatus>('/records/deletion-request', { method: 'DELETE' }), "Couldn't cancel. Your deletion is still scheduled — try again.");
  }

  private async run(call: () => Promise<DeletionStatus>, failure: string): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      const state = await call();
      if (!this.disposed) runInAction(() => { this.state = state; });
    } catch {
      if (!this.disposed) runInAction(() => { this.error = failure; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busy = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.state = null;
    this.loadFailed = false;
    this.confirmText = '';
    this.busy = false;
    this.error = '';
  }
}
