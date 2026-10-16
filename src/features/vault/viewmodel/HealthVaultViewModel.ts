import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** GET /api/health/documents → items[]. */
export interface VaultDocument {
  id: string;
  title: string;
  category: string;
  createdAt: number;
}

/** GET /api/records/shares → items[]: who can see which record, until when. */
export interface RecordShare {
  id: string;
  clinician: string;
  document: string;
  grantedAt: number;
  expiresAt: number;
  revoked: boolean;
  active: boolean;
}

/**
 * Health records for the native app, on the same endpoints as the web vault:
 * the student's own documents and the shares they have granted, each of which
 * can be revoked (DESIGN.md §2.6).
 *
 * This replaces a ViewModel seeded with an invented blood count and ABDM
 * consent requests, and a repository that PATCHed /vault/consent/{id} — a
 * route that does not exist, because the backend has no incoming consent
 * requests at all.
 */
export class HealthVaultViewModel implements ViewModel {
  documents: VaultDocument[] | null = null;
  shares: RecordShare[] | null = null;
  loadFailed = false;
  revokingId: string | null = null;
  error: string | null = null;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<HealthVaultViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get loading(): boolean {
    return (this.documents === null || this.shares === null) && !this.loadFailed;
  }

  get activeShares(): RecordShare[] {
    return (this.shares ?? []).filter((share) => share.active);
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const [docs, shares] = await Promise.all([
        this.request<{ items: VaultDocument[] }>('/health/documents?limit=100'),
        this.request<{ items: RecordShare[] }>('/records/shares'),
      ]);
      if (this.disposed) return;
      runInAction(() => { this.documents = docs.items; this.shares = shares.items; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  /** Access ends only when the server says it has; until then the share stays listed as active. */
  async revoke(shareId: string): Promise<void> {
    if (this.revokingId) return;
    this.revokingId = shareId;
    this.error = null;
    try {
      await this.request(`/records/shares/${encodeURIComponent(shareId)}/revoke`, { method: 'POST' });
      runInAction(() => {
        this.shares = (this.shares ?? []).map((share) => (share.id === shareId ? { ...share, revoked: true, active: false } : share));
        this.revokingId = null;
      });
    } catch {
      runInAction(() => {
        this.error = 'Access wasn’t withdrawn. The clinician can still see this record — try again.';
        this.revokingId = null;
      });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.documents = null;
    this.shares = null;
    this.loadFailed = false;
    this.error = null;
    this.revokingId = null;
  }
}
