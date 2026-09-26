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
/** Nothing to evaluate. Not a result of zero findings — an absence of input. */
const EMPTY_EVALUATION: ClinicalEvaluationResult = {
  differentialDiagnoses: [],
  interactionAlerts: [],
  abnormalTrends: [],
  recommendedGuidelines: [],
};

/** Which evaluation produced what is on screen. */
export type CdssSource = 'local' | 'service';

export class ClinicianViewModel {
  soapNote = '';
  soapTitle = 'Campus Outpatient Encounter';
  noteSaved = false;
  cdssData: ClinicalEvaluationResult;
  /**
   * The console labels these suggestions "M18". When the service cannot be
   * reached the local rules evaluation stands in — which is the right
   * fallback, but a clinician must be able to tell the two apart before
   * acting on either.
   */
  cdssSource: CdssSource = 'local';

  constructor(private readonly clinicianStore: ClinicianStore) {
    this.cdssData = this.evaluateLocal();
    makeAutoObservable(this, {}, { autoBind: true });
    reaction(
      () => this.selectedPatient?.id,
      () => this.onPatientChanged()
    );
  }

  private evaluateLocal(): ClinicalEvaluationResult {
    const selected = this.selectedPatient;
    if (!selected) return EMPTY_EVALUATION;
    return evaluateClinicalPatientData(selected.vitals, selected.chiefComplaint);
  }

  private onPatientChanged(): void {
    this.cdssData = this.evaluateLocal();
    this.cdssSource = 'local';
    void this.refreshCdss();
  }

  get patients(): ClinicianPatient[] {
    return this.clinicianStore.clinicianPatients;
  }

  /** Null when no records are loaded — the console shows an empty state. */
  get selectedPatient(): ClinicianPatient | null {
    return this.clinicianStore.clinicianPatients.find((patient) => patient.id === this.clinicianStore.selectedPatientId)
      ?? this.clinicianStore.clinicianPatients[0]
      ?? null;
  }

  /** True while there is nothing real to show. */
  get hasPatients(): boolean {
    return this.clinicianStore.clinicianPatients.length > 0;
  }

  get isSample(): boolean {
    return this.clinicianStore.isSample;
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
    const selected = this.selectedPatient;
    if (!selected) return;
    this.clinicianStore.addClinicianNote(selected.id, this.soapTitle, this.soapNote);
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
      const selected = this.selectedPatient;
      if (!selected) return;
      const remote = await agentApi.clinicalAssist(
        selected.vitals as unknown as Record<string, unknown>,
        selected.chiefComplaint
      );
      if (remote) {
        runInAction(() => {
          this.cdssData = remote as unknown as ClinicalEvaluationResult;
          this.cdssSource = 'service';
        });
      }
    } catch {
      // Keep the local evaluation — but do not let it pass as the service's.
      runInAction(() => {
        this.cdssSource = 'local';
      });
    }
  }
}
