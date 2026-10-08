import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Activity, ArrowLeft, Bell, Bot, Building2, CalendarDays, ClipboardList, Dumbbell, FileText, FlaskConical, GraduationCap, HeartPulse, IdCard, LayoutDashboard, LogOut, Menu, MessageCircle, Package, Pill, QrCode, Receipt, ShieldAlert, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { useNavigate } from '@/core/navigation';
import { SignOutConsequences } from '@/features/auth/views/SignOutConsequences';
import { ConfirmDialog } from '../../components/interface/ConfirmDialog';
import { canAccessRoute, homeForRole, navigate, RoutePath } from '../../lib/workflowRouting';
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
import { LeaveCampusRoute } from '@/features/campus/views/LeaveCampusView';
import { CareNavigatorPanel } from './CareNavigatorPanel';
import { EncounterNotesPanel } from './EncounterNotesPanel';
import { SuperAdminShell } from './admin/SuperAdminShell';
import { superAdminScreen } from './admin/SuperAdminScreens';

const WebEmergencyCard = lazy(() => import('@/features/emergency/views/WebEmergencyCard').then(module => ({ default: module.WebEmergencyCard })));
const WebPass = lazy(() => import('@/features/digital_id/views/WebPass').then(module => ({ default: module.WebPass })));
const WellnessTrainingScreen = lazy(() => import('../wellbeing/WellnessTrainingScreen').then(module => ({ default: module.WellnessTrainingScreen })));
const WellnessWorkshopsScreen = lazy(() => import('../institution/WellnessWorkshopsScreen').then(module => ({ default: module.WellnessWorkshopsScreen })));
const ExerciseLibraryScreen = lazy(() => import('../wellbeing/ExerciseLibraryScreen').then(module => ({ default: module.ExerciseLibraryScreen })));
const MemberProfilePanel = lazy(() => import('./MemberProfilePanel').then(module => ({ default: module.MemberProfilePanel })));
const PreventiveCareScreen = lazy(() => import('../../features/preventive/screens/PreventiveCareScreen').then(module => ({ default: module.PreventiveCareScreen })));
const ClinicianChronicScreen = lazy(() => import('../clinician/ClinicianChronicScreen').then(module => ({ default: module.ClinicianChronicScreen })));
const ClinicianEarningsScreen = lazy(() => import('../clinician/ClinicianEarningsScreen').then(module => ({ default: module.ClinicianEarningsScreen })));
const PreventiveReviewScreen = lazy(() => import('../../features/preventive/screens/PreventiveReviewScreen').then(module => ({ default: module.PreventiveReviewScreen })));
const AgentAyushPanel = lazy(() => import('./AgentAyushPanel').then(module => ({ default: module.AgentAyushPanel })));
const MyPrescriptionsPanel = lazy(() => import('./MyPrescriptionsPanel').then(module => ({ default: module.MyPrescriptionsPanel })));
const ClinicalReviewPanel = lazy(() => import('./ClinicalReviewPanel').then(module => ({ default: module.ClinicalReviewPanel })));
const ClinicianWorkspaceHub = lazy(() => import('../clinician/ClinicianWorkspaceHub').then(module => ({ default: module.ClinicianWorkspaceHub })));
const InstitutionWorkspaceHub = lazy(() => import('../institution/InstitutionWorkspaceHub').then(module => ({ default: module.InstitutionWorkspaceHub })));
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
const LabQueueScreen = lazy(() => import('../vendor/LabQueueScreen').then(module => ({ default: module.LabQueueScreen })));
const DispenseRegisterScreen = lazy(() => import('../vendor/DispenseRegisterScreen').then(module => ({ default: module.DispenseRegisterScreen })));
const VendorConsoleScreen = lazy(() => import('../vendor/VendorConsoleScreen').then(module => ({ default: module.VendorConsoleScreen })));
const VendorSettlementScreen = lazy(() => import('../vendor/VendorSettlementScreen').then(module => ({ default: module.VendorSettlementScreen })));
const VendorRxReviewScreen = lazy(() => import('../vendor/VendorRxReviewScreen').then(module => ({ default: module.VendorRxReviewScreen })));
const PartnerStaffScreen = lazy(() => import('../vendor/PartnerStaffScreen').then(module => ({ default: module.PartnerStaffScreen })));
const VaultWorkspaceHub = lazy(() => import('../vault/VaultWorkspaceHub').then(module => ({ default: module.VaultWorkspaceHub })));
const CampusAccessRequestsScreen = lazy(() => import('../institution/CampusAccessRequests').then(module => ({ default: module.CampusAccessRequests })));
const CampusBreakGlassScreen = lazy(() => import('../institution/CampusBreakGlass').then(module => ({ default: module.CampusBreakGlass })));

// Students reach Plan, Digital ID, orders, campus verification and support through My profile; notifications is dropped from their sidebar.
const STUDENT_HIDDEN_LINKS: RoutePath[] = ['billing', 'digital-id', 'orders', 'campus', 'support', 'notifications'];

export function WorkspaceScreen({ route }: { route: RoutePath }) {
  const { user, logout } = useAuth();
  const routerNavigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mutation = useMutation();
  useEffect(() => {
    if (!mobileMenu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenu(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileMenu]);
  if (route === 'handover' || route === 'vendor-handover') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorHandoverScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'substitutions' || route === 'vendor-substitutions') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorSubstitutionScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'reorder' || route === 'vendor-reorder') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorReorderScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'camp-intake' || route === 'vendor-camp-intake') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorCampIntakeScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'lab-queue' || route === 'vendor-lab-queue') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <LabQueueScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'dispensing' || route === 'dispense-register' || route === 'vendor-dispense-register') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <DispenseRegisterScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'console' || route === 'vendor-console' || route === 'performance') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorConsoleScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'settlement' || route === 'settlements' || route === 'vendor-settlement') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorSettlementScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'rx-review' || route === 'vendor-rx-review') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorRxReviewScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'staff' || route === 'partner-staff' || route === 'vendor-staff' || route === 'staff-roles') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <PartnerStaffScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'vendor') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorHomeScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
          onSwitchRole={(newRole) => {
            routerNavigate(`/${homeForRole(newRole === 'student' ? 'STUDENT' : newRole === 'admin' ? 'SUPER_ADMIN' : 'VENDOR')}`);
          }}
        />
      </Suspense>
    );
  }
  if (route === 'verify') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <WebScanVerifyScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'orders' && user?.role === 'VENDOR') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorOrdersScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (route === 'catalogue' || (route === 'admin/catalog' && user?.role === 'VENDOR')) {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorCatalogueScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if ((route === 'run-sheet' || route === 'lab-collection') && (user?.role === 'VENDOR' || user?.role === 'SUPER_ADMIN')) {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <LabCollectionScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if ((route === 'cold-chain' || route === 'lab-cold-chain') && (user?.role === 'VENDOR' || user?.role === 'SUPER_ADMIN')) {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <LabColdChainScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if ((route === 'returns' || route === 'vendor-returns') && (user?.role === 'VENDOR' || user?.role === 'SUPER_ADMIN')) {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <VendorReturnsScreen
          onNavigate={(target) => routerNavigate(`/${target}`)}
          onLogout={logout}
        />
      </Suspense>
    );
  }
  if (!user) return null;
  const admin = route.startsWith('admin');
  const staffHome = ['vendor', 'clinician', 'campus'].includes(route);
  const roleLabel = ({ STUDENT: 'Student account', SUPER_ADMIN: 'Super administrator', CAMPUS_ADMIN: 'Campus administrator', VENDOR: 'Provider workspace', NMC_DOCTOR: 'Clinician workspace' } as Record<string, string>)[user.role];
  const memberLinks = [
    { path: 'health' as RoutePath, label: 'Health overview', icon: HeartPulse },
    { path: 'records' as RoutePath, label: 'Health records', icon: FileText },
    { path: 'emergency-card' as RoutePath, label: 'Emergency card', icon: ShieldAlert },
    { path: 'pass' as RoutePath, label: 'My check-in pass', icon: QrCode },
    { path: 'movement' as RoutePath, label: 'Exercise & movement', icon: Dumbbell },
    { path: 'insurance' as RoutePath, label: 'Insurance details', icon: ShieldCheck },
    { path: 'orders' as RoutePath, label: 'Orders & care requests', icon: Package },
    { path: 'my-requests' as RoutePath, label: 'My requests', icon: ClipboardList },
    { path: 'appointments' as RoutePath, label: 'Appointments', icon: CalendarDays },
    { path: 'medications' as RoutePath, label: 'Medications', icon: Pill },
    { path: 'prescriptions' as RoutePath, label: 'Prescriptions & tests', icon: FlaskConical },
    { path: 'campus' as RoutePath, label: 'Campus verification', icon: GraduationCap },
    { path: 'health-camp' as RoutePath, label: 'Health camps', icon: ClipboardList },
    { path: 'notifications' as RoutePath, label: 'Notifications', icon: Bell },
    { path: 'ayush' as RoutePath, label: 'Agent Ayush', icon: Bot },
    { path: 'care-navigator' as RoutePath, label: 'Care navigator', icon: MessageCircle },
    { path: 'preventive-care' as RoutePath, label: 'Vaccines & preventive care', icon: ShieldCheck },
    ...(user.role === 'NMC_DOCTOR' ? [
      { path: 'report-reviews' as RoutePath, label: 'Report review queue', icon: FileText },
      { path: 'chronic' as RoutePath, label: 'Chronic care', icon: HeartPulse },
      { path: 'earnings' as RoutePath, label: 'Earnings', icon: Receipt },
    ] : []),
    { path: 'support' as RoutePath, label: 'Support', icon: MessageCircle },
    { path: 'wellness-training' as RoutePath, label: 'Wellness training', icon: Dumbbell },
    ...(user.role === 'CAMPUS_ADMIN' || user.role === 'SUPER_ADMIN' ? [{ path: 'campus-wellness' as RoutePath, label: 'Campus wellness', icon: Dumbbell }] : []),
    { path: 'devices' as RoutePath, label: 'Devices & sensors', icon: Activity },
    { path: 'billing' as RoutePath, label: 'Plan', icon: ShieldCheck },
    { path: 'profile' as RoutePath, label: 'My profile', icon: UserRound },
    { path: 'digital-id' as RoutePath, label: 'Digital ID', icon: IdCard },
  ];
  const studentLinks = [
    ...memberLinks.filter(link => link.path !== 'profile' && !STUDENT_HIDDEN_LINKS.includes(link.path)),
    ...memberLinks.filter(link => link.path === 'profile'),
  ];
  const links = (user.role === 'STUDENT' ? studentLinks : staffHome ? [{ path: homeForRole(user.role), label: user.role === 'CAMPUS_ADMIN' ? 'Campus verification' : 'Assigned requests', icon: user.role === 'CAMPUS_ADMIN' ? GraduationCap : ClipboardList }, ...(user.role === 'NMC_DOCTOR' ? [{ path: 'clinical-notes' as RoutePath, label: 'Clinical notes', icon: FileText }] : []), ...memberLinks] : memberLinks).filter((link, index, all) => canAccessRoute(link.path, user.role) && all.findIndex(item => item.path === link.path) === index);
  const open = (path: RoutePath) => { setMobileMenu(false); navigate(path); };
  const content = () => {
    const adminScreen = superAdminScreen(route);
    if (adminScreen) return adminScreen;
    switch (route) {
      case 'health': return <MemberOverview />;
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
      case 'leave-campus': return <LeaveCampusRoute links={{ openRecords: () => navigate('records'), openPlans: () => navigate('billing'), openSupport: () => navigate('support') }} />;
      case 'care-navigator': return <CareNavigatorPanel />;
      case 'preventive-care': return <PreventiveCareScreen />;
      case 'report-reviews': return <PreventiveReviewScreen />;
      case 'earnings': return <ClinicianEarningsScreen />;
      case 'chronic': return <ClinicianChronicScreen />;
      case 'my-requests': return <MyRequestsRoute links={{ newReturn: () => navigate('return-request'), newHostelVisit: () => navigate('hostel-visit'), newRefill: () => navigate('refill-request') }} />;
      case 'return-request': return <NewRequestRoute kind="RETURN" links={{ done: () => navigate('my-requests'), attachReturnPhoto }} />;
      case 'hostel-visit': return <NewRequestRoute kind="HOSTEL_VISIT" links={{ done: () => navigate('my-requests') }} />;
      case 'refill-request': return <NewRequestRoute kind="REFILL" links={{ done: () => navigate('my-requests') }} />;
      case 'delete-account': return <DeleteAccountRoute links={{ exportData: () => navigate('records') }} />;
      case 'prescriptions': return <MyPrescriptionsPanel />;
      case 'ayush': return <AgentAyushPanel />;
      case 'clinical-review': return <ClinicalReviewPanel />;
      case 'support': return <SupportPanel />;
      case 'wellness-training': return <WellnessTrainingScreen />;
      case 'campus-wellness': return <WellnessWorkshopsScreen />;
      case 'movement': return <ExerciseLibraryScreen onOpenMetrics={() => navigate('health')} onFindCare={() => navigate('care')} />;
      case 'devices': return <DevicesAndSensorsScreen />;
      case 'clinician': return <ClinicianWorkspaceHub />;
      case 'campus': return <InstitutionWorkspaceHub />;
      case 'campus-access-requests': return <CampusAccessRequestsScreen />;
      case 'campus-break-glass': return <CampusBreakGlassScreen />;
      case 'clinical-notes': return <EncounterNotesPanel />;
      default: return <MemberOverview />;
    }
  };

  const signOutDialog = <ConfirmDialog
    open={confirmSignOut}
    tone="destructive"
    title="Sign out of this device?"
    body={<SignOutConsequences />}
    confirmLabel="Sign out"
    cancelLabel="Stay signed in"
    busy={mutation.busy}
    onConfirm={() => { setConfirmSignOut(false); mutation.run(logout); }}
    onCancel={() => setConfirmSignOut(false)}
  />;

  if (admin) {
    return <>
      <SuperAdminShell route={route} role={user.role} onNavigate={open} onSignOut={() => setConfirmSignOut(true)} signingOut={mutation.busy} signOutError={mutation.error}>
        <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      </SuperAdminShell>
      {signOutDialog}
    </>;
  }

  return <div className="wf-workspace">
    <header className="wf-mobile-workspace-header"><StudentKareLogo size={28} showStrapline={false} /><button ref={menuButton} className="wf-icon-button" aria-label={mobileMenu ? 'Close workspace navigation' : 'Open workspace navigation'} aria-expanded={mobileMenu} aria-controls="workspace-sidebar" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={23} /> : <Menu size={23} />}</button></header>
    <aside id="workspace-sidebar" className={`wf-sidebar ${mobileMenu ? 'is-open' : ''}`}><button className="shop-logo-button wf-sidebar-brand" onClick={() => open('shop')} aria-label="Open marketplace"><StudentKareLogo size={31} showStrapline={false} /></button><div className="wf-account-summary"><span>{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{roleLabel}</small></div></div><nav aria-label="Workspace navigation">{links.map(({ path, label, icon: Icon }) => <button key={path} aria-current={route === path ? 'page' : undefined} onClick={() => open(path)}><Icon size={18} />{label}</button>)}</nav>{user.role !== 'STUDENT' && <button className="wf-sidebar-secondary" onClick={() => open(staffHome ? 'health' : homeForRole(user.role))}><Building2 size={16} />{staffHome ? 'My personal health' : 'My staff workspace'}</button>}<button className="wf-sidebar-secondary" onClick={() => open('shop')}><ArrowLeft size={16} />Marketplace</button><div className="wf-sidebar-bottom"><FormError message={mutation.error} /><button disabled={mutation.busy} onClick={() => setConfirmSignOut(true)}><LogOut size={16} />{mutation.busy ? 'Signing out…' : 'Sign out'}</button></div></aside>
    <main className="wf-workspace-main"><div className="wf-workspace-top"><div><span className="care-eyebrow">{roleLabel.toUpperCase()}</span><strong>Good to see you, {user.fullName.split(' ')[0]}.</strong><p>{user.university || 'Your connected care workspace'}</p></div><div className="wf-row-actions" style={{ flexWrap: 'wrap', gap: 8 }}><div className="wf-top-profile-quicknav" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f6f1f9', padding: '4px 6px', borderRadius: 12, border: '1px solid #e7d8ef' }}><button className={`health-button ${route === 'billing' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('billing')} title="Plan & Subscription"><ShieldCheck size={14} /> Plan</button><button className={`health-button ${route === 'profile' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('profile')} title="My Profile Settings"><UserRound size={14} /> My profile</button><button className={`health-button ${route === 'digital-id' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('digital-id')} title="Digital ID Card"><IdCard size={14} /> Digital ID</button></div>{user.role === 'STUDENT' && <span className="wf-status">{user.isVerifiedStudent ? 'Campus verified' : 'Campus verification pending'}</span>}<button className="health-button" onClick={() => navigate('shop')}>Products & services <Package size={15} /></button></div></div>
      {staffHome && <ConsoleIntro title="Good care, delivered together." description="Review requests assigned to your account and keep customers informed of their status." eyebrow={roleLabel.toUpperCase()} variant="vendor" />}
      <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      <footer className="wf-workspace-footer">Studentkare · Account-scoped records and services</footer>
    </main>
    {signOutDialog}
    <nav className="wf-mobile-bottom-nav" aria-label="Quick navigation"><button aria-current={route === homeForRole(user.role) ? 'page' : undefined} onClick={() => open(homeForRole(user.role))}><LayoutDashboard size={21} /><span>Workspace</span></button><button aria-current={route === 'records' ? 'page' : undefined} onClick={() => open('records')}><FileText size={21} /><span>Records</span></button><button aria-current={route === 'orders' ? 'page' : undefined} onClick={() => open('orders')}><Package size={21} /><span>Requests</span></button><button onClick={() => { setMobileMenu(!mobileMenu); window.scrollTo({ top: 0, behavior: 'instant' }); }} aria-expanded={mobileMenu} aria-controls="workspace-sidebar"><Menu size={21} /><span>More</span></button></nav>
  </div>;
}
