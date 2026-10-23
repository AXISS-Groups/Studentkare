import type { MessageKey, Vars } from '@/i18n';

/**
 * "Add to calendar" for a camp booking: a one-event .ics file the browser
 * downloads. Moved from the old camp panel (screens/workspace/HealthCampPanel)
 * unchanged. Times are the camp's local slot times, written as floating times.
 */
type Translate = (key: MessageKey, vars?: Vars) => string;

export interface CalendarBooking {
  bookingId: string;
  camp: { name: string; date: string; location: string; whatToBring: string };
  slot: { slotStart: string; slotEnd: string };
}

const NOON = 12;

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\;').replace(/,/g, '\\,');
}

function parseSlotTime(value: string): { hours: number; minutes: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === NOON) hours = 0;
  if (match[3].toUpperCase() === 'PM') hours += NOON;
  return { hours, minutes };
}

export function icsDate(date: string, time: string): string | null {
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const parsed = parseSlotTime(time);
  if (!parsed) return null;
  const [year, month, day] = parts;
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(year, 4)}${pad(month)}${pad(day)}T${pad(parsed.hours)}${pad(parsed.minutes)}00`;
}

export function campIcs(booking: CalendarBooking, t: Translate): string | null {
  const start = icsDate(booking.camp.date, booking.slot.slotStart);
  const end = icsDate(booking.camp.date, booking.slot.slotEnd);
  if (!start || !end) return null;
  const place = booking.camp.location || t('care.campus');
  const description = [
    t('care.camp.ics.camp', { name: booking.camp.name }),
    t('care.camp.ics.slot', { start: booking.slot.slotStart, end: booking.slot.slotEnd }),
    t('care.camp.ics.place', { place }),
    t('care.camp.ics.bring', { items: booking.camp.whatToBring || t('care.camp.nothingToBring') }),
  ].join('\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studentkare//Health Camp//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${booking.bookingId}@studentkare`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(booking.camp.name)}`, `LOCATION:${escapeIcsText(place)}`, `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

/** Web only: download the booking as an .ics file. Does nothing when the slot time can't be read. */
export function addBookingToCalendar(booking: CalendarBooking, t: Translate): void {
  const ics = campIcs(booking, t);
  if (!ics || typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${booking.camp.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'health-camp'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
