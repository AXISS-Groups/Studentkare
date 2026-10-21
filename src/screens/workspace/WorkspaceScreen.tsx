import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  // keep-sorted start
  Activity,
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Pill,
  QrCode,
  Receipt,
  Share2,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
  // keep-sorted end
} from 'lucide-react';
import { useAuth } from '../../data/contexts/AuthContext';
import { useLiveCartCount } from '../../data/contexts/LiveCartContext';
import { StudentWebShell } from '@/design-system/student-shell/StudentWebShell';
import { Navigate, useNavigate } from '@/core/navigation';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { SignOutConsequences } from '@/features/auth/views/SignOutConsequences';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { canAccessRoute, homeForRole, navigate, RoutePath } from '../../lib/utils/workflowRouting';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ConsoleIntro } from '../../components/interface/ConsoleIntro';
import { PageTransition } from '../../components/interface/PageTransition';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ScreenLoading } from '../../components/health/ScreenLoading';
import { MemberOverview, OrdersPanel, SupportPanel } from './MemberPanels';
import { DevicesAndSensorsScreen } from './DevicesAndSensorsScreen';
import { AppointmentsPanel } from './AppointmentsPanel';
import { MedicationPanel } from './MedicationPanel';
import { HealthCampPanel } from './HealthCampPanel';
import { NotificationInboxPanel } from './NotificationInboxPanel';
import { MyRequestsRoute, NewRequestRoute } from '@/features/requests/views/RequestsViews';
import { attachReturnPhoto } from '@/features/requests/views/attachReturnPhoto.web';
import { DeleteAccountRoute } from '@/features/account/views/DeleteAccountView';
import { NotificationSettingsRoute } from '@/features/notifications/views/NotificationSettingsView';
import { SignInSecurityRoute } from '@/features/account/views/SignInSecurityView';
import { RewardsRoute } from '@/features/rewards/views/RewardsView';
import { LeaveCampusRoute } from '@/features/campus/views/LeaveCampusView';
import { CareNavigatorPanel } from './CareNavigatorPanel';
import { EncounterNotesPanel } from './EncounterNotesPanel';
import { SuperAdminShell } from './admin/SuperAdminShell';
import { superAdminScreen } from './admin/SuperAdminScreens';
import { VendorShell } from '../vendor/VendorShell';
import { TeamBadge } from '@/features/team-accounts/TeamBadge';
import { canOpenPartnerRoute, partnerDisplayName, partnerKindOf } from '../vendor/partnerAccess';
import { useEffectivePartnerKind } from '../vendor/partnerPreview';
import type { AccountRole } from '../../data/types/workflowTypes';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { StudentPhoneFrame } from './StudentPhoneFrame';
import { AccountDetailsPage, DataExportPage, phoneBoardFor, safetyBoardFor, YourCareWebPage } from './PhoneBoards';
import { MoreHubBoard } from '@/features/account/views/MoreHubBoard';
import { SearchPage, studentPhoneBoard } from '@/features/phoneKit/studentPhoneBoards';
import { EmergencyHelplinesDialog } from '../../components/interface/InterfaceBar';
import { NotificationCenterModal } from '../../components/health/NotificationCenterModal';
import { AyushWidget, ayushWidgetShownOn } from '@/features/ayush/AyushWidget';

const M2TrendsRoute = lazy(() => import('@/features/labResults/views/M2TrendsRoute').then(module => ({ default: module.M2TrendsRoute })));
const M2ReportUploadRoute = lazy(() => import('@/features/labResults/views/M2ReportUploadRoute').then(module => ({ default: module.M2ReportUploadRoute })));
const M2RemindersRoute = lazy(() => import('@/features/reminders/views/M2RemindersRoute').then(module => ({ default: module.M2RemindersRoute })));
const M2WaterRoute = lazy(() => import('@/features/reminders/views/M2WaterRoute').then(module => ({ default: module.M2WaterRoute })));
const M2StepsRoute = lazy(() => import('@/features/steps/views/M2StepsRoute').then(module => ({ default: module.M2StepsRoute })));
const M2LabsRoute = lazy(() => import('@/features/m2store/views/M2LabsRoute').then(module => ({ default: module.M2LabsRoute })));
const CareDirectoryRoute = lazy(() => import('@/features/careDirectory/views/CareDirectoryRoute').then(module => ({ default: module.CareDirectoryRoute })));
const WebEmergencyCard = lazy(() => import('@/features/emergency/views/WebEmergencyCard').then(module => ({ default: module.WebEmergencyCard })));
const IdentityVerifyView = lazy(() => import('@/features/auth/views/IdentityVerifyView').then(module => ({ default: module.IdentityVerifyView })));
const WebPass = lazy(() => import('@/features/digital_id/views/WebPass').then(module => ({ default: module.WebPass })));
const WellnessTrainingScreen = lazy(() => import('../wellbeing/WellnessTrainingScreen').then(module => ({ default: module.WellnessTrainingScreen })));
const ExerciseLibraryScreen = lazy(() => import('../wellbeing/ExerciseLibraryScreen').then(module => ({ default: module.ExerciseLibraryScreen })));
const MemberProfilePanel = lazy(() => import('./MemberProfilePanel').then(module => ({ default: module.MemberProfilePanel })));
const PreventiveCareScreen = lazy(() => import('../../features/preventive/screens/PreventiveCareScreen').then(module => ({ default: module.PreventiveCareScreen })));
const ClinicianChronicScreen = lazy(() => import('../clinician/ClinicianChronicScreen').then(module => ({ default: module.ClinicianChronicScreen })));
const ClinicianEarningsScreen = lazy(() => import('../clinician/ClinicianEarningsScreen').then(module => ({ default: module.ClinicianEarningsScreen })));
const PreventiveReviewScreen = lazy(() => import('../../features/preventive/screens/PreventiveReviewScreen').then(module => ({ default: module.PreventiveReviewScreen })));
const AgentAyushPanel = lazy(() => import('./AgentAyushPanel').then(module => ({ default: module.AgentAyushPanel })));
const VisitSummaryRoute = lazy(() => import('@/features/vault/views/VisitSummaryView').then(module => ({ default: module.VisitSummaryRoute })));
const MyPrescriptionsPanel = lazy(() => import('./MyPrescriptionsPanel').then(module => ({ default: module.MyPrescriptionsPanel })));
const ClinicalReviewPanel = lazy(() => import('./ClinicalReviewPanel').then(module => ({ default: module.ClinicalReviewPanel })));
const ClinicianWorkspaceHub = lazy(() => import('../clinician/ClinicianWorkspaceHub').then(module => ({ default: module.ClinicianWorkspaceHub })));
const CounsellorQueueScreen = lazy(() => import('../institution/CounsellorQueueScreen').then(module => ({ default: module.CounsellorQueueScreen })));
const VendorHomeScreen = lazy(() => import('../vendor/VendorHomeScreen').then(module => ({ default: module.VendorHomeScreen })));
const WebScanVerifyScreen = lazy(() => import('../vendor/WebScanVerifyScreen').then(module => ({ default: module.WebScanVerifyScreen })));
const VendorOrdersScreen = lazy(() => import('../vendor/VendorOrdersScreen').then(module => ({ default: module.VendorOrdersScreen })));
const VendorCatalogueScreen = lazy(() => import('../vendor/VendorCatalogueScreen').then(module => ({ default: module.VendorCatalogueScreen })));
const LabCollectionScreen = lazy(() => import('../vendor/LabCollectionScreen').then(module => ({ default: module.LabCollectionScreen })));
const LabColdChainScreen = lazy(() => import('../vendor/LabColdChainScreen').then(module => ({ default: module.LabColdChainScreen })));
const VendorReturnsScreen = lazy(() => import('../vendor/VendorReturnsScreen').then(module => ({ default: module.VendorReturnsScreen })));
const VendorHandoverScreen = lazy(() => import('../vendor/VendorHandoverScreen').then(module => ({ default: module.VendorHandoverScreen })));
const VendorSubstitutionScreen = lazy(() => import('../vendor/VendorSubstitutionScreen').then(module => ({ default: module.VendorSubstitutionScreen })));
const VendorReorderScreen = lazy(() => import('../vendor/VendorReorderScreen').then(module => ({ default: module.VendorReorderScreen })));
const VendorCampIntakeScreen = lazy(() => import('../vendor/VendorCampIntakeScreen').then(module => ({ default: module.VendorCampIntakeScreen })));
const LabReportingScreen = lazy(() => import('../vendor/LabReportingScreen').then(module => ({ default: module.LabReportingScreen })));
const LabSampleToReportScreen = lazy(() => import('../vendor/LabSampleToReportScreen').then(module => ({ default: module.LabSampleToReportScreen })));
const PharmacyDispensingScreen = lazy(() => import('../vendor/PharmacyDispensingScreen').then(module => ({ default: module.PharmacyDispensingScreen })));
const PartnerRequestsPanel = lazy(() => import('../vendor/PartnerRequestsPanel').then(module => ({ default: module.PartnerRequestsPanel })));
const DispenseRegisterScreen = lazy(() => import('../vendor/DispenseRegisterScreen').then(module => ({ default: module.DispenseRegisterScreen })));
const VendorConsoleScreen = lazy(() => import('../vendor/VendorConsoleScreen').then(module => ({ default: module.VendorConsoleScreen })));
const VendorSettlementScreen = lazy(() => import('../vendor/VendorSettlementScreen').then(module => ({ default: module.VendorSettlementScreen })));
const VendorRxReviewScreen = lazy(() => import('../vendor/VendorRxReviewScreen').then(module => ({ default: module.VendorRxReviewScreen })));
const PartnerStaffScreen = lazy(() => import('../vendor/PartnerStaffScreen').then(module => ({ default: module.PartnerStaffScreen })));
// Signed-in student web pages (canvas 3b, WP-08), drawn in the student web shell.
const WebHomeView = lazy(() => import('@/features/studentweb/views/WebHomeView').then(module => ({ default: module.WebHomeView })));
const WebDashboardView = lazy(() => import('@/features/studentweb/views/WebDashboardView').then(module => ({ default: module.WebDashboardView })));
const WebOrdersView = lazy(() => import('@/features/studentweb/views/WebOrdersView').then(module => ({ default: module.WebOrdersView })));
const WebReorderView = lazy(() => import('@/features/studentweb/views/WebReorderView').then(module => ({ default: module.WebReorderView })));
const WebAccountView = lazy(() => import('@/features/studentweb/views/WebAccountView').then(module => ({ default: module.WebAccountView })));
const WebNotificationsRoute = lazy(() => import('@/features/studentweb/views/WebNotificationsView').then(module => ({ default: module.WebNotificationsRoute })));
const WebShopView = lazy(() => import('@/features/studentweb/views/shop/WebShopView').then(module => ({ default: module.WebShopView })));
const WebCheckoutView = lazy(() => import('@/features/studentweb/views/shop/WebCheckoutView').then(module => ({ default: module.WebCheckoutView })));
const StaffCampFastScreen = lazy(() => import('@/features/partner/staff/StaffCampFastScreen').then(module => ({ default: module.StaffCampFastScreen })));
const StaffScanVerifyScreen = lazy(() => import('@/features/partner/staff/StaffScanVerifyScreen').then(module => ({ default: module.StaffScanVerifyScreen })));
const StaffHandoverScreen = lazy(() => import('@/features/partner/staff/StaffHandoverScreen').then(module => ({ default: module.StaffHandoverScreen })));
const StaffCollectScreen = lazy(() => import('@/features/partner/staff/StaffCollectScreen').then(module => ({ default: module.StaffCollectScreen })));
const VaultWorkspaceHub = lazy(() => import('../vault/VaultWorkspaceHub').then(module => ({ default: module.VaultWorkspaceHub })));
// Signed-in student web, Tier 1 pages (canvas 3b, WP-09), drawn in the student web shell.
const WebVaultView = lazy(() => import('@/features/studentweb/views/t1/WebVaultView').then(module => ({ default: module.WebVaultView })));
const WebMyLabTestsView = lazy(() => import('@/features/studentweb/views/t1/WebMyLabTestsView').then(module => ({ default: module.WebMyLabTestsView })));
const WebReportInsightsView = lazy(() => import('@/features/studentweb/views/t1/WebReportInsightsView').then(module => ({ default: module.WebReportInsightsView })));
const WebAyushView = lazy(() => import('@/features/studentweb/views/t1/WebAyushView').then(module => ({ default: module.WebAyushView })));
const WebConsultSummaryRoute = lazy(() => import('@/features/studentweb/views/t1/WebConsultSummaryView').then(module => ({ default: module.WebConsultSummaryRoute })));
const WebEmergencyCardRoute = lazy(() => import('@/features/studentweb/views/t1/WebEmergencyCardView').then(module => ({ default: module.WebEmergencyCardRoute })));
const WebPassView = lazy(() => import('@/features/studentweb/views/t1/WebPassView').then(module => ({ default: module.WebPassView })));
const WebRequestsRoute = lazy(() => import('@/features/studentweb/views/t1/WebRequestsRoute').then(module => ({ default: module.WebRequestsRoute })));
const WebLeaveCampusRoute = lazy(() => import('@/features/studentweb/views/t1/WebLeaveCampusView').then(module => ({ default: module.WebLeaveCampusRoute })));
const WebDeleteAccountRoute = lazy(() => import('@/features/studentweb/views/t1/WebDeleteAccountView').then(module => ({ default: module.WebDeleteAccountRoute })));

/** The partner console page for a route, or null when the route is not one (same role checks as before). */
function vendorPageFor(route: RoutePath, role: AccountRole | null, onNavigate: (target: string) => void, onLogout: () => Promise<void>, onSwitchRole: (role: 'student' | 'admin' | 'vendor') => void): React.ReactNode {
  const props = { onNavigate, onLogout };
  const labStaff = role === 'VENDOR' || role === 'SUPER_ADMIN';
  switch (route) {
    case 'vendor': return <VendorHomeScreen {...props} onSwitchRole={onSwitchRole} />;
    // /verify is the student identity page; the partner scanner lives at /scan-verify.
    case 'scan-verify': return <WebScanVerifyScreen {...props} />;
    case 'catalogue': return <VendorCatalogueScreen {...props} />;
    case 'handover': case 'vendor-handover': return <VendorHandoverScreen {...props} />;
    case 'substitutions': case 'vendor-substitutions': return <VendorSubstitutionScreen {...props} />;
    case 'reorder': case 'vendor-reorder': return <VendorReorderScreen {...props} />;
    case 'camp-intake': case 'vendor-camp-intake': return <VendorCampIntakeScreen {...props} />;
    // The staff app's camp board: drawn full screen, outside the console shell (see WorkspaceScreen).
    case 'camp-fast': return <StaffCampFastScreen onNavigate={(target) => onNavigate(target)} />;
    // The staff app's phone boards (WP-15): full screen, outside the console shell.
    case 'staff-verify': return <StaffScanVerifyScreen onNavigate={(target) => onNavigate(target)} />;
    case 'staff-handover': return <StaffHandoverScreen onNavigate={(target) => onNavigate(target)} />;
    case 'staff-collect': return labStaff ? <StaffCollectScreen onNavigate={(target) => onNavigate(target)} /> : null;
    // The live lab desk (GET /work/lab-orders): sample custody through to filing the report for a doctor.
    case 'lab-queue': case 'vendor-lab-queue': return <LabSampleToReportScreen onNavigate={onNavigate} />;
    // Release results (WP-15): where each filed report has got to. The doctor releases.
    case 'lab-reporting': return labStaff ? <LabReportingScreen onNavigate={onNavigate} /> : null;
    // The live dispense queue (GET /work/dispenses); the local register stays at /dispense-register.
    case 'dispensing': return <PharmacyDispensingScreen onNavigate={onNavigate} />;
    case 'dispense-register': case 'vendor-dispense-register': return <DispenseRegisterScreen {...props} />;
    case 'console': case 'vendor-console': case 'performance': return <VendorConsoleScreen {...props} />;
    case 'settlement': case 'settlements': case 'vendor-settlement': return <VendorSettlementScreen {...props} />;
    case 'rx-review': case 'vendor-rx-review': return <VendorRxReviewScreen {...props} />;
    case 'staff': case 'partner-staff': case 'vendor-staff': case 'staff-roles': return <PartnerStaffScreen {...props} />;
    case 'orders': return role === 'VENDOR' ? <VendorOrdersScreen {...props} /> : null;
    case 'admin/catalog': return role === 'VENDOR' ? <VendorCatalogueScreen {...props} /> : null;
    case 'run-sheet': case 'lab-collection': return labStaff ? <LabCollectionScreen {...props} /> : null;
    case 'cold-chain': case 'lab-cold-chain': return labStaff ? <LabColdChainScreen {...props} /> : null;
    case 'returns': case 'vendor-returns': return labStaff ? <VendorReturnsScreen {...props} liveRequests={<PartnerRequestsPanel omitReturns />} /> : null;
    default: return null;
  }
}


/** The phone frame's More panel (MoreHub board), in the phone gutter. */
const morePanel: React.CSSProperties = { display: 'block', padding: '0 var(--sk-space-gutter-phone) var(--sk-space-24)', background: 'var(--sk-color-canvas)' };

export function WorkspaceScreen({ route }: { route: RoutePath }) {
  const t = useT();
  const { user, status, logout } = useAuth();
  // The assigned partner type, or the development-only preview of another one.
  const effectivePartnerKind = useEffectivePartnerKind(user);
  const routerNavigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const phoneFrame = usePhoneFrame();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mutation = useMutation();
  const cartCount = useLiveCartCount();
  useEffect(() => {
    if (!mobileMenu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenu(false); (menuButton.current ?? document.querySelector<HTMLElement>('[data-testid="phone-header-menu"]'))?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileMenu]);
  // One sign-out behaviour for every shell (board ConfirmDialogs, "Log out"): caution
  // badge, navy action (signing out removes nothing). The student shell uses the
  // canvas's "Log out" wording (WebDashboard / WebVault).
  const studentShell = user?.role === 'STUDENT';
  // A student gets the SignOut (phone) / WebSignOut (web) boards' content: who is signed
  // in and what signing out does. Every other role keeps the one-line note.
  const studentWhere = phoneFrame ? 'device' : 'browser';
  const signOutDialog = <ConfirmDialog
    open={confirmSignOut}
    tone="action"
    icon="log-out"
    title={studentShell ? t(phoneFrame ? 'launch.signout.title.device' : 'launch.signout.title.browser') : t('ws.signOutTitle')}
    body={studentShell ? t(phoneFrame ? 'launch.signout.body.device' : 'launch.signout.body.browser') : t('ws.signOutBody')}
    confirmLabel={studentShell ? t(phoneFrame ? 'launch.signout.confirm.device' : 'launch.signout.confirm.browser') : t('home.signOut')}
    busyLabel={t('ws.signingOut')}
    cancelLabel={t('ws.staySignedIn')}
    busy={mutation.busy}
    onConfirm={() => { setConfirmSignOut(false); setRememberDevice(false); mutation.run(() => logout({ remember: rememberDevice, lastRoute: route })); }}
    onCancel={() => { setConfirmSignOut(false); setRememberDevice(false); }}
  >
    <SignOutConsequences
      remember={rememberDevice}
      onRememberChange={setRememberDevice}
      where={studentShell ? studentWhere : undefined}
      account={studentShell && user ? { name: user.fullName, contact: user.email || user.phone } : undefined}
    />
  </ConfirmDialog>;

  // Partner console pages share one shell, mounted once for the whole area (see App.tsx
  // pageTransitionKey); only the page inside it changes between sections.
  const vendorPage = vendorPageFor(route, user?.role ?? null, (target) => routerNavigate(`/${target}`), logout, (newRole) => {
    routerNavigate(`/${homeForRole(newRole === 'student' ? 'STUDENT' : newRole === 'admin' ? 'SUPER_ADMIN' : 'VENDOR')}`);
  });
  if (vendorPage) {
    // Wait for the session before drawing the sidebar, so a refresh does not flash the
    // signed-out menu before the partner's own one.
    if (status === 'loading') return <ScreenLoading />;
    // A partner only gets the tools of the type a super admin assigned: another type's
    // page, typed in or refreshed, goes back to their own home.
    const partnerKind = effectivePartnerKind;
    if (!canOpenPartnerRoute(route, user?.role ?? null, partnerKind)) return <Navigate to="/vendor" replace />;
    // A phone board from the staff app: no sidebar, the whole screen is the scanner.
    if (route === 'camp-fast' || route === 'staff-verify' || route === 'staff-handover' || route === 'staff-collect') return <Suspense fallback={<ScreenLoading />}>{vendorPage}</Suspense>;
    return <>
      <VendorShell route={route} role={user?.role ?? null} partnerKind={partnerKind} assignedPartnerKind={partnerKindOf(user)} onNavigate={navigate} accountName={user ? partnerDisplayName(user) : undefined} onSignOut={user ? () => setConfirmSignOut(true) : undefined} signingOut={mutation.busy} signOutError={mutation.error}>
        <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{vendorPage}</PageTransition></Suspense>
      </VendorShell>
      {signOutDialog}
    </>;
  }
  if (!user) return null;
  const admin = route.startsWith('admin');
  const staffHome = ['vendor', 'clinician', 'campus', 'counsellor'].includes(route);
  const roleLabel = t(`role.${user.role}` as MessageKey);
  // /vendor has its own console, so only the campus and clinician homes reach this intro.
  const staffIntro: { title: MessageKey; body: MessageKey } | null = user.role === 'CAMPUS_ADMIN'
    ? { title: 'campus.home.introTitle', body: 'campus.home.introBody' }
    : user.role === 'NMC_DOCTOR' ? { title: 'partner.clin.home.introTitle', body: 'partner.clin.home.introBody' } : null;
  const memberLinks = [
    { path: 'health' as RoutePath, label: 'nav.health' as MessageKey, icon: HeartPulse },
    { path: 'records' as RoutePath, label: 'nav.records' as MessageKey, icon: FileText },
    { path: 'emergency-card' as RoutePath, label: 'nav.emergencyCard' as MessageKey, icon: ShieldAlert },
    { path: 'pass' as RoutePath, label: 'nav.pass' as MessageKey, icon: QrCode },
    { path: 'movement' as RoutePath, label: 'nav.movement' as MessageKey, icon: Dumbbell },
    { path: 'insurance' as RoutePath, label: 'nav.insurance' as MessageKey, icon: ShieldCheck },
    { path: 'orders' as RoutePath, label: 'nav.orders' as MessageKey, icon: Package },
    // Returns, hostel visits and refills are student requests (the server refuses other roles).
    ...(user.role === 'STUDENT' ? [{ path: 'my-requests' as RoutePath, label: 'nav.myRequests' as MessageKey, icon: ClipboardList }] : []),
    { path: 'appointments' as RoutePath, label: 'nav.appointments' as MessageKey, icon: CalendarDays },
    { path: 'medications' as RoutePath, label: 'nav.medications' as MessageKey, icon: Pill },
    { path: 'prescriptions' as RoutePath, label: 'nav.prescriptions' as MessageKey, icon: FlaskConical },
    { path: 'campus' as RoutePath, label: 'nav.campus' as MessageKey, icon: GraduationCap },
    { path: 'health-camp' as RoutePath, label: 'nav.healthCamp' as MessageKey, icon: ClipboardList },
    { path: 'notifications' as RoutePath, label: 'nav.notifications' as MessageKey, icon: Bell },
    { path: 'ayush' as RoutePath, label: 'nav.ayush' as MessageKey, icon: Bot },
    { path: 'care-navigator' as RoutePath, label: 'nav.careNavigator' as MessageKey, icon: MessageCircle },
    { path: 'preventive-care' as RoutePath, label: 'nav.preventive' as MessageKey, icon: ShieldCheck },
    ...(user.role === 'NMC_DOCTOR' ? [
      { path: 'report-reviews' as RoutePath, label: 'nav.reportReviews' as MessageKey, icon: FileText },
      { path: 'chronic' as RoutePath, label: 'nav.chronic' as MessageKey, icon: HeartPulse },
      { path: 'earnings' as RoutePath, label: 'nav.earnings' as MessageKey, icon: Receipt },
    ] : []),
    { path: 'support' as RoutePath, label: 'nav.support' as MessageKey, icon: MessageCircle },
    { path: 'wellness-training' as RoutePath, label: 'nav.wellnessTraining' as MessageKey, icon: Dumbbell },
    ...(user.role === 'CAMPUS_ADMIN' || user.role === 'SUPER_ADMIN' ? [{ path: 'campus-wellness' as RoutePath, label: 'nav.campusWellness' as MessageKey, icon: Dumbbell }] : []),
    { path: 'devices' as RoutePath, label: 'nav.devices' as MessageKey, icon: Activity },
    { path: 'billing' as RoutePath, label: 'nav.plan' as MessageKey, icon: ShieldCheck },
    { path: 'profile' as RoutePath, label: 'nav.profile' as MessageKey, icon: UserRound },
    { path: 'security' as RoutePath, label: 'nav.security' as MessageKey, icon: ShieldCheck },
    { path: 'rewards' as RoutePath, label: 'nav.rewards' as MessageKey, icon: Share2 },
    { path: 'digital-id' as RoutePath, label: 'nav.digitalId' as MessageKey, icon: IdCard },
  ];
  const links = (staffHome ? [{ path: homeForRole(user.role), label: (user.role === 'CAMPUS_ADMIN' ? 'nav.campus' : user.role === 'COUNSELLOR' ? 'nav.counsellorQueue' : 'nav.assigned') as MessageKey, icon: user.role === 'CAMPUS_ADMIN' ? GraduationCap : user.role === 'COUNSELLOR' ? HeartHandshake : ClipboardList }, ...(user.role === 'NMC_DOCTOR' ? [{ path: 'clinical-notes' as RoutePath, label: 'nav.clinicalNotes' as MessageKey, icon: FileText }] : []), ...memberLinks] : memberLinks).filter((link, index, all) => canAccessRoute(link.path, user.role) && all.findIndex(item => item.path === link.path) === index);
  const open = (path: RoutePath) => { setMobileMenu(false); navigate(path); };
  // A student at phone width gets the phone boards (design page 2) for these pages.
  const phoneBoard = user.role === 'STUDENT' && phoneFrame ? studentPhoneBoard(route) : null;
  /**
   * The canvas 3b pages for a signed-in student (WP-08). Home and Buy again are
   * student-only pages at any width; the rest replace the older panels above
   * phone width, where the student web shell draws them. At phone width the
   * phone frame keeps its own screens.
   */
  const studentWebPage = (): React.ReactNode => {
    if (user.role !== 'STUDENT') return null;
    if (route === 'home') return <WebHomeView />;
    if (route === 'buy-again') return <WebReorderView />;
    // No phone board yet: the web page reflows into the phone frame.
    if (route === 'my-lab-tests') return <WebMyLabTestsView />;
    if (route === 'report-insights') return <WebReportInsightsView />;
    if (phoneFrame) return null;
    switch (route) {
      case 'health': return <WebDashboardView />;
      case 'orders': return <WebOrdersView />;
      case 'profile': return <WebAccountView />;
      case 'notification-settings': return <WebNotificationsRoute />;
      case 'shop': return <WebShopView />;
      case 'checkout': return <WebCheckoutView />;
      case 'records': return <WebVaultView />;
      case 'ayush': return <WebAyushView />;
      case 'visit-summaries': return <WebConsultSummaryRoute />;
      case 'emergency-card': return <WebEmergencyCardRoute />;
      case 'pass': return <WebPassView />;
      case 'my-requests': return <WebRequestsRoute />;
      case 'leave-campus': return <WebLeaveCampusRoute />;
      case 'delete-account': return <WebDeleteAccountRoute />;
      // Mobile 2.0 Lab tests: the student shell had no lab tests page (its nav item had no route).
      case 'lab-tests': return <M2LabsRoute />;
      // Find care near you (WebFindCare above phone width): the same board, two columns.
      case 'find-care': return <CareDirectoryRoute wide />;
      default: return null;
    }
  };
  const content = () => {
    const studentPage = studentWebPage();
    if (studentPage) return studentPage;
    const adminScreen = superAdminScreen(route);
    if (adminScreen) return adminScreen;
    if (phoneBoard) return phoneBoard.node;
    switch (route) {
      case 'search': return <SearchPage />;
      case 'health': return <MemberOverview />;
      case 'your-care': return <YourCareWebPage />;
      // Mobile 2.0 My health (Tier 1): the same boards in the page column above phone width.
      case 'health/trends': return <M2TrendsRoute />;
      case 'health/report-upload': return <M2ReportUploadRoute />;
      case 'health/medicines': return <M2RemindersRoute />;
      case 'health/water': return <M2WaterRoute />;
      // Steps: the same board in the page column (a browser counts no steps; typed entry only).
      case 'health/steps': return <M2StepsRoute />;
      case 'account': return <AccountDetailsPage />;
      case 'data-export': return <DataExportPage />;
      case 'billing': return <MemberProfilePanel initialTab="plan" />;
      case 'profile': return <MemberProfilePanel initialTab="profile" />;
      case 'digital-id': return <MemberProfilePanel initialTab="digital-id" />;
      case 'records': return <VaultWorkspaceHub />;
      case 'emergency-card': return <WebEmergencyCard />;
      case 'pass': return <WebPass />;
      case 'insurance': return <MemberProfilePanel initialTab="insurance" />;
      case 'orders': return <OrdersPanel />;
      case 'appointments': return <AppointmentsPanel />;
      case 'medications': return <MedicationPanel />;
      case 'health-camp': return <HealthCampPanel />;
      case 'notifications': return <NotificationInboxPanel />;
      case 'notification-settings': return <NotificationSettingsRoute />;
      case 'security': return <SignInSecurityRoute />;
      case 'verify': return <IdentityVerifyView />;
      case 'rewards': return <RewardsRoute />;
      case 'leave-campus': return <LeaveCampusRoute links={{ openRecords: () => navigate('records'), openPlans: () => navigate('billing'), openSupport: () => navigate('support') }} />;
      case 'care-navigator': return <CareNavigatorPanel />;
      case 'preventive-care': return <PreventiveCareScreen />;
      case 'report-reviews': return <PreventiveReviewScreen />;
      case 'earnings': return <ClinicianEarningsScreen />;
      case 'chronic': return <ClinicianChronicScreen />;
      case 'my-requests': return <MyRequestsRoute links={{ newReturn: () => navigate('return-request'), newHostelVisit: () => navigate('hostel-visit'), newRefill: () => navigate('refill-request'), crisis: () => navigate('sos') }} />;
      case 'return-request': return <NewRequestRoute kind="RETURN" links={{ done: () => navigate('my-requests'), attachReturnPhoto }} />;
      case 'hostel-visit': return <NewRequestRoute kind="HOSTEL_VISIT" links={{ done: () => navigate('my-requests'), crisis: () => navigate('sos') }} />;
      case 'refill-request': return <NewRequestRoute kind="REFILL" links={{ done: () => navigate('my-requests') }} />;
      case 'delete-account': return <DeleteAccountRoute links={{ exportData: () => navigate('data-export'), crisis: () => navigate('crisis') }} />;
      // WP-06 boards with no desktop twin yet: the phone board in the page column.
      case 'ice-contacts': case 'consent': case 'care-circle': return safetyBoardFor(route);
      case 'prescriptions': return <MyPrescriptionsPanel />;
      case 'visit-summaries': return <VisitSummaryRoute links={{ openPrescriptions: () => navigate('prescriptions'), openAppointments: () => navigate('appointments') }} />;
      case 'ayush': return <AgentAyushPanel />;
      case 'clinical-review': return <ClinicalReviewPanel />;
      case 'support': return <SupportPanel />;
      case 'wellness-training': return <WellnessTrainingScreen />;
      case 'movement': return <ExerciseLibraryScreen onOpenMetrics={() => navigate('health')} onFindCare={() => navigate('care')} />;
      case 'devices': return <DevicesAndSensorsScreen />;
      case 'clinician': return <ClinicianWorkspaceHub />;
      // Campus boards (campus, campus/*, campus-wellness, campus-access-requests,
      // campus-break-glass) open in the campus console: see WorkspaceRouteScreen.
      case 'counsellor': return <CounsellorQueueScreen />;
      case 'clinical-notes': return <EncounterNotesPanel />;
      default: return <MemberOverview />;
    }
  };

  const sidebar = <aside id="workspace-sidebar" className={`wf-sidebar ${mobileMenu ? 'is-open' : ''}`}><button className="shop-logo-button wf-sidebar-brand" onClick={() => open('shop')} aria-label={t('ws.openShop')}><StudentKareLogo size={31} showStrapline={false} /></button><div className="wf-account-summary"><span>{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{roleLabel}</small></div></div><nav aria-label={t('ws.nav')}>{links.map(({ path, label, icon: Icon }) => <button key={path} aria-current={route === path ? 'page' : undefined} onClick={() => open(path)}><Icon size={18} aria-hidden="true" />{t(label)}</button>)}</nav>{user.role !== 'STUDENT' && <button className="wf-sidebar-secondary" onClick={() => open(staffHome ? 'health' : homeForRole(user.role))}><Building2 size={16} aria-hidden="true" />{staffHome ? t('ws.personal') : t('ws.staff')}</button>}<button className="wf-sidebar-secondary" onClick={() => open('shop')}><ArrowLeft size={16} aria-hidden="true" />{t('ws.shop')}</button><div className="wf-sidebar-bottom"><FormError message={mutation.error} /><button disabled={mutation.busy} onClick={() => setConfirmSignOut(true)}><LogOut size={16} aria-hidden="true" />{mutation.busy ? t('ws.signingOut') : t('home.signOut')}</button></div></aside>;

  // At phone width a student gets the phone boards' frame (phone header and tab bar)
  // instead of this desktop shell; the sidebar becomes the header's More panel.
  if (user.role === 'STUDENT' && phoneFrame) {
    const pageLink = memberLinks.find(link => link.path === route);
    return <>
      <StudentPhoneFrame
        route={route}
        title={phoneBoard ? t(phoneBoard.title) : pageLink ? t(pageLink.label) : t('phone.brand')}
        ownBack={phoneBoard?.ownBack}
        bleed={phoneBoard !== null}
        onSignOut={() => setConfirmSignOut(true)}
        menu={{ open: mobileMenu, onToggle: () => setMobileMenu(!mobileMenu), controls: 'workspace-sidebar' }}
        menuPanel={<div id="workspace-sidebar" style={morePanel}><MoreHubBoard
          account={{ fullName: user.fullName, university: user.university, role: user.role, isVerifiedStudent: user.isVerifiedStudent }}
          links={{
            open: {
              account: () => open('account'), records: () => open('records'), orders: () => open('orders'), requests: () => open('my-requests'),
              notifications: () => open('notification-settings'), pass: () => open('pass'), verify: () => open('verify'), campus: () => open('digital-id'),
              profile: () => open('profile'), permissions: () => open('permissions'), ayush: () => open('ayush'), crisis: () => open('sos'),
              plan: () => open('billing'), help: () => open('support'), joinClinician: () => open('clinicians/apply'), joinPartner: () => open('partnerships'),
              website: () => open('landing'),
            },
            askSignOut: () => { setMobileMenu(false); setConfirmSignOut(true); },
            signingOut: mutation.busy,
          }}
        /></div>}
      >
        <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{phoneBoardFor(route) ?? content()}</PageTransition></Suspense>
      </StudentPhoneFrame>
      {signOutDialog}
    </>;
  }

  if (studentShell) {
    return <>
      <StudentWebShell
        route={route}
        student={{ fullName: user.fullName, campus: user.university || undefined, verified: user.isVerifiedStudent }}
        cartCount={cartCount}
        onNavigate={(target) => navigate(target)}
        onSos={() => setSosOpen(true)}
        onAlerts={() => setAlertsOpen(true)}
        onSignOut={() => setConfirmSignOut(true)}
        signingOut={mutation.busy}
        signOutError={mutation.error || null}
        bare={route === 'ayush'}
      >
        <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      </StudentWebShell>
      {signOutDialog}
      <NotificationCenterModal isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
      {/* Ayush, floating (AyushWidget): never over crisis, SOS, the emergency card, checkout or Ayush itself. */}
      {ayushWidgetShownOn(route) ? <AyushWidget /> : null}
      {/* The same helplines dialog the app bar opened, unchanged: 112, Tele-MANAS and the campus SOS. */}
      {sosOpen && <EmergencyHelplinesDialog onClose={() => setSosOpen(false)} onSendSos={() => { setSosOpen(false); navigate('sos'); }} onFindCare={() => { setSosOpen(false); navigate('find-care'); }} />}
    </>;
  }

  if (admin) {
    return <>
      <SuperAdminShell route={route} role={user.role} onNavigate={open} onSignOut={() => setConfirmSignOut(true)} signingOut={mutation.busy} signOutError={mutation.error}>
        <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      </SuperAdminShell>
      {signOutDialog}
    </>;
  }

  return <div className="wf-workspace">
    <header className="wf-mobile-workspace-header"><StudentKareLogo size={28} showStrapline={false} /><button ref={menuButton} className="wf-icon-button" aria-label={mobileMenu ? t('ws.closeNav') : t('ws.openNav')} aria-expanded={mobileMenu} aria-controls="workspace-sidebar" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={23} /> : <Menu size={23} />}</button></header>
    {sidebar}
    <main className="wf-workspace-main"><div className="wf-workspace-top"><div><span className="care-eyebrow">{roleLabel.toUpperCase()}</span>{' '}<TeamBadge /><strong>{t('ws.greeting', { name: user.fullName.split(' ')[0] })}</strong><p>{user.university || t('ws.noCampus')}</p></div><div className="wf-row-actions" style={{ flexWrap: 'wrap', gap: 8 }}><div className="wf-top-profile-quicknav" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '4px 6px', borderRadius: 12, border: '1px solid var(--rule)' }}><button className={`health-button ${route === 'billing' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', minHeight: 'var(--sk-size-touch-target, 44px)', fontSize: 'var(--sk-text-caption)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('billing')} ><ShieldCheck size={14} aria-hidden="true" /> {t('nav.plan')}</button><button className={`health-button ${route === 'profile' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', minHeight: 'var(--sk-size-touch-target, 44px)', fontSize: 'var(--sk-text-caption)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('profile')} ><UserRound size={14} aria-hidden="true" /> {t('nav.profile')}</button><button className={`health-button ${route === 'digital-id' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', minHeight: 'var(--sk-size-touch-target, 44px)', fontSize: 'var(--sk-text-caption)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('digital-id')} ><IdCard size={14} aria-hidden="true" /> {t('nav.digitalId')}</button></div>{user.role === 'STUDENT' && <span className="wf-status">{user.isVerifiedStudent ? t('ws.verified') : t('ws.verifyPending')}</span>}<button className="health-button" onClick={() => navigate('shop')}>{t('ws.shop')} <Package size={15} aria-hidden="true" /></button></div></div>
      {staffHome && staffIntro && <ConsoleIntro title={t(staffIntro.title)} description={t(staffIntro.body)} eyebrow={roleLabel.toUpperCase()} />}
      <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      <footer className="wf-workspace-footer">{t('ws.footer')}</footer>
    </main>
    {signOutDialog}
    <nav className="wf-mobile-bottom-nav" aria-label={t('ws.quickNav')}><button aria-current={route === homeForRole(user.role) ? 'page' : undefined} onClick={() => open(homeForRole(user.role))}><LayoutDashboard size={21} aria-hidden="true" /><span>{t('ws.tab.home')}</span></button><button aria-current={route === 'records' ? 'page' : undefined} onClick={() => open('records')}><FileText size={21} aria-hidden="true" /><span>{t('ws.tab.records')}</span></button><button aria-current={route === 'orders' ? 'page' : undefined} onClick={() => open('orders')}><Package size={21} aria-hidden="true" /><span>{t('ws.tab.requests')}</span></button><button onClick={() => { setMobileMenu(!mobileMenu); window.scrollTo({ top: 0, behavior: 'instant' }); }} aria-expanded={mobileMenu} aria-controls="workspace-sidebar"><Menu size={21} aria-hidden="true" /><span>{t('ws.tab.more')}</span></button></nav>
  </div>;
}
