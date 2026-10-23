import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { SkIconName } from '../icons';

export type CampusNavId =
  | 'overview' | 'students' | 'blocks' | 'verification' | 'leave' | 'insights' | 'camps' | 'certificates' | 'wellness'
  | 'sos' | 'incidents' | 'ambulance' | 'care-directory' | 'counsellor' | 'access-requests' | 'emergency-access' | 'isolation' | 'discharge'
  | 'outbreak' | 'water' | 'sanitary' | 'mess' | 'sla'
  | 'team' | 'announcements' | 'reports' | 'scorecard' | 'settings';

export interface CampusNavItem {
  id: CampusNavId;
  label: MessageKey;
  /** The exact canvas drawing (design/icons/icon-manifest.json). */
  icon: SkIconName;
  route: RoutePath;
  /**
   * A count on this item is something someone is waiting on for their safety,
   * so its badge uses the danger fill (canvas: Incidents, Counsellor queue).
   * Other counts use the quiet badge on the navy.
   */
  urgent?: boolean;
}

export interface CampusNavGroup {
  label: MessageKey;
  items: CampusNavItem[];
}

/**
 * Sidebar order, grouping and drawings from the canvas (page 4: every campus
 * board draws this same sidebar). Three additions keep existing features
 * routed: "SOS alerts" leads the Safety group (the live SOS desk has no board of
 * its own and must stay one click from every page), "Medical leave" follows
 * Verification and "Health scorecard" follows Reports.
 */
export const CAMPUS_NAV: CampusNavGroup[] = [
  {
    label: 'campusShell.group.campus',
    items: [
      { id: 'overview', label: 'campusShell.nav.overview', icon: 'users-small', route: 'campus' },
      { id: 'students', label: 'campusShell.nav.students', icon: 'users', route: 'campus/students' },
      { id: 'blocks', label: 'campusShell.nav.blocks', icon: 'hostel', route: 'campus/blocks' },
      { id: 'verification', label: 'campusShell.nav.verification', icon: 'shield-check', route: 'campus/verification' },
      // Not on the canvas: the existing medical leave desk, kept beside the other approval queue.
      { id: 'leave', label: 'campusShell.nav.leave', icon: 'calendar', route: 'campus/leave' },
      { id: 'insights', label: 'campusShell.nav.insights', icon: 'bar-chart', route: 'campus/insights' },
      { id: 'camps', label: 'campusShell.nav.camps', icon: 'alert-triangle-2', route: 'campus/camps' },
      { id: 'certificates', label: 'campusShell.nav.certificates', icon: 'file-check', route: 'campus/certificates' },
      { id: 'wellness', label: 'campusShell.nav.wellness', icon: 'heart-2', route: 'campus-wellness' },
    ],
  },
  {
    label: 'campusShell.group.safety',
    items: [
      { id: 'sos', label: 'campusShell.nav.sos', icon: 'sos', route: 'campus/sos', urgent: true },
      { id: 'incidents', label: 'campusShell.nav.incidents', icon: 'alert-triangle', route: 'campus/incidents', urgent: true },
      { id: 'ambulance', label: 'campusShell.nav.ambulance', icon: 'ambulance-2', route: 'campus/ambulance' },
      // Not on the canvas: the campus's own Find care listings (hospitals, pharmacies, ambulance numbers).
      { id: 'care-directory', label: 'campusShell.nav.careDirectory', icon: 'hospital', route: 'campus/care-directory' },
      { id: 'counsellor', label: 'campusShell.nav.counsellor', icon: 'message-dots', route: 'campus/counsellor', urgent: true },
      { id: 'access-requests', label: 'campusShell.nav.accessRequests', icon: 'lock', route: 'campus-access-requests' },
      { id: 'emergency-access', label: 'campusShell.nav.emergencyAccess', icon: 'heart-plus', route: 'campus-break-glass' },
      { id: 'isolation', label: 'campusShell.nav.isolation', icon: 'window', route: 'campus/isolation' },
      { id: 'discharge', label: 'campusShell.nav.discharge', icon: 'file-minus', route: 'campus/discharge' },
    ],
  },
  {
    label: 'campusShell.group.publicHealth',
    items: [
      { id: 'outbreak', label: 'campusShell.nav.outbreak', icon: 'locate', route: 'campus/outbreak' },
      { id: 'water', label: 'campusShell.nav.water', icon: 'droplet', route: 'campus/water' },
      { id: 'sanitary', label: 'campusShell.nav.sanitary', icon: 'bottle', route: 'campus/sanitary' },
      { id: 'mess', label: 'campusShell.nav.mess', icon: 'utensils', route: 'campus/mess' },
      { id: 'sla', label: 'campusShell.nav.sla', icon: 'timer', route: 'campus/sla' },
    ],
  },
  {
    label: 'campusShell.group.admin',
    items: [
      { id: 'team', label: 'campusShell.nav.team', icon: 'user', route: 'campus/team' },
      { id: 'announcements', label: 'campusShell.nav.announcements', icon: 'volume', route: 'campus/announcements' },
      { id: 'reports', label: 'campusShell.nav.reports', icon: 'bar-chart-2', route: 'campus/reports' },
      // Not on the canvas: the existing health scorecard, kept beside Reports.
      { id: 'scorecard', label: 'campusShell.nav.scorecard', icon: 'chart', route: 'campus/scorecard' },
      { id: 'settings', label: 'campusShell.nav.settings', icon: 'settings-2', route: 'campus/settings' },
    ],
  },
];

export const CAMPUS_NAV_ITEMS: CampusNavItem[] = CAMPUS_NAV.flatMap((group) => group.items);
