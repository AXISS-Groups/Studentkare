import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Activity, ArrowLeft, Bell, Bot, Building2, CalendarDays, ClipboardList, Dumbbell, FileText, FlaskConical, GraduationCap, HeartPulse, IdCard, LayoutDashboard, LogOut, Menu, MessageCircle, Package, Pill, Radio, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { ConfirmDialog } from '../../components/interface/ConfirmDialog';
import { canAccessRoute, homeForRole, navigate, RoutePath } from '../../lib/workflowRouting';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ConsoleIntro } from '../../components/interface/ConsoleIntro';
import { PageTransition } from '../../components/interface/PageTransition';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ScreenLoading } from '../../components/health/ScreenLoading';
import { AuditPanel, AccountsPanel, CatalogManagementPanel, OperationsOverview, WorkRequestsPanel } from './OperationsPanels';
import { MemberOverview, OrdersPanel, RecordsPanel, SupportPanel } from './MemberPanels';
import { DevicesAndSensorsScreen } from './DevicesAndSensorsScreen';
import { AppointmentsPanel } from './AppointmentsPanel';
import { MedicationPanel } from './MedicationPanel';
import { CampusVerificationPanel } from './CampusVerificationPanel';
import { HealthCampPanel } from './HealthCampPanel';
import { AdminBillingPanel } from '../billing/AdminBillingPanel';
import { TelemetryConsole } from './TelemetryConsole';
import { NotificationInboxPanel } from './NotificationInboxPanel';
import { CareNavigatorPanel } from './CareNavigatorPanel';
import { KnowledgeManagerPanel } from './KnowledgeManagerPanel';
import { IntakeReviewQueuePanel } from './IntakeReviewQueuePanel';
import { EncounterNotesPanel } from './EncounterNotesPanel';
import { IntegrationsSettingsModule } from '../admin/IntegrationsSettingsModule';
import { ActivityFeedPanel } from './ActivityFeedPanel';

const ExerciseLibraryScreen = lazy(() => import('../wellbeing/ExerciseLibraryScreen').then(module => ({ default: module.ExerciseLibraryScreen })));
const MemberProfilePanel = lazy(() => import('./MemberProfilePanel').then(module => ({ default: module.MemberProfilePanel })));
const PreventiveCareScreen = lazy(() => import('../../features/preventive/screens/PreventiveCareScreen').then(module => ({ default: module.PreventiveCareScreen })));
const PreventiveOperationsScreen = lazy(() => import('../../features/preventive/screens/PreventiveOperationsScreen').then(module => ({ default: module.PreventiveOperationsScreen })));
const PreventiveReviewScreen = lazy(() => import('../../features/preventive/screens/PreventiveReviewScreen').then(module => ({ default: module.PreventiveReviewScreen })));
const AgentAyushPanel = lazy(() => import('./AgentAyushPanel').then(module => ({ default: module.AgentAyushPanel })));
const MyPrescriptionsPanel = lazy(() => import('./MyPrescriptionsPanel').then(module => ({ default: module.MyPrescriptionsPanel })));
const ClinicalReviewPanel = lazy(() => import('./ClinicalReviewPanel').then(module => ({ default: module.ClinicalReviewPanel })));
const PharmacyQueuePanel = lazy(() => import('./FulfilmentQueuePanel').then(module => ({ default: module.PharmacyQueuePanel })));
const LabQueuePanel = lazy(() => import('./FulfilmentQueuePanel').then(module => ({ default: module.LabQueuePanel })));
const ClinicianWorkspaceHub = lazy(() => import('../clinician/ClinicianWorkspaceHub').then(module => ({ default: module.ClinicianWorkspaceHub })));
const InstitutionWorkspaceHub = lazy(() => import('../institution/InstitutionWorkspaceHub').then(module => ({ default: module.InstitutionWorkspaceHub })));
const VendorWorkspaceHub = lazy(() => import('../vendor/VendorWorkspaceHub').then(module => ({ default: module.VendorWorkspaceHub })));
const VaultWorkspaceHub = lazy(() => import('../vault/VaultWorkspaceHub').then(module => ({ default: module.VaultWorkspaceHub })));
const SafetyCentreModule = lazy(() => import('../admin/SafetyCentreModule').then(module => ({ default: module.SafetyCentreModule })));
const AdminPlansPricingModule = lazy(() => import('../admin/AdminPlansPricingModule').then(module => ({ default: module.AdminPlansPricingModule })));
const ComplianceAuditModule = lazy(() => import('../admin/ComplianceAuditModule').then(module => ({ default: module.ComplianceAuditModule })));
const MarketplaceAnalyticsModule = lazy(() => import('../admin/MarketplaceAnalyticsModule').then(module => ({ default: module.MarketplaceAnalyticsModule })));

// Students reach Plan, Digital ID, orders, campus verification and support through My profile; notifications is dropped from their sidebar.
const STUDENT_HIDDEN_LINKS: RoutePath[] = ['billing', 'digital-id', 'orders', 'campus', 'support', 'notifications'];

export function WorkspaceScreen({ route }: { route: RoutePath }) {
  const { user, logout } = useAuth();
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
  if (!user) return null;
  const admin = route.startsWith('admin');
  const staffHome = ['vendor', 'clinician', 'campus'].includes(route);
  const roleLabel = ({ STUDENT: 'Student account', SUPER_ADMIN: 'Super administrator', CAMPUS_ADMIN: 'Campus administrator', VENDOR: 'Provider workspace', NMC_DOCTOR: 'Clinician workspace' } as Record<string, string>)[user.role];
  const memberLinks = [
    { path: 'health' as RoutePath, label: 'Health overview', icon: HeartPulse },
    { path: 'records' as RoutePath, label: 'Health records', icon: FileText },
    { path: 'movement' as RoutePath, label: 'Exercise & movement', icon: Dumbbell },
    { path: 'insurance' as RoutePath, label: 'Insurance details', icon: ShieldCheck },
    { path: 'orders' as RoutePath, label: 'Orders & care requests', icon: Package },
    { path: 'appointments' as RoutePath, label: 'Appointments', icon: CalendarDays },
    { path: 'medications' as RoutePath, label: 'Medications', icon: Pill },
    { path: 'prescriptions' as RoutePath, label: 'Prescriptions & tests', icon: FlaskConical },
    { path: 'campus' as RoutePath, label: 'Campus verification', icon: GraduationCap },
    { path: 'health-camp' as RoutePath, label: 'Health camps', icon: ClipboardList },
    { path: 'notifications' as RoutePath, label: 'Notifications', icon: Bell },
    { path: 'ayush' as RoutePath, label: 'Agent Ayush', icon: Bot },
    { path: 'care-navigator' as RoutePath, label: 'Care navigator', icon: MessageCircle },
    { path: 'preventive-care' as RoutePath, label: 'Vaccines & preventive care', icon: ShieldCheck },
    ...(user.role === 'NMC_DOCTOR' ? [{ path: 'report-reviews' as RoutePath, label: 'Report review queue', icon: FileText }] : []),
    { path: 'support' as RoutePath, label: 'Support', icon: MessageCircle },
    { path: 'devices' as RoutePath, label: 'Devices & sensors', icon: Activity },
    { path: 'billing' as RoutePath, label: 'Plan', icon: ShieldCheck },
    { path: 'profile' as RoutePath, label: 'My profile', icon: UserRound },
    { path: 'digital-id' as RoutePath, label: 'Digital ID', icon: IdCard },
  ];
  const adminLinks = [
    { path: 'admin' as RoutePath, label: 'Operations overview', icon: LayoutDashboard },
    { path: 'admin/activity' as RoutePath, label: 'Activity across dashboards', icon: Radio },
    { path: 'admin/billing' as RoutePath, label: 'Inquiries & contracts', icon: ShieldCheck },
    { path: 'admin/catalog' as RoutePath, label: 'Catalog management', icon: Package },
    { path: 'admin/accounts' as RoutePath, label: 'Accounts & roles', icon: Users },
    { path: 'admin/requests' as RoutePath, label: 'Provider requests', icon: ClipboardList },
    { path: 'admin/support' as RoutePath, label: 'Support queue', icon: MessageCircle },
    { path: 'admin/audit' as RoutePath, label: 'Workflow audit', icon: ShieldCheck },
    { path: 'admin/integrations' as RoutePath, label: 'Integrations & secrets', icon: Activity },
    { path: 'admin/telemetry' as RoutePath, label: 'Telemetry & jobs', icon: Activity },
    { path: 'admin/knowledge' as RoutePath, label: 'Knowledge sources', icon: ShieldCheck },
    { path: 'admin/intake' as RoutePath, label: 'Intake review', icon: FileText },
    { path: 'admin/preventive' as RoutePath, label: 'Providers & preventive care', icon: ShieldCheck },
    { path: 'profile' as RoutePath, label: 'My profile', icon: UserRound },
    { path: 'digital-id' as RoutePath, label: 'Digital ID', icon: IdCard },
  ];
  const studentLinks = [
    ...memberLinks.filter(link => link.path !== 'profile' && !STUDENT_HIDDEN_LINKS.includes(link.path)),
    ...memberLinks.filter(link => link.path === 'profile'),
  ];
  const links = (user.role === 'STUDENT' ? studentLinks : admin ? adminLinks : staffHome ? [{ path: homeForRole(user.role), label: user.role === 'CAMPUS_ADMIN' ? 'Campus verification' : 'Assigned requests', icon: user.role === 'CAMPUS_ADMIN' ? GraduationCap : ClipboardList }, ...(user.role === 'NMC_DOCTOR' ? [{ path: 'clinical-notes' as RoutePath, label: 'Clinical notes', icon: FileText }] : []), ...memberLinks] : memberLinks).filter((link, index, all) => canAccessRoute(link.path, user.role) && all.findIndex(item => item.path === link.path) === index);
  const open = (path: RoutePath) => { setMobileMenu(false); navigate(path); };
  const content = () => {
    switch (route) {
      case 'health': return <MemberOverview />;
      case 'billing': return <MemberProfilePanel initialTab="plan" />;
      case 'admin/billing': return <AdminBillingPanel />;
      case 'profile': return <MemberProfilePanel initialTab="profile" />;
      case 'digital-id': return <MemberProfilePanel initialTab="digital-id" />;
      case 'records': return <VaultWorkspaceHub />;
      case 'insurance': return <MemberProfilePanel initialTab="insurance" />;
      case 'orders': return <OrdersPanel />;
      case 'appointments': return <AppointmentsPanel />;
      case 'medications': return <MedicationPanel />;
      case 'health-camp': return <HealthCampPanel />;
      case 'notifications': return <NotificationInboxPanel />;
      case 'care-navigator': return <CareNavigatorPanel />;
      case 'preventive-care': return <PreventiveCareScreen />;
      case 'report-reviews': return <PreventiveReviewScreen />;
      case 'admin/preventive': return <PreventiveOperationsScreen />;
      case 'admin/activity': return <ActivityFeedPanel />;
      case 'prescriptions': return <MyPrescriptionsPanel />;
      case 'ayush': return <AgentAyushPanel />;
      case 'clinical-review': return <ClinicalReviewPanel />;
      case 'dispensing': return <PharmacyQueuePanel />;
      case 'lab-queue': return <LabQueuePanel />;
      case 'support': return <SupportPanel />;
      case 'movement': return <ExerciseLibraryScreen onOpenMetrics={() => navigate('health')} onFindCare={() => navigate('care')} />;
      case 'devices': return <DevicesAndSensorsScreen />;
      case 'admin': return <OperationsOverview />;
      case 'admin/accounts': return <AccountsPanel />;
      case 'admin/catalog': return <CatalogManagementPanel />;
      case 'admin/requests': return <WorkRequestsPanel />;
      case 'vendor': return <VendorWorkspaceHub />;
      case 'clinician': return <ClinicianWorkspaceHub />;
      case 'campus': return <InstitutionWorkspaceHub />;
      case 'admin/support': return <SupportPanel staff />;
      case 'admin/audit': return <AuditPanel />;
      case 'admin/integrations': return (
        <>
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">INTEGRATIONS & SECRETS</span>
              <h2>Connected services & AI Gateways.</h2>
              <p>Configure API keys and secrets for third-party providers.</p>
            </div>
          </div>
          <IntegrationsSettingsModule />
        </>
      );
      case 'admin/telemetry': return <TelemetryConsole />;
      case 'admin/knowledge': return <KnowledgeManagerPanel />;
      case 'admin/intake': return <IntakeReviewQueuePanel />;
      case 'clinical-notes': return <EncounterNotesPanel />;
      default: return <MemberOverview />;
    }
  };

  return <div className="wf-workspace">
    <header className="wf-mobile-workspace-header"><StudentKareLogo size={28} showStrapline={false} /><button ref={menuButton} className="wf-icon-button" aria-label={mobileMenu ? 'Close workspace navigation' : 'Open workspace navigation'} aria-expanded={mobileMenu} aria-controls="workspace-sidebar" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={23} /> : <Menu size={23} />}</button></header>
    <aside id="workspace-sidebar" className={`wf-sidebar ${mobileMenu ? 'is-open' : ''}`}><button className="shop-logo-button wf-sidebar-brand" onClick={() => open('shop')} aria-label="Open marketplace"><StudentKareLogo size={31} showStrapline={false} /></button><div className="wf-account-summary"><span>{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{roleLabel}</small></div></div><nav aria-label="Workspace navigation">{links.map(({ path, label, icon: Icon }) => <button key={path} aria-current={route === path ? 'page' : undefined} onClick={() => open(path)}><Icon size={18} />{label}</button>)}</nav>{user.role !== 'STUDENT' && <button className="wf-sidebar-secondary" onClick={() => open(admin || staffHome ? 'health' : homeForRole(user.role))}><Building2 size={16} />{admin || staffHome ? 'My personal health' : 'My staff workspace'}</button>}<button className="wf-sidebar-secondary" onClick={() => open('shop')}><ArrowLeft size={16} />Marketplace</button><div className="wf-sidebar-bottom"><FormError message={mutation.error} /><button disabled={mutation.busy} onClick={() => setConfirmSignOut(true)}><LogOut size={16} />{mutation.busy ? 'Signing out…' : 'Sign out'}</button></div></aside>
    <main className="wf-workspace-main"><div className="wf-workspace-top"><div><span className="care-eyebrow">{roleLabel.toUpperCase()}</span><strong>Good to see you, {user.fullName.split(' ')[0]}.</strong><p>{user.university || 'Your connected care workspace'}</p></div><div className="wf-row-actions" style={{ flexWrap: 'wrap', gap: 8 }}><div className="wf-top-profile-quicknav" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f6f1f9', padding: '4px 6px', borderRadius: 12, border: '1px solid #e7d8ef' }}><button className={`health-button ${route === 'billing' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('billing')} title="Plan & Subscription"><ShieldCheck size={14} /> Plan</button><button className={`health-button ${route === 'profile' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('profile')} title="My Profile Settings"><UserRound size={14} /> My profile</button><button className={`health-button ${route === 'digital-id' ? 'health-button-primary' : ''}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('digital-id')} title="Digital ID Card"><IdCard size={14} /> Digital ID</button></div>{user.role === 'STUDENT' && <span className="wf-status">{user.isVerifiedStudent ? 'Campus verified' : 'Campus verification pending'}</span>}<button className="health-button" onClick={() => navigate('shop')}>Products & services <Package size={15} /></button></div></div>
      {(admin || staffHome) && <ConsoleIntro title={admin ? 'A clearer view of your care platform.' : 'Good care, delivered together.'} description={admin ? 'Manage actual accounts, published services, and requests from one authenticated workspace.' : 'Review requests assigned to your account and keep customers informed of their status.'} eyebrow={roleLabel.toUpperCase()} variant={admin ? 'admin' : 'vendor'} />}
      <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      <footer className="wf-workspace-footer">Studentkare · Account-scoped records and services</footer>
    </main>
    <ConfirmDialog
      open={confirmSignOut}
      tone="destructive"
      title="Sign out of this device?"
      body="Your records stay where they are, and any shares you have granted keep running until they expire or you revoke them. Nothing is deleted."
      confirmLabel="Sign out"
      cancelLabel="Stay signed in"
      busy={mutation.busy}
      onConfirm={() => { setConfirmSignOut(false); mutation.run(logout, () => navigate('shop')); }}
      onCancel={() => setConfirmSignOut(false)}
    />
    <nav className="wf-mobile-bottom-nav" aria-label="Quick navigation"><button aria-current={route === homeForRole(user.role) ? 'page' : undefined} onClick={() => open(homeForRole(user.role))}><LayoutDashboard size={21} /><span>Workspace</span></button><button aria-current={route === 'records' ? 'page' : undefined} onClick={() => open('records')}><FileText size={21} /><span>Records</span></button><button aria-current={route === 'orders' ? 'page' : undefined} onClick={() => open('orders')}><Package size={21} /><span>Requests</span></button><button onClick={() => { setMobileMenu(!mobileMenu); window.scrollTo({ top: 0, behavior: 'instant' }); }} aria-expanded={mobileMenu} aria-controls="workspace-sidebar"><Menu size={21} /><span>More</span></button></nav>
  </div>;
}
