import type { Lang, MessageKey, Vars } from '@/i18n';

type T = (key: MessageKey, vars?: Vars) => string;

const LOCALE: Record<Lang, string> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Tomorrow, 6:30 am – 7:30 am" in the reader's language. The slot's own instant, shown in local time. */
export function slotLabel(t: T, lang: Lang, start: string, end: string, now: Date = new Date()): string {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime())) return start;
  const time = (d: Date) => d.toLocaleTimeString(LOCALE[lang], { hour: 'numeric', minute: '2-digit' });
  const range = Number.isNaN(e.getTime()) ? time(s) : `${time(s)} – ${time(e)}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(s, now)) return t('labbook.slot.today', { range });
  if (sameDay(s, tomorrow)) return t('labbook.slot.tomorrow', { range });
  const day = s.toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'short' });
  return t('labbook.slot.day', { day, range });
}

/** "2 tests · report in 24 hours" from the package's own breakdown. */
export function packageMeta(t: T, includes: string[], reportHours: number): string {
  const parts: string[] = [];
  if (includes.length === 1) parts.push(t('labbook.testsOne'));
  else if (includes.length > 1) parts.push(t('labbook.tests', { count: includes.length }));
  if (reportHours > 0) parts.push(t('labbook.reportIn', { hours: reportHours }));
  return parts.join(' · ');
}

/** A short booking reference for the student and support (never a provider id). */
export const bookingRef = (orderId: string) => `LB-${orderId.slice(0, 8).toUpperCase()}`;
