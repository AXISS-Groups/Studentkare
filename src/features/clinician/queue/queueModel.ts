/**
 * ClinicianConsole — "Today's queue" (design page 5, Tier 2). Who is waiting,
 * and exactly what each of them has let the doctor see. Pure types + helpers.
 */

export { initialsOf } from '../shared/names';

/** The student's consent to this doctor, for this care relationship. */
export type ConsentState = 'active' | 'awaiting' | 'expired';

export interface RecordAccessItem {
  id: string;
  /** "Vitamin D Test — 20 Sep", "Records before Aug 2026" */
  label: string;
  /** Why it is open or closed: "Shared by Priya on 21 Sep for this consult". */
  reason: string;
  open: boolean;
}

export interface QueueEntry {
  id: string;
  patientName: string;
  reason: string;
  consent: ConsentState;
  /** "Shared: 2 lab reports, 1 prescription · expires in 12 days" */
  scope: string;
  /** Set while the student is waiting in the virtual room. */
  waitingSince?: Date;
  /** "2:30 PM" for a later booking. */
  scheduledAt?: string;
  access: RecordAccessItem[];
  /** The doctor has already asked for access or a renewal. */
  requested?: boolean;
}

export interface QueueData {
  entries: QueueEntry[];
  /** Students with any live care relationship (not only today's queue). */
  activeRelationships: number;
  accepting: boolean;
  /** Crisis escalations flagged in the last 24 hours. */
  crisisFlagged24h: number;
}

export const CONSENT_LABEL: Record<ConsentState, string> = {
  active: 'Consent active',
  awaiting: 'Awaiting consent',
  expired: 'Consent expired',
};

/** What the doctor can do next for an entry, given its consent. */
export type QueueAction = 'open-consult' | 'request-access' | 'ask-renew';

export function actionFor(entry: QueueEntry): QueueAction {
  if (entry.consent === 'active') return 'open-consult';
  if (entry.consent === 'awaiting') return 'request-access';
  return 'ask-renew';
}

export const ACTION_LABEL: Record<QueueAction, { idle: string; done: string }> = {
  'open-consult': { idle: 'Open consult', done: 'Open consult' },
  'request-access': { idle: 'Request access', done: 'Access requested' },
  'ask-renew': { idle: 'Ask to renew', done: 'Renewal requested' },
};

/** "Waiting 4m" / "Waiting 1h 5m", or the booked time. */
export function timeLabel(entry: QueueEntry, now: Date): string {
  if (entry.waitingSince) {
    const minutes = Math.max(0, Math.floor((now.getTime() - entry.waitingSince.getTime()) / 60000));
    if (minutes < 60) return `Waiting ${minutes}m`;
    return `Waiting ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return entry.scheduledAt ?? '';
}

/** "6 students with an active care relationship · 2 waiting now" */
export function queueSummary(data: QueueData): string {
  const waiting = data.entries.filter((entry) => entry.waitingSince).length;
  const students = `${data.activeRelationships} student${data.activeRelationships === 1 ? '' : 's'} with an active care relationship`;
  return `${students} · ${waiting} waiting now`;
}
