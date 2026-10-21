import { apiRequest } from '@/data/services/http';
import type { Stat } from '@/design-system';
import { translate } from '@/i18n';
import type { Loadable } from '../shared/LoadableViewModel';
import { careAppointments, namesByPatient, waitedFor } from '../shared/clinicalData';
import type { Request, T } from '../shared/clinicalData';

/**
 * ClinicalReview — critical results (design page 5, Tier 1, approved
 * 2026-10-21). Ranked by severity, not arrival.
 *
 * Production reads `GET /work/critical-results` (unacknowledged critical
 * values the doctor may review) and `GET /work/lab-orders/awaiting-collection`
 * (samples this doctor ordered that were never collected), and acknowledges
 * with `POST /lab-orders/{id}/acknowledge-critical`. The lab sends the value
 * as its own note; the API does not split value, unit and reference range, so
 * the screen shows the lab's words rather than a re-parsed number.
 */

/**
 * Lab flag: HH / LL critical with a direction, `CRIT` critical as flagged by
 * the lab without a direction, H / L out of range, none for "never collected".
 */
export type ResultFlag = 'HH' | 'LL' | 'CRIT' | 'H' | 'L' | 'none';
export type AckState = 'unacknowledged' | 'acknowledged' | 'never-collected';

export interface CriticalResult {
  id: string;
  /** Empty when the student is not on this doctor's appointments. */
  patientName: string;
  /** "Sample S-4410" — identifies the result when the name is not known. */
  meta: string;
  analyte: string;
  panel: string;
  /** The value as the lab released it, e.g. "Potassium 6.8 mmol/L (3.5–5.1)". */
  value: string;
  /** Reference range when the source reports one separately; empty otherwise. */
  reference: string;
  flag: ResultFlag;
  /** "11 min" since release, or why a sample is overdue. */
  released: string;
  ack: AckState;
  ackText: string;
}

export interface CriticalData {
  stats: Stat[];
  results: CriticalResult[];
}

export type Escalation = 'call' | 'clinic' | 'follow-up';
export const ESCALATIONS: readonly Escalation[] = ['call', 'clinic', 'follow-up'];

export function isCritical(flag: ResultFlag): boolean {
  return flag === 'HH' || flag === 'LL' || flag === 'CRIT';
}

/** Critical first, then out-of-range, then the rest — never by arrival. */
export function bySeverity(results: CriticalResult[]): CriticalResult[] {
  const rank = (r: CriticalResult) => (isCritical(r.flag) ? 0 : r.flag === 'H' || r.flag === 'L' ? 1 : 2);
  return [...results].sort((a, b) => rank(a) - rank(b));
}

export interface CriticalSource extends Loadable<CriticalData> {
  /** Records the acknowledgement and the chosen escalation. Absent = cannot. */
  acknowledge?: (id: string, escalation: Escalation) => Promise<void>;
  /** Reminds the student about a sample never collected. Absent = no service for it. */
  chase?: (id: string) => Promise<void>;
}

/* ------------------------------------------------------------ API mapping */

export interface CriticalApiItem {
  id: string;
  patientId: string;
  testPanel: string[];
  sampleId: string;
  criticalNote: string;
  waitingSeconds: number;
}

export interface UncollectedApiItem {
  id: string;
  patientId: string;
  testPanel: string[];
  overdueReason: string;
  waitingSeconds: number;
}

export function mapCritical(
  critical: { items: CriticalApiItem[]; total: number },
  uncollected: { items: UncollectedApiItem[]; total: number },
  names: Map<string, string>,
  t: T,
): CriticalData {
  const sample = (id: string) => (id ? t('clinCritical.sample', { id }) : '');
  const results: CriticalResult[] = [
    ...critical.items.map((item): CriticalResult => ({
      id: item.id,
      patientName: names.get(item.patientId) ?? '',
      meta: sample(item.sampleId),
      analyte: item.testPanel.join(', '),
      panel: t('clinCritical.flaggedByLab'),
      value: item.criticalNote,
      reference: '',
      flag: 'CRIT',
      released: waitedFor(item.waitingSeconds, t),
      ack: 'unacknowledged',
      ackText: t('clinCritical.notAcknowledged'),
    })),
    ...uncollected.items.map((item): CriticalResult => ({
      id: item.id,
      patientName: names.get(item.patientId) ?? '',
      meta: '',
      analyte: item.testPanel.join(', '),
      panel: item.overdueReason === 'no_slot_recorded' ? t('partner.core.review.noSlot') : t('partner.core.review.slotPassed'),
      value: t('clinCritical.noSample'),
      reference: '',
      flag: 'none',
      released: waitedFor(item.waitingSeconds, t),
      ack: 'never-collected',
      ackText: t('clinCritical.neverCollected'),
    })),
  ];
  const oldest = Math.max(0, ...critical.items.map((i) => i.waitingSeconds));
  const oldestUncollected = Math.max(0, ...uncollected.items.map((i) => i.waitingSeconds));
  return {
    stats: [
      { label: t('clinCritical.stat.unack'), value: String(critical.total), meta: critical.total ? t('clinCritical.stat.oldest', { time: waitedFor(oldest, t) }) : t('clinCritical.stat.noneWaiting'), tone: critical.total ? 'danger' : 'text' },
      // No server aggregate for these two: shown as unreported, never estimated.
      { label: t('clinCritical.stat.turnaround'), value: null, meta: t('clinCritical.stat.notReported') },
      { label: t('clinCritical.stat.never'), value: String(uncollected.total), meta: uncollected.total ? t('clinCritical.stat.oldest', { time: waitedFor(oldestUncollected, t) }) : t('clinCritical.stat.noneWaiting'), tone: uncollected.total ? 'danger' : 'text' },
      { label: t('clinCritical.stat.inCare'), value: null, meta: t('clinCritical.stat.notReported') },
    ],
    results,
  };
}

/**
 * What goes into the server's acknowledgement note: the doctor's chosen
 * escalation, in English, because it is part of the clinical record rather
 * than of this screen's language.
 */
export function escalationNote(escalation: Escalation): string {
  const key = escalation === 'call' ? 'clinCritical.record.call' : escalation === 'clinic' ? 'clinCritical.record.clinic' : 'clinCritical.record.followUp';
  return translate('en', key);
}

export function criticalApiSource(t: T, request: Request = apiRequest): CriticalSource {
  return {
    async load() {
      // Names are a convenience: if the appointments can't load, the results still do.
      const names = careAppointments(request).then(namesByPatient, () => new Map<string, string>());
      const [critical, uncollected] = await Promise.all([
        request<{ items: CriticalApiItem[]; total: number }>('/work/critical-results'),
        request<{ items: UncollectedApiItem[]; total: number }>('/work/lab-orders/awaiting-collection'),
      ]);
      return mapCritical(critical, uncollected, await names, t);
    },
    async acknowledge(id, escalation) {
      await request(`/lab-orders/${encodeURIComponent(id)}/acknowledge-critical`, {
        method: 'POST',
        body: JSON.stringify({ note: escalationNote(escalation) }),
      });
    },
    // No reminder endpoint exists for an uncollected sample: `chase` stays absent.
  };
}
