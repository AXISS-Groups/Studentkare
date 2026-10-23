import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from '../../../design-system/icons';
import { ConsoleBrand, ConsoleNav, ConsoleSidebarLink } from '../../../design-system/console-shell/ConsoleShell';
import type { ConsoleNavGroup } from '../../../design-system/console-shell/ConsoleShell';
import type { AccountRole } from '../../../data/types/workflowTypes';
import { canAccessRoute, RoutePath } from '../../../lib/utils/workflowRouting';
import { useTheme } from '../../../theme/tokens/theme';
import { FormError } from '../../../components/interface/WorkflowUI';
import { SUPER_ADMIN_NAVIGATION } from './superAdminNavigation';
import { useT } from '../../../i18n';
import { TeamBadge } from '../../../features/team-accounts/TeamBadge';
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

  const groups: ConsoleNavGroup[] = SUPER_ADMIN_NAVIGATION.map(group => ({
    id: group.title,
    title: t(group.titleKey),
    items: group.items.map(({ label, labelKey, icon, route: target, activeFor }) => ({
      id: label,
      label: t(labelKey),
      icon,
      current: route === target || (activeFor?.includes(route) ?? false),
      onSelect: target && canAccessRoute(target, role) ? () => go(target) : undefined,
    })),
  }));

  return <div className="sk-admin-shell">
    <header className="sk-admin-mobilebar">
      <ConsoleBrand size={28} />
      <button ref={menuButton} type="button" className="sk-admin-menu-button" aria-label={drawerOpen ? t('admin.shell.closeNav') : t('admin.shell.openNav')} aria-expanded={drawerOpen} aria-controls="sk-admin-sidebar" onClick={() => setDrawerOpen(!drawerOpen)}>
        <Icon name={drawerOpen ? 'x' : 'menu'} size={22} />
      </button>
    </header>

    {drawerOpen && <button type="button" className="sk-admin-backdrop" aria-label={t('admin.shell.closeNav')} onClick={() => setDrawerOpen(false)} />}

    <aside id="sk-admin-sidebar" className={`sk-admin-sidebar${drawerOpen ? ' is-open' : ''}`}>
      <div className="sk-admin-brand">
        <ConsoleBrand role={t('admin.shell.wordmark')} />
      </div>

      <ConsoleNav label={t('admin.shell.nav')} groups={groups} />

      <div className="sk-admin-sidebar-footer">
        <FormError message={signOutError} />
        <ConsoleSidebarLink icon="log-out" label={signingOut ? t('admin.shell.signingOut') : t('admin.shell.signOut')} disabled={signingOut} onClick={onSignOut} />
      </div>
    </aside>

    <main className="sk-admin-main">
      {/* The app-wide theme setting (ThemeProvider); it applies everywhere, not only here. */}
      <div className="sk-admin-topbar">
        <TeamBadge />
        {/* Alerts opens the real activity feed; the shared notification centre shows demo data. */}
        <button type="button" className="sk-admin-top-action" onClick={() => go('admin/activity')}>
          <Icon name="bell" size={18} /><span>{t('admin.shell.alerts')}</span>
        </button>
        <button type="button" className="sk-admin-theme-toggle" aria-label={t('admin.shell.darkMode')} aria-pressed={mode === 'dark'} title={mode === 'dark' ? t('admin.shell.toLight') : t('admin.shell.toDark')} onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')}>
          <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={20} />
        </button>
      </div>
      {children}
    </main>
  </div>;
}
