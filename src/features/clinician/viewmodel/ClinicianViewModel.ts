import { makeAutoObservable, runInAction, reaction } from 'mobx';
import { evaluateClinicalPatientData } from '@/ai/clinicalAssistant';
import type { ClinicalEvaluationResult } from '@/ai/clinicalAssistant';
import { agentApi } from '@/data/api';
import type { ClinicianPatient } from '@/types';
import type { ClinicianStore } from '../store/ClinicianStore';

/**
 * MVVM ViewModel for the clinician EMR / diagnostic decision-support console.
 *
 * Wraps the ClinicianStore (patient list + selected patient + timeline), owns
 * the CDSS evaluation (sync then agent-enriched), and the SOAP note form state.
 */
export class ClinicianViewModel {
  soapNote = '';
  soapTitle = 'Campus Outpatient Encounter';
  noteSaved = false;
  cdssData: ClinicalEvaluationResult;

  constructor(private readonly clinicianStore: ClinicianStore) {
    this.cdssData = this.evaluateLocal();
    makeAutoObservable(this, {}, { autoBind: true });
    reaction(
      () => this.selectedPatient.id,
      () => this.onPatientChanged()
    );
  }

  private evaluateLocal(): ClinicalEvaluationResult {
    const selected = this.selectedPatient;
    return evaluateClinicalPatientData(selected.vitals, selected.chiefComplaint);
  }

  private onPatientChanged(): void {
    this.cdssData = this.evaluateLocal();
    void this.refreshCdss();
  }

  get patients(): ClinicianPatient[] {
    return this.clinicianStore.clinicianPatients;
  }

  get selectedPatient(): ClinicianPatient {
    return this.clinicianStore.clinicianPatients.find((patient) => patient.id === this.clinicianStore.selectedPatientId)
      ?? this.clinicianStore.clinicianPatients[0];
  }

  selectPatient(id: string): void {
    this.clinicianStore.setSelectedPatientId(id);
  }

  setSoapTitle(value: string): void {
    this.soapTitle = value;
  }

  setSoapNote(value: string): void {
    this.soapNote = value;
  }

  get canSave(): boolean {
    return this.soapNote.trim().length > 0;
  }

  saveNote(): void {
    if (!this.canSave) return;
    this.clinicianStore.addClinicianNote(this.selectedPatient.id, this.soapTitle, this.soapNote);
    this.soapNote = '';
    this.noteSaved = true;
    window.setTimeout(() => {
      runInAction(() => {
        this.noteSaved = false;
      });
    }, 2000);
  }

  /** Enrich the CDSS evaluation from the agent (best-effort). */
  async refreshCdss(): Promise<void> {
    try {
      const remote = await agentApi.clinicalAssist(
        this.selectedPatient.vitals as unknown as Record<string, unknown>,
        this.selectedPatient.chiefComplaint
      );
      if (remote) {
        runInAction(() => {
          this.cdssData = remote as unknown as ClinicalEvaluationResult;
        });
      }
    } catch {
      /* offline/optional — keep the local evaluation */
    }
  }
}
