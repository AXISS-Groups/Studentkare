import { apiRequest } from '@/data/services/http';
import { clock24, isLive, loadBookings, sameLocalDay } from '../shared/appointmentsSource';
import type { Booking, BookingsLoader } from '../shared/appointmentsSource';
import type { Availability, NextConsult, SlotKind, TodayData, TodaySlot } from './todayModel';

/**
 * Where ClinicianToday gets its day. The view model depends on this interface
 * only.
 */
export interface ClinicianTodaySource {
  /** Resolves null when the console is not connected to real schedules. */
  load(): Promise<TodayData | null>;
  /** Absent when the source cannot change availability. */
  setAvailability?: (value: Availability) => Promise<void>;
}

/** A count from a list endpoint, or null when it can't be read — one tile's "—", never the page. */
export type CountLoader = () => Promise<number | null>;

async function totalOf(path: string): Promise<number | null> {
  try {
    const page = await apiRequest<{ total?: number }>(path);
    return typeof page.total === 'number' ? page.total : null;
  } catch {
    return null;
  }
}

/** Unacknowledged critical results this doctor may review (`GET /work/critical-results`). */
const criticalResultsCount: CountLoader = () => totalOf('/work/critical-results');
/** Report reviews assigned to this doctor (`GET /preventive/work/report-reviews`, services/preventive_care.py). */
const REPORTS_TO_SIGN_PATH = '/preventive/work/report-reviews?offset=0&limit=1';
const reportsToSignCount: CountLoader = () => totalOf(REPORTS_TO_SIGN_PATH);

const KIND_BY_STATUS: Record<Booking['status'], SlotKind> = {
  COMPLETED: 'done',
  CONFIRMED: 'booked',
  REQUESTED: 'requested',
  NO_SHOW: 'missed',
  CANCELLED: 'missed',
};

/** The next confirmed booking that has not ended yet. */
function nextBooking(bookings: Booking[], now: Date): Booking | null {
  return bookings.find((booking) => booking.status === 'CONFIRMED' && (booking.end ?? booking.start).getTime() > now.getTime()) ?? null;
}

/**
 * The day from the doctor's own bookings (`GET /work/appointments`) and two
 * counts. What no endpoint reports — sharing, the student's age or reason,
 * check-in, follow-up messages, renewals, camp duty, availability — is left
 * empty and shown as not reported. Nothing is filled in.
 */
export function bookingsTodaySource(
  load: BookingsLoader = loadBookings,
  counts: { critical: CountLoader; reports: CountLoader } = { critical: criticalResultsCount, reports: reportsToSignCount },
  now: () => Date = () => new Date(),
): ClinicianTodaySource {
  return {
    async load() {
      const today = now();
      const [bookings, critical, reports] = await Promise.all([load(), counts.critical(), counts.reports()]);
      const todays = bookings.filter((booking) => isLive(booking) && sameLocalDay(booking.start, today));
      const upcoming = nextBooking(todays, today);
      const slots: TodaySlot[] = todays.map((booking) => ({
        id: booking.id,
        time: clock24(booking.start),
        kind: booking.id === upcoming?.id ? 'next' : KIND_BY_STATUS[booking.status],
        title: booking.patientName,
      }));
      const next: NextConsult | null = upcoming
        ? { appointmentId: upcoming.id, patientName: upcoming.patientName, startsAt: upcoming.start, recordsShared: null }
        : null;
      return {
        date: today,
        queueOpensAt: todays[0] ? clock24(todays[0].start) : undefined,
        campHours: null,
        slots,
        next,
        waiting: { criticalResults: { count: critical }, reportsToSign: { count: reports }, followUps: { count: null }, renewals: { count: null } },
        camp: null,
        availability: null,
      };
    },
  };
}

export function defaultTodaySource(): ClinicianTodaySource {
  return bookingsTodaySource();
}
