import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Moon, X } from 'lucide-react';
import type { AccountRole } from '../../../data/types/workflowTypes';
import { canAccessRoute, RoutePath } from '../../../lib/utils/workflowRouting';
import { useTheme } from '../../../theme/tokens/theme';
import { StudentKareLogo, StudentKareShield } from '../../../components/StudentKareLogo';
import { FormError } from '../../../components/interface/WorkflowUI';
import { SUPER_ADMIN_NAVIGATION } from './superAdminNavigation';
import { useT } from '../../../i18n';
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
  const t = useT();

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
      <button ref={menuButton} type="button" className="sk-admin-menu-button" aria-label={drawerOpen ? t('admin.shell.closeNav') : t('admin.shell.openNav')} aria-expanded={drawerOpen} aria-controls="sk-admin-sidebar" onClick={() => setDrawerOpen(!drawerOpen)}>
        {drawerOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
    </header>

    {drawerOpen && <button type="button" className="sk-admin-backdrop" aria-label={t('admin.shell.closeNav')} onClick={() => setDrawerOpen(false)} />}

    <aside id="sk-admin-sidebar" className={`sk-admin-sidebar${drawerOpen ? ' is-open' : ''}`}>
      <div className="sk-admin-brand">
        <StudentKareShield size={44} id="skAdminShield" />
        <span className="sk-admin-wordmark"><strong>Student <em>Kare</em></strong><span>{t('admin.shell.wordmark')}</span></span>
      </div>

      <nav aria-label={t('admin.shell.nav')}>
        {SUPER_ADMIN_NAVIGATION.map(group => <div key={group.title} className="sk-admin-group">
          <h2 className="sk-admin-group-title">{group.title}</h2>
          <ul>
            {group.items.map(({ label, icon: Icon, route: target, activeFor }) => <li key={label}>
              {target && canAccessRoute(target, role)
                ? <button type="button" className="sk-admin-link" aria-current={route === target || activeFor?.includes(route) ? 'page' : undefined} onClick={() => go(target)}>
                  <Icon size={16} aria-hidden="true" /><span>{label}</span>
                </button>
                : <span className="sk-admin-link is-unavailable" aria-disabled="true">
                  <Icon size={16} aria-hidden="true" /><span>{label}</span><small>{t('admin.shell.notAvailable')}</small>
                </span>}
            </li>)}
          </ul>
        </div>)}
      </nav>

      <div className="sk-admin-sidebar-footer">
        <FormError message={signOutError} />
        <button type="button" className="sk-admin-link" disabled={signingOut} onClick={onSignOut}><LogOut size={16} aria-hidden="true" /><span>{signingOut ? t('admin.shell.signingOut') : t('admin.shell.signOut')}</span></button>
      </div>
    </aside>

    <main className="sk-admin-main">
      {/* The app-wide theme setting (ThemeProvider); it applies everywhere, not only here. */}
      <div className="sk-admin-topbar">
        {/* Alerts opens the real activity feed; the shared notification centre shows demo data. */}
        <button type="button" className="sk-admin-top-action" onClick={() => go('admin/activity')}>
          <Bell size={18} aria-hidden="true" /><span>{t('admin.shell.alerts')}</span>
        </button>
        <button type="button" className="sk-admin-theme-toggle" aria-label={t('admin.shell.darkMode')} aria-pressed={mode === 'dark'} title={mode === 'dark' ? t('admin.shell.toLight') : t('admin.shell.toDark')} onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')}>
          <Moon size={20} aria-hidden="true" fill={mode === 'dark' ? 'currentColor' : 'none'} />
        </button>
      </div>
      {children}
    </main>
  </div>;
}
