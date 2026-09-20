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
  abhaAddress = 'aarav.sharma@abdm';
  abhaNumber = '91-8829-1029-4401';
  isLinkedWithAbdm = true;
  syncMessage = '';

  consentRequests: AbdmConsentRequest[] = [
    {
      id: 'cr-101',
      title: 'IIT Bombay Campus Health Center',
      requesterName: 'Dr. Ramesh Kumar (MO)',
      purpose: 'Annual Health Camp Passport Verification',
      expiryDate: '2026-12-31',
      dataTypes: ['Lab Records', 'Prescriptions'],
      status: 'GRANTED',
    },
    {
      id: 'cr-102',
      title: 'Metropolis Healthcare Diagnostics',
      requesterName: 'Metropolis Diagnostics Lab System',
      purpose: 'Diagnostic Lab Test Ingestion',
      expiryDate: '2026-10-15',
      dataTypes: ['Diagnostic Reports'],
      status: 'PENDING',
    },
  ];

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

  syncAbdmRecords(): void {
    this.status = { kind: 'syncing' };
    this.syncMessage = 'Connecting to ABDM Gateway & pulls FHIR bundles...';

    setTimeout(() => {
      runInAction(() => {
        this.status = { kind: 'success' };
        this.syncMessage = 'Vault successfully synced with ABDM Health Repository (2 new records found).';
      });
    }, 1200);
  }

  grantConsent(requestId: string): void {
    const req = this.consentRequests.find(r => r.id === requestId);
    if (req) {
      req.status = 'GRANTED';
      void vaultRepository.updateConsentStatus(requestId, 'GRANTED');
    }
  }

  denyConsent(requestId: string): void {
    const req = this.consentRequests.find(r => r.id === requestId);
    if (req) {
      req.status = 'DENIED';
      void vaultRepository.updateConsentStatus(requestId, 'DENIED');
    }
  }

  reset(): void {
    this.syncMessage = '';
    this.status = { kind: 'idle' };
  }
}

export const vaultStore = new VaultStore();
