import { apiRequest } from '@/data/services/http';
import type { MessageKey, Vars } from '@/i18n';

/**
 * Small pieces the doctor's clinical screens (WP-13) share: the translator
 * type, the request seam, "how long ago", and the doctor's own patients from
 * their confirmed or completed appointments — the only people the server lets
 * them write a note, a prescription or a lab order for.
 */
export type T = (key: MessageKey, vars?: Vars) => string;
export type Request = typeof apiRequest;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "11 min", "3 hr 4 min", "2 days 1 hr" — the console's existing wait wording. */
export function waitedFor(seconds: number, t: T): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < MINUTE) return t('partner.core.wait.seconds', { n: s });
  if (s < HOUR) return t('partner.core.wait.minutes', { n: Math.floor(s / MINUTE) });
  if (s < DAY) return t('partner.core.wait.hoursMinutes', { h: Math.floor(s / HOUR), m: Math.floor((s % HOUR) / MINUTE) });
  const days = Math.floor(s / DAY);
  const hours = Math.floor((s % DAY) / HOUR);
  if (days === 1) return hours ? t('partner.core.wait.dayOneHours', { h: hours }) : t('partner.core.wait.dayOne');
  return hours ? t('partner.core.wait.daysHours', { n: days, h: hours }) : t('partner.core.wait.days', { n: days });
}

/** "21 Oct 2026, 10:02" in the viewer's locale, from epoch seconds. */
function dateTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "21 Oct 2026" from epoch seconds. */
export function dateOnly(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** GET /work/appointments: items[] (the doctor's own). */
export interface CareAppointment {
  id: string;
  patientId: string;
  /** The student's name as booked. */
  customer: string;
  /** ISO local time, e.g. "2026-10-21T10:00". */
  slotStart: string;
  status: string;
}

const IN_CARE = new Set(['CONFIRMED', 'COMPLETED']);

/** Confirmed or completed appointments with this doctor, newest first. */
export async function careAppointments(request: Request = apiRequest): Promise<CareAppointment[]> {
  const res = await request<{ items: CareAppointment[] }>('/work/appointments');
  return res.items.filter((a) => IN_CARE.has(a.status)).sort((a, b) => b.slotStart.localeCompare(a.slotStart));
}

/** patientId to name, from the doctor's own appointments. */
export function namesByPatient(appointments: CareAppointment[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const appt of appointments) if (!names.has(appt.patientId) && appt.customer) names.set(appt.patientId, appt.customer);
  return names;
}

/** "2026-10-21T10:00" becomes "21 Oct, 10:00" without a timezone shift (the slot is local). */
export function slotLabel(slotStart: string): string {
  const [date, time = ''] = slotStart.split('T');
  const [, month, day] = date.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[Number(month) - 1];
  if (!m || !day) return slotStart;
  return `${day} ${m}${time ? `, ${time.slice(0, 5)}` : ''}`;
}
