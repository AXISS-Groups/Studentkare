import { apiRequest } from '@/data/http';
import type { HealthRecord } from '../domain/Vault';

interface DocumentRow {
  id: string;
  title: string;
  category: string;
  createdAt: number;
}

const CATEGORY: Record<string, HealthRecord['category']> = {
  LAB: 'LAB',
  PRESCRIPTION: 'PRESCRIPTION',
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  VACCINE: 'VACCINATION',
  CAMP_REPORT: 'CAMP_REPORT',
};

/** An uploaded document as a vault record. Nothing is inferred: no facility, doctor or values. */
function toHealthRecord(row: DocumentRow): HealthRecord {
  return {
    id: row.id,
    title: row.title,
    category: CATEGORY[row.category] ?? 'OTHER',
    date: new Date(row.createdAt * 1000).toISOString().slice(0, 10),
    facilityName: '',
    doctorName: '',
    sourceType: 'MANUAL',
    observations: [],
    confidenceGatePassed: false,
    humanReviewRequired: false,
    isCachedOffline: false,
    syncStatus: 'SYNCED',
  };
}

export class VaultRepository {
  /**
   * The student's own records, from GET /health/documents (the same source as
   * the web vault). There is no /vault/records route; this used to fall back
   * to two invented records — a CBC with platelet and haemoglobin values and a
   * prescription — shown as the student's own. A failure now reaches the
   * store as an error, never as made-up clinical data.
   */
  async fetchHealthRecords(): Promise<HealthRecord[]> {
    const res = await apiRequest<{ items: DocumentRow[] }>('/health/documents?limit=100');
    return res.items.map(toHealthRecord);
  }

  /** A consent decision must reach the server; a failure is thrown, never swallowed. */
  async updateConsentStatus(requestId: string, status: 'GRANTED' | 'DENIED'): Promise<void> {
    await apiRequest(`/vault/consent/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const vaultRepository = new VaultRepository();
