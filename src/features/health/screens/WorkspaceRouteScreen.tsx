import React from 'react';
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
import { asRoutePath } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';

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

export function WorkspaceRouteScreen() {
  const routePath = useRoutePath();
  const route = asRoutePath(routePath);
  const ClinicianPage = CLINICIAN_SCREENS[route];
  if (ClinicianPage) return <ClinicianPage />;
  return <WorkspaceScreen route={route} />;
}
