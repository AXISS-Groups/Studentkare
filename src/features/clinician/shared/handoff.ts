/**
 * One-shot, in-memory hand-off between the doctor's clinical screens: "Sign &
 * prescribe" opens Prescribe on the same patient and note; the consult room
 * opens the note for its appointment. Held in memory only — never in browser
 * storage, never logged — and cleared the moment it is read.
 */
export interface ClinicalHandoff {
  patientId?: string;
  encounterId?: string;
  appointmentId?: string;
}

let pending: ClinicalHandoff | null = null;

export function handOff(value: ClinicalHandoff): void {
  pending = { ...value };
}

export function takeHandoff(): ClinicalHandoff | null {
  const value = pending;
  pending = null;
  return value;
}
