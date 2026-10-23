import React, { useId } from 'react';
import { BrandLogo, Icon } from '../icons';
import type { SkIconName } from '../icons';
import { useT } from '@/i18n';
import '../design-system.css';
import './console-shell.css';

/**
 * The console frame pieces shared by the doctor (page 5), partner (page 6) and
 * super admin (page 7) consoles on the canvas: the brand block with its role
 * line, the grouped navy sidebar with the white current-page pill, a footer
 * link, and the white top bar (page name, search, 2FA chip, notifications,
 * account). Each console keeps its own drawer and routing; these pieces draw
 * the parts every console shares, so the three look and behave as one.
 *
 * Icons only through <Icon> with manifest names. Colours only from tokens
 * (console-shell.css). Copy comes from the caller, already translated, except
 * the shell's own words ("Not available yet", "{count} waiting"), which come
 * from the i18n catalogue.
 */

/** The two halves of the wordmark. A name, so it is never translated (DESIGN.md §3). */
const WORDMARK = { first: 'Student', second: 'Kare' } as const;

export interface ConsoleBrandProps {
  /** The role line under the wordmark, e.g. "CLINICIAN", "PARTNER", "SUPER ADMIN". */
  role?: string;
  /** Logo size in px. The canvas sidebar draws it at 32. */
  size?: number;
  className?: string;
}

/** Shield + "Student Kare" wordmark ("Kare" in the serif italic) + role line. */
export function ConsoleBrand({ role, size = 32, className }: ConsoleBrandProps): React.ReactElement {
  return (
    <span className={`sk-console-brand${className ? ` ${className}` : ''}`}>
      {/* The wordmark beside it says the name, so the shield is not read twice. */}
      <BrandLogo size={size} label="" />
      <span className="sk-console-brand__words">
        <span className="sk-console-brand__name">{WORDMARK.first}<em>&nbsp;{WORDMARK.second}</em></span>
        {role ? <span className="sk-console-brand__role">{role}</span> : null}
      </span>
    </span>
  );
}

export interface TeamAccountBadgeProps {
  /** "Team account", already translated. */
  label: string;
  /** Longer explanation, read by screen readers and shown on hover. */
  hint?: string;
  className?: string;
}

/**
 * The small "Team account" badge in a console header: the session is one of the
 * shared team accounts (one per role, PIN sign-in), not a person's own login.
 * Drawn only when the session says so; the caller decides that.
 */
export function TeamAccountBadge({ label, hint, className }: TeamAccountBadgeProps): React.ReactElement {
  return (
    <span className={`sk-team-badge${className ? ` ${className}` : ''}`} title={hint}>
      <Icon name="users" size={14} strokeWidth={1.9} />
      <span>{label}</span>
      {hint ? <span className="sk-visually-hidden">{`: ${hint}`}</span> : null}
    </span>
  );
}

export interface ConsoleNavItem {
  /** Stable id, unique within the nav. */
  id: string;
  /** Visible label, already translated. */
  label: string;
  /** Manifest icon name, exactly as the board's brief lists it. */
  icon: SkIconName;
  /** This is the page being shown: the white pill, and aria-current="page". */
  current?: boolean;
  /** Count badge; zero or missing shows none. */
  count?: number;
  /**
   * What the item does. Missing means the screen is not built (or not open to
   * this account): the item keeps its designed place, says "Not available yet",
   * and never navigates.
   */
  onSelect?: () => void;
}

export interface ConsoleNavGroup {
  id: string;
  /** Group heading, already translated. Drawn in capitals by CSS; read as written. */
  title: string;
  items: ConsoleNavItem[];
}

export interface ConsoleNavProps {
  /** Accessible name of the navigation landmark. */
  label: string;
  groups: ConsoleNavGroup[];
  className?: string;
}

/** The grouped sidebar navigation: heading per group, one 44 px row per item. */
export function ConsoleNav({ label, groups, className }: ConsoleNavProps): React.ReactElement {
  const prefix = useId();
  return (
    <nav aria-label={label} className={`sk-console-nav${className ? ` ${className}` : ''}`}>
      {groups.filter((group) => group.items.length > 0).map((group) => {
        const headingId = `${prefix}-${group.id}`;
        return (
          <div key={group.id} className="sk-console-nav__group" role="group" aria-labelledby={headingId}>
            <h2 id={headingId} className="sk-console-nav__title">{group.title}</h2>
            <ul className="sk-console-nav__list">
              {group.items.map((item) => <li key={item.id}><ConsoleNavRow item={item} /></li>)}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function ConsoleNavRow({ item }: { item: ConsoleNavItem }): React.ReactElement {
  const t = useT();
  const count = item.count && item.count > 0 ? item.count : 0;
  const badge = count > 0
    ? <><span className="sk-console-nav__badge" aria-hidden="true">{count}</span><span className="sk-visually-hidden">{t('console.countWaiting', { count })}</span></>
    : null;
  if (!item.onSelect) {
    return (
      <button type="button" className="sk-console-nav__link is-unavailable" aria-disabled="true" title={t('console.notAvailable')}>
        <Icon name={item.icon} size={16} strokeWidth={1.9} />
        <span className="sk-console-nav__label">{item.label}</span>
        {/* Dimmed in place on screen (as the canvas lays it out); said in words to assistive tech and on hover. */}
        <span className="sk-visually-hidden">{t('console.notAvailable')}</span>
        {badge}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`sk-console-nav__link${item.current ? ' is-current' : ''}`}
      aria-current={item.current ? 'page' : undefined}
      onClick={item.onSelect}
    >
      <Icon name={item.icon} size={16} strokeWidth={1.9} />
      <span className="sk-console-nav__label">{item.label}</span>
      {badge}
    </button>
  );
}

export interface ConsoleSidebarLinkProps {
  icon: SkIconName;
  label: string;
  /** Read after the label, not shown (e.g. "help centre" after a name). */
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}

/** A sidebar row outside the groups: the footer's help link and sign out. */
export function ConsoleSidebarLink({ icon, label, hint, onClick, disabled = false }: ConsoleSidebarLinkProps): React.ReactElement {
  // Wrapped in the nav root class so it shares the rows' scoped styles.
  return (
    <div className="sk-console-nav">
      <button type="button" className="sk-console-nav__link" disabled={disabled} onClick={onClick}>
        <Icon name={icon} size={16} strokeWidth={1.9} />
        <span className="sk-console-nav__label">{label}</span>
        {hint ? <span className="sk-visually-hidden">{hint}</span> : null}
      </button>
    </div>
  );
}

export interface ConsoleSearchProps {
  /** Accessible name and placeholder, already translated. */
  label: string;
  value?: string;
  /** Without a handler the field is shown disabled: search is not wired yet. */
  onChange?: (value: string) => void;
}

export interface ConsoleTopbarProps {
  /** Page or console name at the left. */
  title: string;
  /** Shorter title at phone width; defaults to `title`. */
  titleShort?: string;
  search?: ConsoleSearchProps;
  /**
   * The "2FA on" chip text. Pass it only when the session reports 2FA on: a
   * claim without a source would be a hard-coded security assertion
   * (AGENTS.md guardrail 6).
   */
  twoFactorLabel?: string;
  notifications?: { label: string; unread?: boolean; onClick: () => void };
  /** The account chip (and its menu), drawn by the console. */
  account?: React.ReactNode;
  /** Controls before the title, e.g. the drawer button below the sidebar breakpoint. */
  leading?: React.ReactNode;
  /** After the title, e.g. the TeamAccountBadge for a shared team account. */
  badge?: React.ReactNode;
  className?: string;
}

/** The white 64 px console top bar from the partner and doctor boards. */
export function ConsoleTopbar({ title, titleShort, search, twoFactorLabel, notifications, account, leading, badge, className }: ConsoleTopbarProps): React.ReactElement {
  return (
    <header className={`sk-console-topbar${className ? ` ${className}` : ''}`}>
      {leading}
      <span className="sk-console-topbar__title">
        <span className={titleShort ? 'sk-console-topbar__title-long' : undefined}>{title}</span>
        {titleShort ? <span className="sk-console-topbar__title-short" aria-hidden="true">{titleShort}</span> : null}
      </span>
      {badge}
      {search ? (
        <label className="sk-console-topbar__search">
          <Icon name="search" size={16} strokeWidth={1.9} />
          <input
            type="search"
            aria-label={search.label}
            placeholder={search.label}
            disabled={!search.onChange}
            {...(search.onChange
              ? { value: search.value ?? '', onChange: (event: React.ChangeEvent<HTMLInputElement>) => search.onChange?.(event.target.value) }
              : {})}
          />
        </label>
      ) : null}
      <span className="sk-console-topbar__grow" />
      {twoFactorLabel ? (
        <span className="sk-console-topbar__twofa"><Icon name="shield-2" size={14} strokeWidth={1.9} />{twoFactorLabel}</span>
      ) : null}
      {notifications ? (
        <button type="button" className="sk-console-topbar__icon-btn" aria-label={notifications.label} onClick={notifications.onClick}>
          <Icon name="bell" size={18} strokeWidth={1.9} />
          {notifications.unread ? <span className="sk-console-topbar__unread" aria-hidden="true" /> : null}
        </button>
      ) : null}
      {account}
    </header>
  );
}
