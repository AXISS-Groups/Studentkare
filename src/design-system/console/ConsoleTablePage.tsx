import React from 'react';
import { useT } from '@/i18n';
import { Icon, Icon3d } from '../icons';
import type { SkIcon3dName } from '../icons';
import { SkButton, Skeleton, StatusPill } from '../primitives';
import type { SkTone } from '../primitives';
import { DataTable, StatRow } from '../data/DataTable';
import type { DataTableColumn, DataTableRow, DataTableSelection, Stat } from '../data/DataTable';
import './console-table-page.css';

/**
 * The console table page (canvas pages 4–7, ~70 boards): page header, optional
 * note, figures, search and filter chips, one table with row actions and
 * pagination, and every state. Presentational: the screen's view model owns
 * the data and says which state it is in. Every text arrives translated.
 *
 * - `loading`: skeleton of the page.
 * - `ready`: the data (a filter that matches nothing says so inside the table).
 * - `empty`: connected, nothing yet: the board's 3D tile, title, body and one next step.
 * - `unconnected`: no API behind the board yet: the real layout, figures as "—",
 *   the designed columns and a plain "not connected" message. Never sample rows.
 * - `error`: calm card with retry, help and the board's reference code.
 */
export type ConsoleTableStatus = 'loading' | 'ready' | 'empty' | 'unconnected' | 'error';

export type ConsoleBadgeTone = Extract<SkTone, 'danger' | 'action' | 'attention' | 'positive' | 'neutral'>;

export interface ConsolePageHeaderProps {
  title: string;
  /** Small uppercase line above the title (super admin boards). */
  eyebrow?: string;
  subtitle?: React.ReactNode;
  /** A real, current state top right, e.g. "1 blocked". */
  badge?: { label: string; tone: ConsoleBadgeTone };
  /** Buttons or header tabs, right of the title. */
  actions?: React.ReactNode;
  /** The board's title is the page's h1; a page nested under another heading can drop to h2. */
  headingLevel?: 1 | 2;
}

/** Title block shared by every console page. */
export function ConsolePageHeader({ title, eyebrow, subtitle, badge, actions, headingLevel = 1 }: ConsolePageHeaderProps): React.ReactElement {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <header className="sk-ctp-head sk-fade">
      <div className="sk-ctp-head__titles">
        {eyebrow ? <p className="sk-ctp-eyebrow">{eyebrow}</p> : null}
        <Heading className="sk-ctp-title">{title}</Heading>
        {subtitle ? <p className="sk-ctp-subtitle">{subtitle}</p> : null}
      </div>
      {badge || actions ? (
        <div className="sk-ctp-head__side">
          {badge ? (
            <StatusPill tone={badge.tone} dot={badge.tone === 'danger' ? 'live' : true} className="sk-ctp-badge">{badge.label}</StatusPill>
          ) : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ toolbar */

export interface ConsoleSearch {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Search by name or roll number". */
  label: string;
  placeholder?: string;
}

export interface ConsoleFilterOption {
  id: string;
  label: string;
  /** Shown in mono after the label; omit when no source reports it. */
  count?: string;
}

export interface ConsoleFilters {
  /** Names the chip group, e.g. "Account status". */
  label: string;
  options: ConsoleFilterOption[];
  value: string;
  onChange: (id: string) => void;
}

export interface ConsoleBulk {
  /** How many rows are selected; the bar shows only when it is above 0. */
  count: number;
  /** Buttons that act on the selection. */
  actions: React.ReactNode;
}

function ConsoleToolbar({ search, filters, bulk }: { search?: ConsoleSearch; filters?: ConsoleFilters; bulk?: ConsoleBulk }): React.ReactElement | null {
  const t = useT();
  if (!search && !filters && !(bulk && bulk.count > 0)) return null;
  return (
    <div className="sk-ctp-toolbar">
      {search ? (
        <label className="sk-ctp-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={search.value}
            aria-label={search.label}
            placeholder={search.placeholder}
            onChange={(event) => search.onChange(event.target.value)}
          />
        </label>
      ) : null}
      {filters ? (
        <div className="sk-ctp-chips" role="group" aria-label={filters.label}>
          {filters.options.map((option) => {
            const on = option.id === filters.value;
            return (
              <button key={option.id} type="button" className={`sk-ctp-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => filters.onChange(option.id)}>
                {option.label}
                {option.count !== undefined ? <span className="sk-ctp-chip__count sk-mono">{option.count}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {bulk && bulk.count > 0 ? (
        <div className="sk-ctp-bulk" role="status">
          <span className="sk-ctp-bulk__count">{t('console.table.selected', { count: bulk.count })}</span>
          {bulk.actions}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- pagination */

export interface ConsolePagination {
  /** 1-based. */
  page: number;
  pages: number;
  /** Rows on this page and in all, already formatted ("10", "3,184"). */
  shown: string;
  total: string;
  onPrevious: () => void;
  onNext: () => void;
}

function Pagination({ pagination }: { pagination: ConsolePagination }): React.ReactElement {
  const t = useT();
  const { page, pages } = pagination;
  return (
    <nav className="sk-ctp-pages" aria-label={t('console.pagination.label')}>
      <span className="sk-ctp-pages__summary">
        {t('console.pagination.summary', { shown: pagination.shown, total: pagination.total, page, pages })}
      </span>
      <span className="sk-ctp-pages__buttons">
        <button type="button" className="sk-ctp-pages__button" disabled={page <= 1} onClick={pagination.onPrevious}>{t('console.pagination.previous')}</button>
        <button type="button" className="sk-ctp-pages__button" disabled={page >= pages} onClick={pagination.onNext}>{t('console.pagination.next')}</button>
      </span>
    </nav>
  );
}

/* ------------------------------------------------------------------- states */

export interface ConsoleEmpty {
  title: string;
  body: string;
  /** The board's 3D tile, e.g. `stetho-alt--p4` (clinician), `shield--p5` (super admin). */
  icon3d: SkIcon3dName;
  /** The one next step, e.g. "Open your schedule". */
  action?: { label: string; onSelect: () => void };
}

export interface ConsoleError {
  title: string;
  /** Defaults to the calm "on our side" sentence. */
  body?: string;
  /** Shown in mono, e.g. "Ref PATIENTS · ClinicianPatients". */
  reference: string;
  /** What the server said, in small print (never PHI). */
  detail?: string;
  onRetry: () => void;
  onHelp?: () => void;
  retrying?: boolean;
}

function EmptyView({ empty, headingLevel }: { empty: ConsoleEmpty; headingLevel: 1 | 2 }): React.ReactElement {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="sk-state">
      <div className="sk-state__body">
        <Icon3d name={empty.icon3d} size={96} />
        <Heading className="sk-state__title">{empty.title}</Heading>
        <p className="sk-state__text">{empty.body}</p>
        {empty.action ? (
          <div className="sk-state__actions">
            <SkButton onClick={empty.action.onSelect}>{empty.action.label}</SkButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ErrorView({ error, headingLevel }: { error: ConsoleError; headingLevel: 1 | 2 }): React.ReactElement {
  const t = useT();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="sk-state">
      <div className="sk-state__body sk-state__body--card" role="alert">
        <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
        <Heading className="sk-state__title">{error.title}</Heading>
        <p className="sk-state__text">{error.body ?? t('console.error.body')}</p>
        {error.detail ? <p className="sk-state__detail">{error.detail}</p> : null}
        <div className="sk-state__actions">
          <SkButton onClick={error.onRetry} busy={error.retrying}>{t('common.tryAgain')}</SkButton>
          {error.onHelp ? <SkButton variant="secondary" onClick={error.onHelp}>{t('console.error.help')}</SkButton> : null}
        </div>
        <span className="sk-state__ref">{error.reference}</span>
      </div>
    </div>
  );
}

const SKELETON_TILES = 4;
const SKELETON_ROWS = 6;

function LoadingView({ label, plainStats }: { label: string; plainStats: boolean }): React.ReactElement {
  return (
    <div className="sk-ctp sk-ctp--loading" aria-busy="true" aria-label={label} role="status">
      <div className="sk-ctp-head">
        <div className="sk-ctp-head__titles"><Skeleton width={280} height={26} /><Skeleton width={420} height={14} className="sk-ctp-skel-shrink" /></div>
        <Skeleton width={150} height={42} />
      </div>
      <div className="sk-ctp-skel-tiles">
        {Array.from({ length: SKELETON_TILES }, (_, i) => <Skeleton key={i} height={plainStats ? 64 : 92} />)}
      </div>
      <div className="sk-ctp-skel-rows">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => <Skeleton key={i} height={54} />)}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- page */

export interface ConsoleTableSpec {
  /** Visually hidden table caption. */
  caption: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** Title inside the table card, e.g. "This week". */
  title?: string;
  hideHeadings?: boolean;
  /** The board's closing sentence under the table. */
  footnote?: string;
  variant?: 'card' | 'plain';
  /** Rows carry `actions`; the column heading reads "Actions" to assistive tech. */
  rowActions?: boolean;
  selection?: DataTableSelection;
}

export interface ConsoleTablePageProps {
  status: ConsoleTableStatus;
  header: ConsolePageHeaderProps;
  /** Under the header, e.g. an info note ("Roster shows name, roll number…"). Shown with data and when not connected. */
  note?: React.ReactNode;
  /** The figures (ready). */
  stats?: Stat[];
  /** The design's figure labels, shown as "—" when not connected. */
  statLabels?: readonly string[];
  statVariant?: 'tile' | 'plain';
  /** Names the figures for assistive tech, e.g. "Accounts summary". */
  statsLabel?: string;
  search?: ConsoleSearch;
  filters?: ConsoleFilters;
  bulk?: ConsoleBulk;
  table: ConsoleTableSpec;
  pagination?: ConsolePagination;
  /** Ready, but the search or filter matches nothing. */
  noMatches?: { title: string; body: string };
  empty: ConsoleEmpty;
  unconnected: { title: string; body: string };
  error: ConsoleError;
  /** Accessible name of the skeleton, e.g. "Loading my patients". */
  loadingLabel: string;
  /** Header tabs that switch what the table area shows: wraps it in their tabpanel. */
  tabPanel?: { id: string; labelledBy: string };
  /** Shown in place of the table, e.g. a tab whose content is not this table. */
  alternate?: React.ReactNode;
  /** Anything the board shows under the table (a disclosure, a second card). */
  children?: React.ReactNode;
  className?: string;
}

export function ConsoleTablePage(props: ConsoleTablePageProps): React.ReactElement {
  const {
    status, header, note, stats, statLabels, statVariant = 'tile', statsLabel, search, filters, bulk,
    table, pagination, noMatches, empty, unconnected, error, loadingLabel, tabPanel, alternate, children, className,
  } = props;
  const t = useT();
  const headingLevel = header.headingLevel ?? 1;
  const rootClass = ['sk-ds', 'sk-ctp', className ?? ''].filter(Boolean).join(' ');

  if (status === 'loading') return <div className={rootClass}><LoadingView label={loadingLabel} plainStats={statVariant === 'plain'} /></div>;
  if (status === 'error') return <div className={rootClass}><ErrorView error={error} headingLevel={headingLevel} /></div>;
  // Connected with nothing at all (no filter to blame): the board's empty state.
  const nothing = status === 'empty' || (status === 'ready' && !alternate && table.rows.length === 0 && !noMatches);
  if (nothing) return <div className={rootClass}><EmptyView empty={empty} headingLevel={headingLevel} />{children}</div>;

  const connected = status === 'ready';
  const figures: Stat[] = connected && stats?.length
    ? stats
    : (statLabels ?? []).map((label) => ({ label, value: null }));
  const actionsLabel = table.rowActions ? t('console.table.actions') : undefined;
  const body = alternate ?? (
    <>
      {connected ? <ConsoleToolbar search={search} filters={filters} bulk={bulk} /> : null}
      <DataTable
        caption={table.caption}
        title={table.title}
        hideHeadings={table.hideHeadings}
        columns={table.columns}
        rows={connected ? table.rows : []}
        footnote={table.footnote}
        variant={table.variant}
        actionsLabel={actionsLabel}
        selection={connected ? table.selection : undefined}
        emptyMessage={connected ? noMatches : unconnected}
        footer={connected && pagination ? <Pagination pagination={pagination} /> : undefined}
      />
    </>
  );

  return (
    <div className={rootClass}>
      <ConsolePageHeader {...header} badge={connected ? header.badge : undefined} />
      {note}
      {figures.length ? <StatRow stats={figures} variant={statVariant} label={statsLabel} /> : null}
      {tabPanel ? (
        <div id={tabPanel.id} role="tabpanel" aria-labelledby={tabPanel.labelledBy} className="sk-ctp-panel">{body}</div>
      ) : body}
      {children}
    </div>
  );
}

/**
 * The page's own states, for a board laid out without the table (cards, two
 * columns): the same empty, error and skeleton the table page draws.
 */
export { EmptyView as ConsoleEmptyState, ErrorView as ConsoleErrorState, LoadingView as ConsoleLoadingState };
