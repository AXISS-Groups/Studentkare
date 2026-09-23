import { apiRequest } from '@/data/http';
import type { HealthRecord } from '../domain/Vault';

export interface AbdmSyncResult {
  records: HealthRecord[];
  newRecordCount: number;
}

export class VaultRepository {
  async fetchHealthRecords(): Promise<HealthRecord[]> {
    try {
      const res = await apiRequest<{ records: HealthRecord[] }>('/vault/records');
      return (res.records || []).map(r => ({ ...r, lastSyncedTimestamp: Date.now() }));
    } catch {
      // Mock fallback data
      return [
        {
          id: 'rec-01',
          title: 'Complete Blood Count (CBC) & Dengue NS1',
          category: 'LAB',
          date: '2026-09-10',
          facilityName: 'Metropolis Diagnostics',
          doctorName: 'Dr. S. Nair',
          sourceType: 'ABDM_PULL',
          observations: [
            { id: 'obs-1', code: '58410-2', display: 'Platelet Count', value: 210000, unit: '/µL', isAbnormal: false, confidenceScore: 98 },
            { id: 'obs-2', code: '718-7', display: 'Hemoglobin', value: 14.5, unit: 'g/dL', isAbnormal: false, confidenceScore: 99 },
          ],
          confidenceGatePassed: true,
          humanReviewRequired: false,
          isCachedOffline: true,
          syncStatus: 'SYNCED',
          lastSyncedTimestamp: Date.now() - 3600000,
        },
        {
          id: 'rec-02',
          title: 'Outpatient Consultation & Rx',
          category: 'PRESCRIPTION',
          date: '2026-08-28',
          facilityName: 'Campus Health Centre',
          doctorName: 'Dr. Radhika Sen',
          sourceType: 'SCAN',
          observations: [],
          confidenceGatePassed: true,
          humanReviewRequired: false,
          isCachedOffline: true,
          syncStatus: 'SYNCED',
          lastSyncedTimestamp: Date.now() - 7200000,
        },
      ];
    }
  }

  async syncAbdmRecords(): Promise<AbdmSyncResult> {
    try {
      const res = await apiRequest<AbdmSyncResult>('/vault/abdm-sync', { method: 'POST' });
      return res;
    } catch {
      return {
        records: await this.fetchHealthRecords(),
        newRecordCount: 2,
      };
    }
  }

  async updateConsentStatus(requestId: string, status: 'GRANTED' | 'DENIED'): Promise<void> {
    await apiRequest(`/vault/consent/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).catch(() => null);
  }
}

export const vaultRepository = new VaultRepository();
