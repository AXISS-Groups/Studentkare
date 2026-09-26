import { makeAutoObservable } from 'mobx';
import { initialClinicianPatients } from '@/data/mockData';
import { isDev } from '@/core/env';
import type { ClinicianPatient } from '@/types';

/**
 * Domain store for the clinician console (patient list + EMR timeline).
 *
 * The console has no patient endpoint behind it yet. It used to open on
 * `initialClinicianPatients` unconditionally, so a clinician signing in to a
 * production build was shown a fabricated patient — a name, a blood group,
 * vitals, lab values, current medications and drug interactions — with nothing
 * marking any of it as invented. DESIGN.md section 6: no invented numbers, no
 * demo content in production builds.
 *
 * Outside development the list therefore starts empty, and `isSample` tells
 * the view which of the two it is looking at.
 */
export class ClinicianStore {
  clinicianPatients: ClinicianPatient[] = isDev() ? initialClinicianPatients : [];
  // Derived from the list actually loaded, not from the sample — otherwise a
  // production build carries a selection pointing at a patient it does not have.
  selectedPatientId: string = (isDev() ? initialClinicianPatients[0]?.id : undefined) ?? '';
  /** True while the list is the built-in sample rather than real records. */
  isSample: boolean = isDev();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setSelectedPatientId(id: string): void {
    this.selectedPatientId = id;
  }

  setClinicianPatients(patients: ClinicianPatient[]): void {
    // Real records arriving means this is no longer the sample.
    this.clinicianPatients = patients;
    this.isSample = false;
    if (!patients.some((patient) => patient.id === this.selectedPatientId)) {
      this.selectedPatientId = patients[0]?.id ?? '';
    }
  }

  addClinicianNote(patientId: string, noteTitle: string, noteText: string): void {
    this.clinicianPatients = this.clinicianPatients.map((patient) => {
      if (patient.id !== patientId) return patient;
      const newEntry = {
        date: new Date().toISOString().split('T')[0],
        type: 'EMR_NOTE',
        title: noteTitle,
        notes: noteText,
      };
      return { ...patient, timeline: [newEntry, ...patient.timeline] };
    });
  }
}
