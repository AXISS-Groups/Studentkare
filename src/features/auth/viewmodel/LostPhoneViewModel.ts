import { makeAutoObservable, runInAction } from 'mobx';
import type { MessageKey } from '@/i18n';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** POST /api/auth/sessions/revoke-others (backend/services/workflow_auth.py). */
export interface RevokeResult {
  sessionsRevoked: number;
  passCancelled: boolean;
}

export type LostPhonePhase = 'ready' | 'busy' | 'done' | 'failed';

/**
 * Lost phone (design page 1, LostPhone, Tier 1). Replaces a screen that listed
 * made-up devices and always reported "signed out, pass cancelled" even though
 * no such endpoint existed. Reports only what the server confirms.
 */
export class LostPhoneViewModel implements ViewModel {
  phase: LostPhonePhase = 'ready';
  result: RevokeResult | null = null;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<LostPhoneViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  async revokeOthers(): Promise<void> {
    this.disposed = false;
    this.phase = 'busy';
    this.result = null;
    try {
      const result = await this.request<RevokeResult>('/auth/sessions/revoke-others', { method: 'POST' });
      if (this.disposed) return;
      runInAction(() => {
        this.result = result;
        this.phase = 'done';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'failed'; });
    }
  }

  /** What happened, as message keys for the view to translate. Empty until there is a result. */
  get summary(): { key: MessageKey; vars?: Record<string, number> }[] {
    if (!this.result) return [];
    const n = this.result.sessionsRevoked;
    const devices: { key: MessageKey; vars?: Record<string, number> } = n === 0 ? { key: 'lost.none' } : n === 1 ? { key: 'lost.one' } : { key: 'lost.many', vars: { count: n } };
    return this.result.passCancelled ? [devices, { key: 'lost.passCancelled' }] : [devices];
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.phase = 'ready';
    this.result = null;
  }
}
