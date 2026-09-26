/**
 * Campus medical incident types and first-aid text.
 *
 * Every first-aid protocol here used to end in a claim that somebody had been
 * told: "Ambulance dispatched.", "Emergency ALS Ambulance en route.", "Medical
 * Officer notified.", "The Chief Medical Officer and Campus Nurse have been
 * notified for fluid monitoring.", "Temperature monitoring requested.",
 * "...are connected."
 *
 * None of it happened. This text renders on MedicalIncidentScreen, whose store
 * appends to an in-memory array and calls no service — there is no incident
 * endpoint in the backend. A student with a suspected spinal injury read
 * "Ambulance dispatched." and had every reason to wait for it.
 *
 * The claims are gone. The first aid itself is unchanged apart from dropping an
 * inhaler dose we are in no position to specify: DESIGN.md section 5 makes this
 * Tier 1, so withdrawing a false statement is in scope here and rewriting
 * clinical guidance is not, pending the named review.
 *
 * The seeded incidents, officers and outbreak alert are also gone — two named
 * students with their blood group, allergies, hostel block and room number,
 * three named staff with phone numbers, and a "CRITICAL_OUTBREAK" affecting
 * four people. MeoDashboardScreen rendered all of it, and until this change
 * that screen was a public route.
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
    'Sip Oral Rehydration Salts (ORS) slowly. Avoid solid foods. Sit upright.',
  INJURY_ACCIDENT:
    'Apply clean cloth pressure to bleeding. Keep injured limb elevated and immobilized. Do not move if neck/back injury is suspected.',
  ALLERGIC_REACTION:
    'Sit comfortably. Loosen tight clothing. Check if an EpiPen or antihistamine is available in the hostel emergency kit.',
  HIGH_FEVER:
    'Apply cool damp cloth to forehead. Stay hydrated with water. Rest in a well-ventilated room.',
  RESPIRATORY_DISTRESS:
    'Sit upright in a leaning-forward position. Take slow deep breaths. If you have been prescribed an inhaler, use it as prescribed.',
  MENTAL_HEALTH_DISTRESS:
    'You are not alone. Take slow 4-7-8 deep breaths. Tele-MANAS, the national mental-health helpline, answers 24x7 on 14416.',
};
