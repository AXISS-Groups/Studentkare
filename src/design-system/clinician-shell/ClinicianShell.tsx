import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { SkIcon } from '../icons/SkIcon';
import { CLINICIAN_NAV } from './clinicianNav';
import type { ClinicianNavId, ClinicianNavItem } from './clinicianNav';
import type { RoutePath } from '@/lib/workflowRouting';
import '../design-system.css';
import './clinician-shell.css';

export interface ClinicianIdentity {
  fullName: string;
  initials: string;
  /** e.g. "MBBS, MD · NMC 71842". Omitted when the account does not carry it. */
  credentials?: string;
}

export interface ClinicianShellProps {
  current: ClinicianNavId;
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
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Web console frame for every clinician screen: dark sidebar with the four
 * canvas groups, a 64 px top bar, and the page. Below 960 px the sidebar
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
  children,
}: ClinicianShellProps): React.ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountMenuId = useId();

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

  return (
    <div className={`sk-ds sk-shell${drawerOpen ? ' is-drawer-open' : ''}`}>
      {drawerOpen ? <div className="sk-shell__scrim" aria-hidden="true" onClick={closeDrawer} /> : null}
      <aside
        ref={sidebar}
        id="clinician-sidebar"
        className="sk-shell__sidebar"
        aria-label="Clinician workspace"
        {...(drawerOpen ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="sk-shell__brand">
          <img src="/brand/sk-shield.svg" width={29} height={34} alt="" />
          <span className="sk-shell__wordmark">
            <span className="sk-shell__name">Student<em>&nbsp;Kare</em></span>
            <span className="sk-shell__role">CLINICIAN</span>
          </span>
          <button type="button" className="sk-shell__drawer-close" aria-label="Close navigation" onClick={closeDrawer}>
            <SkIcon name="close" size={20} />
          </button>
        </div>
        <nav aria-label="Clinician" className="sk-shell__nav">
          {CLINICIAN_NAV.map((group) => (
            <div key={group.label} className="sk-shell__group" role="group" aria-labelledby={`nav-${group.label}`}>
              <span id={`nav-${group.label}`} className="sk-shell__group-label">{group.label.toUpperCase()}</span>
              {group.items.map((item) => (
                <NavItem key={item.id} item={usePreviewRoutes && item.previewRoute ? { ...item, route: item.previewRoute } : item} current={item.id === current} count={counts[item.id] ?? 0} onGo={go} />
              ))}
            </div>
          ))}
        </nav>
        <span className="sk-shell__spacer" />
        <button type="button" className="sk-shell__link sk-shell__footer" onClick={() => go('support')}>
          <SkIcon name="help" />
          <span>{clinician.fullName}{clinician.credentials ? ` · ${clinician.credentials.split(' · ').pop()}` : ''}</span>
          <span className="sk-visually-hidden"> — help centre</span>
        </button>
      </aside>

      <div className="sk-shell__body">
        <header className="sk-shell__topbar">
          <button
            ref={menuButton}
            type="button"
            className="sk-shell__icon-btn sk-shell__menu-btn"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="clinician-sidebar"
            onClick={() => setDrawerOpen(true)}
          >
            <SkIcon name="menu" size={20} />
          </button>
          <span className="sk-shell__context">
            <span className="sk-shell__context-long">{context}</span>
            <span className="sk-shell__context-short" aria-hidden="true">{contextShort ?? context}</span>
          </span>
          <label className="sk-shell__search">
            <SkIcon name="search" size={16} />
            <span className="sk-visually-hidden">Search patients, orders, results (not available yet)</span>
            <input type="search" placeholder="Search patients, orders, results" disabled />
          </label>
          <span className="sk-shell__grow" />
          {twoFactorOn ? (
            <span className="sk-pill sk-pill--positive sk-shell__twofa"><SkIcon name="shield" size={14} strokeWidth={2} />2FA on</span>
          ) : null}
          <button
            type="button"
            className="sk-shell__icon-btn"
            aria-label={hasUnreadNotifications ? 'Notifications, unread' : 'Notifications'}
            onClick={() => go('notifications')}
          >
            <SkIcon name="bell" size={18} />
            {hasUnreadNotifications ? <span className="sk-shell__unread" aria-hidden="true" /> : null}
          </button>
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
              <span className="sk-visually-hidden">, account menu</span>
            </button>
            {accountOpen ? (
              <div id={accountMenuId} className="sk-shell__menu">
                <button type="button" className="sk-shell__menu-item" onClick={() => { setAccountOpen(false); onPersonalHealth(); }}>
                  <SkIcon name="heart" size={16} />My personal health
                </button>
                <button type="button" className="sk-shell__menu-item sk-shell__menu-item--danger" onClick={() => { setAccountOpen(false); onSignOut(); }}>
                  <SkIcon name="logout" size={16} />Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="sk-shell__main" id="main">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ item, current, count, onGo }: { item: ClinicianNavItem; current: boolean; count: number; onGo: (route: RoutePath) => void }): React.ReactElement {
  const { route } = item;
  const badge = count > 0 ? <span className="sk-shell__badge" aria-hidden="true">{count}</span> : null;
  const countText = count > 0 ? <span className="sk-visually-hidden">, {count} waiting</span> : null;
  if (route === null) {
    return (
      <button type="button" className="sk-shell__link is-unavailable" aria-disabled="true" title="Not available yet">
        <SkIcon name={item.icon} />
        <span>{item.label}</span>
        <span className="sk-visually-hidden"> — not available yet</span>
        {badge}{countText}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`sk-shell__link${current ? ' is-current' : ''}`}
      aria-current={current ? 'page' : undefined}
      onClick={() => onGo(route)}
    >
      <SkIcon name={item.icon} />
      <span>{item.label}</span>
      {badge}{countText}
    </button>
  );
}
