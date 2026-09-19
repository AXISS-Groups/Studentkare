/**
 * StudentKare — Campus Medical Incident & MEO Outbreak Data (M27)
 * Integration: Medical Adaptation of KisaanSaathi Architecture
 */

export type MedicalSeverity = 'CRITICAL_1' | 'URGENT_2' | 'MODERATE_3' | 'ROUTINE_4';
export type IncidentCategory =
  | 'FOOD_POISONING'
  | 'INJURY_ACCIDENT'
  | 'ALLERGIC_REACTION'
  | 'HIGH_FEVER'
  | 'RESPIRATORY_DISTRESS'
  | 'MENTAL_HEALTH_DISTRESS';

export type IncidentStatus = 'REPORTED' | 'TRIAGED_BY_DOCTOR' | 'AMBULANCE_DISPATCHED' | 'RESOLVED';

export interface MedicalIncident {
  id: string;
  studentId: string;
  studentName: string;
  bloodGroup: string;
  allergies: string[];
  category: IncidentCategory;
  severity: MedicalSeverity;
  title: string;
  description: string;
  hostelBlock: string;
  roomNumber: string;
  pincode: string;
  status: IncidentStatus;
  assignedOfficerName?: string;
  medicalAdvisory?: string;
  timestamp: string;
}

export interface MeoOfficer {
  id: string;
  name: string;
  role: 'CHIEF_MEDICAL_OFFICER' | 'SENIOR_PHYSICIAN' | 'PARAMEDIC' | 'CAMPUS_NURSE';
  phone: string;
  status: 'AVAILABLE' | 'ON_DISPATCH' | 'OFF_DUTY';
  assignedIncidentsCount: number;
}

export interface CampusOutbreakAlert {
  id: string;
  category: IncidentCategory;
  location: string;
  affectedCount: number;
  alertLevel: 'WARNING' | 'CRITICAL_OUTBREAK';
  summary: string;
  timestamp: string;
}

export const FIRST_AID_PROTOCOLS: Record<IncidentCategory, string> = {
  FOOD_POISONING:
    'Sip Oral Rehydration Salts (ORS) slowly. Avoid solid foods. Sit upright. The Chief Medical Officer and Campus Nurse have been notified for fluid monitoring.',
  INJURY_ACCIDENT:
    'Apply clean cloth pressure to bleeding. Keep injured limb elevated and immobilized. Do not move if neck/back injury is suspected. Ambulance dispatched.',
  ALLERGIC_REACTION:
    'Sit comfortably. Loosen tight clothing. Check if EpiPen / antihistamine is available in Hostel Emergency Kit. Medical Officer notified.',
  HIGH_FEVER:
    'Apply cool damp cloth to forehead. Stay hydrated with water. Rest in a well-ventilated room. Temperature monitoring requested.',
  RESPIRATORY_DISTRESS:
    'Sit upright in a leaning-forward position. Take slow deep breaths. If asthmatic, use inhaler (2 puffs). Emergency ALS Ambulance en route.',
  MENTAL_HEALTH_DISTRESS:
    'You are not alone. Take slow 4-7-8 deep breaths. Campus confidential counsellor & 24x7 Tele-MANAS hotline (+91 14416) are connected.',
};

export const INITIAL_MEDICAL_INCIDENTS: MedicalIncident[] = [
  {
    id: 'INC-MED-801',
    studentId: 'STU-2026-8819',
    studentName: 'Aarav Sharma',
    bloodGroup: 'O+',
    allergies: ['Sulfa'],
    category: 'FOOD_POISONING',
    severity: 'URGENT_2',
    title: 'Acute Vomiting & Abdominal Cramps after Lunch',
    description: 'Multiple students experiencing nausea and abdominal distress after eating at Hostel Block 4 Mess.',
    hostelBlock: 'Hostel Block 4',
    roomNumber: 'B-214',
    pincode: '502285',
    status: 'TRIAGED_BY_DOCTOR',
    assignedOfficerName: 'Nurse Priya (Campus Clinic)',
    medicalAdvisory: 'Administer ORS 500ml + Domperidone 10mg. Monitor vitals every 30 mins.',
    timestamp: '15 mins ago',
  },
  {
    id: 'INC-MED-802',
    studentId: 'STU-2026-4412',
    studentName: 'Ananya Reddy',
    bloodGroup: 'A+',
    allergies: ['Penicillin'],
    category: 'INJURY_ACCIDENT',
    severity: 'CRITICAL_1',
    title: 'Right Ankle Sprain & Contusion at Sports Complex',
    description: 'Incurred deep contusion and ligament sprain during basketball match. Unable to bear weight.',
    hostelBlock: 'Indoor Sports Complex',
    roomNumber: 'Court 2',
    pincode: '502285',
    status: 'AMBULANCE_DISPATCHED',
    assignedOfficerName: 'Dr. Sharma (Chief Medical Officer)',
    medicalAdvisory: 'Ice pack RICE protocol applied. Campus ALS Ambulance en route for X-ray transport.',
    timestamp: '28 mins ago',
  },
];

export const INITIAL_MEO_OFFICERS: MeoOfficer[] = [
  {
    id: 'MEO-01',
    name: 'Dr. Sharma',
    role: 'CHIEF_MEDICAL_OFFICER',
    phone: '+91 8455 235555',
    status: 'AVAILABLE',
    assignedIncidentsCount: 1,
  },
  {
    id: 'MEO-02',
    name: 'Dr. Kavitha',
    role: 'SENIOR_PHYSICIAN',
    phone: '+91 8455 235556',
    status: 'AVAILABLE',
    assignedIncidentsCount: 0,
  },
  {
    id: 'MEO-03',
    name: 'Nurse Priya',
    role: 'CAMPUS_NURSE',
    phone: '+91 8455 235558',
    status: 'ON_DISPATCH',
    assignedIncidentsCount: 2,
  },
];

export const INITIAL_OUTBREAK_ALERTS: CampusOutbreakAlert[] = [
  {
    id: 'OUTBREAK-101',
    category: 'FOOD_POISONING',
    location: 'Hostel Block 4 Mess',
    affectedCount: 4,
    alertLevel: 'CRITICAL_OUTBREAK',
    summary: '4 students reported acute gastroenteritis within 2 hours. Food safety inspection triggered.',
    timestamp: '30 mins ago',
  },
];
