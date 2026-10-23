import React, { useCallback, useEffect, useState } from 'react';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIcon3dName, SkIconName } from '@/design-system/icons';
import { SkButton, Skeleton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import './partner-console.css';

/**
 * Pieces every partner console page (design page 6) shares inside the partner
 * shell: the page frame, the calm notes under a table, the full-area empty and
 * error states with the board's reference code, a loading skeleton, and a
 * small loader hook. Every text arrives translated from the caller.
 */

export function PartnerPage({ children, className, labelledBy }: { children: React.ReactNode; className?: string; labelledBy?: string }): React.ReactElement {
  return <main className={['sk-ds', 'pc-page', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={labelledBy}>{children}</main>;
}

export type PartnerNoteTone = 'info' | 'attention' | 'danger' | 'positive';

/** A tinted note: lead words in bold, then the sentence (the boards' "Why roles matter: …"). */
export function PartnerNote({ tone, lead, children, eyebrow, icon }: { tone: PartnerNoteTone; lead?: string; eyebrow?: string; icon?: SkIconName; children: React.ReactNode }): React.ReactElement {
  return (
    <div className={`pc-note pc-note--${tone}`} role="note">
      {eyebrow ? <p className="pc-note__eyebrow">{icon ? <Icon name={icon} size={14} strokeWidth={2.2} /> : <span className="pc-note__dot" aria-hidden="true" />}{eyebrow}</p> : null}
      <p className="pc-note__text">{lead ? <strong>{lead} </strong> : null}{children}</p>
    </div>
  );
}

/** The partner boards' empty tile (VendorHome and every console page). */
export const PARTNER_EMPTY_TILE: SkIcon3dName = 'cart-alt--p3';

export function PartnerEmpty({ title, body, icon3d = PARTNER_EMPTY_TILE, action }: { title: string; body: string; icon3d?: SkIcon3dName; action?: { label: string; onSelect: () => void } }): React.ReactElement {
  return (
    <div className="sk-state">
      <div className="sk-state__body">
        <Icon3d name={icon3d} size={96} />
        <h1 className="sk-state__title">{title}</h1>
        <p className="sk-state__text">{body}</p>
        {action ? <div className="sk-state__actions"><SkButton onClick={action.onSelect}>{action.label}</SkButton></div> : null}
      </div>
    </div>
  );
}

export function PartnerError({ title, reference, detail, onRetry, onHelp }: { title: string; reference: string; detail?: string; onRetry: () => void; onHelp?: () => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-state">
      <div className="sk-state__body sk-state__body--card" role="alert">
        <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
        <h1 className="sk-state__title">{title}</h1>
        <p className="sk-state__text">{t('console.error.body')}</p>
        {detail ? <p className="sk-state__detail">{detail}</p> : null}
        <div className="sk-state__actions">
          <SkButton onClick={onRetry}>{t('common.tryAgain')}</SkButton>
          {onHelp ? <SkButton variant="secondary" onClick={onHelp}>{t('console.error.help')}</SkButton> : null}
        </div>
        <span className="sk-state__ref">{reference}</span>
      </div>
    </div>
  );
}

export interface PartnerKpi {
  id: string;
  label: string;
  /** null: no source reports it; shown as "—" with the not-connected line, never as 0. */
  value: string | null;
  meta?: string;
  tone?: 'text' | 'positive' | 'attention' | 'danger';
}

/** The four tiles under a page title: eyebrow label, figure, one line of meta. */
export function PartnerKpis({ items, label }: { items: PartnerKpi[]; label?: string }): React.ReactElement {
  const t = useT();
  // The name goes on a wrapping group: a role on the <dl> drops its list semantics (axe dlitem, live-run audit #10).
  const list = (
    <dl className="pc-kpis">
      {items.map((item) => (
        <div key={item.id} className="pc-kpi">
          <dt className="pc-kpi__label">{item.label}</dt>
          <dd className={`pc-kpi__value pc-kpi__value--${item.value === null ? 'unknown' : item.tone ?? 'text'}`}>{item.value ?? '\u2014'}</dd>
          <dd className="pc-kpi__meta">{item.value === null ? t('pc.notConnected') : item.meta}</dd>
        </div>
      ))}
    </dl>
  );
  return label ? <div role="group" aria-label={label}>{list}</div> : list;
}

/** Page skeleton: title, four tiles, a panel of rows. */
export function PartnerLoading({ label, tiles = 4, rows = 5 }: { label: string; tiles?: number; rows?: number }): React.ReactElement {
  return (
    <div className="pc-loading" role="status" aria-busy="true" aria-label={label}>
      <div className="pc-loading__head"><Skeleton width={280} height={26} /><Skeleton width={420} height={14} className="pc-shrink" /></div>
      <div className="pc-loading__tiles">{Array.from({ length: tiles }, (_, i) => <Skeleton key={i} height={96} />)}</div>
      <div className="pc-loading__rows">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={54} />)}</div>
    </div>
  );
}

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface Loaded<T> {
  status: LoadStatus;
  data: T | null;
  error: string;
  reload: () => void;
}

/**
 * Runs `load` on mount and on reload, aborting a stale run. Errors keep the
 * server's message for the small print (never PHI: these endpoints return none).
 */
export function usePartnerLoad<T>(load: ((signal: AbortSignal) => Promise<T>) | null): Loaded<T> {
  const [state, setState] = useState<{ status: LoadStatus; data: T | null; error: string }>({ status: load ? 'loading' : 'ready', data: null, error: '' });
  const [version, setVersion] = useState(0);
  // Runs again when the loader changes (callers memoise it on what it reads) or on reload().
  useEffect(() => {
    if (!load) return undefined;
    const controller = new AbortController();
    setState((previous) => ({ status: 'loading', data: previous.data, error: '' }));
    load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ status: 'ready', data, error: '' }); },
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', data: null, error: reason instanceof Error ? reason.message : '' });
      },
    );
    return () => controller.abort();
  }, [version, load]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}

/** A short, stable reference for an order or line id, as the boards print it ("ORD-5521"). */
export function shortRef(id: string): string {
  const compact = id.replace(/[^a-z0-9]/gi, '');
  return compact.slice(-6).toUpperCase();
}

/** Initials of a name, never the name itself (fulfilment needs no more). */
export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => `${part[0]?.toUpperCase() ?? ''}.`).join('');
}
