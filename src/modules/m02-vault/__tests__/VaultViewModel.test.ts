import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vaultRepository } from '../data/VaultRepository';
import { vaultStore } from '../state/VaultStore';
import { isRecordStale, getAbnormalObservations } from '../domain/Vault';
import type { HealthRecord } from '../domain/Vault';

describe('M02 Vault Characterisation Tests & Domain Invariants', () => {
  beforeEach(() => {
    vaultStore.reset();
  });

  it('holds no invented consent requests and claims no ABHA identity or ABDM link', () => {
    // Guardrail 6 and honest states: no request exists unless a server sent it.
    expect(vaultStore.consentRequests).toEqual([]);
    expect('abhaAddress' in vaultStore).toBe(false);
    expect('abhaNumber' in vaultStore).toBe(false);
    expect('isLinkedWithAbdm' in vaultStore).toBe(false);
    expect('syncAbdmRecords' in vaultStore).toBe(false);
  });

  it('shows a consent decision only after the server records it', async () => {
    const req = { id: 'cr-1', title: 'T', requesterName: 'R', purpose: 'P', expiryDate: '2027-01-01', dataTypes: [], status: 'PENDING' as const };
    vaultStore.consentRequests = [req];
    const update = vi.spyOn(vaultRepository, 'updateConsentStatus');

    update.mockRejectedValueOnce(new Error('offline'));
    await vaultStore.decideConsent('cr-1', 'GRANTED');
    expect(vaultStore.consentRequests[0].status).toBe('PENDING');
    expect(vaultStore.errorMessage).toMatch(/wasn't saved/);

    update.mockResolvedValueOnce(undefined);
    await vaultStore.decideConsent('cr-1', 'GRANTED');
    expect(vaultStore.consentRequests[0].status).toBe('GRANTED');
    vaultStore.consentRequests = [];
  });

  it('never invents records when they cannot be loaded', async () => {
    vi.spyOn(vaultRepository, 'fetchHealthRecords').mockRejectedValueOnce(new Error('offline'));
    await vaultStore.fetchRecords();
    expect(vaultStore.storedRecords).toEqual([]);
    expect(vaultStore.errorMessage).not.toBeNull();
  });

  it('correctly calculates stale records and abnormal observations', () => {
    const mockRecord: HealthRecord = {
      id: 'r-1',
      title: 'Lab Report',
      category: 'LAB',
      date: '2026-09-20',
      facilityName: 'Test Lab',
      doctorName: 'Dr. Test',
      sourceType: 'ABDM_PULL',
      observations: [
        { id: 'o-1', code: '123', display: 'WBC', value: 15000, unit: '/µL', isAbnormal: true, confidenceScore: 99 },
        { id: 'o-2', code: '456', display: 'RBC', value: 4.5, unit: 'm/µL', isAbnormal: false, confidenceScore: 99 },
      ],
      confidenceGatePassed: true,
      humanReviewRequired: false,
      isCachedOffline: true,
      syncStatus: 'SYNCED',
      lastSyncedTimestamp: Date.now() - (100 * 3600 * 1000), // 100 hours ago
    };

    expect(isRecordStale(mockRecord)).toBe(true);
    const abnormal = getAbnormalObservations(mockRecord);
    expect(abnormal.length).toBe(1);
    expect(abnormal[0].id).toBe('o-1');
  });
});
