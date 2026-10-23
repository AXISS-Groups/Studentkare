import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BrandLogo, Icon } from '../icons';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { CAMPUS_NAV } from './campusNav';
import type { CampusNavId, CampusNavItem } from './campusNav';
import '../design-system.css';
import './campus-shell.css';

export interface CampusScopeOption {
  id: string;
  label: string;
  meta?: string;
}

export interface CampusIdentity {
  fullName: string;
  initials: string;
  /** "Campus admin" / "Super admin", already translated. */
  roleLabel: string;
}

export interface CampusShellProps {
  /** The sidebar item to highlight; null on pages outside the sidebar. */
  current: CampusNavId | null;
  identity: CampusIdentity;
  /** Under the wordmark, e.g. "Campus admin · VNR VJIET". Shown uppercase. */
  roleLine: string;
  /** The campus name at the start of the scope picker, e.g. "VNR VJIET". */
  campusLabel: string;
  scopes: CampusScopeOption[];
  scope: string;
  onScopeChange: (id: string) => void;
  /** Said under the options, e.g. why only "Whole campus" is offered. */
  scopeNote?: string;
  /** Sidebar count badges; a missing or zero count shows no badge. */
  counts?: Partial<Record<CampusNavId, number>>;
  /**
   * Shown only when the session reports it. A "2FA on" claim without a source
   * would be a hard-coded security assertion (AGENTS.md guardrail 6).
   */
  twoFactorOn?: boolean;
  unreadNotifications?: number;
  /** Most boards draw the top bar; a few (Camps, SLA, …) are sidebar and page only. */
  topBar?: boolean;
  onNavigate: (route: RoutePath) => void;
  onSignOut: () => void;
  /** In the top bar after the menu button, e.g. the "Team account" badge. */
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** A plain click navigates in place; a modified click (new tab, window) is left to the browser. */
function plainClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Web console frame for every campus / hostel admin board (design page 4):
 * the navy sidebar in four groups with the white current-page pill, a top bar
 * with the scope picker, search, 2FA chip, notifications and the signed-in
 * admin, then the page. Below 1024 px the sidebar becomes a modal drawer.
 */
export function CampusShell({
  current,
  identity,
  roleLine,
  campusLabel,
  scopes,
  scope,
  onScopeChange,
  scopeNote,
  counts = {},
  twoFactorOn,
  unreadNotifications = 0,
  topBar = true,
  onNavigate,
  onSignOut,
  badge,
  children,
}: CampusShellProps): React.ReactElement {
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const scopeButton = useRef<HTMLButtonElement>(null);
  const scopeListId = useId();
  const sidebarId = useId();

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

  // Scope list: focus the chosen option on open; Esc and an outside click close it.
  useEffect(() => {
    if (!scopeOpen) return undefined;
    scopeRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setScopeOpen(false); scopeButton.current?.focus(); }
    };
    const onClick = (event: MouseEvent) => {
      if (scopeRef.current && event.target instanceof Node && !scopeRef.current.contains(event.target)) setScopeOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
  }, [scopeOpen]);

  const go = (route: RoutePath) => {
    setDrawerOpen(false);
    onNavigate(route);
  };

  const pickScope = (id: string) => {
    setScopeOpen(false);
    scopeButton.current?.focus();
    onScopeChange(id);
  };

  // Arrow keys move between options, as in a native list box.
  const onScopeListKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const options = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
    const at = options.findIndex((node) => node === document.activeElement);
    const next = event.key === 'ArrowDown' ? Math.min(at + 1, options.length - 1) : Math.max(at - 1, 0);
    options[next]?.focus();
  };

  const scopeLabel = scopes.find((option) => option.id === scope)?.label ?? '';

  return (
    <div className={`sk-ds sk-cshell${drawerOpen ? ' is-drawer-open' : ''}`}>
      {drawerOpen ? <div className="sk-cshell__scrim" aria-hidden="true" onClick={closeDrawer} /> : null}
      <aside
        ref={sidebar}
        id={sidebarId}
        className="sk-cshell__sidebar"
        aria-label={t('campusShell.sidebarLabel')}
        {...(drawerOpen ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="sk-cshell__brand">
          <BrandLogo size={32} />
          <span className="sk-cshell__wordmark">
            <span className="sk-cshell__name">{t('campusShell.brandFirst')}<em>{'\u00a0'}{t('campusShell.brandSecond')}</em></span>
            <span className="sk-cshell__role">{roleLine}</span>
          </span>
          <button type="button" className="sk-cshell__drawer-close" aria-label={t('campusShell.closeNav')} onClick={closeDrawer}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <nav aria-label={t('campusShell.navLabel')} className="sk-cshell__nav">
          {CAMPUS_NAV.map((group) => (
            <div key={group.label} className="sk-cshell__group" role="group" aria-labelledby={`${sidebarId}-${group.label}`}>
              <span id={`${sidebarId}-${group.label}`} className="sk-cshell__group-label">{t(group.label)}</span>
              {group.items.map((item) => (
                <NavLink key={item.id} item={item} current={item.id === current} count={counts[item.id] ?? 0} onGo={go} />
              ))}
            </div>
          ))}
        </nav>
        <span className="sk-cshell__spacer" />
        <div className="sk-cshell__footer">
          <a
            className="sk-cshell__link"
            href="/support"
            onClick={(event) => { if (plainClick(event)) { event.preventDefault(); go('support'); } }}
          >
            <Icon name="help-circle" size={16} strokeWidth={1.9} />
            <span>{t('campusShell.support')}</span>
            <span className="sk-visually-hidden">{t('campusShell.supportHint')}</span>
          </a>
          <button type="button" className="sk-cshell__link sk-cshell__link--signout" onClick={() => { setDrawerOpen(false); onSignOut(); }}>
            <Icon name="log-out" size={16} strokeWidth={1.9} />
            <span>{t('campusShell.signOut')}</span>
          </button>
        </div>
      </aside>

      <div className="sk-cshell__body">
        <header className={`sk-cshell__topbar${topBar ? '' : ' is-compact'}`}>
          <button
            ref={menuButton}
            type="button"
            className="sk-cshell__icon-btn sk-cshell__menu-btn"
            aria-label={t('campusShell.openNav')}
            aria-expanded={drawerOpen}
            aria-controls={sidebarId}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          {badge}
          {topBar ? (
            <>
              <div className="sk-cshell__scope" ref={scopeRef}>
                <button
                  ref={scopeButton}
                  type="button"
                  className="sk-cshell__scope-btn"
                  aria-haspopup="listbox"
                  aria-expanded={scopeOpen}
                  aria-controls={scopeOpen ? scopeListId : undefined}
                  onClick={() => setScopeOpen((open) => !open)}
                >
                  <span className="sk-cshell__scope-dot" aria-hidden="true" />
                  <span className="sk-cshell__scope-campus">{campusLabel}</span>
                  <span className="sk-cshell__scope-sep" aria-hidden="true">·</span>
                  <span className="sk-cshell__scope-value">{scopeLabel}</span>
                  <span className="sk-visually-hidden">{t('campusShell.scopeButtonHint')}</span>
                  <Icon name="chevron-down" size={16} strokeWidth={1.9} />
                </button>
                {scopeOpen ? (
                  <div className="sk-cshell__scope-pop">
                    <div id={scopeListId} role="listbox" aria-label={t('campusShell.scopeLabel')} onKeyDown={onScopeListKey}>
                      {scopes.map((option) => {
                        const selected = option.id === scope;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`sk-cshell__scope-option${selected ? ' is-selected' : ''}`}
                            onClick={() => pickScope(option.id)}
                          >
                            <span className="sk-cshell__scope-option-text">
                              <span className="sk-cshell__scope-option-label">{option.label}</span>
                              {option.meta ? <span className="sk-cshell__scope-option-meta">{option.meta}</span> : null}
                            </span>
                            {selected ? <Icon name="check-2" size={16} strokeWidth={2.2} /> : null}
                          </button>
                        );
                      })}
                    </div>
                    {scopeNote ? <p className="sk-cshell__scope-note">{scopeNote}</p> : null}
                  </div>
                ) : null}
              </div>
              {/* No campus search endpoint exists yet: shown in its designed place, disabled, and said so. */}
              <label className="sk-cshell__search">
                <Icon name="search" size={16} strokeWidth={1.9} />
                <span className="sk-visually-hidden">{t('campusShell.searchUnavailable')}</span>
                <input type="search" placeholder={t('campusShell.searchPlaceholder')} disabled />
              </label>
              <span className="sk-cshell__grow" />
              {twoFactorOn ? (
                <span className="sk-cshell__twofa"><Icon name="shield-2" size={14} strokeWidth={1.9} />{t('campusShell.twoFactorOn')}</span>
              ) : null}
              <a
                className="sk-cshell__icon-btn"
                href="/notifications"
                aria-label={unreadNotifications > 0 ? t('campusShell.notificationsUnread', { count: unreadNotifications }) : t('campusShell.notifications')}
                onClick={(event) => { if (plainClick(event)) { event.preventDefault(); go('notifications'); } }}
              >
                <Icon name="bell" size={18} strokeWidth={1.9} />
                {unreadNotifications > 0 ? <span className="sk-cshell__unread" aria-hidden="true" /> : null}
              </a>
              <span className="sk-cshell__who">
                <span className="sk-avatar" aria-hidden="true">{identity.initials}</span>
                <span className="sk-cshell__who-text">
                  <span className="sk-cshell__who-name">{identity.fullName}</span>
                  <span className="sk-cshell__who-role">{identity.roleLabel}</span>
                </span>
              </span>
            </>
          ) : null}
        </header>
        <main className="sk-cshell__main" id="campus-main">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ item, current, count, onGo }: { item: CampusNavItem; current: boolean; count: number; onGo: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  return (
    <a
      href={`/${item.route}`}
      className={`sk-cshell__link${current ? ' is-current' : ''}`}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => { if (plainClick(event)) { event.preventDefault(); onGo(item.route); } }}
    >
      <Icon name={item.icon} size={16} strokeWidth={1.9} />
      <span>{t(item.label)}</span>
      {count > 0 ? (
        <>
          <span className={`sk-cshell__badge${item.urgent ? ' is-urgent' : ''}`} aria-hidden="true">{count}</span>
          <span className="sk-visually-hidden">{t('campusShell.waiting', { count })}</span>
        </>
      ) : null}
    </a>
  );
}
