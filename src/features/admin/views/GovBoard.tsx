import React, { useEffect, useId, useState } from 'react';
import { ConsoleErrorState, ConsoleLoadingState, StatusPill } from '@/design-system';
import type { SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { ResourceViewModel } from '../viewmodels/ResourceViewModel';
import { boardError } from './AdminBoard';
import './gov-board.css';

/**
 * Pieces shared by the super admin governance, safety and money boards (canvas page 7,
 * WP-17, Tier 1): one server resource per board section, the page's loading and error
 * states for boards laid out as cards, cards with an eyebrow, label/value lines, bars
 * and a back link. Every text arrives translated; icons are named by the screen.
 */

type Translate = ReturnType<typeof useT>;

/** A resource that loads when the board mounts and stops when it leaves. */
export function useResource<T>(fetcher: (signal: AbortSignal) => Promise<T>): ResourceViewModel<T> {
  const [vm] = useState(() => new ResourceViewModel(fetcher));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  return vm;
}

/** The skeleton of a board laid out as cards. */
export function BoardLoading({ label }: { label: string }) {
  return <div className="sk-ds sk-ctp"><ConsoleLoadingState label={label} plainStats={false} /></div>;
}

/** The board's calm error: retry, status & help, and its reference. Never a figure. */
export function BoardFailure({ t, what, screen, onRetry, detail }: { t: Translate; what: string; screen: string; onRetry: () => void; detail?: string }) {
  return <div className="sk-ds sk-ctp"><ConsoleErrorState error={boardError(t, what, screen, onRetry, detail)} headingLevel={1} /></div>;
}

/** A white card with an eyebrow heading (and an optional link or note on the right). */
export function GovCard({ eyebrow, title, aside, tone, children, className }: { eyebrow?: string; title?: string; aside?: React.ReactNode; tone?: 'danger' | 'soft'; children: React.ReactNode; className?: string }) {
  const id = `sk-gov-card-${useId().replace(/:/g, '')}`;
  const heading = title ?? eyebrow;
  return <section className={['sk-gov-card', tone ? `sk-gov-card--${tone}` : '', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={heading ? id : undefined}>
    {heading || aside ? <div className="sk-gov-card__head">
      {title ? <h2 id={id} className="sk-gov-card__title">{title}</h2> : eyebrow ? <h2 id={id} className="sk-gov-eyebrow">{eyebrow}</h2> : null}
      {aside ? <div className="sk-gov-card__aside">{aside}</div> : null}
    </div> : null}
    {children}
  </section>;
}

export type LineTone = 'positive' | 'attention' | 'danger' | 'muted';

/** Label / value lines (grounding, signing key, guardrails). A value of null reads "—" and says it is not reported. */
export function GovLines({ label, lines }: { label: string; lines: { label: string; value: string | null; tone?: LineTone; mono?: boolean }[] }) {
  const t = useT();
  return <dl className="sk-gov-lines" aria-label={label}>
    {lines.map(line => <div key={line.label}>
      <dt>{line.label}</dt>
      <dd className={[line.value === null ? 'is-unknown' : line.tone ? `is-${line.tone}` : '', line.mono ? 'sk-mono' : ''].filter(Boolean).join(' ')}
        aria-label={line.value === null ? t('admin.overview.notReportedFor', { label: line.label }) : undefined}>{line.value ?? '—'}</dd>
    </div>)}
  </dl>;
}

/** A thin bar: how much of `max` is used. Decorative; the number beside it carries the meaning. */
export function GovBar({ value, max, tone = 'action' }: { value: number; max: number; tone?: SkTone }) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return <span className={`sk-gov-bar sk-gov-bar--${tone}`} aria-hidden="true"><span style={{ width: `${Math.round(share * 100)}%` }} /></span>;
}

/** A back link ("Integrations", with a left arrow): back to the board this one belongs to. */
export function BackLink({ route, label }: { route: RoutePath; label: string }) {
  return <button type="button" className="sk-gov-back" onClick={() => navigate(route)}><Icon name="arrow-left" size={15} strokeWidth={2.4} />{label}</button>;
}

/** "View all", with a right arrow: a link to the board a summary comes from. */
export function ViewLink({ route, label }: { route: RoutePath; label: string }) {
  return <button type="button" className="sk-gov-link" onClick={() => navigate(route)}>{label}<Icon name="arrow-right" size={14} strokeWidth={2.4} /></button>;
}

/** A pill that names a state (never a figure). */
export function GovPill({ tone, children, dot }: { tone: SkTone; children: React.ReactNode; dot?: boolean | 'live' }) {
  return <StatusPill tone={tone} dot={dot} className="sk-gov-pill">{children}</StatusPill>;
}

/** An honest "not available yet" line under a control the board draws but cannot use. */
export function Unavailable({ icon = 'info', children }: { icon?: SkIconName; children: React.ReactNode }) {
  return <p className="sk-gov-unavailable"><Icon name={icon} size={15} strokeWidth={2.2} />{children}</p>;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "2 min ago", "3 h ago", "Yesterday", "14 days ago"; from epoch seconds. */
export function ago(t: Translate, seconds: number, now: number = Date.now() / 1000): string {
  const elapsed = Math.max(0, now - seconds);
  if (elapsed < MINUTE) return t('gov.time.justNow');
  if (elapsed < HOUR) return t('gov.time.minutes', { count: Math.floor(elapsed / MINUTE) });
  if (elapsed < DAY) return t('gov.time.hours', { count: Math.floor(elapsed / HOUR) });
  if (elapsed < 2 * DAY) return t('gov.time.yesterday');
  return t('gov.time.days', { count: Math.floor(elapsed / DAY) });
}

/** Whole days between two epoch-second times (rounded down, never negative). */
export const wholeDays = (from: number, to: number) => Math.max(0, Math.floor((to - from) / DAY));

/** The middle value, or null for none. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** "acct_4f21••": enough of an id to tell rows apart, never the whole id. */
export const maskId = (prefix: string, id: string) => `${prefix}${id.slice(0, 4)}••`;
