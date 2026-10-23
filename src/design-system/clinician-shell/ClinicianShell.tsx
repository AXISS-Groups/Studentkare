import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../icons';
import { ConsoleBrand, ConsoleNav, ConsoleSidebarLink, ConsoleTopbar } from '../console-shell/ConsoleShell';
import type { ConsoleNavGroup } from '../console-shell/ConsoleShell';
import { CLINICIAN_NAV } from './clinicianNav';
import type { ClinicianNavId } from './clinicianNav';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import '../design-system.css';
import './clinician-shell.css';

export interface ClinicianIdentity {
  fullName: string;
  initials: string;
  /** e.g. "MBBS, MD · NMC 71842". Omitted when the account does not carry it. */
  credentials?: string;
}

export interface ClinicianShellProps {
  /** The sidebar item to highlight; null on pages outside the sidebar (notifications, help). */
  current: ClinicianNavId | null;
  clinician: ClinicianIdentity;
  /** Sidebar count badges; a missing or zero count shows no badge. */
  counts?: Partial<Record<ClinicianNavId, number>>;
  /** Left of the top bar: the date on Today, the page name elsewhere. */
  context: string;
  /** Shorter form for phone widths (e.g. "Wed 30 Sep"); defaults to `context`. */
  contextShort?: string;
  /**
   * Shown only when the session reports it. A "2FA on" claim without a source
   * would be a hard-coded security assertion (AGENTS.md guardrail 6).
   */
  twoFactorOn?: boolean;
  hasUnreadNotifications?: boolean;
  /** Open review-pending preview screens (development only). */
  usePreviewRoutes?: boolean;
  onNavigate: (route: RoutePath) => void;
  onSignOut: () => void;
  onPersonalHealth: () => void;
  /** In the top bar after the page name, e.g. the "Team account" badge. */
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Web console frame for every clinician screen: the navy sidebar with the four
 * canvas groups (shared ConsoleNav), the white 64 px top bar (shared
 * ConsoleTopbar), and the page. Below 960 px the sidebar
 * becomes a modal drawer opened from the top bar.
 */
export function ClinicianShell({
  current,
  clinician,
  counts = {},
  context,
  contextShort,
  twoFactorOn,
  hasUnreadNotifications = false,
  usePreviewRoutes = false,
  onNavigate,
  onSignOut,
  onPersonalHealth,
  badge,
  children,
}: ClinicianShellProps): React.ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountMenuId = useId();
  const t = useT();

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);

  // Drawer: Esc closes, Tab stays inside, focus moves in on open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const panel = sidebar.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeDrawer(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  // Account menu: Esc and outside click close it.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setAccountOpen(false); };
    const onClick = (event: MouseEvent) => {
      if (accountRef.current && event.target instanceof Node && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
  }, [accountOpen]);

  const go = (route: RoutePath) => {
    setDrawerOpen(false);
    onNavigate(route);
  };

  const groups: ConsoleNavGroup[] = CLINICIAN_NAV.map((group) => ({
    id: group.label,
    title: t(group.labelKey),
    items: group.items.map((item) => {
      const route = usePreviewRoutes && item.previewRoute ? item.previewRoute : item.route;
      return {
        id: item.id,
        label: t(item.labelKey),
        icon: item.icon,
        current: item.id === current,
        count: counts[item.id] ?? 0,
        onSelect: route === null ? undefined : () => go(route),
      };
    }),
  }));

  return (
    <div className={`sk-ds sk-shell${drawerOpen ? ' is-drawer-open' : ''}`}>
      {drawerOpen ? <div className="sk-shell__scrim" aria-hidden="true" onClick={closeDrawer} /> : null}
      <aside
        ref={sidebar}
        id="clinician-sidebar"
        className="sk-shell__sidebar"
        aria-label={t('console.clin.sidebar')}
        {...(drawerOpen ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="sk-shell__brand">
          <ConsoleBrand role={t('console.clin.role')} />
          <button type="button" className="sk-shell__drawer-close" aria-label={t('console.closeNav')} onClick={closeDrawer}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <ConsoleNav label={t('console.clin.nav')} groups={groups} />
        <span className="sk-shell__spacer" />
        {/* The canvas footer: help, labelled with the clinician's name and registration; then sign out. */}
        <div className="sk-shell__sidebar-footer">
          <ConsoleSidebarLink
            icon="help-circle"
            label={clinician.credentials ? `${clinician.fullName} · ${clinician.credentials.split(' · ').pop() ?? ''}` : clinician.fullName}
            hint={t('console.helpCentre')}
            onClick={() => go('support')}
          />
          <ConsoleSidebarLink icon="log-out" label={t('console.signOut')} onClick={() => { setDrawerOpen(false); onSignOut(); }} />
        </div>
      </aside>

      <div className="sk-shell__body">
        <ConsoleTopbar
          title={context}
          titleShort={contextShort}
          leading={(
            <button
              ref={menuButton}
              type="button"
              className="sk-console-topbar__icon-btn sk-shell__menu-btn"
              aria-label={t('console.openNav')}
              aria-expanded={drawerOpen}
              aria-controls="clinician-sidebar"
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="menu" size={20} />
            </button>
          )}
          badge={badge}
          search={{ label: t('console.search') }}
          twoFactorLabel={twoFactorOn ? t('console.twoFactorOn') : undefined}
          notifications={{
            label: hasUnreadNotifications ? t('console.notificationsUnread') : t('console.notifications'),
            unread: hasUnreadNotifications,
            onClick: () => go('notifications'),
          }}
          account={(
            <div className="sk-shell__account" ref={accountRef}>
              <button
                type="button"
                className="sk-shell__chip"
                aria-haspopup="true"
                aria-expanded={accountOpen}
                aria-controls={accountMenuId}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span className="sk-avatar">{clinician.initials}</span>
                <span className="sk-shell__chip-text">
                  <span className="sk-shell__chip-name">{clinician.fullName}</span>
                  {clinician.credentials ? <span className="sk-shell__chip-meta">{clinician.credentials}</span> : null}
                </span>
                <span className="sk-visually-hidden">{t('console.clin.accountMenu')}</span>
              </button>
              {accountOpen ? (
                <div id={accountMenuId} className="sk-shell__menu">
                  <button type="button" className="sk-shell__menu-item" onClick={() => { setAccountOpen(false); onPersonalHealth(); }}>
                    <Icon name="heart" size={16} />{t('console.clin.personalHealth')}
                  </button>
                  <button type="button" className="sk-shell__menu-item sk-shell__menu-item--danger" onClick={() => { setAccountOpen(false); onSignOut(); }}>
                    <Icon name="log-out" size={16} />{t('console.signOut')}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        />
        <main className="sk-shell__main" id="main">{children}</main>
      </div>
    </div>
  );
}
