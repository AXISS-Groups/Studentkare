import { getSetting } from '@/data/services/config';
import type { MessageKey } from '@/i18n';
import type { AgeBand, AgeEntry, MedicineDetail, RelatedMedicine } from '../data/MedicineInfoRepository';

/**
 * "Who is it for?" (plan tier1-medicine-info-2026-10-22, D-MI-6, D-MI-7, D-MI-8).
 * The band boundaries come from the settings registry (medicine_info.*). The band
 * picked stays on this device: the answer is filtered here from the reviewed label
 * entries the server already returned. Never a dose, frequency or mg/kg.
 */
export const AGE_BANDS: readonly AgeBand[] = ['UNDER_2', 'CHILD', 'TEEN', 'ADULT', 'OLDER_ADULT', 'PREGNANT_BREASTFEEDING'];

export interface BandOption {
  band: AgeBand;
  label: MessageKey;
  /** The age range line, with its numbers from settings. */
  range: { key: MessageKey; vars: Record<string, number> } | null;
  /** Always "Ask a doctor or pharmacist before giving this" (under the threshold, and pregnancy). */
  askFirst: boolean;
}

export function bandOptions(): BandOption[] {
  const child = getSetting('medicine_info.child_from_years');
  const teen = getSetting('medicine_info.teen_from_years');
  const adult = getSetting('medicine_info.adult_from_years');
  const older = getSetting('medicine_info.older_adult_from_years');
  const askBelow = getSetting('medicine_info.ask_doctor_below_years');
  // A band "asks first" when it ends (exclusive) at or below the threshold: under-12 by default.
  return [
    { band: 'UNDER_2', label: 'mi.band.UNDER_2', range: { key: 'mi.range.under', vars: { to: child } }, askFirst: child <= askBelow },
    { band: 'CHILD', label: 'mi.band.CHILD', range: { key: 'mi.range.between', vars: { from: child, to: teen - 1 } }, askFirst: teen <= askBelow },
    { band: 'TEEN', label: 'mi.band.TEEN', range: { key: 'mi.range.between', vars: { from: teen, to: adult - 1 } }, askFirst: adult <= askBelow },
    { band: 'ADULT', label: 'mi.band.ADULT', range: { key: 'mi.range.between', vars: { from: adult, to: older - 1 } }, askFirst: false },
    { band: 'OLDER_ADULT', label: 'mi.band.OLDER_ADULT', range: { key: 'mi.range.over', vars: { from: older } }, askFirst: false },
    { band: 'PREGNANT_BREASTFEEDING', label: 'mi.band.PREGNANT_BREASTFEEDING', range: null, askFirst: true },
  ];
}

export interface LabelForm {
  medicineId: string;
  brand: string;
  form: string;
  strength: string;
  /** This medicine (true) or another medicine with the same salts (false). */
  self: boolean;
  related: RelatedMedicine | null;
}

/** The forms and strengths the reviewed labels list for this band: this medicine first, then same-salt ones. */
export function labelFormsFor(detail: MedicineDetail, band: AgeBand): LabelForm[] {
  const own = (detail.fields.age_availability?.items ?? [])
    .filter((entry: AgeEntry) => entry.band === band)
    .map((entry) => ({ medicineId: detail.id, brand: detail.brand, form: entry.form, strength: entry.strength, self: true, related: null }));
  const others = detail.sameSalt.flatMap((related) => (related.ageAvailability?.items ?? [])
    .filter((entry) => entry.band === band)
    .map((entry) => ({ medicineId: related.id, brand: related.brand, form: entry.form, strength: entry.strength, self: false, related })));
  return [...own, ...others];
}
