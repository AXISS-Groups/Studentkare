/**
 * M18 Clinician Domain Model.
 *
 * Rule 5 / R8 Compliance:
 * Clinician-facing prediction & risk stratification runs on its own service and Postgres role.
 * Predictions or risk scores MUST NEVER reach student-facing views or shared sessions.
 */

export interface ClinicalSignoff {
  id: string;
  patientId: string;
  clinicianId: string;
  clinicianLicenseNumber: string;
  notes: string;
  signedAt: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}

export interface InternalRiskStratification {
  id: string;
  patientId: string;
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  score: number;
  evaluatedAt: string;
  /** Internal field — strictly restricted to M18 clinician service boundary */
  isClinicianOnly: true;
}

export function isClinicianOnlyField(field: keyof InternalRiskStratification): boolean {
  return field === 'isClinicianOnly' || field === 'score' || field === 'riskCategory';
}
