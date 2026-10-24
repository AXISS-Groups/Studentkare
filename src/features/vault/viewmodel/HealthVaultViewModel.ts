import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** GET /api/health/documents, items[] (filename and mimeType since the one vault view). */
export interface VaultDocument {
  id: string;
  title: string;
  category: string;
  createdAt: number;
  filename?: string;
  mimeType?: string;
}

/** GET /api/records/shares, items[]: who can see which record, until when. */
export interface RecordShare {
  id: string;
  clinician: string;
  document: string;
  /** The document shared (WP-09); the one vault view groups shares by it. */
  documentId?: string;
  grantedAt: number;
  expiresAt: number;
  revoked: boolean;
  active: boolean;
}

/** The categories POST /health/documents accepts, in the canvas's chip order. */
export const VAULT_CATEGORIES = ['LAB', 'PRESCRIPTION', 'VACCINE', 'CAMP_REPORT', 'DISCHARGE_SUMMARY', 'OTHER'] as const;
export type VaultCategory = (typeof VAULT_CATEGORIES)[number];
export const vaultKindOf = (category: string): VaultCategory => ((VAULT_CATEGORIES as readonly string[]).includes(category) ? category as VaultCategory : 'OTHER');

/** POST /records/shares accepts 1–90 days (ShareInput); the form says so before the server does. */
export const SHARE_DAYS = { min: 1, max: 90, initial: 7 } as const;
/** One page of the vault: the server caps a page at 100 documents. */
export const VAULT_PAGE = 100;

/** Why a revoke did not fully happen: the clinicians the server still lists for the document. */
export interface RevokeOutcome { documentId: string; stillShared: string[] }

/**
 * Health vault, one view-model for the web (phone and desktop) and the Expo
 * app (Tier 1 parity plan 2026-10-24 §6): the student's own documents and the
 * shares they have granted, each of which can be revoked (DESIGN.md §2.6), on
 * the endpoints the web vault always used. Nothing here reads anyone else's
 * documents: the server scopes every call to the signed-in student.
 *
 * Access ends only when the server says it has: a share stays listed as active
 * until a revoke succeeds, and after any revoke the shares are read back from
 * the server, never flipped locally.
 */
export class HealthVaultViewModel implements ViewModel {
  documents: VaultDocument[] | null = null;
  /** How many documents the student has (the page shows the newest `VAULT_PAGE`). */
  total = 0;
  shares: RecordShare[] | null = null;
  loadFailed = false;
  revokingId: string | null = null;
  /** A document whose shares are being revoked. */
  revokingDocumentId: string | null = null;
  /** Which clinicians the server still lists after a document revoke that did not fully succeed. */
  revokeOutcome: RevokeOutcome | null = null;
  error: string | null = null;
  sharing = false;
  /** The server's reason a share was refused, verbatim (it says what to fix); null after success. */
  shareError: string | null = null;
  exporting = false;
  exportFailed = false;
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

  /** Active shares of one document. */
  activeSharesOf(documentId: string): RecordShare[] {
    return this.activeShares.filter((share) => share.documentId === documentId);
  }

  /** Documents per category, from the server's list only (never invented). */
  get categoryCounts(): Map<VaultCategory, number> {
    const out = new Map<VaultCategory, number>();
    for (const doc of this.documents ?? []) out.set(vaultKindOf(doc.category), (out.get(vaultKindOf(doc.category)) ?? 0) + 1);
    return out;
  }

  /** How many documents are shared right now. */
  get sharedNow(): number {
    const ids = new Set(this.activeShares.map((share) => share.documentId));
    return (this.documents ?? []).filter((doc) => ids.has(doc.id)).length;
  }

  /** The newest document's time, or null. */
  get lastAdded(): number | null {
    return (this.documents ?? []).reduce<number | null>((max, doc) => (max === null || doc.createdAt > max ? doc.createdAt : max), null);
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const [docs, shares] = await Promise.all([
        this.request<{ items: VaultDocument[]; total?: number }>(`/health/documents?limit=${VAULT_PAGE}`),
        this.request<{ items: RecordShare[] }>('/records/shares'),
      ]);
      if (this.disposed) return;
      runInAction(() => { this.documents = docs.items; this.total = docs.total ?? docs.items.length; this.shares = shares.items; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  /** Reads the shares back from the server (after a revoke or a share). */
  async reloadShares(): Promise<void> {
    try {
      const shares = await this.request<{ items: RecordShare[] }>('/records/shares');
      if (!this.disposed) runInAction(() => { this.shares = shares.items; });
    } catch {
      // The last list stays; the next load replaces it.
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

  /**
   * Stops every active share of one document, one revoke call each. A call
   * that fails does not stop the rest; afterwards the shares are read back
   * from the server and `revokeOutcome` names whoever the server still lists,
   * so nothing is shown as revoked that the server still has.
   */
  async revokeDocument(documentId: string): Promise<boolean> {
    if (this.revokingDocumentId) return false;
    const targets = this.activeSharesOf(documentId);
    this.revokingDocumentId = documentId;
    this.revokeOutcome = null;
    for (const share of targets) {
      try {
        await this.request(`/records/shares/${encodeURIComponent(share.id)}/revoke`, { method: 'POST' });
      } catch {
        // Reported below from what the server still lists.
      }
    }
    await this.reloadShares();
    if (this.disposed) return false;
    const stillShared = this.activeSharesOf(documentId).map((share) => share.clinician);
    runInAction(() => {
      this.revokingDocumentId = null;
      this.revokeOutcome = stillShared.length ? { documentId, stillShared } : null;
    });
    return stillShared.length === 0;
  }

  clearRevokeOutcome(): void {
    this.revokeOutcome = null;
  }

  /** Shares one document with one clinician for 1–90 days; refused here before the server sees a bad value. */
  async share(documentId: string, clinicianEmail: string, days: number): Promise<boolean> {
    if (this.sharing) return false;
    if (!Number.isInteger(days) || days < SHARE_DAYS.min || days > SHARE_DAYS.max) return false;
    this.sharing = true;
    this.shareError = null;
    try {
      await this.request('/records/shares', { method: 'POST', body: JSON.stringify({ documentId, clinicianEmail: clinicianEmail.trim(), expiresInDays: days }) });
      await this.reloadShares();
      if (!this.disposed) runInAction(() => { this.sharing = false; });
      return true;
    } catch (reason) {
      if (!this.disposed) runInAction(() => { this.shareError = reason instanceof Error && reason.message ? reason.message : ''; this.sharing = false; });
      return false;
    }
  }

  /** GET /records/export: everything the student owns, for the caller to save as a file. */
  async exportAll(): Promise<unknown | null> {
    if (this.exporting) return null;
    this.exporting = true;
    this.exportFailed = false;
    try {
      const data = await this.request<unknown>('/records/export');
      if (!this.disposed) runInAction(() => { this.exporting = false; });
      return data;
    } catch {
      if (!this.disposed) runInAction(() => { this.exporting = false; this.exportFailed = true; });
      return null;
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.documents = null;
    this.total = 0;
    this.shares = null;
    this.loadFailed = false;
    this.error = null;
    this.revokingId = null;
    this.revokingDocumentId = null;
    this.revokeOutcome = null;
    this.sharing = false;
    this.shareError = null;
    this.exporting = false;
    this.exportFailed = false;
  }
}
