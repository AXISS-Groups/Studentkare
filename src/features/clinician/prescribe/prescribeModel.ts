import { isDev } from '@/core/env';
import type { Loadable } from '../shared/LoadableViewModel';

/**
 * Prescribe (design page 5). TIER 1: awaiting a named design reviewer and
 * clinical sign-off. Pure rules here so they can be tested on their own.
 */

export type DrugSchedule = 'OTC' | 'H' | 'H1' | 'X';

export interface Drug {
  id: string;
  /** "Amoxicillin 500 mg" */
  name: string;
  generic: string;
  /** "Crocin · tablet" */
  brand: string;
  drugClass: string;
  schedule: DrugSchedule;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Allergy {
  substance: string;
  /** The class it was recorded against, e.g. "Penicillin". */
  drugClass: string;
  /** "14 Jul 2026" — as recorded, full date. */
  recordedOn: string;
}

export interface RxLine {
  id: string;
  drugId: string;
  generic: string;
  brand: string;
  schedule: DrugSchedule;
  dose: string;
  frequency: string;
  duration: string;
  substitutionAllowed: boolean;
  /** Set when the check refused it; the line stays, struck through, with why. */
  blockedReason?: string;
}

export interface PrescribeData {
  patientName: string;
  /** How the consult is happening — Schedule X is never prescribed by video. */
  mode: 'video' | 'in-person';
  /** Null when the allergy record could not be read: then nothing can be added. */
  allergies: Allergy[] | null;
  lines: RxLine[];
  catalogue: Drug[];
}

export interface PrescribeSource extends Loadable<PrescribeData> {
  sign?: (lines: RxLine[]) => Promise<void>;
}

/**
 * Why a drug may not be prescribed here, or null if it may.
 * Name/class match only — cross-reactivity is NOT checked, and the screen says so.
 */
export function matchingAllergy(drug: Pick<Drug, 'drugClass' | 'generic'>, allergies: Allergy[]): Allergy | null {
  return allergies.find(
    (a) => a.drugClass.toLowerCase() === drug.drugClass.toLowerCase() || drug.generic.toLowerCase().includes(a.substance.toLowerCase()),
  ) ?? null;
}

export function blockReason(drug: Drug, data: Pick<PrescribeData, 'allergies' | 'mode'>): string | null {
  if (data.allergies === null) return 'Allergy record couldn’t be checked — nothing can be added until it can';
  const allergy = matchingAllergy(drug, data.allergies);
  if (allergy) return `${drug.drugClass} class — allergy recorded ${allergy.recordedOn}`;
  if (drug.schedule === 'X' && data.mode === 'video') return 'Schedule X — never prescribed by video (Telemedicine Practice Guidelines 2020)';
  return null;
}

export function searchDrugs(catalogue: Drug[], query: string): Drug[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return catalogue.filter((d) => d.name.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q) || d.drugClass.toLowerCase().includes(q));
}

export const SCHEDULE_NOTE: Record<DrugSchedule, string> = {
  OTC: 'Over the counter',
  H: 'Schedule H · prescription only',
  H1: 'Schedule H1 · ID needed at counter',
  X: 'Schedule X',
};

export function prescribeSample(): PrescribeData {
  const catalogue: Drug[] = [
    { id: 'd-para', name: 'Paracetamol 650 mg', generic: 'Paracetamol', brand: 'Crocin · tablet', drugClass: 'Analgesic', schedule: 'OTC', dose: '650 mg', frequency: 'Every 6 hrs, as needed', duration: '3 days' },
    { id: 'd-azi', name: 'Azithromycin 500 mg', generic: 'Azithromycin', brand: 'Azee · tablet', drugClass: 'Macrolide', schedule: 'H1', dose: '500 mg', frequency: 'Once daily', duration: '3 days' },
    { id: 'd-amox', name: 'Amoxicillin 500 mg', generic: 'Amoxicillin', brand: 'Mox · capsule', drugClass: 'Penicillin', schedule: 'H', dose: '500 mg', frequency: 'Three times daily', duration: '5 days' },
    { id: 'd-amoxclav', name: 'Amoxicillin + Clavulanate', generic: 'Amoxicillin + Clavulanate', brand: 'Augmentin · tablet', drugClass: 'Penicillin', schedule: 'H', dose: '625 mg', frequency: 'Twice daily', duration: '5 days' },
    { id: 'd-cetir', name: 'Cetirizine 10 mg', generic: 'Cetirizine', brand: 'Cetzine · tablet', drugClass: 'Antihistamine', schedule: 'OTC', dose: '10 mg', frequency: 'Once at night', duration: '5 days' },
    { id: 'd-ors', name: 'ORS sachet', generic: 'Oral rehydration salts', brand: 'Electral · sachet', drugClass: 'Rehydration', schedule: 'OTC', dose: '1 sachet in 1 L water', frequency: 'Sip through the day', duration: '3 days' },
  ];
  const line = (drug: Drug, blockedReason?: string): RxLine => ({
    id: `l-${drug.id}`, drugId: drug.id, generic: drug.generic, brand: blockedReason ? 'Blocked by allergy check' : drug.brand, schedule: drug.schedule,
    dose: blockedReason ? '—' : drug.dose, frequency: blockedReason ? '—' : drug.frequency, duration: blockedReason ? '—' : drug.duration,
    substitutionAllowed: !blockedReason, blockedReason,
  });
  return {
    patientName: 'Priya N.',
    mode: 'video',
    allergies: [{ substance: 'Penicillin', drugClass: 'Penicillin', recordedOn: '14 Jul 2026' }],
    catalogue,
    lines: [line(catalogue[0]), line(catalogue[1]), line(catalogue[2], 'Penicillin class — allergy recorded 14 Jul 2026')],
  };
}

export const samplePrescribeSource: PrescribeSource = { load: async () => prescribeSample(), sign: async () => undefined };
export const unconnectedPrescribeSource: PrescribeSource = { load: async () => null };

export function defaultPrescribeSource(): PrescribeSource {
  return isDev() ? samplePrescribeSource : unconnectedPrescribeSource;
}
