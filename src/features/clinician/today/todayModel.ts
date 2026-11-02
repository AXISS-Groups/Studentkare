/**
 * ClinicianToday (design page 5, Tier 2): the doctor's day at a glance.
 * Pure types and helpers — no React, no MobX — so they are testable alone.
 * Copy lives in the `clinToday.*` catalogue; helpers return keys or numbers.
 */
import type { MessageKey } from '@/i18n';

export { initialsOf } from '../shared/names';

/**
 * `done`, `next`, `booked`, `requested` and `missed` come from the doctor's
 * bookings. `video`, `chat`, `person`, `break`, `open` and `camp` are the
 * canvas's other rows; they show only when a source reports them (none does yet).
 */
export type SlotKind = 'done' | 'next' | 'booked' | 'requested' | 'missed' | 'video' | 'chat' | 'person' | 'break' | 'open' | 'camp';

/** Whether the student has shared records for this consult. */
type SlotSharing = 'shared' | 'not-shared';

export interface TodaySlot {
  id: string;
  /** Local time, 24 h "HH:MM". */
  time: string;
  kind: SlotKind;
  /** Student name, or the block's name ("Break", "Open slot"). */
  title: string;
  /** A line from the source (e.g. "Video · acne review"); otherwise the kind's own line. */
  meta?: string;
  /** Absent when no source reports sharing. */
  sharing?: SlotSharing;
}

export interface NextConsult {
  appointmentId: string;
  patientName: string;
  /** e.g. "Video · fever 3 days · follow-up", when a source reports it. */
  summary?: string;
  startsAt: Date;
  /** Records shared for this consult; null when no source reports sharing. */
  recordsShared: number | null;
}

export interface WaitingItem {
  /** Null when no source reports it — shown as "—", never as 0. */
  count: number | null;
}

interface WaitingOnYou {
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
  /** "HH:MM" of the first booking today; omitted when there is none. */
  queueOpensAt?: string;
  /** Null when no source reports camp duty. */
  campHours: number | null;
  slots: TodaySlot[];
  next: NextConsult | null;
  waiting: WaitingOnYou;
  camp: CampDuty | null;
  /** Null when availability is not connected. */
  availability: Availability | null;
}

const CONSULT_KINDS: ReadonlySet<SlotKind> = new Set(['done', 'next', 'booked', 'requested', 'missed', 'video', 'chat', 'person']);

function isConsult(slot: TodaySlot): boolean {
  return CONSULT_KINDS.has(slot.kind);
}

/** Counted from the slots, not stated. */
export function dayCounts(data: Pick<TodayData, 'slots' | 'campHours'>): { consults: number; campHours: number; breaks: number } {
  return {
    consults: data.slots.filter(isConsult).length,
    campHours: data.campHours ?? 0,
    breaks: data.slots.filter((slot) => slot.kind === 'break').length,
  };
}

/** Nothing waiting that a source reports, and nothing booked. */
export function isQuietDay(data: TodayData): boolean {
  const counts = Object.values(data.waiting).map((item: WaitingItem) => item.count ?? 0);
  return data.slots.length === 0 && data.next === null && counts.every((count) => count === 0);
}

const NOON = 12;
const EVENING = 17;

/** Before 12:00, before 17:00, then evening. */
export function greetingKey(now: Date): MessageKey {
  const hour = now.getHours();
  if (hour < NOON) return 'clinToday.greeting.morning';
  if (hour < EVENING) return 'clinToday.greeting.afternoon';
  return 'clinToday.greeting.evening';
}

/** "Dr. Sameer Menon" gives "Menon"; the view adds the title. Empty when there is no name. */
export function surname(fullName: string): string {
  const words = fullName.replace(/^dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return words[words.length - 1] ?? '';
}

/** "Thursday, 24 September" */
export function longDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thursday 24 Sep" (three-letter month, as on the canvas — not the locale's "Sept"). */
export function cardDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  return `${weekday} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** "Wed 30 Sep" — the top bar on a phone. */
export function shortDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  return `${weekday} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** Milliseconds as "00:14:00". Negative input clamps to zero. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Spoken form for the timer, as a key and its values. */
export function countdownSpoken(ms: number): { key: MessageKey; vars?: Record<string, number> } {
  if (ms <= 0) return { key: 'clinToday.timer.now' };
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return { key: 'clinToday.timer.minutes', vars: { minutes } };
  return { key: 'clinToday.timer.hours', vars: { hours: Math.floor(minutes / 60), minutes: minutes % 60 } };
}
