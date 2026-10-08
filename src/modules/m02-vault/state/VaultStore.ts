import { makeAutoObservable, runInAction } from 'mobx';
import type { HealthRecord, AbdmConsentRequest } from '../domain/Vault';
import { vaultRepository } from '../data/VaultRepository';

export type VaultStoreStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'syncing' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export class VaultStore {
  // No ABHA address, ABHA number, "linked with ABDM" flag or ABDM sync lives
  // here: there is no ABDM/ABHA integration, so any value would be invented
  // (guardrail 6).
  syncMessage = '';

  /**
   * Requests to access this student's records. Empty: no backend serves them
   * yet. It used to hold two hardcoded requests (a campus clinic and a lab)
   * whose Grant/Deny buttons reached no server.
   */
  consentRequests: AbdmConsentRequest[] = [];

  storedRecords: HealthRecord[] = [];
  status: VaultStoreStatus = { kind: 'idle' };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    void this.fetchRecords();
  }

  get isSyncing(): boolean {
    return this.status.kind === 'syncing';
  }

  get isLoading(): boolean {
    return this.status.kind === 'loading';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  async fetchRecords(): Promise<void> {
    this.status = { kind: 'loading' };
    try {
      const records = await vaultRepository.fetchHealthRecords();
      runInAction(() => {
        this.storedRecords = records;
        this.status = { kind: 'success' };
      });
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Failed to fetch vault records.';
        this.status = { kind: 'error', message };
      });
    }
  }

  grantConsent(requestId: string): void {
    void this.decideConsent(requestId, 'GRANTED');
  }

  denyConsent(requestId: string): void {
    void this.decideConsent(requestId, 'DENIED');
  }

  /** A consent decision shows only once the server has recorded it. */
  async decideConsent(requestId: string, decision: 'GRANTED' | 'DENIED'): Promise<void> {
    const req = this.consentRequests.find(r => r.id === requestId);
    if (!req) return;
    try {
      await vaultRepository.updateConsentStatus(requestId, decision);
      runInAction(() => { req.status = decision; });
    } catch {
      runInAction(() => {
        this.status = { kind: 'error', message: "Your decision wasn't saved. Nothing changed — try again." };
      });
    }
  }

  reset(): void {
    this.syncMessage = '';
    this.status = { kind: 'idle' };
  }
}

export const vaultStore = new VaultStore();
