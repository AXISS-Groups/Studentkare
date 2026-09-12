import React, { lazy, Suspense, useState } from 'react';
import { Activity, ArrowLeft, Building2, ClipboardList, Dumbbell, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, MessageCircle, Package, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { homeForRole, navigate, RoutePath } from '../../lib/workflowRouting';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ConsoleIntro } from '../../components/interface/ConsoleIntro';
import { PageTransition } from '../../components/interface/PageTransition';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ScreenLoading } from '../../components/health/ScreenLoading';
import { AuditPanel, AccountsPanel, CatalogManagementPanel, OperationsOverview, WorkRequestsPanel } from './OperationsPanels';
import { InsurancePanel, IntegrationsPanel, MemberOverview, OrdersPanel, RecordsPanel, SupportPanel } from './MemberPanels';
import { IntegrationsSettingsModule } from '../admin/IntegrationsSettingsModule';

const ExerciseLibraryScreen = lazy(() => import('../wellbeing/ExerciseLibraryScreen').then(module => ({ default: module.ExerciseLibraryScreen })));

export function WorkspaceScreen({ route }: { route: RoutePath }) {
  const { user, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const mutation = useMutation();
  if (!user) return null;
  const admin = route.startsWith('admin');
  const staffHome = ['vendor', 'clinician', 'campus'].includes(route);
  const roleLabel = { STUDENT: 'Student account', SUPER_ADMIN: 'Super administrator', CAMPUS_ADMIN: 'Campus administrator', VENDOR: 'Provider workspace', NMC_DOCTOR: 'Clinician workspace' }[user.role];
  const memberLinks = [
    { path: 'health' as RoutePath, label: 'Health overview', icon: HeartPulse },
    { path: 'records' as RoutePath, label: 'Health records', icon: FileText },
    { path: 'movement' as RoutePath, label: 'Exercise & movement', icon: Dumbbell },
    { path: 'insurance' as RoutePath, label: 'Insurance details', icon: ShieldCheck },
    { path: 'orders' as RoutePath, label: 'Orders & care requests', icon: Package },
    { path: 'support' as RoutePath, label: 'Support', icon: MessageCircle },
  ];
  const adminLinks = [
    { path: 'admin' as RoutePath, label: 'Operations overview', icon: LayoutDashboard },
    { path: 'admin/catalog' as RoutePath, label: 'Catalog management', icon: Package },
    { path: 'admin/accounts' as RoutePath, label: 'Accounts & roles', icon: Users },
    { path: 'admin/requests' as RoutePath, label: 'Provider requests', icon: ClipboardList },
    { path: 'admin/support' as RoutePath, label: 'Support queue', icon: MessageCircle },
    { path: 'admin/audit' as RoutePath, label: 'Workflow audit', icon: ShieldCheck },
    { path: 'admin/integrations' as RoutePath, label: 'Integrations & secrets', icon: Activity },
  ];
  const links = admin ? adminLinks : staffHome ? [{ path: homeForRole(user.role), label: 'Assigned requests', icon: ClipboardList }, ...memberLinks] : memberLinks;
  const open = (path: RoutePath) => { setMobileMenu(false); navigate(path); };
  const content = () => {
    switch (route) {
      case 'health': return <MemberOverview />;
      case 'records': return <RecordsPanel />;
      case 'insurance': return <InsurancePanel />;
      case 'orders': return <OrdersPanel />;
      case 'support': return <SupportPanel />;
      case 'movement': return <ExerciseLibraryScreen onOpenMetrics={() => navigate('health')} onFindCare={() => navigate('care')} />;
      case 'admin': return <OperationsOverview />;
      case 'admin/accounts': return <AccountsPanel />;
      case 'admin/catalog': return <CatalogManagementPanel />;
      case 'admin/requests':
      case 'vendor':
      case 'clinician':
      case 'campus': return <WorkRequestsPanel />;
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
      default: return <MemberOverview />;
    }
  };

  return <div className="wf-workspace">
    <header className="wf-mobile-workspace-header"><StudentKareLogo size={28} showStrapline={false} /><button className="wf-icon-button" aria-label={mobileMenu ? 'Close workspace navigation' : 'Open workspace navigation'} aria-expanded={mobileMenu} aria-controls="workspace-sidebar" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={23} /> : <Menu size={23} />}</button></header>
    <aside id="workspace-sidebar" className={`wf-sidebar ${mobileMenu ? 'is-open' : ''}`}><button className="shop-logo-button wf-sidebar-brand" onClick={() => open('shop')} aria-label="Open marketplace"><StudentKareLogo size={31} showStrapline={false} /></button><div className="wf-account-summary"><span>{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{roleLabel}</small></div></div><nav aria-label="Workspace navigation">{links.map(({ path, label, icon: Icon }) => <button key={path} aria-current={route === path ? 'page' : undefined} onClick={() => open(path)}><Icon size={18} />{label}</button>)}</nav>{user.role !== 'STUDENT' && <button className="wf-sidebar-secondary" onClick={() => open(admin || staffHome ? 'health' : homeForRole(user.role))}><Building2 size={16} />{admin || staffHome ? 'My personal health' : 'My staff workspace'}</button>}<button className="wf-sidebar-secondary" onClick={() => open('shop')}><ArrowLeft size={16} />Marketplace</button><div className="wf-sidebar-bottom"><FormError message={mutation.error} /><button disabled={mutation.busy} onClick={() => mutation.run(logout, () => navigate('shop'))}><LogOut size={16} />{mutation.busy ? 'Signing out…' : 'Sign out'}</button></div></aside>
    <main className="wf-workspace-main"><div className="wf-workspace-top"><div><span className="care-eyebrow">{roleLabel.toUpperCase()}</span><strong>Good to see you, {user.fullName.split(' ')[0]}.</strong><p>{user.university || 'Your connected care workspace'}</p></div><div className="wf-row-actions">{user.role === 'STUDENT' && <span className="wf-status">{user.isVerifiedStudent ? 'Campus verified' : 'Campus verification pending'}</span>}<button className="health-button" onClick={() => navigate('shop')}>Products & services <Package size={15} /></button></div></div>
      {(admin || staffHome) && <ConsoleIntro title={admin ? 'A clearer view of your care platform.' : 'Good care, delivered together.'} description={admin ? 'Manage actual accounts, published services, and requests from one authenticated workspace.' : 'Review requests assigned to your account and keep customers informed of their status.'} eyebrow={roleLabel.toUpperCase()} variant={admin ? 'admin' : 'vendor'} />}
      <Suspense fallback={<ScreenLoading />}><PageTransition key={route}>{content()}</PageTransition></Suspense>
      <footer className="wf-workspace-footer">Studentkare · Account-scoped records and services</footer>
    </main>
    <nav className="wf-mobile-bottom-nav" aria-label="Quick navigation"><button onClick={() => open(homeForRole(user.role))}><LayoutDashboard size={18} /><span>Workspace</span></button><button onClick={() => open('records')}><FileText size={18} /><span>Records</span></button><button onClick={() => open('orders')}><Package size={18} /><span>Requests</span></button><button onClick={() => { setMobileMenu(!mobileMenu); window.scrollTo({ top: 0, behavior: 'instant' }); }} aria-expanded={mobileMenu}><Menu size={18} /><span>More</span></button></nav>
  </div>;
}
