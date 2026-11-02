/**
 * LifeShare — types and the blood compatibility rules.
 *
 * This file used to ship five named real hospitals (Yashoda Somajiguda, Apollo
 * Jubilee Hills, Kamineni L.B. Nagar, NIMS, the IIT Hyderabad health centre)
 * with invented ICU bed counts, ventilator counts, oxygen reserve hours, blood
 * unit stock, `isVerifiedNABH: true` and a star rating, plus two in-flight
 * transfer requests. No service anywhere in this repo reports hospital
 * availability, so none of it could ever have been true.
 *
 * Presenting it on a public route is the most dangerous thing this codebase
 * did: someone deciding where to take a bleeding friend could read "O+: 22" and
 * "ICU Beds: 8 / 45" against a real hospital's name and act on it.
 *
 * What remains is the part that is genuinely true. The compatibility map is
 * settled transfusion medicine for red cells, not data about anybody, so it
 * needs no backend to be correct.
 */

export interface BloodUnitStock {
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  unitsAvailable: number;
  lastUpdated: string;
  status: 'OPTIMAL' | 'LOW' | 'CRITICAL_SHORTAGE';
}

export interface HospitalResourceNode {
  id: string;
  name: string;
  pincode: string;
  city: string;
  district: string;
  phone: string;
  emergencyHelpline: string;
  distanceKm: number;
  isVerifiedNABH: boolean;
  synergyRating: number; // 0 - 5 stars
  availableIcuBeds: number;
  totalIcuBeds: number;
  availableVentilators: number;
  oxygenStockHours: number;
  bloodUnits: Record<string, number>;
}

export interface LifeShareTransferRequest {
  id: string;
  requestingHospital: string;
  targetHospital: string;
  resourceType: 'BLOOD_UNIT' | 'VENTILATOR' | 'ICU_BED' | 'ORGAN_HEART' | 'ORGAN_KIDNEY';
  details: string;
  urgency: 'HIGH' | 'CRITICAL' | 'LIFE_THREATENING';
  status: 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'DELIVERED';
  timestamp: string;
}

// Deterministic Blood Compatibility Rules (Who can receive from whom)
export const BLOOD_COMPATIBILITY_MAP: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal donor
};

export function getCompatibleDonorTypes(recipientType: string): string[] {
  return BLOOD_COMPATIBILITY_MAP[recipientType.toUpperCase()] || [recipientType.toUpperCase()];
}

