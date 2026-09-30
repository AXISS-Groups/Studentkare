import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { Allergy, Drug, PrescribeData, PrescribeSource, RxLine } from './prescribeModel';
import { blockReason, matchingAllergy, searchDrugs } from './prescribeModel';

export type EditableField = 'dose' | 'frequency' | 'duration';

export class PrescribeViewModel extends LoadableViewModel<PrescribeData> {
  lines: RxLine[] = [];
  searchOpen = false;
  query = '';
  signing = false;
  signed = false;

  constructor(private readonly source: PrescribeSource) {
    super(source);
    makeObservable<PrescribeViewModel, 'afterLoad'>(this, {
      lines: observable, searchOpen: observable, query: observable, signing: observable, signed: observable,
      results: computed, blockedLines: computed, allergyBlock: computed, prescribable: computed, allergyUnknown: computed, canSign: computed,
      afterLoad: actionBound, openSearch: actionBound, closeSearch: actionBound, setQuery: actionBound, add: actionBound, remove: actionBound, edit: actionBound, toggleSubstitution: actionBound,
    });
  }

  protected isEmpty(): boolean {
    return false;
  }

  protected afterLoad(data: PrescribeData): void {
    this.lines = data.lines.map((line) => ({ ...line }));
  }

  get allergyUnknown(): boolean {
    return this.data?.allergies === null;
  }

  /** Every match, blocked ones included — with the reason, never hidden. */
  get results(): { drug: Drug; blocked: string | null }[] {
    const data = this.data;
    if (!data) return [];
    return searchDrugs(data.catalogue, this.query).map((drug) => ({ drug, blocked: blockReason(drug, data) }));
  }

  get blockedLines(): RxLine[] {
    return this.lines.filter((line) => line.blockedReason);
  }

  /** The first refused line that an allergy on file explains — for the banner. */
  get allergyBlock(): { generic: string; allergy: Allergy } | null {
    const data = this.data;
    if (!data?.allergies) return null;
    for (const line of this.blockedLines) {
      const drug = data.catalogue.find((d) => d.id === line.drugId);
      const allergy = drug ? matchingAllergy(drug, data.allergies) : null;
      if (allergy) return { generic: line.generic, allergy };
    }
    return null;
  }

  get prescribable(): RxLine[] {
    return this.lines.filter((line) => !line.blockedReason);
  }

  get canSign(): boolean {
    return !this.signed && !this.signing && !this.allergyUnknown && this.prescribable.length > 0
      && this.prescribable.every((l) => l.dose.trim() && l.frequency.trim() && l.duration.trim())
      && typeof this.source.sign === 'function';
  }

  openSearch(): void { if (!this.signed) { this.searchOpen = true; this.query = ''; } }
  closeSearch(): void { this.searchOpen = false; }
  setQuery(query: string): void { this.query = query; }

  /**
   * Adds the drug — or, if the check refuses it, records the refused attempt as
   * a struck-through line so the reason stays in front of the doctor. Fails
   * closed: a drug is only prescribable when the check positively passes.
   */
  add(drug: Drug): void {
    const data = this.data;
    if (!data || this.signed) return;
    if (this.lines.some((line) => line.drugId === drug.id)) {
      this.say(`${drug.generic} is already on this prescription`);
      return;
    }
    const blocked = blockReason(drug, data);
    this.lines = [...this.lines, {
      id: `l-${drug.id}`, drugId: drug.id, generic: drug.generic, schedule: drug.schedule,
      brand: blocked ? 'Blocked by allergy check' : drug.brand,
      dose: blocked ? '—' : drug.dose, frequency: blocked ? '—' : drug.frequency, duration: blocked ? '—' : drug.duration,
      substitutionAllowed: !blocked, blockedReason: blocked ?? undefined,
    }];
    this.searchOpen = false;
    this.say(blocked ? `${drug.generic} not added — ${blocked}` : `${drug.name} added`);
  }

  remove(id: string): void {
    if (!this.signed) this.lines = this.lines.filter((line) => line.id !== id);
  }

  edit(id: string, field: EditableField, value: string): void {
    if (this.signed) return;
    this.lines = this.lines.map((line) => (line.id === id && !line.blockedReason ? { ...line, [field]: value } : line));
  }

  toggleSubstitution(id: string): void {
    if (this.signed) return;
    this.lines = this.lines.map((line) => (line.id === id && !line.blockedReason ? { ...line, substitutionAllowed: !line.substitutionAllowed } : line));
  }

  /** Only prescribable lines are signed; refused attempts never are. */
  async sign(): Promise<void> {
    const sign = this.source.sign;
    if (!sign || !this.canSign) return;
    this.signing = true;
    try {
      await sign(this.prescribable);
      runInAction(() => { this.signing = false; this.signed = true; this.say(`Prescription signed · sent to ${this.data?.patientName ?? 'the student'}`); });
    } catch {
      runInAction(() => { this.signing = false; this.say('Couldn’t sign the prescription. Nothing was sent — try again.'); });
    }
  }
}
