import { makeAutoObservable } from 'mobx';
import {
  MedicalIncident,
  MeoOfficer,
  CampusOutbreakAlert,
  INITIAL_MEDICAL_INCIDENTS,
  INITIAL_MEO_OFFICERS,
  INITIAL_OUTBREAK_ALERTS,
} from '../../../data/medicalIncidentData';

export class MedicalIncidentStore {
  incidents: MedicalIncident[] = INITIAL_MEDICAL_INCIDENTS;
  meoOfficers: MeoOfficer[] = INITIAL_MEO_OFFICERS;
  outbreakAlerts: CampusOutbreakAlert[] = INITIAL_OUTBREAK_ALERTS;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setIncidents(incidents: MedicalIncident[]): void {
    this.incidents = incidents;
  }

  reportIncident(
    payload: Omit<MedicalIncident, 'id' | 'status' | 'timestamp'>
  ): MedicalIncident {
    const newIncident: MedicalIncident = {
      id: `INC-MED-${Math.floor(800 + Math.random() * 100)}`,
      status: 'REPORTED',
      timestamp: 'Just now',
      ...payload,
    };

    this.incidents = [newIncident, ...this.incidents];
    this.detectOutbreaks();
    return newIncident;
  }

  triageIncident(
    incidentId: string,
    status: MedicalIncident['status'],
    assignedOfficerName?: string,
    medicalAdvisory?: string
  ): void {
    this.incidents = this.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      return {
        ...inc,
        status,
        assignedOfficerName: assignedOfficerName || inc.assignedOfficerName,
        medicalAdvisory: medicalAdvisory || inc.medicalAdvisory,
      };
    });
  }

  private detectOutbreaks(): void {
    // Automatically flag cluster if 3+ reports occur in same location
    const counts: Record<string, number> = {};
    for (const inc of this.incidents) {
      const key = `${inc.category}_${inc.hostelBlock}`;
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] >= 3) {
        const existing = this.outbreakAlerts.find((o) => o.location === inc.hostelBlock && o.category === inc.category);
        if (!existing) {
          const alert: CampusOutbreakAlert = {
            id: `OUTBREAK-${Math.floor(100 + Math.random() * 900)}`,
            category: inc.category,
            location: inc.hostelBlock,
            affectedCount: counts[key],
            alertLevel: 'CRITICAL_OUTBREAK',
            summary: `Automated Cluster Alert: ${counts[key]} ${inc.category.replace('_', ' ')} incidents reported in ${inc.hostelBlock}.`,
            timestamp: 'Just now',
          };
          this.outbreakAlerts = [alert, ...this.outbreakAlerts];
        }
      }
    }
  }
}
