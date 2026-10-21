import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { CareAppointment, T } from '../shared/clinicalData';
import { RX_LIMITS, applyConflicts, lineComplete, localBlock } from './prescribeModel';
import type { DrugEntry, PrescribeData, PrescribeSource, PrescriberNote, RxLine } from './prescribeModel';

export type EditableField = 'dose' | 'frequency';

const blankEntry = (): DrugEntry => ({
  genericName: '', brandName: '', strength: '', form: '', dose: '', frequency: '', durationDays: 0, quantity: 0,
  scheduleClass: 'OTC', substitutionAllowed: true,
});

/**
 * Prescribe (Tier 1, approved 2026-10-21). Fails closed at every step: no
 * patient, no send; offline, no send; a line the allergy check refused is
 * never sent again; the row changes to "signed" only after the server issues it.
 */
export class PrescribeViewModel extends LoadableViewModel<PrescribeData> {
  patientId = '';
  encounterId = '';
  lines: RxLine[] = [];
  drawerOpen = false;
  entry: DrugEntry = blankEntry();
  signing = false;
  issuedId: string | null = null;
  online = true;
  private nextKey = 1;

  constructor(private readonly source: PrescribeSource, private readonly t: T, private preferred: { patientId?: string; encounterId?: string } | null = null) {
    super(source);
    makeObservable<PrescribeViewModel, 'afterLoad'>(this, {
      patientId: observable, encounterId: observable, lines: observable, drawerOpen: observable, entry: observable,
      signing: observable, issuedId: observable, online: observable,
      patients: computed, patientName: computed, patientNotes: computed, blockedLines: computed, allergyBlock: computed,
      prescribable: computed, canSign: computed, entryValid: computed, signed: computed,
      afterLoad: actionBound, selectPatient: actionBound, selectNote: actionBound, openDrawer: actionBound, closeDrawer: actionBound,
      setEntry: actionBound, add: actionBound, remove: actionBound, edit: actionBound, toggleSubstitution: actionBound, setOnline: actionBound,
      startAnother: actionBound,
    });
  }

  protected isEmpty(data: PrescribeData): boolean {
    return data.appointments.length === 0;
  }

  protected afterLoad(): void {
    const want = this.preferred;
    this.preferred = null;
    if (want?.patientId && this.patients.some((p) => p.patientId === want.patientId)) {
      this.patientId = want.patientId;
      this.encounterId = want.encounterId && this.patientNotes.some((n) => n.id === want.encounterId) ? want.encounterId : '';
    }
  }

  /** One entry per student, most recent appointment first. */
  get patients(): CareAppointment[] {
    const seen = new Set<string>();
    return (this.data?.appointments ?? []).filter((a) => (seen.has(a.patientId) ? false : (seen.add(a.patientId), true)));
  }

  get patientName(): string {
    return this.patients.find((p) => p.patientId === this.patientId)?.customer ?? '';
  }

  get patientNotes(): PrescriberNote[] {
    return (this.data?.notes ?? []).filter((n) => n.patientId === this.patientId).sort((a, b) => b.createdAt - a.createdAt);
  }

  get signed(): boolean {
    return this.issuedId !== null;
  }

  get blockedLines(): RxLine[] {
    return this.lines.filter((line) => line.blocked);
  }

  /** The first line the allergy check refused — for the banner. */
  get allergyBlock(): { generic: string; substances: string[] } | null {
    for (const line of this.lines) if (line.blocked?.kind === 'allergy') return { generic: line.genericName, substances: line.blocked.substances };
    return null;
  }

  get prescribable(): RxLine[] {
    return this.lines.filter((line) => !line.blocked);
  }

  get canSign(): boolean {
    return !this.signed && !this.signing && this.online && !!this.patientId
      && this.prescribable.length > 0 && this.prescribable.length <= RX_LIMITS.lines
      && this.prescribable.every(lineComplete) && typeof this.source.issue === 'function';
  }

  get entryValid(): boolean {
    return lineComplete(this.entry);
  }

  setOnline(online: boolean): void { this.online = online; }

  selectPatient(patientId: string): void {
    if (this.signed) return;
    this.patientId = patientId;
    // A different student: their own allergy record, so earlier refusals no longer apply.
    this.lines = this.lines.map((line) => (line.blocked?.kind === 'allergy' ? { ...line, blocked: undefined } : line));
    const latest = this.patientNotes.find((n) => n.status === 'DRAFT') ?? this.patientNotes[0];
    this.encounterId = latest?.id ?? '';
  }

  selectNote(encounterId: string): void {
    this.encounterId = encounterId === '' || this.patientNotes.some((n) => n.id === encounterId) ? encounterId : '';
  }

  openDrawer(): void { if (!this.signed) { this.drawerOpen = true; this.entry = blankEntry(); } }
  closeDrawer(): void { this.drawerOpen = false; }

  setEntry<K extends keyof DrugEntry>(field: K, value: DrugEntry[K]): void {
    this.entry = { ...this.entry, [field]: value };
  }

  /**
   * Adds the entered drug — or, if a rule here refuses it, records the refused
   * attempt as a struck-through line so the reason stays in front of the doctor.
   */
  add(): void {
    if (this.signed || !this.entryValid) return;
    if (this.lines.length >= RX_LIMITS.lines) { this.say(this.t('clinRx.toast.tooMany', { n: RX_LIMITS.lines })); return; }
    const name = this.entry.genericName.trim();
    if (this.lines.some((line) => line.genericName.trim().toLowerCase() === name.toLowerCase())) {
      this.say(this.t('clinRx.toast.duplicate', { name }));
      return;
    }
    const blocked = localBlock(this.entry);
    this.lines = [...this.lines, { ...this.entry, genericName: name, id: `line-${this.nextKey++}`, substitutionAllowed: blocked ? false : this.entry.substitutionAllowed, blocked }];
    this.drawerOpen = false;
    this.say(blocked ? this.t('clinRx.toast.blockedX', { name }) : this.t('clinRx.toast.added', { name }));
  }

  remove(id: string): void {
    if (!this.signed) this.lines = this.lines.filter((line) => line.id !== id);
  }

  edit(id: string, field: EditableField, value: string): void {
    if (this.signed) return;
    this.lines = this.lines.map((line) => (line.id === id && !line.blocked ? { ...line, [field]: value.slice(0, RX_LIMITS[field]) } : line));
  }

  toggleSubstitution(id: string): void {
    if (this.signed) return;
    this.lines = this.lines.map((line) => (line.id === id && !line.blocked ? { ...line, substitutionAllowed: !line.substitutionAllowed } : line));
  }

  /** Only prescribable lines are sent; refused attempts never are. */
  async sign(): Promise<void> {
    const issue = this.source.issue;
    if (!issue || !this.canSign) return;
    this.signing = true;
    try {
      const result = await issue({ patientId: this.patientId, encounterId: this.encounterId, lines: this.prescribable });
      runInAction(() => {
        this.signing = false;
        if (result.kind === 'issued') {
          this.issuedId = result.id;
          this.say(this.t('clinRx.toast.issued', { name: this.patientName }));
        } else {
          this.lines = applyConflicts(this.lines, result.conflicts);
          this.say(this.t('clinRx.toast.conflict'));
        }
      });
    } catch {
      runInAction(() => { this.signing = false; this.say(this.t('clinRx.toast.failed')); });
    }
  }

  startAnother(): void {
    this.issuedId = null;
    this.lines = [];
  }
}
