import { isDev } from '@/core/env';
import type { Stat } from '@/design-system';
import type { Loadable } from '../shared/LoadableViewModel';

/**
 * ClinicalReview — critical results (design page 5). Ranked by severity, not
 * arrival. TIER 1: awaiting a named design reviewer and clinical sign-off.
 */

/** Lab flag: HH / LL critical, H / L out of range, none for "never collected". */
export type ResultFlag = 'HH' | 'LL' | 'H' | 'L' | 'none';
export type AckState = 'unacknowledged' | 'acknowledged' | 'never-collected';

export interface CriticalResult {
  id: string;
  patientName: string;
  /** "STU-2026-4410 · Osmania" */
  meta: string;
  campus: string;
  analyte: string;
  panel: string;
  /** Value with unit, as released by the lab: "6.8 mmol/L". */
  value: string;
  reference: string;
  flag: ResultFlag;
  released: string;
  ack: AckState;
  /** "Acknowledged 2h ago" / "Booked, never collected" */
  ackText: string;
}

export interface CriticalData {
  stats: Stat[];
  results: CriticalResult[];
}

export type Escalation = 'call' | 'clinic' | 'follow-up';

export const ESCALATIONS: { id: Escalation; label: string; meta: (r: CriticalResult) => string }[] = [
  { id: 'call', label: 'Call the student now', meta: () => 'Campus number on file · logs the attempt' },
  { id: 'clinic', label: 'Route to campus clinic', meta: (r) => `${r.campus} desk · on shift today` },
  { id: 'follow-up', label: 'Add a follow-up task', meta: () => 'Appears on your queue until closed' },
];

export function isCritical(flag: ResultFlag): boolean {
  return flag === 'HH' || flag === 'LL';
}

/** Critical first, then out-of-range, then the rest — never by arrival. */
export function bySeverity(results: CriticalResult[]): CriticalResult[] {
  const rank = (r: CriticalResult) => (isCritical(r.flag) ? 0 : r.flag === 'H' || r.flag === 'L' ? 1 : 2);
  return [...results].sort((a, b) => rank(a) - rank(b));
}

export interface CriticalSource extends Loadable<CriticalData> {
  /** Records the acknowledgement and the chosen escalation. Absent = cannot. */
  acknowledge?: (id: string, escalation: Escalation) => Promise<void>;
  /** Reminds the student about a sample never collected. */
  chase?: (id: string) => Promise<void>;
}

export function criticalSample(): CriticalData {
  return {
    stats: [
      { label: 'Unacknowledged', value: '2', meta: 'Oldest 38 minutes', tone: 'danger' },
      { label: 'Median turnaround', value: '14 min', meta: 'Release to acknowledgement' },
      { label: 'Ordered, never collected', value: '1', meta: 'Slot passed 11 days ago', tone: 'danger' },
      { label: 'In care this week', value: '23', meta: 'Active consent on file' },
    ],
    results: [
      { id: 'k1', patientName: 'Aarav Sharma', meta: 'STU-2026-4410 · Osmania', campus: 'Osmania', analyte: 'Potassium', panel: 'Renal panel · Kare Labs', value: '6.8 mmol/L', reference: '3.5–5.1', flag: 'HH', released: '11 min ago', ack: 'unacknowledged', ackText: 'Not acknowledged' },
      { id: 'k2', patientName: 'Meera Nair', meta: 'STU-2026-3341 · Univ. of Hyderabad', campus: 'Univ. of Hyderabad', analyte: 'Haemoglobin', panel: 'CBC · Kare Labs', value: '7.1 g/dL', reference: '12.0–15.5', flag: 'LL', released: '38 min ago', ack: 'unacknowledged', ackText: 'Not acknowledged' },
      { id: 'k3', patientName: 'Rohan Verma', meta: 'STU-2026-8902 · BITS Pilani', campus: 'BITS Pilani', analyte: 'TSH', panel: 'Thyroid · Kare Labs', value: '9.4 mIU/L', reference: '0.4–4.0', flag: 'H', released: '3 hrs ago', ack: 'acknowledged', ackText: 'Acknowledged 2h ago' },
      { id: 'k4', patientName: 'Ananya Reddy', meta: 'STU-2026-1182 · IIT Hyderabad', campus: 'IIT Hyderabad', analyte: 'Vitamin D', panel: 'Vitamin panel', value: '11 ng/mL', reference: '30–100', flag: 'L', released: 'Yesterday', ack: 'acknowledged', ackText: 'Acknowledged' },
      { id: 'k5', patientName: 'Vikramaditya Rao', meta: 'STU-2026-5521 · IIIT Hyderabad', campus: 'IIIT Hyderabad', analyte: 'Iron panel', panel: 'Ordered 12 Sep', value: 'No sample', reference: '—', flag: 'none', released: 'Slot passed', ack: 'never-collected', ackText: 'Booked, never collected' },
    ],
  };
}

export const sampleCriticalSource: CriticalSource = {
  load: async () => criticalSample(),
  acknowledge: async () => undefined,
  chase: async () => undefined,
};

export const unconnectedCriticalSource: CriticalSource = { load: async () => null };

export function defaultCriticalSource(): CriticalSource {
  return isDev() ? sampleCriticalSource : unconnectedCriticalSource;
}
