import { workRepository } from '@/features/admin/model/workRepository';
import type { StaffAppointment } from '@/data/types/workflowTypes';

/**
 * The clinician's own bookings, from `GET /work/appointments` (the server
 * scopes it to the signed-in provider). This is the one real source behind
 * Today, the queue and the schedule. It carries who booked, the slot and the
 * booking's state — nothing about what the student has shared, their age or
 * why they booked, so the screens never show those as if they knew.
 */
export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Booking {
  id: string;
  patientName: string;
  status: BookingStatus;
  start: Date;
  /** Null when the server sent no usable end time. */
  end: Date | null;
}

const STATUSES: ReadonlySet<string> = new Set<BookingStatus>(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);

function isStatus(value: string): value is BookingStatus {
  return STATUSES.has(value);
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Drops anything the screens can't place honestly: no slot time, or a state they don't know. */
export function toBookings(items: StaffAppointment[]): Booking[] {
  const bookings: Booking[] = [];
  for (const item of items) {
    const start = parseDate(item.slotStart);
    if (!start || !isStatus(item.status)) continue;
    bookings.push({ id: item.id, patientName: item.customer, status: item.status, start, end: parseDate(item.slotEnd) });
  }
  return bookings.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface BookingsLoader {
  (signal?: AbortSignal): Promise<Booking[]>;
}

export const loadBookings: BookingsLoader = async (signal) => {
  const list = await workRepository.listAppointments(signal);
  return toBookings(list.items ?? []);
};

/** A booking that still holds its slot (not cancelled). */
export function isLive(booking: Booking): boolean {
  return booking.status !== 'CANCELLED';
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAYS_IN_WEEK = 7;
const MONDAY = 1;

/** Monday 00:00 local of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() - MONDAY + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  start.setDate(start.getDate() - offset);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** "09:30" — 24-hour, as the canvas prints slot times. */
export function clock24(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "Priya Nair" → "Priya N." — first name and initial, as the queue prints them. */
export function shortName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] ?? '';
  return `${words[0]} ${words[words.length - 1].charAt(0).toUpperCase()}.`;
}
