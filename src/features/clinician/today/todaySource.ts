import { isDev } from '@/core/env';
import type { Availability, TodayData } from './todayModel';

/**
 * Where ClinicianToday gets its day. The view model depends on this interface
 * only, so the endpoint-backed source can replace the sample without touching
 * the screen.
 */
export interface ClinicianTodaySource {
  /** Resolves null when the console is not connected to real schedules. */
  load(): Promise<TodayData | null>;
  /** Absent when the source cannot change availability. */
  setAvailability?: (value: Availability) => Promise<void>;
}

/**
 * Development-only sample, laid out like the canvas picture so the screen can
 * be reviewed against it. Never served outside `isDev()` (DESIGN.md §6: no
 * demo content in production builds). The start time is relative to load so
 * the countdown behaves.
 */
export const sampleTodaySource: ClinicianTodaySource = {
  async load() {
    const now = new Date();
    return {
      date: now,
      queueOpensAt: '10:00',
      campHours: 2,
      slots: [
        { id: 's1', time: '09:30', kind: 'done', title: 'Kavya Iyer', meta: 'Video · acne review', sharing: 'shared' },
        { id: 's2', time: '10:00', kind: 'next', title: 'Rohan Varma', meta: 'Video · fever 3 days', sharing: 'shared' },
        { id: 's3', time: '10:20', kind: 'chat', title: 'Arjun Nair', meta: 'Chat · allergy query', sharing: 'not-shared' },
        { id: 's4', time: '10:40', kind: 'break', title: 'Break' },
        { id: 's5', time: '11:00', kind: 'person', title: 'Diya Reddy', meta: 'In person · clinic room 2', sharing: 'shared' },
        { id: 's6', time: '11:30', kind: 'video', title: 'Sneha Patel', meta: 'Video · follow-up BP', sharing: 'shared' },
        { id: 's7', time: '12:00', kind: 'open', title: 'Open slot', meta: 'Bookable' },
        { id: 's8', time: '15:00', kind: 'camp', title: 'Block C camp prep', meta: 'Review station list' },
      ],
      next: {
        appointmentId: 'sample-rv',
        patientName: 'Rohan Varma',
        age: 19,
        summary: 'Video · fever 3 days · follow-up',
        startsAt: new Date(now.getTime() + 14 * 60 * 1000),
        checkIn: { time: '09:58', photoMatched: true },
        recordsShared: 3,
        allergies: ['Penicillin'],
      },
      waiting: {
        criticalResults: { count: 1, detail: 'Potassium 6.8 · 8 min' },
        reportsToSign: { count: 3, detail: 'Oldest 2 h' },
        followUps: { count: 4, detail: '72-h window' },
        renewals: { count: 2, detail: 'Refill requests' },
      },
      camp: {
        title: 'Camp duty',
        when: 'Block C flu camp · Sat 8:00–10:00',
        note: 'You are the supervising doctor. The lab team runs intake; you review flagged readings only.',
      },
      availability: 'taking',
    };
  },
  async setAvailability() {
    // Sample only: nothing to persist.
  },
};

/** Production until the schedule endpoints are wired: honestly nothing. */
export const unconnectedTodaySource: ClinicianTodaySource = {
  async load() {
    return null;
  },
};

export function defaultTodaySource(): ClinicianTodaySource {
  return isDev() ? sampleTodaySource : unconnectedTodaySource;
}
