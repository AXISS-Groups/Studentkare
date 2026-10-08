import { isDev } from '@/core/env';
import type { QueueData } from './queueModel';

export interface ClinicianQueueSource {
  /** Null when the console is not connected to real consents. */
  load(): Promise<QueueData | null>;
  /**
   * Ask the student to share (awaiting) or renew (expired). The student
   * decides; this only sends the request. Absent when the source can't.
   */
  requestAccess?: (entryId: string) => Promise<void>;
}

const LOCKED_BEFORE_WINDOW = { id: 'window', label: 'Records before Aug 2026', reason: 'Outside the consent window', open: false };

/** Development-only sample laid out like the canvas. Never served outside `isDev()`. */
export const sampleQueueSource: ClinicianQueueSource = {
  async load() {
    const now = Date.now();
    return {
      activeRelationships: 6,
      accepting: true,
      crisisFlagged24h: 1,
      entries: [
        {
          id: 'q1',
          patientName: 'Priya N.',
          reason: 'Sore throat and fever since last night',
          consent: 'active',
          scope: 'Shared: 2 lab reports, 1 prescription · expires in 12 days',
          waitingSince: new Date(now - 4 * 60000),
          access: [
            { id: 'a1', label: 'Vitamin D Test — 20 Sep', reason: 'Shared by Priya on 21 Sep for this consult', open: true },
            { id: 'a2', label: 'Complete Blood Count — 04 Aug', reason: 'Shared by Priya on 21 Sep for this consult', open: true },
            LOCKED_BEFORE_WINDOW,
          ],
        },
        {
          id: 'q2',
          patientName: 'Arjun M.',
          reason: 'Follow-up on iron panel',
          consent: 'active',
          scope: 'Shared: 1 lab report · expires in 3 days',
          waitingSince: new Date(now - 11 * 60000),
          access: [
            { id: 'b1', label: 'Iron studies — 12 Sep', reason: 'Shared by Arjun on 22 Sep for this consult', open: true },
            LOCKED_BEFORE_WINDOW,
          ],
        },
        {
          id: 'q3',
          patientName: 'Sneha K.',
          reason: 'Requested a dermatology referral',
          consent: 'awaiting',
          scope: 'No records shared — request access to proceed',
          scheduledAt: '2:30 PM',
          access: [{ id: 'c1', label: 'No records shared', reason: 'Sneha has not shared anything with you yet', open: false }],
        },
        {
          id: 'q4',
          patientName: 'Rahul V.',
          reason: 'Post-consult review',
          consent: 'expired',
          scope: 'Access lapsed 2 days ago — records now sealed',
          scheduledAt: '4:00 PM',
          access: [{ id: 'd1', label: 'All shared records', reason: 'Access lapsed 2 days ago — sealed until Rahul renews', open: false }],
        },
      ],
    };
  },
  async requestAccess() {
    // Sample only: nothing is sent.
  },
};

export const unconnectedQueueSource: ClinicianQueueSource = {
  async load() {
    return null;
  },
};

export function defaultQueueSource(): ClinicianQueueSource {
  return isDev() ? sampleQueueSource : unconnectedQueueSource;
}
