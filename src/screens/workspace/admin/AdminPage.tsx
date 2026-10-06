import React, { KeyboardEvent, ReactNode, useRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { navigate, RoutePath } from '../../../lib/workflowRouting';
import './admin-screens.css';
import './admin-legacy.css';

/** Page frame shared by the Super Admin screens (design: 07-super-admin/*). */
export function AdminPage({ eyebrow, title, description, status, children }: { eyebrow?: string; title: string; description: string; status?: ReactNode; children: ReactNode }) {
  return <div className="sk-admin-page">
    <header className="sk-admin-page-header">
      <div className="sk-admin-page-heading">
        {eyebrow && <p className="sk-admin-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {status && <div className="sk-admin-page-status">{status}</div>}
    </header>
    {children}
  </div>;
}

export function AdminCard({ title, children, labelledBy }: { title?: string; children: ReactNode; labelledBy?: string }) {
  return <section className="sk-admin-card" aria-labelledby={title ? labelledBy : undefined}>
    {title && <h3 id={labelledBy} className="sk-admin-eyebrow">{title}</h3>}
    {children}
  </section>;
}

export function AdminTile({ label, value, meta }: { label: string; value: string; meta: string }) {
  return <article className="sk-admin-tile"><h3 className="sk-admin-eyebrow">{label}</h3><strong>{value}</strong><p>{meta}</p></article>;
}

/** A design KPI. A missing value is shown as unknown, never as 0. */
export interface AdminStat { label: string; value?: string | null; meta?: string }

/** Tiles for figures with no data source yet: each shows “—”, never 0. */
export const unreportedStats = (labels: string[] = []): AdminStat[] => labels.map(label => ({ label }));

/** `columns={5}` keeps five tiles on one row on wide screens; narrower screens still wrap. */
export function AdminStats({ stats, label, plain = false, columns = 4 }: { stats: AdminStat[]; label: string; plain?: boolean; columns?: 4 | 5 }) {
  return <div className={`sk-admin-tiles${plain ? ' is-plain' : ''}${columns === 5 ? ' is-five' : ''}`} role="group" aria-label={label}>
    {stats.map(stat => {
      const known = stat.value !== undefined && stat.value !== null;
      return <article key={stat.label} className={`sk-admin-tile${known ? '' : ' is-unreported'}`}>
        <h3 className="sk-admin-eyebrow">{stat.label}</h3>
        <strong>{known ? stat.value : '—'}</strong>
        <p>{known ? stat.meta ?? '' : 'Not reported · no data source yet'}</p>
      </article>;
    })}
  </div>;
}

/** A small header pill for a real, current state (e.g. open safety events). */
export function AdminStatus({ tone, children }: { tone: 'danger' | 'attention' | 'positive' | 'neutral'; children: ReactNode }) {
  return <span className={`sk-admin-status is-${tone}`}><span aria-hidden="true" className="sk-admin-status-dot" />{children}</span>;
}

export function AdminEmpty({ title, description }: { title: string; description: string }) {
  return <div className="sk-admin-empty"><strong>{title}</strong><p>{description}</p></div>;
}

export function AdminLoading({ label }: { label: string }) {
  return <div className="sk-admin-loading" role="status">{label}</div>;
}

export function AdminError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <div className="sk-admin-error" role="alert">
    <AlertCircle size={22} aria-hidden="true" />
    <div><strong>{title}</strong><p>This is on our side, not yours — nothing was lost.</p>{message && <p className="sk-admin-fineprint">{message}</p>}</div>
    <button type="button" className="sk-admin-button" onClick={onRetry}><RefreshCw size={15} aria-hidden="true" />Try again</button>
  </div>;
}

/**
 * A designed table with no data source behind it yet. The column headings come
 * from the approved design; the body says plainly that nothing is connected,
 * rather than that nothing needs attention.
 */
export function NotConnectedTable({ caption, columns, subject, emptyTitle }: { caption: string; columns: string[]; subject: string; emptyTitle?: string }) {
  return <div className="sk-admin-card sk-admin-table-card">
    <table className="sk-admin-table">
      <caption className="sk-admin-visually-hidden">{caption}</caption>
      <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody><tr><td colSpan={columns.length}>
        <AdminEmpty title={emptyTitle ?? `No ${subject} yet.`} description={`${subject.charAt(0).toUpperCase()}${subject.slice(1)} will appear here once the data source is connected. No sample data is shown.`} />
      </td></tr></tbody>
    </table>
  </div>;
}

/** A section of a screen whose data source isn't connected yet. */
export function AdminEmptySection({ title, description, emptyTitle, emptyDescription }: { title: string; description: string; emptyTitle: string; emptyDescription: string }) {
  const id = `sk-admin-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <section className="sk-admin-card" aria-labelledby={id}>
    <h3 id={id} className="sk-admin-eyebrow">{title}</h3>
    <p className="sk-admin-section-description">{description}</p>
    <AdminEmpty title={emptyTitle} description={emptyDescription} />
  </section>;
}

/** Wraps an older panel so its `wf-*` markup takes the console's look (admin-legacy.css). */
export function LegacyPanel({ children }: { children: ReactNode }) {
  return <div className="sk-admin-legacy">{children}</div>;
}

export interface AdminTab { route: RoutePath; label: string }

/**
 * Tabs whose selection is the URL, so each tab keeps its own address and the
 * routing system stays the only source of truth. Arrow keys move between tabs.
 */
export function AdminTabs({ label, tabs, current }: { label: string; tabs: AdminTab[]; current: RoutePath }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + tabs.length) % tabs.length;
    refs.current[target]?.focus();
    navigate(tabs[target].route);
  };
  return <div className="sk-admin-tabs" role="tablist" aria-label={label}>
    {tabs.map((tab, index) => {
      const selected = tab.route === current;
      return <button key={tab.route} ref={element => { refs.current[index] = element; }} type="button" role="tab" id={`sk-admin-tab-${tab.route.replace(/\//g, '-')}`} aria-selected={selected} aria-controls="sk-admin-tabpanel" tabIndex={selected ? 0 : -1} onClick={() => navigate(tab.route)} onKeyDown={event => move(event, index)}>{tab.label}</button>;
    })}
  </div>;
}

/** A canonical screen made of route-backed tabs. */
export function AdminTabbedPage({ eyebrow, title, description, status, tabs, current, children }: { eyebrow?: string; title: string; description: string; status?: ReactNode; tabs: AdminTab[]; current: RoutePath; children: ReactNode }) {
  return <AdminPage eyebrow={eyebrow} title={title} description={description} status={status}>
    <AdminTabs label={`${title} sections`} tabs={tabs} current={current} />
    <div id="sk-admin-tabpanel" role="tabpanel" aria-labelledby={`sk-admin-tab-${current.replace(/\//g, '-')}`} className="sk-admin-tabpanel">{children}</div>
  </AdminPage>;
}
