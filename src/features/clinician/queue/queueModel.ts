/**
 * ClinicianConsole — "Today's queue" (design page 5, Tier 2). Who is booked
 * today and, where a source reports it, exactly what each student has let the
 * doctor see. Pure types + helpers; the view translates.
 */

export { initialsOf } from '../shared/names';

/**
 * The student's consent to this doctor, for this care relationship.
 * `unreported`: no source tells the console (today's bookings API carries no
 * sharing), so nothing is claimed either way.
 */
export type ConsentState = 'active' | 'awaiting' | 'expired' | 'unreported';

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
  /** The booking behind the entry: a request still to confirm, or confirmed. */
  booking: 'REQUESTED' | 'CONFIRMED';
  consent: ConsentState;
  /** Why the student booked, when a source reports it. */
  reason?: string;
  /** What is shared and for how long, when a source reports it. */
  scope?: string;
  /** Set while the student is waiting in the virtual room. */
  waitingSince?: Date;
  /** The booked slot. */
  scheduledAt?: Date;
  /** Null when no source reports what this student shared. */
  access: RecordAccessItem[] | null;
  /** The doctor has already asked for access or a renewal. */
  requested?: boolean;
}

export interface QueueData {
  entries: QueueEntry[];
  /** Students with any live care relationship; null when no source reports it. */
  activeRelationships: number | null;
  /** Null when availability is not connected. */
  accepting: boolean | null;
  /** Crisis escalations flagged in the last 24 hours; null when not reported. */
  crisisFlagged24h: number | null;
}

/** What the doctor can do next for an entry. */
export type QueueAction = 'open-consult' | 'request-access' | 'ask-renew' | 'none';

export function actionFor(entry: QueueEntry): QueueAction {
  if (entry.consent === 'active') return 'open-consult';
  if (entry.consent === 'awaiting') return 'request-access';
  if (entry.consent === 'expired') return 'ask-renew';
  // Sharing not reported: a confirmed booking can still be opened; the consult
  // room decides what is visible. A request has to be confirmed first.
  return entry.booking === 'CONFIRMED' ? 'open-consult' : 'none';
}

/** Whole minutes the student has been waiting, or null when not in the room. */
export function waitingMinutes(entry: QueueEntry, now: Date): number | null {
  if (!entry.waitingSince) return null;
  return Math.max(0, Math.floor((now.getTime() - entry.waitingSince.getTime()) / 60000));
}

export function waitingCount(data: QueueData): number {
  return data.entries.filter((entry) => entry.waitingSince).length;
}

export function confirmedCount(data: QueueData): number {
  return data.entries.filter((entry) => entry.booking === 'CONFIRMED').length;
}
