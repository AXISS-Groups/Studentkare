/**
 * M14 Lifeshare Domain Model.
 * Pure TypeScript entity, type definitions, and invariants.
 * No react, no fetch, no platform imports.
 */

export interface DonorProfile {
  id: string;
  name: string;
  bloodGroup: string;
  campusYear: string;
  lastDonatedDaysAgo: number;
  totalDonations: number;
  verified: boolean;
}

export interface BloodTransferRequest {
  id: string;
  bloodGroup: string;
  unitsNeeded: number;
  hospitalStation: string;
  urgency: 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'MATCHED' | 'FULFILLED';
  requesterName: string;
  timestamp: number;
}

export function filterCompatibleDonors(donors: DonorProfile[], bloodGroup: string): DonorProfile[] {
  return donors.filter(d => d.bloodGroup === bloodGroup);
}

export function validateBloodUnits(units: number): number {
  return Math.max(1, Math.min(10, units));
}
