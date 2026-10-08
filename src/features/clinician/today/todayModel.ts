/**
 * ClinicianToday (design page 5, Tier 2): the doctor's day at a glance.
 * Pure types and helpers — no React, no MobX — so they are testable alone.
 */

export { initialsOf } from '../shared/names';

export type SlotKind = 'done' | 'next' | 'video' | 'chat' | 'person' | 'break' | 'open' | 'camp';

/** Whether the student has shared records for this consult. */
export type SlotSharing = 'shared' | 'not-shared';

export interface TodaySlot {
  id: string;
  /** Local time, 24 h "HH:MM". */
  time: string;
  kind: SlotKind;
  /** Student name, or the block's name ("Break", "Open slot"). */
  title: string;
  meta?: string;
  sharing?: SlotSharing;
}

export interface CheckInVerification {
  /** "HH:MM" */
  time: string;
  photoMatched: boolean;
}

export interface NextConsult {
  appointmentId: string;
  patientName: string;
  age: number;
  /** e.g. "Video · fever 3 days · follow-up" */
  summary: string;
  startsAt: Date;
  /** Absent until the student has checked in. */
  checkIn?: CheckInVerification;
  recordsShared: number;
  /** Recorded by the student; shown as-is, never inferred. */
  allergies: string[];
}

export interface WaitingItem {
  count: number;
  /** One line under the label, e.g. "Oldest 2 h". */
  detail?: string;
}

export interface WaitingOnYou {
  criticalResults: WaitingItem;
  reportsToSign: WaitingItem;
  followUps: WaitingItem;
  renewals: WaitingItem;
}

export interface CampDuty {
  title: string;
  when: string;
  note: string;
}

export type Availability = 'taking' | 'paused';

export interface TodayData {
  date: Date;
  /** "HH:MM" the queue opens; omitted when there is no queue today. */
  queueOpensAt?: string;
  campHours: number;
  slots: TodaySlot[];
  next: NextConsult | null;
  waiting: WaitingOnYou;
  camp: CampDuty | null;
  availability: Availability;
}

const CONSULT_KINDS: ReadonlySet<SlotKind> = new Set(['done', 'next', 'video', 'chat', 'person']);

export function isConsult(slot: TodaySlot): boolean {
  return CONSULT_KINDS.has(slot.kind);
}

/** "5 consults · 2 camp hours · 1 break" — counted from the slots, not stated. */
export function daySummary(data: Pick<TodayData, 'slots' | 'campHours'>): string {
  const consults = data.slots.filter(isConsult).length;
  const breaks = data.slots.filter((slot) => slot.kind === 'break').length;
  const parts = [plural(consults, 'consult')];
  if (data.campHours > 0) parts.push(plural(data.campHours, 'camp hour'));
  if (breaks > 0) parts.push(plural(breaks, 'break'));
  return parts.join(' · ');
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** "Good morning" before 12:00, "Good afternoon" before 17:00, then "Good evening". */
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Dr. Sameer Menon" → "Dr. Menon"; a name without the title still gets one. */
export function formalName(fullName: string): string {
  const words = fullName.replace(/^dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  const surname = words[words.length - 1];
  return surname ? `Dr. ${surname}` : 'Doctor';
}

/** "Thursday, 24 September" */
export function longDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today · Thursday 24 Sep" (three-letter month, as on the canvas — not the locale's "Sept"). */
export function cardDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  return `Today · ${weekday} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** "Wed 30 Sep" — the top bar on a phone. */
export function shortDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  return `${weekday} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** Milliseconds → "00:14:00". Negative input clamps to zero. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Spoken form for the timer: "14 minutes until start". */
export function countdownLabel(ms: number): string {
  if (ms <= 0) return 'Due to start now';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} until start`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minutes` : ''} until start`;
}
