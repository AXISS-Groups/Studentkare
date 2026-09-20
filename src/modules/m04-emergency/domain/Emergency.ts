/**
 * M04 Emergency Domain Model.
 * Pure TypeScript entity, type definitions, and invariants.
 * Data Class: clinical. No react, no fetch, no platform imports.
 */

export type EmergencyStatus = 'IDLE' | 'COUNTDOWN' | 'DISPATCHED' | 'CANCELLED';

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  notified: boolean;
}

export interface AmbulanceDispatchInfo {
  unitId: string;
  driverName: string;
  driverPhone: string;
  etaMinutes: number;
  currentLocation: string;
}

export function isEmergencyActive(status: EmergencyStatus): boolean {
  return status === 'COUNTDOWN' || status === 'DISPATCHED';
}
