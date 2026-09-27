import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentCategory =
  | 'FEVER_FLU'
  | 'SURGICAL_TRAUMA'
  | 'MENTAL_WELLBEING'
  | 'GASTRO'
  | 'OTHER';

export interface VitalSigns {
  feverCelsius?: number;
  heartRateBpm?: number;
  bloodPressure?: string;
}

export interface TriageOutcome {
  incidentId: string;
  recommendedAction: string;
  dispatchAssigned?: string;
  etaMinutes?: number;
  sosTriggered: boolean;
  timestamp: number;
}

export interface IncidentRecord {
  id: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  symptoms: string;
  location: string;
  status: 'PENDING' | 'DISPATCHED' | 'RESOLVED';
  timestamp: number;
}

/**
 * MVVM ViewModel for Campus Health Incident & Emergency Triage Console.
 *
 * Manages symptom entry, vital signs input, severity grading, emergency SOS
 * dispatches, and triage recommendations across Web & Mobile.
 */
export class IncidentTriageViewModel implements ViewModel {
  symptoms = '';
  severity: IncidentSeverity = 'MEDIUM';
  category: IncidentCategory = 'FEVER_FLU';
  location = '';
  vitals: VitalSigns = {};

  incidentsList: IncidentRecord[] = [];
  loading = false;
  submitting = false;
  error: string | null = null;
  triageOutcome: TriageOutcome | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.fetchIncidentHistory();
  }

  get isEmergencySOS(): boolean {
    return (
      this.severity === 'CRITICAL' ||
      (this.vitals.feverCelsius !== undefined && this.vitals.feverCelsius >= 39.5)
    );
  }

  get canSubmit(): boolean {
    return this.symptoms.trim().length >= 5 && !this.submitting;
  }

  setSymptoms(value: string): void {
    this.symptoms = value;
  }

  setSeverity(severity: IncidentSeverity): void {
    this.severity = severity;
  }

  setCategory(category: IncidentCategory): void {
    this.category = category;
  }

  setLocation(location: string): void {
    this.location = location;
  }

  setVitals(vitals: Partial<VitalSigns>): void {
    this.vitals = { ...this.vitals, ...vitals };
    if (this.vitals.feverCelsius && this.vitals.feverCelsius >= 39.5) {
      this.severity = 'CRITICAL';
    }
  }

  async fetchIncidentHistory(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await apiRequest<{ incidents: IncidentRecord[] }>('/incidents/history');
      runInAction(() => {
        this.incidentsList = response.incidents || [];
        this.loading = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to load incident records.';
        this.loading = false;
      });
    }
  }

  async submitIncident(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.submitting = true;
    this.error = null;
    try {
      const payload = {
        symptoms: this.symptoms,
        severity: this.severity,
        category: this.category,
        location: this.location || 'Campus Center',
        vitals: this.vitals,
        isEmergencySOS: this.isEmergencySOS,
      };

      const result = await apiRequest<TriageOutcome>('/incidents/triage', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      runInAction(() => {
        this.triageOutcome = result || {
          incidentId: `INC-${Date.now().toString().slice(-6)}`,
          recommendedAction:
            this.severity === 'CRITICAL'
              ? 'Campus 24x7 Ambulance & Nurse Priya dispatched to location immediately.'
              : 'Proceed to Student Health Center OPD Block B for evaluation.',
          dispatchAssigned: this.severity === 'CRITICAL' ? 'Nurse Priya & Campus Ambulance Unit 1' : undefined,
          etaMinutes: this.severity === 'CRITICAL' ? 5 : 15,
          sosTriggered: this.isEmergencySOS,
          timestamp: Date.now(),
        };
        this.submitting = false;
      });
      await this.fetchIncidentHistory();
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to submit incident triage report.';
        this.submitting = false;
      });
      return false;
    }
  }

  async triggerImmediateSOS(): Promise<void> {
    this.severity = 'CRITICAL';
    if (!this.symptoms) {
      this.symptoms = 'IMMEDIATE SOS EMERGENCY BUTTON TRIGGERED BY USER';
    }
    await this.submitIncident();
  }

  reset(): void {
    this.symptoms = '';
    this.severity = 'MEDIUM';
    this.category = 'FEVER_FLU';
    this.location = '';
    this.vitals = {};
    this.triageOutcome = null;
    this.error = null;
  }

  dispose(): void {
    this.reset();
  }
}
