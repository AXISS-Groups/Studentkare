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
 * The Tier 1 safety boards (Insights, Incidents, Ambulance, Counsellor, Access
 * requests, Emergency access, Isolation, Discharge, SLA) are built to the
 * canvas in src/features/campus/safety (WP-11, approved 2026-10-21). The SOS
 * desk is unchanged. The counsellor queue stays on the counsellor's own home.
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
const CampusSosDesk = named(() => import('@/screens/institution/CampusSosDesk'), 'CampusSosDesk');
// WP-10 boards (design page 4), built to the canvas in src/features/campus/boards.
const CampusRosterScreen = named(() => import('@/features/campus/boards'), 'CampusRosterScreen');
const CampusBlocksScreen = named(() => import('@/features/campus/boards'), 'CampusBlocksScreen');
const CampusApprovalsScreen = named(() => import('@/features/campus/boards'), 'CampusApprovalsScreen');
const CampusCampsScreen = named(() => import('@/features/campus/boards'), 'CampusCampsScreen');
const CampusCertificatesScreen = named(() => import('@/features/campus/boards'), 'CampusCertificatesScreen');
const CampusWellnessScreen = named(() => import('@/features/campus/boards'), 'CampusWellnessScreen');
const CampusOutbreakScreen = named(() => import('@/features/campus/boards'), 'CampusOutbreakScreen');
const CampusWaterScreen = named(() => import('@/features/campus/boards'), 'CampusWaterScreen');
const CampusSanitaryScreen = named(() => import('@/features/campus/boards'), 'CampusSanitaryScreen');
const CampusMessScreen = named(() => import('@/features/campus/boards'), 'CampusMessScreen');
const CampusAdminTeamScreen = named(() => import('@/features/campus/boards'), 'CampusAdminTeamScreen');
const CampusAnnouncementsScreen = named(() => import('@/features/campus/boards'), 'CampusAnnouncementsScreen');
const CampusReportsScreen = named(() => import('@/features/campus/boards'), 'CampusReportsScreen');
const CampusSettingsScreen = named(() => import('@/features/campus/boards'), 'CampusSettingsScreen');
const CampusAggregateScreen = named(() => import('@/features/campus/boards'), 'CampusAggregateScreen');
const MedicalLeaveApprovalsScreen = named(() => import('@/screens/institution/MedicalLeaveApprovalsScreen'), 'MedicalLeaveApprovalsScreen');
const CampusHealthScorecardScreen = named(() => import('@/screens/institution/CampusHealthScorecardScreen'), 'CampusHealthScorecardScreen');
const CounsellorOnlyPage = named(() => import('./CampusPendingPage'), 'CampusCounsellorOnlyPage');
// WP-11 boards (design page 4, Tier 1, approved 2026-10-21), built to the canvas in src/features/campus/safety.
const CampusInsightsScreen = named(() => import('@/features/campus/safety'), 'CampusInsightsScreen');
const CampusAccessRequestsScreen = named(() => import('@/features/campus/safety'), 'CampusAccessRequestsScreen');
const CampusBreakGlassScreen = named(() => import('@/features/campus/safety'), 'CampusBreakGlassScreen');
const CampusIncidentsScreen = named(() => import('@/features/campus/safety'), 'CampusIncidentsScreen');
const CampusIsolationScreen = named(() => import('@/features/campus/safety'), 'CampusIsolationScreen');
const CampusAmbulanceScreen = named(() => import('@/features/campus/safety'), 'CampusAmbulanceScreen');
const CampusDischargeScreen = named(() => import('@/features/campus/safety'), 'CampusDischargeScreen');
const CampusSlaScreen = named(() => import('@/features/campus/safety'), 'CampusSlaScreen');
// Find care near you: the campus's own directory listings (no canvas board; brief AdminCareDirectory).
const CampusCareDirectoryScreen = named(() => import('@/features/careDirectory/admin/CareDirectoryAdminView'), 'CampusCareDirectoryScreen');
const NotificationInboxPanel = named(() => import('@/screens/workspace/NotificationInboxPanel'), 'NotificationInboxPanel');
const SupportPanel = lazy(() => import('@/screens/workspace/MemberPanels').then((module) => ({ default: () => <module.SupportPanel /> })));

export const CAMPUS_PAGES: Partial<Record<RoutePath, CampusPage>> = {
  campus: { current: 'overview', board: 'CampusOverview', title: 'campusShell.nav.overview', topBar: true, screen: CampusOverviewScreen },
  'campus/students': { current: 'students', board: 'CampusRoster', title: 'campusShell.nav.students', topBar: true, screen: CampusRosterScreen },
  'campus/blocks': { current: 'blocks', board: 'CampusBlocks', title: 'campusShell.nav.blocks', topBar: false, screen: CampusBlocksScreen },
  'campus/verification': { current: 'verification', board: 'CampusApprovals', title: 'campusShell.nav.verification', topBar: false, screen: CampusApprovalsScreen },
  // No board on the canvas; the old hub's Medical leave tab, mounted unchanged beside Verification (CampusApprovals).
  'campus/leave': { current: 'leave', board: 'CampusApprovals', title: 'campusShell.nav.leave', topBar: false, screen: MedicalLeaveApprovalsScreen },
  'campus/insights': { current: 'insights', board: 'CampusInsights', title: 'campusShell.nav.insights', topBar: true, screen: CampusInsightsScreen },
  'campus/camps': { current: 'camps', board: 'CampusCamps', title: 'campusShell.nav.camps', topBar: false, screen: CampusCampsScreen },
  'campus/certificates': { current: 'certificates', board: 'CampusCertificates', title: 'campusShell.nav.certificates', topBar: true, screen: CampusCertificatesScreen },
  'campus-wellness': { current: 'wellness', board: 'CampusWellness', title: 'campusShell.nav.wellness', topBar: false, screen: CampusWellnessScreen },
  // No board of its own on the canvas: the live, approved SOS desk the old hub opened on.
  'campus/sos': { current: 'sos', board: 'CampusSosDesk', title: 'campusShell.nav.sos', topBar: true, screen: CampusSosDesk },
  'campus/incidents': { current: 'incidents', board: 'CampusIncidents', title: 'campusShell.nav.incidents', topBar: true, screen: CampusIncidentsScreen },
  'campus/ambulance': { current: 'ambulance', board: 'CampusAmbulance', title: 'campusShell.nav.ambulance', topBar: false, screen: CampusAmbulanceScreen },
  'campus/care-directory': { current: 'care-directory', board: 'AdminCareDirectory', title: 'campusShell.nav.careDirectory', topBar: false, screen: CampusCareDirectoryScreen },
  'campus/counsellor': { current: 'counsellor', board: 'CampusCounsellor', title: 'campusShell.nav.counsellor', topBar: true, screen: CounsellorOnlyPage },
  'campus-access-requests': { current: 'access-requests', board: 'CampusAccessRequests', title: 'campusShell.nav.accessRequests', topBar: true, screen: CampusAccessRequestsScreen },
  'campus-break-glass': { current: 'emergency-access', board: 'CampusBreakGlass', title: 'campusShell.nav.emergencyAccess', topBar: true, screen: CampusBreakGlassScreen },
  'campus/isolation': { current: 'isolation', board: 'CampusIsolation', title: 'campusShell.nav.isolation', topBar: false, screen: CampusIsolationScreen },
  'campus/discharge': { current: 'discharge', board: 'CampusDischarge', title: 'campusShell.nav.discharge', topBar: false, screen: CampusDischargeScreen },
  'campus/outbreak': { current: 'outbreak', board: 'CampusOutbreak', title: 'campusShell.nav.outbreak', topBar: false, screen: CampusOutbreakScreen },
  'campus/water': { current: 'water', board: 'CampusWater', title: 'campusShell.nav.water', topBar: false, screen: CampusWaterScreen },
  'campus/sanitary': { current: 'sanitary', board: 'CampusSanitary', title: 'campusShell.nav.sanitary', topBar: false, screen: CampusSanitaryScreen },
  'campus/mess': { current: 'mess', board: 'CampusMess', title: 'campusShell.nav.mess', topBar: false, screen: CampusMessScreen },
  'campus/sla': { current: 'sla', board: 'CampusSla', title: 'campusShell.nav.sla', topBar: false, screen: CampusSlaScreen },
  'campus/team': { current: 'team', board: 'CampusAdminTeam', title: 'campusShell.nav.team', topBar: true, screen: CampusAdminTeamScreen },
  'campus/announcements': { current: 'announcements', board: 'CampusAnnouncements', title: 'campusShell.nav.announcements', topBar: true, screen: CampusAnnouncementsScreen },
  'campus/reports': { current: 'reports', board: 'CampusReports', title: 'campusShell.nav.reports', topBar: true, screen: CampusReportsScreen },
  // No board on the canvas; the old hub's Scorecard tab, mounted unchanged beside Reports (CampusReports).
  'campus/scorecard': { current: 'scorecard', board: 'CampusReports', title: 'campusShell.nav.scorecard', topBar: true, screen: CampusHealthScorecardScreen },
  'campus/settings': { current: 'settings', board: 'CampusSettings', title: 'campusShell.nav.settings', topBar: true, screen: CampusSettingsScreen },
  // Not in the sidebar on the canvas: the aggregate console board.
  'campus/aggregate': { current: null, board: 'CampusAdminConsole', title: 'campusShell.nav.aggregate', topBar: false, screen: CampusAggregateScreen },
  // The shell's bell and Support link, for a campus admin.
  notifications: { current: null, board: 'Notifications', title: 'campusShell.notifications', topBar: true, screen: NotificationInboxPanel },
  support: { current: null, board: 'HelpCentre', title: 'campusShell.support', topBar: true, screen: SupportPanel },
};
