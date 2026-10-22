import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from '../../design-system/icons';
import type { SkIconName } from '../../design-system/icons';
import { ConsoleBrand, ConsoleNav, ConsoleSidebarLink } from '../../design-system/console-shell/ConsoleShell';
import type { ConsoleNavGroup } from '../../design-system/console-shell/ConsoleShell';
import { FormError } from '../../components/interface/WorkflowUI';
import { TeamBadge } from '../../features/team-accounts/TeamBadge';
import type { RoutePath } from '../../lib/utils/workflowRouting';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n';
import './admin/super-admin-shell.css';

/** The counsellor's pages: the crisis follow-up queue and the account pages every role has. */
const COUNSELLOR_LINKS: readonly { route: RoutePath; label: MessageKey; icon: SkIconName }[] = [
  { route: 'counsellor', label: 'nav.counsellorQueue', icon: 'heart' },
  { route: 'notifications', label: 'nav.notifications', icon: 'bell' },
  { route: 'support', label: 'nav.support', icon: 'help-circle' },
  { route: 'security', label: 'nav.security', icon: 'lock-4' },
];

interface CounsellorShellProps {
  route: RoutePath;
  onNavigate: (path: RoutePath) => void;
  onSignOut: () => void;
  signingOut: boolean;
  signOutError: string;
  children: ReactNode;
}

/**
 * The campus counsellor's console (live-run audit #8). Counsellor pages used to
 * open in the student workspace: its nav (records, digital ID, plan, medicines)
 * and its student-only data. This is the console frame the other staff roles
 * use (design-system console-shell pieces, the super admin shell's layout),
 * with only the counsellor's own pages in it.
 */
export function CounsellorShell({ route, onNavigate, onSignOut, signingOut, signOutError, children }: CounsellorShellProps): React.ReactElement {
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawerOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [drawerOpen]);

  const go = (path: RoutePath) => { setDrawerOpen(false); onNavigate(path); };
  const groups: ConsoleNavGroup[] = [{
    id: 'counsellor',
    title: t('role.COUNSELLOR'),
    items: COUNSELLOR_LINKS.map((link) => ({
      id: link.route, label: t(link.label), icon: link.icon, current: route === link.route, onSelect: () => go(link.route),
    })),
  }];

  return <div className="sk-admin-shell">
    <header className="sk-admin-mobilebar">
      <ConsoleBrand size={28} />
      <button ref={menuButton} type="button" className="sk-admin-menu-button" aria-label={drawerOpen ? t('ws.staffShell.closeNav') : t('ws.staffShell.openNav')} aria-expanded={drawerOpen} aria-controls="sk-counsellor-sidebar" onClick={() => setDrawerOpen(!drawerOpen)}>
        <Icon name={drawerOpen ? 'x' : 'menu'} size={22} />
      </button>
    </header>

    {drawerOpen && <button type="button" className="sk-admin-backdrop" aria-label={t('ws.staffShell.closeNav')} onClick={() => setDrawerOpen(false)} />}

    <aside id="sk-counsellor-sidebar" className={`sk-admin-sidebar${drawerOpen ? ' is-open' : ''}`}>
      <div className="sk-admin-brand"><ConsoleBrand role={t('role.COUNSELLOR').toUpperCase()} /></div>
      <ConsoleNav label={t('ws.staffShell.counsellorNav')} groups={groups} />
      <div className="sk-admin-sidebar-footer">
        <FormError message={signOutError} />
        <ConsoleSidebarLink icon="log-out" label={signingOut ? t('admin.shell.signingOut') : t('admin.shell.signOut')} disabled={signingOut} onClick={onSignOut} />
      </div>
    </aside>

    <main className="sk-admin-main">
      <div className="sk-admin-topbar"><TeamBadge /></div>
      {children}
    </main>
  </div>;
}
