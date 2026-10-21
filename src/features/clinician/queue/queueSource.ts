import { isLive, loadBookings, sameLocalDay } from '../shared/appointmentsSource';
import type { BookingsLoader } from '../shared/appointmentsSource';
import type { QueueData, QueueEntry } from './queueModel';

export interface ClinicianQueueSource {
  /** Null when the console is not connected to anything real. */
  load(): Promise<QueueData | null>;
  /**
   * Ask the student to share (awaiting) or renew (expired). The student
   * decides; this only sends the request. Absent when the source can't.
   */
  requestAccess?: (entryId: string) => Promise<void>;
}

/**
 * Today's queue from the doctor's own bookings (`GET /work/appointments`):
 * today's requests and confirmed consults, in slot order. That API reports
 * no sharing, waiting room, availability or crisis flags, so those stay
 * "not reported" — never filled in. No request-access action: nothing on the
 * server sends one.
 */
export function bookingsQueueSource(load: BookingsLoader = loadBookings, now: () => Date = () => new Date()): ClinicianQueueSource {
  return {
    async load() {
      const today = now();
      const entries: QueueEntry[] = [];
      for (const booking of await load()) {
        if (!isLive(booking) || !sameLocalDay(booking.start, today)) continue;
        if (booking.status !== 'REQUESTED' && booking.status !== 'CONFIRMED') continue;
        entries.push({
          id: booking.id,
          patientName: booking.patientName,
          booking: booking.status,
          consent: 'unreported',
          scheduledAt: booking.start,
          access: null,
        });
      }
      return { entries, activeRelationships: null, accepting: null, crisisFlagged24h: null };
    },
  };
}

export function defaultQueueSource(): ClinicianQueueSource {
  return bookingsQueueSource();
}
