import React, { lazy, Suspense } from 'react';
import { useRoutePath } from '@/core/navigation';
import { WorkspaceScreen } from '@/screens/workspace/WorkspaceScreen';
import { ClinicianTodayScreen } from '@/features/clinician/today/ClinicianTodayScreen';
import { ClinicianQueueScreen } from '@/features/clinician/queue/ClinicianQueueScreen';
import { ClinicianLabOrdersScreen } from '@/features/clinician/lab-orders/ClinicianLabOrdersScreen';
import { ClinicianReferralsScreen } from '@/features/clinician/referrals/ClinicianReferralsScreen';
import { ClinicianRenewalsScreen } from '@/features/clinician/renewals/ClinicianRenewalsScreen';
import { ClinicianPatientsScreen } from '@/features/clinician/patients/ClinicianPatientsScreen';
import { ClinicianAyushScreen } from '@/features/clinician/ayush/ClinicianAyushScreen';
import { ClinicianDecisionSupportScreen } from '@/features/clinician/decision-support/ClinicianDecisionSupportScreen';
import { ClinicianScheduleScreen } from '@/features/clinician/schedule/ClinicianScheduleScreen';
import { ClinicianEarningsConsoleScreen } from '@/features/clinician/earnings/ClinicianEarningsConsoleScreen';
import { ClinicianChronicConsoleScreen } from '@/features/clinician/chronic/ClinicianChronicConsoleScreen';
import { ClinicianInboxScreen } from '@/features/clinician/inbox/ClinicianInboxScreen';
import { ConsultRoomScreen } from '@/features/clinician/consult-room/ConsultRoomScreen';
import { CriticalResultsScreen } from '@/features/clinician/critical-results/CriticalResultsScreen';
import { ReportReviewsScreen } from '@/features/clinician/report-reviews/ReportReviewsScreen';
import { EncounterNoteScreen } from '@/features/clinician/encounter-note/EncounterNoteScreen';
import { PrescribeScreen } from '@/features/clinician/prescribe/PrescribeScreen';
import { asRoutePath } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { PageTransition } from '@/components/interface/PageTransition';
import { ClinicianConsoleFrame, ClinicianConsoleLayout } from '@/features/clinician/shared/ClinicianConsoleFrame';
import type { ClinicianNavId } from '@/design-system';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * Clinician console pages have their own frame (design page 5). Their role
 * gates are declared in the health module and still run before this screen.
 */
const CLINICIAN_SCREENS: Partial<Record<RoutePath, React.ComponentType>> = {
  clinician: ClinicianTodayScreen,
  'clinician/queue': ClinicianQueueScreen,
  'clinician/lab-orders': ClinicianLabOrdersScreen,
  'clinician/referrals': ClinicianReferralsScreen,
  'clinician/renewals': ClinicianRenewalsScreen,
  'clinician/patients': ClinicianPatientsScreen,
  'clinician/ayush': ClinicianAyushScreen,
  'clinician/decision-support': ClinicianDecisionSupportScreen,
  'clinician/schedule': ClinicianScheduleScreen,
  // Tier 1 — awaiting a named design reviewer and clinical sign-off. Each
  // shows a "preview" banner and serves sample data in development only.
  'clinician/inbox': ClinicianInboxScreen,
  'clinician/consult-room': ConsultRoomScreen,
  'clinician/critical-results': CriticalResultsScreen,
  'clinician/report-reviews': ReportReviewsScreen,
  'clinician/encounter-note': EncounterNoteScreen,
  'clinician/prescribe': PrescribeScreen,
  earnings: ClinicianEarningsConsoleScreen,
  chronic: ClinicianChronicConsoleScreen,
};

const ClinicalReviewPanel = lazy(() => import('@/screens/workspace/ClinicalReviewPanel').then(module => ({ default: module.ClinicalReviewPanel })));
const PreventiveReviewScreen = lazy(() => import('@/features/preventive/screens/PreventiveReviewScreen').then(module => ({ default: module.PreventiveReviewScreen })));
const NotificationInboxPanel = lazy(() => import('@/screens/workspace/NotificationInboxPanel').then(module => ({ default: module.NotificationInboxPanel })));
const SupportPanel = lazy(() => import('@/screens/workspace/MemberPanels').then(module => ({ default: () => <module.SupportPanel /> })));
const EncounterNotesPanel = lazy(() => import('@/screens/workspace/EncounterNotesPanel').then(module => ({ default: module.EncounterNotesPanel })));

/**
 * The production targets of three clinician sidebar items, and the shell's
 * notifications and help links. Older panels that used to open in the member
 * workspace, with its own sidebar; for a doctor they now open inside the console.
 */
const CONSOLE_PANELS: Partial<Record<RoutePath, { current: ClinicianNavId | null; context: string; Panel: React.ComponentType }>> = {
  'clinical-review': { current: 'critical-results', context: 'Critical results', Panel: ClinicalReviewPanel },
  'report-reviews': { current: 'report-reviews', context: 'Report reviews', Panel: PreventiveReviewScreen },
  'clinical-notes': { current: 'encounter-note', context: 'Encounter note', Panel: EncounterNotesPanel },
  notifications: { current: null, context: 'Notifications', Panel: NotificationInboxPanel },
  support: { current: null, context: 'Help centre', Panel: SupportPanel },
};

function ConsolePanel({ route }: { route: RoutePath }): React.ReactElement | null {
  const panel = CONSOLE_PANELS[route];
  if (!panel) return null;
  const { current, context, Panel } = panel;
  return <ClinicianConsoleFrame current={current} context={context}><Suspense fallback={<ScreenLoading />}><Panel /></Suspense></ClinicianConsoleFrame>;
}

export function WorkspaceRouteScreen() {
  const { user } = useAuth();
  const routePath = useRoutePath();
  const route = asRoutePath(routePath);
  const ClinicianPage = CLINICIAN_SCREENS[route];
  const consolePanel = user?.role === 'NMC_DOCTOR' && CONSOLE_PANELS[route] !== undefined;
  if (ClinicianPage || consolePanel) {
    // One shell for every console page; only the page inside it changes.
    return <ClinicianConsoleLayout>
      <PageTransition key={route}>{ClinicianPage ? <ClinicianPage /> : <ConsolePanel route={route} />}</PageTransition>
    </ClinicianConsoleLayout>;
  }
  return <WorkspaceScreen route={route} />;
}
