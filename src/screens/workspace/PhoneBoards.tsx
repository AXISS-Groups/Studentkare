import React, { lazy, Suspense, useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { YourCareBoard } from '@/features/yourcare/views/YourCareBoard';
import { AppointmentsBoard } from '@/features/appointments/views/AppointmentsBoard';
import type { BoardAppointment } from '@/features/appointments/views/AppointmentsBoard';
import { VideoConsultationDialog } from '@/components/health/VideoConsultationDialog';
import { BookAppointmentDialog } from './AppointmentsPanel';
import { NotificationNativeView } from '@/features/notifications/views/NotificationNativeView';
import { NotificationViewModel } from '@/features/notifications/viewmodel/NotificationViewModel';
import { AccountDetailsBoard } from '@/features/account/views/AccountDetailsBoard';
import { DataExportBoard } from '@/features/account/views/DataExportBoard';
import type { RecordsExport } from '@/features/account/views/DataExportBoard';
import { DigitalIdRoute } from '@/features/digital_id/views/DigitalIdNativeView';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { M2InsuranceRoute } from '@/features/m2store/views/M2InsuranceRoute';
import { HelpCentreBoard } from '@/features/support/views/HelpCentreBoard';
import { MovementBoard } from '@/features/movement/views/MovementBoard';
import { useExerciseStore } from '@/data/contexts/ExerciseStore';
import { EmergencyCardRoute } from '@/features/emergency/views/EmergencyCardBoard';
import { IceContactsRoute } from '@/features/emergency/views/IceContactsBoard';
import { MyPassRoute } from '@/features/digital_id/views/MyPassBoard';
import { DeleteAccountRoute } from '@/features/account/views/DeleteAccountView';
import { PlanBillingBoard } from '@/features/billing/views/PlanBillingBoard';
import { ConsentInboxBoard } from '@/features/vault/views/ConsentInboxBoard';
import { FamilyCircleBoard } from '@/features/vault/views/FamilyCircleBoard';

const ExerciseLibraryScreen = lazy(() => import('../wellbeing/ExerciseLibraryScreen').then((module) => ({ default: module.ExerciseLibraryScreen })));

const MemberProfilePanel = lazy(() => import('./MemberProfilePanel').then((module) => ({ default: module.MemberProfilePanel })));

/** The existing web form for a tab of the profile, opened under a board (edit details, link ABHA). */
function WebPanel({ tab }: { tab: 'profile' | 'digital-id' | 'insurance' }): React.ReactElement {
  return <div id={`board-panel-${tab}`}><Suspense fallback={<ScreenLoading />}><MemberProfilePanel initialTab={tab} /></Suspense></div>;
}

/** Opens a web panel under the board and scrolls it into view. */
function usePanel(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) document.querySelector('[id^="board-panel-"]')?.scrollIntoView({ block: 'start' });
  }, [open]);
  return [open, () => setOpen(true)];
}

/** Saves the export as a file on this device. Nothing is kept anywhere else. */
function saveExport(data: RecordsExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `studentkare-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AccountDetailsPage(): React.ReactElement {
  const [editing, edit] = usePanel();
  return (
    <>
      <AccountDetailsBoard links={{
        verify: () => navigate('verify'), points: () => navigate('rewards'), edit, abha: () => navigate('digital-id'),
        exportData: () => navigate('data-export'), leaveCampus: () => navigate('leave-campus'), deleteAccount: () => navigate('delete-account'),
      }} />
      {editing ? <WebPanel tab="profile" /> : null}
    </>
  );
}

export function DataExportPage(): React.ReactElement {
  return <DataExportBoard links={{ save: saveExport, deleteAccount: () => navigate('delete-account') }} />;
}

function DigitalIdPage(): React.ReactElement {
  const [abha, openAbha] = usePanel();
  return (
    <>
      <DigitalIdRoute links={{ pass: () => navigate('pass'), abha: openAbha, insurance: () => navigate('insurance') }} />
      {abha ? <WebPanel tab="digital-id" /> : null}
    </>
  );
}

/** Mobile 2.0 Insurance (M2Insurance, replaces ClaimsHub); "Manage" opens the full insurance page under it. */
export function InsurancePage({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [open, openPanel] = usePanel();
  return (
    <>
      <M2InsuranceRoute manage={openPanel} wide={wide} />
      {open ? <WebPanel tab="insurance" /> : null}
    </>
  );
}

function HelpCentrePage(): React.ReactElement {
  return (
    <HelpCentreBoard links={{
      topic: { orders: () => navigate('orders'), prescriptions: () => navigate('prescriptions'), records: () => navigate('records'), verify: () => navigate('verify'), delete: () => navigate('delete-account') },
      crisis: () => navigate('sos'), requests: () => navigate('my-requests'), legal: () => navigate('privacy'),
    }} />
  );
}

function MovementPage(): React.ReactElement {
  const { sessions, loading, error, reload } = useExerciseStore();
  const [routineId, setRoutineId] = useState<string | null>(null);
  return (
    <>
      <MovementBoard sessions={sessions} loading={loading} error={error} onRetry={reload}
        links={{ log: () => navigate('devices'), openGuide: (routine) => setRoutineId(routine.id) }} />
      {routineId ? (
        <Suspense fallback={null}>
          <ExerciseLibraryScreen dialogOnly startRoutineId={routineId} onDialogClose={() => setRoutineId(null)}
            onOpenMetrics={() => navigate('health')} onFindCare={() => navigate('care')} />
        </Suspense>
      ) : null}
    </>
  );
}

/** Help that works on any signal, linked from every board's offline state. */
const offlineHelp = {
  emergencyCard: () => navigate('emergency-card'),
  pass: () => navigate('pass'),
  crisis: () => navigate('sos'),
};

function YourCarePage(): React.ReactElement {
  return (
    <YourCareBoard links={{
      ...offlineHelp,
      appointments: () => navigate('appointments'),
      records: () => navigate('records'),
      devices: () => navigate('devices'),
      movement: () => navigate('movement'),
      refill: () => navigate('refill-request'),
      labTests: () => navigate('lab-tests'),
      // No avatar on the web: the frame header's More button already opens the
      // More panel, so the board's avatar would float on its own row. Expo draws it.
    }} />
  );
}

function AppointmentsPage(): React.ReactElement {
  const [booking, setBooking] = useState(false);
  const [consulting, setConsulting] = useState<BoardAppointment | null>(null);
  const [version, setVersion] = useState(0);
  return (
    <>
      <AppointmentsBoard
        reloadKey={version}
        links={{ ...offlineHelp, book: () => setBooking(true), join: setConsulting, notes: () => navigate('visit-summaries') }}
      />
      {booking ? <BookAppointmentDialog onClose={() => setBooking(false)} onDone={() => { setBooking(false); setVersion((v) => v + 1); }} /> : null}
      {consulting ? <VideoConsultationDialog appointment={{ id: consulting.id, slotStart: consulting.slotStart }} onClose={() => setConsulting(null)} /> : null}
    </>
  );
}

export function NotificationsPage(): React.ReactElement {
  // The view model fetches when made and holds nothing that outlives the page.
  const [vm] = useState(() => new NotificationViewModel());
  return <NotificationNativeView viewModel={vm} links={{ settings: () => navigate('notification-settings') }} />;
}

/**
 * The Tier 1 boards of WP-06 (safety, consent and account deletion), approved
 * by Krishna Chintakayala on 2026-10-21. The same boards serve the desktop
 * routes that have no web twin yet (ice-contacts, consent, care-circle).
 */
export function safetyBoardFor(route: RoutePath): React.ReactElement | null {
  switch (route) {
    case 'emergency-card': return <EmergencyCardRoute links={{ contacts: () => navigate('ice-contacts'), nearestHospitals: () => navigate('find-care') }} />;
    case 'ice-contacts': return <IceContactsRoute links={{}} />;
    case 'pass': return <MyPassRoute links={{ digitalId: () => navigate('digital-id') }} />;
    case 'delete-account': return <DeleteAccountRoute links={{ exportData: () => navigate('data-export'), crisis: () => navigate('crisis') }} />;
    case 'billing': return <PlanBillingBoard links={{ support: () => navigate('support') }} />;
    case 'consent': return <ConsentInboxBoard links={{ records: () => navigate('records') }} />;
    case 'care-circle': return <FamilyCircleBoard links={{ emergencyCard: () => navigate('emergency-card'), consent: () => navigate('consent') }} />;
    default: return null;
  }
}

/**
 * The phone board a student's route draws in the web phone frame (canvas page
 * 2), or null where the route keeps its web view. Your Care, the profile and
 * preventive care are Mobile 2.0 boards now (M2Insights, M2Profile,
 * M2Vaccines: features/phoneKit/studentPhoneBoards). The desktop shell keeps the
 * web panels; these are the phone boards only.
 */
export function phoneBoardFor(route: RoutePath): React.ReactElement | null {
  switch (route) {
    case 'appointments': return <AppointmentsPage />;
    case 'notifications': return <NotificationsPage />;
    case 'account': return <AccountDetailsPage />;
    case 'data-export': return <DataExportPage />;
    case 'digital-id': return <DigitalIdPage />;
    case 'insurance': return <InsurancePage />;
    case 'support': return <HelpCentrePage />;
    case 'movement': return <MovementPage />;
    default: return safetyBoardFor(route);
  }
}

/** Your Care at desktop width: the same overview, until the web board (WebDashboard) replaces it. */
export function YourCareWebPage(): React.ReactElement {
  return <YourCarePage />;
}
