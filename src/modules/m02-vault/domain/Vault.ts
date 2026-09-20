/**
 * M02 Vault Domain Model.
 * Pure TypeScript entity, FHIR R4 type definitions, and invariants.
 * Data Class: clinical. No react, no fetch, no platform imports. No `any` type escapes.
 */

export interface ObservationItem {
  id: string;
  code: string;
  display: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  confidenceScore: number;
}

export interface HealthRecord {
  id: string;
  title: string;
  category: 'LAB' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'VACCINATION';
  date: string;
  facilityName: string;
  doctorName: string;
  sourceType: 'ABDM_PULL' | 'SCAN' | 'MANUAL';
  observations: ObservationItem[];
  confidenceGatePassed: boolean;
  humanReviewRequired: boolean;
  isCachedOffline: boolean;
  syncStatus: 'SYNCED' | 'PENDING' | 'ERROR';
  lastSyncedTimestamp?: number;
}

export interface AbdmConsentRequest {
  id: string;
  title: string;
  requesterName: string;
  purpose: string;
  expiryDate: string;
  dataTypes: string[];
  status: 'PENDING' | 'GRANTED' | 'DENIED';
}

export function isRecordStale(record: HealthRecord, maxAgeMs: number = 86400000): boolean {
  if (!record.lastSyncedTimestamp) return false;
  return Date.now() - record.lastSyncedTimestamp > maxAgeMs;
}

export function getAbnormalObservations(record: HealthRecord): ObservationItem[] {
  return record.observations.filter(obs => obs.isAbnormal);
}
