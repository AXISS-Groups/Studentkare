import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest, ApiError } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type ScheduleClass = 'OTC' | 'H' | 'H1' | 'X';
export const SCHEDULE_CLASSES: readonly ScheduleClass[] = ['OTC', 'H', 'H1', 'X'];

/** One line of POST /api/prescriptions (backend PrescriptionItemInput). */
export interface RxLine {
  key: string;
  genericName: string;
  strength: string;
  form: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  substitutionAllowed: boolean;
  scheduleClass: ScheduleClass;
}

/** GET /api/work/appointments → items[] (the doctor's own). */
export interface StaffAppointment {
  id: string;
  patientId: string;
  customer: string;
  slotStart: string;
  status: string;
}

/** GET /api/encounters → items[]: this doctor's own notes, draft or signed. */
export interface DoctorNote {
  id: string;
  appointmentId: string;
  patientId: string;
  status: string;
  createdAt: number;
  signedAt: number | null;
}

export interface CarePatient {
  patientId: string;
  name: string;
  lastVisit: string;
}

/** One entry of a 409's detail.conflicts (clinical_fulfilment.cross_check_allergies). */
export interface AllergyConflict {
  genericName: string;
  conflicts: { substance: string; flag: string }[];
}

/** POST /api/prescriptions → 201 (prescription_payload). */
export interface IssuedPrescription {
  id: string;
  validUntil: number;
  prescriberRegNo: string;
  allergyCheck: { acknowledged?: boolean };
}

const blankLine = (key: string): RxLine => ({
  key, genericName: '', strength: '', form: '', dose: '', frequency: '', durationDays: 5, quantity: 0,
  substitutionAllowed: true, scheduleClass: 'OTC',
});

/**
 * E-prescription writer (design page 5: Prescribe, Tier 1), on the real
 * POST /api/prescriptions contract.
 *
 * - The patient comes from the doctor's own confirmed or completed
 *   appointments; the server refuses anyone else (no care relationship, no Rx).
 * - The registration number is the one on the clinician profile, set by the
 *   server — never typed here.
 * - A recorded-allergy conflict blocks the issue. The doctor sees each conflict
 *   and must tick an explicit acknowledgement to proceed, which the server
 *   stores on the prescription.
 *
 * This replaces a form that posted fields the backend rejects, hard-wired its
 * patient to null, and claimed to sign and dispatch to a pharmacy.
 */
export class PrescribeViewModel implements ViewModel {
  patients: CarePatient[] | null = null;
  patientsFailed = false;
  patientId = '';
  /** This doctor's notes; null until loaded. A failed load leaves only "No note". */
  notes: DoctorNote[] | null = null;
  notesFailed = false;
  /** The visit note this prescription is linked to, or '' for none. */
  encounterId = '';
  private latestAppointment = new Map<string, { id: string; slotStart: string }>();
  lines: RxLine[] = [blankLine('line-1')];
  advice = '';
  validDays = 30;

  conflicts: AllergyConflict[] = [];
  acknowledgeConflicts = false;
  busy = false;
  error: string | null = null;
  issued: IssuedPrescription | null = null;
  private nextKey = 2;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<PrescribeViewModel, 'disposed' | 'request' | 'nextKey' | 'latestAppointment'>(this, { disposed: false, request: false, nextKey: false, latestAppointment: false }, { autoBind: true });
  }

  get canIssue(): boolean {
    if (!this.patientId || this.busy) return false;
    if (this.lines.length === 0 || this.lines.length > 20) return false;
    if (!this.lines.every((l) => l.genericName.trim().length >= 2 && l.quantity >= 1 && l.quantity <= 1000)) return false;
    if (this.conflicts.length > 0 && !this.acknowledgeConflicts) return false;
    return true;
  }

  /** The selected patient's notes by this doctor, newest first. */
  get patientNotes(): DoctorNote[] {
    if (!this.notes || !this.patientId) return [];
    return this.notes.filter((n) => n.patientId === this.patientId).sort((a, b) => b.createdAt - a.createdAt);
  }

  async loadPatients(): Promise<void> {
    this.disposed = false;
    this.patientsFailed = false;
    // Notes are optional: if they can't load the doctor can still prescribe, unlinked.
    const notes = this.request<{ items: DoctorNote[] }>('/encounters').then((r) => r.items, () => null);
    try {
      const res = await this.request<{ items: StaffAppointment[] }>('/work/appointments');
      const loadedNotes = await notes;
      if (this.disposed) return;
      const seen = new Map<string, CarePatient>();
      const latest = new Map<string, { id: string; slotStart: string }>();
      for (const appt of res.items) {
        if (appt.status !== 'CONFIRMED' && appt.status !== 'COMPLETED') continue;
        if (!seen.has(appt.patientId)) seen.set(appt.patientId, { patientId: appt.patientId, name: appt.customer, lastVisit: appt.slotStart });
        const known = latest.get(appt.patientId);
        if (!known || appt.slotStart > known.slotStart) latest.set(appt.patientId, { id: appt.id, slotStart: appt.slotStart });
      }
      runInAction(() => {
        this.patients = [...seen.values()];
        this.latestAppointment = latest;
        this.notes = loadedNotes ?? [];
        this.notesFailed = loadedNotes === null;
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.patientsFailed = true; });
    }
  }

  selectPatient(patientId: string): void {
    this.patientId = patientId;
    // Default: the newest note for this patient's latest appointment, if there is one.
    const appointment = this.latestAppointment.get(patientId);
    this.encounterId = this.patientNotes.find((n) => appointment && n.appointmentId === appointment.id)?.id ?? '';
    this.clearConflict();
  }

  /** Only one of this patient's notes, or '' for none. */
  selectNote(encounterId: string): void {
    this.encounterId = encounterId === '' || this.patientNotes.some((n) => n.id === encounterId) ? encounterId : '';
  }

  addLine(): void {
    if (this.lines.length >= 20) return;
    this.lines.push(blankLine(`line-${this.nextKey++}`));
    this.clearConflict();
  }

  removeLine(key: string): void {
    this.lines = this.lines.filter((l) => l.key !== key);
    this.clearConflict();
  }

  updateLine<K extends keyof Omit<RxLine, 'key'>>(key: string, field: K, value: RxLine[K]): void {
    const line = this.lines.find((l) => l.key === key);
    if (!line) return;
    line[field] = value;
    // A changed drug list needs a fresh allergy check and a fresh acknowledgement.
    this.clearConflict();
  }

  setAdvice(value: string): void { this.advice = value; }
  setValidDays(value: number): void { this.validDays = Math.min(180, Math.max(1, Math.round(value) || 1)); }
  setAcknowledgeConflicts(value: boolean): void { this.acknowledgeConflicts = value; }

  private clearConflict(): void {
    this.conflicts = [];
    this.acknowledgeConflicts = false;
  }

  async issue(): Promise<void> {
    if (!this.canIssue) return;
    this.busy = true;
    this.error = null;
    const body = {
      patientId: this.patientId,
      // Sent only when linked; the server checks the note is this doctor's, about this patient.
      ...(this.encounterId ? { encounterId: this.encounterId } : {}),
      items: this.lines.map(({ key: _key, genericName, strength, form, dose, frequency, ...rest }) => ({
        genericName: genericName.trim(), strength: strength.trim(), form: form.trim(), dose: dose.trim(), frequency: frequency.trim(), ...rest,
      })),
      advice: this.advice.trim(),
      validDays: this.validDays,
      acknowledgeAllergyConflict: this.conflicts.length > 0 && this.acknowledgeConflicts,
    };
    try {
      const issued = await this.request<IssuedPrescription>('/prescriptions', { method: 'POST', body: JSON.stringify(body) });
      runInAction(() => { this.issued = issued; this.busy = false; });
    } catch (err: unknown) {
      runInAction(() => {
        this.busy = false;
        if (err instanceof ApiError && err.status === 409 && isConflictDetail(err.detail)) {
          this.conflicts = err.detail.conflicts;
          this.acknowledgeConflicts = false;
          this.error = err.message;
          return;
        }
        this.error = err instanceof Error && err.message ? err.message : 'The prescription was not issued. Try again.';
      });
    }
  }

  startAnother(): void {
    this.issued = null;
    this.lines = [blankLine(`line-${this.nextKey++}`)];
    this.advice = '';
    this.validDays = 30;
    this.clearConflict();
    this.error = null;
  }

  dispose(): void { this.disposed = true; }

  reset(): void {
    this.patientId = '';
    this.encounterId = '';
    this.startAnother();
  }
}

function isConflictDetail(detail: unknown): detail is { message: string; conflicts: AllergyConflict[] } {
  return typeof detail === 'object' && detail !== null && Array.isArray((detail as { conflicts?: unknown }).conflicts);
}
