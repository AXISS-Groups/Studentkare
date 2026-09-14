import { makeAutoObservable } from 'mobx';
import { initialClinicianPatients } from '@/data/mockData';
import type { ClinicianPatient } from '@/types';

/** Domain store for the clinician console (patient list + EMR timeline). */
export class ClinicianStore {
  clinicianPatients: ClinicianPatient[] = initialClinicianPatients;
  selectedPatientId: string = 'PAT-01';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setSelectedPatientId(id: string): void {
    this.selectedPatientId = id;
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
