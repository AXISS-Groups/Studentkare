import React, { useEffect, useState } from 'react';
import type { RoutePath } from '@/lib/workflowRouting';
import { SkIcon } from './icons/SkIcon';
import type { SkIconName } from './icons/SkIcon';

export type SkTone = 'positive' | 'attention' | 'danger' | 'action' | 'neutral';

/* ---------------------------------------------------------------- StatusPill */

export interface StatusPillProps {
  tone: SkTone;
  children: React.ReactNode;
  /** Small uppercase eyebrow pill (queue consent labels) instead of the 26 px chip. */
  small?: boolean;
  /** Leading dot; `live` pulses it (stops under reduced motion). */
  dot?: boolean | 'live';
  className?: string;
}

export function StatusPill({ tone, children, small, dot, className }: StatusPillProps): React.ReactElement {
  const classes = ['sk-pill', `sk-pill--${tone}`, small ? 'sk-pill--sm' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      {dot ? <span className={`sk-pill__dot${dot === 'live' ? ' sk-pill__dot--live' : ''}`} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Button */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'on-hero';

export interface SkButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  icon?: SkIconName;
  /** Spinner inside the button while an action under ~2 s runs. */
  busy?: boolean;
  type?: 'button' | 'submit';
}

export function SkButton({ variant = 'primary', icon, busy = false, disabled, className, children, type = 'button', ...rest }: SkButtonProps): React.ReactElement {
  return (
    <button
      {...rest}
      type={type}
      className={['sk-btn', `sk-btn--${variant}`, className ?? ''].filter(Boolean).join(' ')}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? <span className="sk-btn__spinner" aria-hidden="true" /> : icon ? <SkIcon name={icon} size={17} /> : null}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------- Card */

export interface SkCardProps {
  title?: string;
  subtitle?: string;
  /** Right side of the header: a link or a pill. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** Heading level for the title; defaults to h2 on a page whose h1 is the greeting. */
  headingLevel?: 2 | 3;
  labelledBy?: string;
}

export function SkCard({ title, subtitle, action, children, className, headingLevel = 2, labelledBy }: SkCardProps): React.ReactElement {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const headingId = labelledBy;
  return (
    <section className={['sk-card', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={title ? headingId : undefined}>
      {title ? (
        <div className="sk-card__head">
          <span className="sk-card__titles">
            <Heading className="sk-card__title" id={headingId}>{title}</Heading>
            {subtitle ? <p className="sk-card__subtitle">{subtitle}</p> : null}
          </span>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------------- Note */

export interface NoteProps {
  tone: 'info' | 'attention' | 'danger' | 'positive';
  children: React.ReactNode;
}

const NOTE_ICON: Record<NoteProps['tone'], SkIconName> = { info: 'info', attention: 'alert', danger: 'alert', positive: 'check' };

export function Note({ tone, children }: NoteProps): React.ReactElement {
  return (
    <div className={`sk-note sk-note--${tone}`}>
      <SkIcon name={NOTE_ICON[tone]} size={16} />
      <span>{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------- Avatar */

export function Avatar({ initials, className }: { initials: string; className?: string }): React.ReactElement {
  return <span className={['sk-avatar', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">{initials}</span>;
}

/* ------------------------------------------------------------------ Skeleton */

export function Skeleton({ width = '100%', height, className }: { width?: number | string; height: number | string; className?: string }): React.ReactElement {
  return <span className={['sk-skeleton', className ?? ''].filter(Boolean).join(' ')} style={{ width, height }} aria-hidden="true" />;
}

/* --------------------------------------------------------------- State views */

export interface EmptyStateViewProps {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  /** 3D illustration from /public/illustrations (48–140 px only). */
  illustration?: string;
}

export function EmptyStateView({ title, body, action, illustration = '/illustrations/stethoscope-3d.svg' }: EmptyStateViewProps): React.ReactElement {
  return (
    <div className="sk-state">
      <div className="sk-state__body">
        <img src={illustration} width={96} height={96} alt="" />
        <h2 className="sk-state__title">{title}</h2>
        <p className="sk-state__text">{body}</p>
        {action ? (
          <div className="sk-state__actions">
            <SkButton onClick={action.onClick}>{action.label}</SkButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ErrorStateViewProps {
  title: string;
  body?: string;
  onRetry: () => void;
  onHelp?: () => void;
  /** Shown in mono, e.g. "Ref ERR-503 · ClinicianToday". */
  reference: string;
  retrying?: boolean;
}

export function ErrorStateView({
  title,
  body = 'This is on our side, not yours — nothing was lost. If it keeps happening, the status page will say so.',
  onRetry,
  onHelp,
  reference,
  retrying = false,
}: ErrorStateViewProps): React.ReactElement {
  return (
    <div className="sk-state">
      <div className="sk-state__body sk-state__body--card" role="alert">
        <span className="sk-state__badge"><SkIcon name="alert" size={30} strokeWidth={2.2} /></span>
        <h2 className="sk-state__title">{title}</h2>
        <p className="sk-state__text">{body}</p>
        <div className="sk-state__actions">
          <SkButton onClick={onRetry} busy={retrying}>Try again</SkButton>
          {onHelp ? <SkButton variant="secondary" onClick={onHelp}>Status &amp; help</SkButton> : null}
        </div>
        <span className="sk-state__ref">{reference}</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- Toast */

/**
 * A polite status message that clears itself. Rendered through a persistent
 * live region so screen readers announce each new message.
 */
export function Toast({ message, onDone, durationMs = 2600 }: { message: string | null; onDone: () => void; durationMs?: number }): React.ReactElement {
  const [shown, setShown] = useState(message);
  useEffect(() => {
    setShown(message);
    if (!message) return undefined;
    const timer = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDone, durationMs]);
  return (
    <div role="status" aria-live="polite">
      {shown ? <div className="sk-toast">{shown}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------- DestinationButton */

export interface DestinationButtonProps {
  /** Where it goes; `null` = that screen is not built yet. */
  route: RoutePath | null;
  onNavigate: (route: RoutePath) => void;
  className: string;
  children: React.ReactNode;
}

/**
 * A control that goes somewhere — or, when that screen isn't built yet, is
 * shown (it is part of the design) but disabled, and says so to assistive tech.
 */
export function DestinationButton({ route, onNavigate, className, children }: DestinationButtonProps): React.ReactElement {
  if (route === null) {
    return (
      <button type="button" className={`${className} is-unavailable`} aria-disabled="true" title="Not available yet">
        {children}
        <span className="sk-visually-hidden"> — not available yet</span>
      </button>
    );
  }
  return (
    <button type="button" className={className} onClick={() => onNavigate(route)}>
      {children}
    </button>
  );
}
