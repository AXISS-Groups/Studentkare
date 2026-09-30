import type { RoutePath } from '@/lib/workflowRouting';
import type { SkIconName } from '../icons/SkIcon';

export type ClinicianNavId =
  | 'today' | 'check-in' | 'inbox' | 'queue' | 'consult-room' | 'critical-results' | 'report-reviews'
  | 'encounter-note' | 'prescribe' | 'lab-orders' | 'referrals' | 'renewals' | 'my-patients'
  | 'chronic-care' | 'ayush' | 'decision-support' | 'schedule' | 'earnings';

export interface ClinicianNavItem {
  id: ClinicianNavId;
  label: string;
  icon: SkIconName;
  /**
   * Where the item goes. `null` means the screen has not been built yet: the
   * item is shown (the console's shape is part of the design) but cannot be
   * activated, and says so to assistive tech.
   */
  route: RoutePath | null;
}

export interface ClinicianNavGroup {
  label: string;
  items: ClinicianNavItem[];
}

/** Sidebar order and grouping from the canvas (page 5, every console screen). */
export const CLINICIAN_NAV: ClinicianNavGroup[] = [
  {
    label: 'Clinical',
    items: [
      { id: 'today', label: 'Today', icon: 'today', route: 'clinician' },
      { id: 'check-in', label: 'Check in patient', icon: 'checkIn', route: null },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', route: null },
      { id: 'queue', label: 'Queue', icon: 'queue', route: 'clinician/queue' },
      { id: 'consult-room', label: 'Consult room', icon: 'video', route: null },
      { id: 'critical-results', label: 'Critical results', icon: 'flask', route: 'clinical-review' },
      { id: 'report-reviews', label: 'Report reviews', icon: 'doc', route: 'report-reviews' },
      { id: 'encounter-note', label: 'Encounter note', icon: 'note', route: 'clinical-notes' },
      { id: 'prescribe', label: 'Prescribe', icon: 'rx', route: null },
    ],
  },
  {
    label: 'Orders',
    items: [
      { id: 'lab-orders', label: 'Lab orders', icon: 'flask', route: null },
      { id: 'referrals', label: 'Referrals', icon: 'referral', route: null },
      { id: 'renewals', label: 'Renewals', icon: 'renew', route: null },
    ],
  },
  {
    label: 'Patients',
    items: [
      { id: 'my-patients', label: 'My patients', icon: 'patients', route: null },
      { id: 'chronic-care', label: 'Chronic care', icon: 'chronic', route: 'chronic' },
      { id: 'ayush', label: 'AYUSH', icon: 'leaf', route: null },
      { id: 'decision-support', label: 'Decision support', icon: 'spark', route: null },
    ],
  },
  {
    label: 'Practice',
    items: [
      { id: 'schedule', label: 'Schedule', icon: 'calendar', route: null },
      { id: 'earnings', label: 'Earnings', icon: 'earnings', route: 'earnings' },
    ],
  },
];
