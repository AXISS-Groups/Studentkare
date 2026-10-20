import React, { lazy } from 'react';
import type { CampusNavId } from '@/design-system';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * Every page-4 board and where it lives. `screen: null` means the board has no
 * screen or data source yet: the console still routes to it (the sidebar is part
 * of the design) and shows an honest "not connected" page, never sample data.
 *
 * `topBar` follows the canvas: the Overview, Students, Insights, Incidents,
 * Counsellor, Access requests, Emergency access, Certificates, Admin team,
 * Announcements, Reports and Settings boards draw the scope/search top bar; the
 * other boards are sidebar and page only.
 *
 * Tier 1 boards (Insights, Incidents, Ambulance, Isolation, Access requests,
 * Emergency access, SOS) render their existing screens unchanged; only the
 * wrapper around them moved from the old tab hub into this shell.
 */
export interface CampusPage {
  current: CampusNavId | null;
  /** Canvas board name (design/screens/briefs/<board>.md). */
  board: string;
  title: MessageKey;
  topBar: boolean;
  screen: React.ComponentType | null;
}

const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const CampusOverviewScreen = named(() => import('@/features/campus/overview/CampusOverviewScreen'), 'CampusOverviewScreen');
const StudentRosterScreen = named(() => import('@/screens/institution/StudentRosterScreen'), 'StudentRosterScreen');
const MultiBlockConfigScreen = named(() => import('@/screens/institution/MultiBlockConfigScreen'), 'MultiBlockConfigScreen');
const CampusVerificationPanel = named(() => import('@/screens/workspace/CampusVerificationPanel'), 'CampusVerificationPanel');
const CampusHealthInsightsScreen = named(() => import('@/screens/institution/CampusHealthInsightsScreen'), 'CampusHealthInsightsScreen');
const CampusHealthCampHostScreen = named(() => import('@/screens/institution/CampusHealthCampHostScreen'), 'CampusHealthCampHostScreen');
const WellnessWorkshopsScreen = named(() => import('@/screens/institution/WellnessWorkshopsScreen'), 'WellnessWorkshopsScreen');
const CampusSosDesk = named(() => import('@/screens/institution/CampusSosDesk'), 'CampusSosDesk');
const CampusIncidentsDeskScreen = named(() => import('@/screens/institution/CampusIncidentsDeskScreen'), 'CampusIncidentsDeskScreen');
const AmbulanceDispatchTrackerScreen = named(() => import('@/screens/institution/AmbulanceDispatchTrackerScreen'), 'AmbulanceDispatchTrackerScreen');
const CampusAccessRequests = named(() => import('@/screens/institution/CampusAccessRequests'), 'CampusAccessRequests');
const CampusBreakGlass = named(() => import('@/screens/institution/CampusBreakGlass'), 'CampusBreakGlass');
const OutbreakIsolationDeskScreen = named(() => import('@/screens/institution/OutbreakIsolationDeskScreen'), 'OutbreakIsolationDeskScreen');
const HostelOutbreakEarlyWarningRadar = named(() => import('@/components/institution/HostelOutbreakEarlyWarningRadar'), 'HostelOutbreakEarlyWarningRadar');
const WaterContaminationRadarScreen = named(() => import('@/screens/institution/WaterContaminationRadarScreen'), 'WaterContaminationRadarScreen');
const HostelSanitaryAuditScreen = named(() => import('@/screens/institution/HostelSanitaryAuditScreen'), 'HostelSanitaryAuditScreen');
const MessAndDiet = lazy(() => Promise.all([
  import('@/screens/institution/MessFoodPoisoningDeskScreen'),
  import('@/screens/institution/MealDietRestrictionsScreen'),
]).then(([mess, diet]) => ({
  // One board on the canvas (Mess & diet); two existing desks, shown in that order.
  default: () => <><mess.MessFoodPoisoningDeskScreen /><diet.MealDietRestrictionsScreen /></>,
})));
const CampusAdminTeamScreen = named(() => import('@/screens/institution/CampusAdminTeamScreen'), 'CampusAdminTeamScreen');
const CampusAggregateScreen = named(() => import('@/screens/institution/Flow11InstitutionConsoleScreen'), 'Flow11InstitutionConsoleScreen');
const CounsellorOnlyPage = named(() => import('./CampusPendingPage'), 'CampusCounsellorOnlyPage');
const NotificationInboxPanel = named(() => import('@/screens/workspace/NotificationInboxPanel'), 'NotificationInboxPanel');
const SupportPanel = lazy(() => import('@/screens/workspace/MemberPanels').then((module) => ({ default: () => <module.SupportPanel /> })));

export const CAMPUS_PAGES: Partial<Record<RoutePath, CampusPage>> = {
  campus: { current: 'overview', board: 'CampusOverview', title: 'campusShell.nav.overview', topBar: true, screen: CampusOverviewScreen },
  'campus/students': { current: 'students', board: 'CampusRoster', title: 'campusShell.nav.students', topBar: true, screen: StudentRosterScreen },
  'campus/blocks': { current: 'blocks', board: 'CampusBlocks', title: 'campusShell.nav.blocks', topBar: false, screen: MultiBlockConfigScreen },
  'campus/verification': { current: 'verification', board: 'CampusApprovals', title: 'campusShell.nav.verification', topBar: false, screen: CampusVerificationPanel },
  'campus/insights': { current: 'insights', board: 'CampusInsights', title: 'campusShell.nav.insights', topBar: true, screen: CampusHealthInsightsScreen },
  'campus/camps': { current: 'camps', board: 'CampusCamps', title: 'campusShell.nav.camps', topBar: false, screen: CampusHealthCampHostScreen },
  'campus/certificates': { current: 'certificates', board: 'CampusCertificates', title: 'campusShell.nav.certificates', topBar: true, screen: null },
  'campus-wellness': { current: 'wellness', board: 'CampusWellness', title: 'campusShell.nav.wellness', topBar: false, screen: WellnessWorkshopsScreen },
  // No board of its own on the canvas: the live, approved SOS desk the old hub opened on.
  'campus/sos': { current: 'sos', board: 'CampusSosDesk', title: 'campusShell.nav.sos', topBar: true, screen: CampusSosDesk },
  'campus/incidents': { current: 'incidents', board: 'CampusIncidents', title: 'campusShell.nav.incidents', topBar: true, screen: CampusIncidentsDeskScreen },
  'campus/ambulance': { current: 'ambulance', board: 'CampusAmbulance', title: 'campusShell.nav.ambulance', topBar: false, screen: AmbulanceDispatchTrackerScreen },
  'campus/counsellor': { current: 'counsellor', board: 'CampusCounsellor', title: 'campusShell.nav.counsellor', topBar: true, screen: CounsellorOnlyPage },
  'campus-access-requests': { current: 'access-requests', board: 'CampusAccessRequests', title: 'campusShell.nav.accessRequests', topBar: true, screen: CampusAccessRequests },
  'campus-break-glass': { current: 'emergency-access', board: 'CampusBreakGlass', title: 'campusShell.nav.emergencyAccess', topBar: true, screen: CampusBreakGlass },
  'campus/isolation': { current: 'isolation', board: 'CampusIsolation', title: 'campusShell.nav.isolation', topBar: false, screen: OutbreakIsolationDeskScreen },
  'campus/discharge': { current: 'discharge', board: 'CampusDischarge', title: 'campusShell.nav.discharge', topBar: false, screen: null },
  'campus/outbreak': { current: 'outbreak', board: 'CampusOutbreak', title: 'campusShell.nav.outbreak', topBar: false, screen: HostelOutbreakEarlyWarningRadar },
  'campus/water': { current: 'water', board: 'CampusWater', title: 'campusShell.nav.water', topBar: false, screen: WaterContaminationRadarScreen },
  'campus/sanitary': { current: 'sanitary', board: 'CampusSanitary', title: 'campusShell.nav.sanitary', topBar: false, screen: HostelSanitaryAuditScreen },
  'campus/mess': { current: 'mess', board: 'CampusMess', title: 'campusShell.nav.mess', topBar: false, screen: MessAndDiet },
  'campus/sla': { current: 'sla', board: 'CampusSla', title: 'campusShell.nav.sla', topBar: false, screen: null },
  'campus/team': { current: 'team', board: 'CampusAdminTeam', title: 'campusShell.nav.team', topBar: true, screen: CampusAdminTeamScreen },
  'campus/announcements': { current: 'announcements', board: 'CampusAnnouncements', title: 'campusShell.nav.announcements', topBar: true, screen: null },
  'campus/reports': { current: 'reports', board: 'CampusReports', title: 'campusShell.nav.reports', topBar: true, screen: null },
  'campus/settings': { current: 'settings', board: 'CampusSettings', title: 'campusShell.nav.settings', topBar: true, screen: null },
  // Not in the sidebar on the canvas: the aggregate console board.
  'campus/aggregate': { current: null, board: 'CampusAdminConsole', title: 'campusShell.nav.aggregate', topBar: false, screen: CampusAggregateScreen },
  // The shell's bell and Support link, for a campus admin.
  notifications: { current: null, board: 'Notifications', title: 'campusShell.notifications', topBar: true, screen: NotificationInboxPanel },
  support: { current: null, board: 'HelpCentre', title: 'campusShell.support', topBar: true, screen: SupportPanel },
};
