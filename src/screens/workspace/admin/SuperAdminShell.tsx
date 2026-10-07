import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Moon, ShieldAlert, X } from 'lucide-react';
import { EmergencyHelplinesDialog } from '../../../components/interface/InterfaceBar';
import type { AccountRole } from '../../../data/workflowTypes';
import { canAccessRoute, RoutePath } from '../../../lib/workflowRouting';
import { useTheme } from '../../../theme/theme';
import { StudentKareLogo, StudentKareShield } from '../../../components/StudentKareLogo';
import { FormError } from '../../../components/interface/WorkflowUI';
import { SUPER_ADMIN_NAVIGATION } from './superAdminNavigation';
import './super-admin-shell.css';

interface SuperAdminShellProps {
  route: RoutePath;
  role: AccountRole;
  onNavigate: (path: RoutePath) => void;
  onSignOut: () => void;
  signingOut: boolean;
  signOutError: string;
  children: ReactNode;
}

/** Layout for /admin and /admin/* (SK-014, design 07-super-admin/SuperAdminConsole). */
export function SuperAdminShell({ route, role, onNavigate, onSignOut, signingOut, signOutError, children }: SuperAdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { mode, setTheme } = useTheme();
  const [sosOpen, setSosOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawerOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [drawerOpen]);

  const go = (path: RoutePath) => { setDrawerOpen(false); onNavigate(path); };

  return <div className="sk-admin-shell">
    <header className="sk-admin-mobilebar">
      <StudentKareLogo size={26} darkVariant showStrapline={false} />
      <button ref={menuButton} type="button" className="sk-admin-menu-button" aria-label={drawerOpen ? 'Close super admin navigation' : 'Open super admin navigation'} aria-expanded={drawerOpen} aria-controls="sk-admin-sidebar" onClick={() => setDrawerOpen(!drawerOpen)}>
        {drawerOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
    </header>

    {drawerOpen && <button type="button" className="sk-admin-backdrop" aria-label="Close super admin navigation" onClick={() => setDrawerOpen(false)} />}

    <aside id="sk-admin-sidebar" className={`sk-admin-sidebar${drawerOpen ? ' is-open' : ''}`}>
      <div className="sk-admin-brand">
        <StudentKareShield size={44} id="skAdminShield" />
        <span className="sk-admin-wordmark"><strong>Student <em>Kare</em></strong><span>SUPER ADMIN</span></span>
      </div>

      <nav aria-label="Super admin navigation">
        {SUPER_ADMIN_NAVIGATION.map(group => <div key={group.title} className="sk-admin-group">
          <h2 className="sk-admin-group-title">{group.title}</h2>
          <ul>
            {group.items.map(({ label, icon: Icon, route: target, activeFor }) => <li key={label}>
              {target && canAccessRoute(target, role)
                ? <button type="button" className="sk-admin-link" aria-current={route === target || activeFor?.includes(route) ? 'page' : undefined} onClick={() => go(target)}>
                  <Icon size={16} aria-hidden="true" /><span>{label}</span>
                </button>
                : <span className="sk-admin-link is-unavailable" aria-disabled="true">
                  <Icon size={16} aria-hidden="true" /><span>{label}</span><small>Not available yet</small>
                </span>}
            </li>)}
          </ul>
        </div>)}
      </nav>

      <div className="sk-admin-sidebar-footer">
        <FormError message={signOutError} />
        <button type="button" className="sk-admin-link" disabled={signingOut} onClick={onSignOut}><LogOut size={16} aria-hidden="true" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
      </div>
    </aside>

    <main className="sk-admin-main">
      {/* The app-wide theme setting (ThemeProvider); it applies everywhere, not only here. */}
      <div className="sk-admin-topbar">
        {/* Alerts opens the real activity feed; the shared notification centre shows demo data. */}
        <button type="button" className="sk-admin-top-action" onClick={() => go('admin/activity')}>
          <Bell size={18} aria-hidden="true" /><span>Alerts</span>
        </button>
        <button type="button" className="sk-admin-top-action sk-admin-sos" onClick={() => setSosOpen(true)}>
          <ShieldAlert size={18} aria-hidden="true" /><span>SOS</span>
        </button>
        <button type="button" className="sk-admin-theme-toggle" aria-label="Dark mode" aria-pressed={mode === 'dark'} title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')}>
          <Moon size={20} aria-hidden="true" fill={mode === 'dark' ? 'currentColor' : 'none'} />
        </button>
      </div>
      {children}
    </main>
    {sosOpen && <EmergencyHelplinesDialog onClose={() => setSosOpen(false)} />}
  </div>;
}
