import type { QueueData } from '../queueModel';
import type { Booking } from '../../shared/appointmentsSource';

/**
 * Test fixtures only. A queue as a consent-reporting source would send it (no
 * such source exists yet), and the doctor's bookings as the live API sends them.
 */
export function consentQueue(now: Date): QueueData {
  const locked = { id: 'window', label: 'Records before Aug 2026', reason: 'Outside the consent window', open: false };
  return {
    activeRelationships: 6,
    accepting: true,
    crisisFlagged24h: 1,
    entries: [
      { id: 'q1', patientName: 'Priya Nair', booking: 'CONFIRMED', consent: 'active', reason: 'Sore throat and fever since last night', scope: 'Shared: 2 lab reports', waitingSince: new Date(now.getTime() - 4 * 60000),
        access: [{ id: 'a1', label: 'Vitamin D Test — 20 Sep', reason: 'Shared by Priya on 21 Sep for this consult', open: true }, locked] },
      { id: 'q2', patientName: 'Arjun Mehta', booking: 'CONFIRMED', consent: 'active', waitingSince: new Date(now.getTime() - 11 * 60000), access: [locked] },
      { id: 'q3', patientName: 'Sneha Kumar', booking: 'CONFIRMED', consent: 'awaiting', scheduledAt: new Date(now.getTime() + 60 * 60000), access: [] },
      { id: 'q4', patientName: 'Rahul Varma', booking: 'CONFIRMED', consent: 'expired', scheduledAt: new Date(now.getTime() + 2 * 60 * 60000),
        access: [{ id: 'd1', label: 'All shared records', reason: 'Access lapsed 2 days ago — sealed until Rahul renews', open: false }] },
    ],
  };
}

export function bookingsFor(now: Date): Booking[] {
  const at = (hours: number, minutes = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10);
  return [
    { id: 'b1', patientName: 'Kavya Iyer', status: 'COMPLETED', start: at(9, 30), end: at(9, 45) },
    { id: 'b2', patientName: 'Rohan Varma', status: 'CONFIRMED', start: at(10), end: at(10, 15) },
    { id: 'b3', patientName: 'Arjun Nair', status: 'REQUESTED', start: at(10, 20), end: at(10, 35) },
    { id: 'b4', patientName: 'Diya Reddy', status: 'CANCELLED', start: at(11), end: at(11, 15) },
    { id: 'b5', patientName: 'Sneha Patel', status: 'NO_SHOW', start: at(11, 30), end: at(11, 45) },
    { id: 'b6', patientName: 'Old Booking', status: 'CONFIRMED', start: yesterday, end: null },
  ];
}
