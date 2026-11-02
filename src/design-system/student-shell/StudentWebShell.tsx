import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n';
import { BrandLogo, Icon } from '../icons/Icon';
import { EMERGENCY_NUMBER, TELE_MANAS_PRIMARY } from '@/ai/core/crisisGate';
import { STUDENT_NAV, STUDENT_TOP_NAV, studentNavIdFor } from './studentNav';
import type { StudentNavItem } from './studentNav';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import '../design-system.css';
import './student-shell.css';

export interface StudentShellIdentity {
  fullName: string;
  /** The campus on the account; omitted when the account has none. */
  campus?: string;
  /** From the session (isVerifiedStudent). Never assumed. */
  verified: boolean;
}

export interface StudentWebShellProps {
  /** The route on screen: marks the current sidebar item and top-nav link. */
  route: RoutePath;
  student: StudentShellIdentity;
  /** Items in this browser's cart; no badge at zero. */
  cartCount?: number;
  onNavigate: (route: RoutePath) => void;
  /**
   * SOS: opens the helplines dialog (112, Tele-MANAS and the campus SOS). Required,
   * so every student web page keeps help one tap away (DESIGN.md §2.4).
   */
  onSos: () => void;
  /** Alerts (the bell): opens the notifications inbox, the one inbox (as on the phone). */
  onAlerts: () => void;
  /** The top bar's search: the one search box for the signed-in student (results open in the shop). */
  onSearch: (query: string) => void;
  /** Unread alerts; no badge at zero. */
  alertCount?: number;
  /** Opens the one sign-out confirm dialog (the shell never signs out by itself). */
  onSignOut: () => void;
  signingOut?: boolean;
  signOutError?: string | null;
  /**
   * Boards drawn without the sidebar (WebAyush): above 1024 px only the top nav
   * shows; narrower, the drawer still opens from the menu button.
   */
  bare?: boolean;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SIDEBAR_ID = 'student-shell-sidebar';

/** "Krishna Chintakayala" gives "KC"; one word gives its first letter. */
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

/** "Krishna Chintakayala" gives "Krishna C." as on the canvas account header. */
export function shortNameOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] ?? '';
  return `${words[0]} ${words[words.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * Signed-in student web frame (canvas page 3b, boards WebDashboard / WebVault):
 * a white top nav (brand, Shop · Lab tests · Doctors, the one search box,
 * Alerts, SOS, cart, account), and the grouped sidebar (My care / Services /
 * Account) with the account header and Log out. Each place appears once
 * (founder decisions, 23 Oct 2026, docs/ux/web-mobile-parity-2026-10-23.md);
 * Ayush is the floating bubble. The sidebar keeps the founder's
 * navy with the white pill for the current item (PR #152); the canvas draws it
 * light. At 1024 px and below the sidebar becomes a modal drawer.
 */
export function StudentWebShell({
  route,
  student,
  cartCount = 0,
  onNavigate,
  onSos,
  onAlerts,
  onSearch,
  alertCount = 0,
  onSignOut,
  signingOut = false,
  signOutError = null,
  bare = false,
  children,
}: StudentWebShellProps): React.ReactElement {
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const current = studentNavIdFor(route);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);

  // Drawer: focus moves in, Tab stays inside, Esc closes and returns focus.
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

  const go = (target: RoutePath) => {
    setDrawerOpen(false);
    onNavigate(target);
  };

  const initials = initialsOf(student.fullName);
  const campus = student.campus?.trim();
  const status = student.verified
    ? (campus ? t('shell.verified', { campus }) : t('shell.verifiedNoCampus'))
    : (campus ? t('shell.pending', { campus }) : t('shell.pendingNoCampus'));
  const alertsLabel = alertCount > 0 ? t('shell.alertsCount', { count: alertCount }) : t('shell.alerts');
  const cartLabel = cartCount <= 0 ? t('shell.cart') : cartCount === 1 ? t('shell.cartOne') : t('shell.cartMany', { count: cartCount });

  const topLinks = (variant: 'bar' | 'drawer') => STUDENT_TOP_NAV.map((link) => (
    <button
      key={`${variant}-${link.label}`}
      type="button"
      className={variant === 'bar' ? 'sk-sshell__toplink' : 'sk-sshell__link'}
      aria-current={variant === 'bar' && route === link.route ? 'page' : undefined}
      onClick={() => go(link.route)}
    >
      {t(link.label)}
    </button>
  ));

  return (
    <div className={`sk-ds sk-sshell${drawerOpen ? ' is-drawer-open' : ''}${bare ? ' is-bare' : ''}`}>
      <header className="sk-sshell__top">
        <button
          ref={menuButton}
          type="button"
          className="sk-sshell__icon-btn sk-sshell__menu-btn"
          aria-label={drawerOpen ? t('shell.closeMenu') : t('shell.openMenu')}
          aria-expanded={drawerOpen}
          aria-controls={SIDEBAR_ID}
          onClick={() => (drawerOpen ? closeDrawer() : setDrawerOpen(true))}
        >
          <Icon name="menu" size={22} />
        </button>
        {/* One home (founder decision, 23 Oct 2026): the brand opens /health, as the phone's Home does. */}
        <button type="button" className="sk-sshell__brand" aria-label={t('shell.brand.home')} onClick={() => go('health')}>
          <BrandLogo size={30} label="" />
          <span className="sk-sshell__wordmark" aria-hidden="true">{t('shell.brand.student')}<em>&nbsp;{t('shell.brand.kare')}</em></span>
        </button>
        <nav className="sk-sshell__topnav" aria-label={t('shell.top.aria')}>{topLinks('bar')}</nav>
        <form
          className="sk-sshell__search"
          role="search"
          aria-label={t('shell.search.label')}
          onSubmit={(event) => { event.preventDefault(); const q = query.trim(); if (q) onSearch(q); }}
        >
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('shell.search.placeholder')}
            aria-label={t('shell.search.label')}
          />
        </form>
        <span className="sk-sshell__grow" />
        <button type="button" className="sk-sshell__icon-btn sk-sshell__alerts" aria-label={alertsLabel} onClick={onAlerts}>
          <Icon name="bell" size={19} />
          {alertCount > 0 ? <span className="sk-sshell__badge" aria-hidden="true">{alertCount}</span> : null}
        </button>
        {/* Red only for SOS (DESIGN.md §3). Never hidden at any width. */}
        <button type="button" className="sk-sshell__sos" aria-label={t('shell.sosLabel')} onClick={onSos}>
          <Icon name="sos" size={18} />
          <span aria-hidden="true">{t('shell.sos')}</span>
        </button>
        <button type="button" className="sk-sshell__icon-btn sk-sshell__cart" aria-label={cartLabel} aria-current={route === 'checkout' ? 'page' : undefined} onClick={() => go('checkout')}>
          <Icon name="shopping-bag" size={19} />
          {cartCount > 0 ? <span className="sk-sshell__badge" aria-hidden="true">{cartCount}</span> : null}
        </button>
        <button type="button" className="sk-sshell__avatar sk-sshell__avatar--top" aria-label={t('shell.myAccountInitials', { initials })} onClick={() => go('profile')}>
          {/* The name starts with the initials it shows (label in name, live-run audit #10). */}
          <span aria-hidden="true">{initials}</span>
        </button>
      </header>

      <div className="sk-sshell__frame">
        {drawerOpen ? <div className="sk-sshell__scrim" aria-hidden="true" onClick={closeDrawer} /> : null}
        <aside
          ref={sidebar}
          id={SIDEBAR_ID}
          className="sk-sshell__sidebar"
          aria-label={t('shell.sidebar.aria')}
          {...(drawerOpen ? { role: 'dialog', 'aria-modal': true } : {})}
        >
          <div className="sk-sshell__drawer-head">
            <button type="button" className="sk-sshell__icon-btn sk-sshell__drawer-close" aria-label={t('shell.closeMenu')} onClick={closeDrawer}>
              <Icon name="x" size={20} />
            </button>
          </div>
          {/* The account header opens the account (there is no separate "Account" item). */}
          <button type="button" className="sk-sshell__who" aria-current={route === 'profile' ? 'page' : undefined} onClick={() => go('profile')}>
            <span className="sk-sshell__avatar" aria-hidden="true">{initials}</span>
            <span className="sk-sshell__who-text">
              <span className="sk-sshell__who-name">{shortNameOf(student.fullName)}</span>
              <span className="sk-sshell__who-meta">{status}</span>
            </span>
          </button>
          <nav className="sk-sshell__nav" aria-label={t('shell.sidebar.aria')}>
            <div className="sk-sshell__group sk-sshell__drawer-only" role="group" aria-label={t('shell.top.aria')}>
              {topLinks('drawer')}
            </div>
            {STUDENT_NAV.map((group) => (
              <div key={group.id} className="sk-sshell__group" role="group" aria-labelledby={`sk-sshell-${group.id}`}>
                <span id={`sk-sshell-${group.id}`} className="sk-sshell__group-label">{t(group.label)}</span>
                {group.items.map((item) => (
                  <NavItem key={item.id} item={item} current={item.id === current} onGo={go} />
                ))}
              </div>
            ))}
          </nav>
          <div className="sk-sshell__footer">
            {signOutError ? <p className="sk-sshell__error" role="alert">{signOutError}</p> : null}
            <button
              type="button"
              className="sk-sshell__link sk-sshell__logout"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={() => { setDrawerOpen(false); onSignOut(); }}
            >
              <Icon name="log-out" size={18} />
              <span>{signingOut ? t('shell.loggingOut') : t('shell.logout')}</span>
            </button>
          </div>
        </aside>
        <main className="sk-sshell__main" id="main">
          {children}
          {/* Signed in, the public site's footer is not drawn; one line keeps crisis help in reach on every page. */}
          <footer className="sk-sshell__crisis" aria-label={t('shell.crisis.aria')}>
            <a href="/crisis">
              {t('landing.site.footer.crisisLead')} <strong>{EMERGENCY_NUMBER}</strong> · {t('landing.site.footer.teleManas')} <strong>{TELE_MANAS_PRIMARY}</strong>
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

function NavItem({ item, current, onGo }: { item: StudentNavItem; current: boolean; onGo: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const { route } = item;
  if (route === null) {
    // On the canvas, but no student screen yet: in its place, visibly unavailable, never interactive.
    return (
      <button type="button" className="sk-sshell__link is-unavailable" aria-disabled="true" title={t('shell.unavailable')}>
        <Icon name={item.icon} size={18} />
        <span>{t(item.label)}</span>
        <span className="sk-visually-hidden">, {t('shell.unavailable')}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`sk-sshell__link${current ? ' is-current' : ''}`}
      aria-current={current ? 'page' : undefined}
      onClick={() => onGo(route)}
    >
      <Icon name={item.icon} size={18} />
      <span>{t(item.label)}</span>
    </button>
  );
}
