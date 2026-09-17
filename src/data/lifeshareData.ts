/**
 * StudentKare — LifeShare Emergency Hospital & Blood Bank Network Dataset (M26)
 * Integration: Rakeshmanpoor22/lifeshare-2 Connected Hospital Resource Network
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

export const INITIAL_HOSPITAL_NODES: HospitalResourceNode[] = [
  {
    id: 'HOSP-HYD-001',
    name: 'Yashoda Hospital — Somajiguda',
    pincode: '500082',
    city: 'Hyderabad',
    district: 'Hyderabad',
    phone: '+91 40 4567 4567',
    emergencyHelpline: '105710',
    distanceKm: 3.2,
    isVerifiedNABH: true,
    synergyRating: 4.9,
    availableIcuBeds: 8,
    totalIcuBeds: 45,
    availableVentilators: 4,
    oxygenStockHours: 72,
    bloodUnits: { 'A+': 14, 'A-': 3, 'B+': 18, 'B-': 2, 'AB+': 8, 'AB-': 1, 'O+': 22, 'O-': 5 },
  },
  {
    id: 'HOSP-HYD-002',
    name: 'Apollo Hospitals — Jubilee Hills',
    pincode: '500033',
    city: 'Hyderabad',
    district: 'Hyderabad',
    phone: '+91 40 2360 7777',
    emergencyHelpline: '1066',
    distanceKm: 5.8,
    isVerifiedNABH: true,
    synergyRating: 4.95,
    availableIcuBeds: 12,
    totalIcuBeds: 60,
    availableVentilators: 6,
    oxygenStockHours: 96,
    bloodUnits: { 'A+': 20, 'A-': 4, 'B+': 25, 'B-': 5, 'AB+': 12, 'AB-': 2, 'O+': 30, 'O-': 7 },
  },
  {
    id: 'HOSP-HYD-003',
    name: 'Kamineni Hospital — L.B. Nagar',
    pincode: '500068',
    city: 'Hyderabad',
    district: 'Ranga Reddy',
    phone: '+91 40 3987 9999',
    emergencyHelpline: '+91 40 2405 5555',
    distanceKm: 12.4,
    isVerifiedNABH: true,
    synergyRating: 4.7,
    availableIcuBeds: 5,
    totalIcuBeds: 30,
    availableVentilators: 3,
    oxygenStockHours: 48,
    bloodUnits: { 'A+': 9, 'A-': 1, 'B+': 11, 'B-': 1, 'AB+': 4, 'AB-': 0, 'O+': 15, 'O-': 2 },
  },
  {
    id: 'HOSP-MED-004',
    name: 'IIT Hyderabad Health Centre & Emergency Ward',
    pincode: '502285',
    city: 'Sangareddy',
    district: 'Sangareddy',
    phone: '+91 8455 235555',
    emergencyHelpline: '+91 8455 235000',
    distanceKm: 1.1,
    isVerifiedNABH: true,
    synergyRating: 4.85,
    availableIcuBeds: 3,
    totalIcuBeds: 10,
    availableVentilators: 2,
    oxygenStockHours: 60,
    bloodUnits: { 'A+': 6, 'A-': 2, 'B+': 8, 'B-': 2, 'AB+': 3, 'AB-': 1, 'O+': 10, 'O-': 3 },
  },
  {
    id: 'HOSP-HYD-005',
    name: 'NIMS (Nizam\'s Institute of Medical Sciences)',
    pincode: '500082',
    city: 'Hyderabad',
    district: 'Hyderabad',
    phone: '+91 40 2339 6552',
    emergencyHelpline: '108',
    distanceKm: 3.9,
    isVerifiedNABH: true,
    synergyRating: 4.8,
    availableIcuBeds: 15,
    totalIcuBeds: 120,
    availableVentilators: 8,
    oxygenStockHours: 120,
    bloodUnits: { 'A+': 35, 'A-': 8, 'B+': 40, 'B-': 6, 'AB+': 15, 'AB-': 3, 'O+': 50, 'O-': 12 },
  },
];

export const INITIAL_TRANSFER_REQUESTS: LifeShareTransferRequest[] = [
  {
    id: 'REQ-LS-901',
    requestingHospital: 'IIT Hyderabad Health Centre',
    targetHospital: 'Yashoda Hospital — Somajiguda',
    resourceType: 'BLOOD_UNIT',
    details: '2 Units O- Negative Red Blood Cells for acute emergency trauma',
    urgency: 'LIFE_THREATENING',
    status: 'DISPATCHED',
    timestamp: '10 minutes ago',
  },
  {
    id: 'REQ-LS-902',
    requestingHospital: 'Kamineni Hospital — L.B. Nagar',
    targetHospital: 'Apollo Hospitals — Jubilee Hills',
    resourceType: 'VENTILATOR',
    details: '1 Portable ICU Ventilator unit for pediatric transport',
    urgency: 'HIGH',
    status: 'APPROVED',
    timestamp: '25 minutes ago',
  },
];
