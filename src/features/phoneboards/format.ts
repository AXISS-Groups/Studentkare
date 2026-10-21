import type { MessageKey, Vars } from '@/i18n';

type Translate = (key: MessageKey, vars?: Vars) => string;

const DAY_MS = 86_400_000;

function startOfDay(at: Date): number {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
}

/** A server time as a Date: ISO strings, epoch seconds (the API's `createdAt`) or epoch ms. */
export function toDate(value: string | number): Date | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    // Epoch seconds are 10 digits until 2286; anything larger is already ms.
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "Today", "Tomorrow", "Yesterday", else "Sat 27" (the boards' day column). */
export function dayLabel(value: string | number, t: Translate, now: Date = new Date()): string {
  const at = toDate(value);
  if (!at) return '';
  const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY_MS);
  if (days === 0) return t('pb.today');
  if (days === 1) return t('pb.tomorrow');
  if (days === -1) return t('pb.yesterday');
  return at.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

/** "4:30 PM" in the device's own clock style. */
export function clockLabel(value: string | number): string {
  const at = toDate(value);
  return at ? at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}

/** "14 Sep" (the boards' short dates). */
export function shortDate(value: string | number): string {
  const at = toDate(value);
  return at ? at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
}

/** Whether a time is today, on the device's calendar. */
export function isToday(value: string | number, now: Date = new Date()): boolean {
  const at = toDate(value);
  return at !== null && startOfDay(at) === startOfDay(now);
}

/** Monday of the current week, local time (the Movement board's week). */
export function startOfWeek(now: Date = new Date()): Date {
  const day = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
}

/** "₹1,299" from paise (Indian grouping). */
export function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
