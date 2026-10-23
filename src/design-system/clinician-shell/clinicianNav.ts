import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { SkIconName } from '../icons';
import type { MessageKey } from '@/i18n';

export type ClinicianNavId =
  | 'today' | 'check-in' | 'inbox' | 'queue' | 'consult-room' | 'critical-results' | 'report-reviews'
  | 'encounter-note' | 'prescribe' | 'lab-orders' | 'referrals' | 'renewals' | 'my-patients'
  | 'chronic-care' | 'ayush' | 'decision-support' | 'schedule' | 'earnings' | 'post-reviews';

export interface ClinicianNavItem {
  id: ClinicianNavId;
  /** English name (stable for tests); `labelKey` is what the sidebar shows, in the chosen language. */
  label: string;
  labelKey: MessageKey;
  /** Manifest icon name from the ClinicianConsole brief. */
  icon: SkIconName;
  /**
   * Where the item goes. `null` means the screen has not been built yet: the
   * item is shown (the console's shape is part of the design) but cannot be
   * activated, and says so to assistive tech.
   */
  route: RoutePath | null;
  /**
   * The new screen for this item while it awaits a named design reviewer and
   * clinical sign-off (DESIGN.md §5). Opened only when the shell is told to
   * (development); production keeps `route`.
   */
  previewRoute?: RoutePath;
}

export interface ClinicianNavGroup {
  label: string;
  labelKey: MessageKey;
  items: ClinicianNavItem[];
}

/**
 * Sidebar order, grouping, labels and icons from the canvas (page 5, every console
 * screen; icons as named in design/screens/briefs/ClinicianConsole.md).
 * "Check in patient" opens WebScanVerify on the canvas; that route is open to
 * partners and the super admin only, so it stays unavailable for clinicians.
 */
export const CLINICIAN_NAV: ClinicianNavGroup[] = [
  {
    label: 'Clinical',
    labelKey: 'console.clin.group.clinical',
    items: [
      { id: 'today', label: 'Today', labelKey: 'console.clin.nav.today', icon: 'clock', route: 'clinician' },
      { id: 'check-in', label: 'Check in patient', labelKey: 'console.clin.nav.checkIn', icon: 'scan', route: null },
      { id: 'inbox', label: 'Inbox', labelKey: 'console.clin.nav.inbox', icon: 'inbox', route: 'clinician/inbox' },
      { id: 'queue', label: 'Queue', labelKey: 'console.clin.nav.queue', icon: 'align-left', route: 'clinician/queue' },
      { id: 'consult-room', label: 'Consult room', labelKey: 'console.clin.nav.consultRoom', icon: 'video-2', route: 'clinician/consult-room' },
      { id: 'critical-results', label: 'Critical results', labelKey: 'console.clin.nav.criticalResults', icon: 'flask', route: 'clinician/critical-results' },
      { id: 'report-reviews', label: 'Report reviews', labelKey: 'console.clin.nav.reportReviews', icon: 'file', route: 'clinician/report-reviews' },
      // Not on the design canvas: health tip posts waiting for a clinician's approval (features/newsroom).
      { id: 'post-reviews', label: 'Health tip reviews', labelKey: 'news.adm.rev.title', icon: 'heart-pulse', route: 'clinician/post-reviews' },
      { id: 'encounter-note', label: 'Encounter note', labelKey: 'console.clin.nav.encounterNote', icon: 'doc', route: 'clinician/encounter-note' },
      { id: 'prescribe', label: 'Prescribe', labelKey: 'console.clin.nav.prescribe', icon: 'prescription', route: 'clinician/prescribe' },
    ],
  },
  {
    label: 'Orders',
    labelKey: 'console.clin.group.orders',
    items: [
      { id: 'lab-orders', label: 'Lab orders', labelKey: 'console.clin.nav.labOrders', icon: 'flask', route: 'clinician/lab-orders' },
      { id: 'referrals', label: 'Referrals', labelKey: 'console.clin.nav.referrals', icon: 'arrow-up-right', route: 'clinician/referrals' },
      { id: 'renewals', label: 'Renewals', labelKey: 'console.clin.nav.renewals', icon: 'repeat', route: 'clinician/renewals' },
    ],
  },
  {
    label: 'Patients',
    labelKey: 'console.clin.group.patients',
    items: [
      { id: 'my-patients', label: 'My patients', labelKey: 'console.clin.nav.myPatients', icon: 'users', route: 'clinician/patients' },
      { id: 'chronic-care', label: 'Chronic care', labelKey: 'console.clin.nav.chronicCare', icon: 'heart', route: 'chronic' },
      { id: 'ayush', label: 'AYUSH', labelKey: 'console.clin.nav.ayush', icon: 'leaf', route: 'clinician/ayush' },
      { id: 'decision-support', label: 'Decision support', labelKey: 'console.clin.nav.decisionSupport', icon: 'sparkle', route: 'clinician/decision-support' },
    ],
  },
  {
    label: 'Practice',
    labelKey: 'console.clin.group.practice',
    items: [
      { id: 'schedule', label: 'Schedule', labelKey: 'console.clin.nav.schedule', icon: 'calendar-2', route: 'clinician/schedule' },
      { id: 'earnings', label: 'Earnings', labelKey: 'console.clin.nav.earnings', icon: 'banknote', route: 'earnings' },
    ],
  },
];
