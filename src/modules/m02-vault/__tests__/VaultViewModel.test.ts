import { describe, it, expect, beforeEach } from 'vitest';
import { vaultStore } from '../state/VaultStore';
import { isRecordStale, getAbnormalObservations } from '../domain/Vault';
import type { HealthRecord } from '../domain/Vault';

describe('M02 Vault Characterisation Tests & Domain Invariants', () => {
  beforeEach(() => {
    vaultStore.reset();
  });

  it('initializes with default ABHA details and consent requests', () => {
    expect(vaultStore.abhaAddress).toBe('aarav.sharma@abdm');
    expect(vaultStore.abhaNumber).toBe('91-8829-1029-4401');
    expect(vaultStore.isLinkedWithAbdm).toBe(true);
    expect(vaultStore.consentRequests.length).toBeGreaterThan(0);
  });

  it('grants and denies consent requests correctly', () => {
    const pendingReq = vaultStore.consentRequests.find(r => r.status === 'PENDING');
    expect(pendingReq).toBeDefined();

    if (pendingReq) {
      vaultStore.grantConsent(pendingReq.id);
      expect(pendingReq.status).toBe('GRANTED');

      vaultStore.denyConsent(pendingReq.id);
      expect(pendingReq.status).toBe('DENIED');
    }
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
