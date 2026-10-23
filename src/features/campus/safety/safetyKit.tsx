import React, { useId } from 'react';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIcon3dName, SkIconName } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useOnline } from '@/design-system/States';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './campus-safety.css';
import '@/design-system/design-system.css';

/**
 * Shared pieces for the WP-11 campus safety boards (design page 4, Tier 1).
 *
 * The emergency numbers are protocol values, not settings: India's ambulance
 * (108), emergency (112) and Tele-MANAS (14416) lines. They are plain `tel:`
 * links that carry no state and make no request, so they work while the page
 * is loading, failed or offline (DESIGN.md §2.4: help is always one tap away).
 */
export type EmergencyNumber = '108' | '112' | '14416';

const LINE_COPY: Record<EmergencyNumber, { label: MessageKey; spoken: MessageKey }> = {
  108: { label: 'campusSafety.lines.call108', spoken: 'campusSafety.lines.call108Spoken' },
  112: { label: 'campusSafety.lines.call112', spoken: 'campusSafety.lines.call112Spoken' },
  14416: { label: 'campusSafety.lines.teleManas', spoken: 'campusSafety.lines.teleManasSpoken' },
};

export interface EmergencyLinesProps {
  numbers: readonly EmergencyNumber[];
  /** The sentence before the links; omit for links only. */
  lead?: MessageKey;
  /** The drawing on each link (`phone` unless the board draws another). */
  icon?: SkIconName;
  /** A trailing drawing, e.g. the canvas's `arrow-right` on a link. */
  trailing?: SkIconName;
  /** The first number is the one to call first: it gets the danger fill. */
  className?: string;
}

/** 108 / 112 / Tele-MANAS as call links. The first number is drawn as the one to call first. */
export function EmergencyLines({ numbers, lead, icon = 'phone', trailing, className }: EmergencyLinesProps): React.ReactElement {
  const t = useT();
  const baseId = `cs-line-${useId().replace(/:/g, '')}`;
  return (
    <div className={['cs-lines', className ?? ''].filter(Boolean).join(' ')} role="group" aria-label={t('campusSafety.lines.label')}>
      {lead ? <p className="cs-lines__lead">{t(lead)}</p> : null}
      {numbers.map((number, index) => (
        // Named by what it shows (label-in-name, WCAG 2.5.3); the spoken line describes it.
        <React.Fragment key={number}>
          <a className={`cs-line${index === 0 ? ' cs-line--first' : ''}`} href={`tel:${number}`} aria-describedby={`${baseId}-${number}`}>
            <Icon name={icon} size={16} strokeWidth={2.2} />
            <span>{t(LINE_COPY[number].label)}</span>
            {trailing ? <Icon name={trailing} size={16} strokeWidth={2.2} /> : null}
          </a>
          <span id={`${baseId}-${number}`} className="sk-visually-hidden">{t(LINE_COPY[number].spoken)}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Read-only notice while the browser is offline; the board decides what it disables. */
export function OfflineNotice(): React.ReactElement | null {
  const t = useT();
  const online = useOnline();
  if (online) return null;
  return <p className="cs-offline" role="status">{t('campusSafety.offline')}</p>;
}

export type NoticeTone = 'info' | 'attention' | 'danger';

/**
 * A note inside a board. `danger` is kept for safety meaning only (misuse of
 * emergency access, an emergency that cannot be handled here).
 */
export function SafetyNotice({ icon, tone = 'info', title, children }: { icon: SkIconName; tone?: NoticeTone; title?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className={`cs-notice cs-notice--${tone}`} role="note">
      <span className="cs-notice__icon" aria-hidden="true"><Icon name={icon} size={18} strokeWidth={2.1} /></span>
      <span className="cs-notice__text">
        {title ? <strong>{title}</strong> : null}
        <span>{children}</span>
      </span>
    </div>
  );
}

/** A labelled card section inside a board (two-column layouts). */
export function SafetyCard({ title, sub, children, className, labelledBy }: { title: string; sub?: string; children: React.ReactNode; className?: string; labelledBy: string }): React.ReactElement {
  return (
    <section className={['cs-card', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={labelledBy}>
      <header className="cs-card__head">
        <h2 id={labelledBy} className="cs-card__title">{title}</h2>
        {sub ? <p className="cs-card__sub">{sub}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** A board's own error card (calm copy, retry, reference); for boards not drawn by ConsoleTablePage. */
export function BoardError({ title, reference, onRetry, onHelp, detail }: { title: string; reference: string; onRetry: () => void; onHelp?: () => void; detail?: string }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-state">
      <div className="sk-state__body sk-state__body--card" role="alert">
        <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
        <h2 className="sk-state__title">{title}</h2>
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

/** A board's own empty state: its 3D tile, title, body and one next step. */
export function BoardEmpty({ tile, title, body, action }: { tile: SkIcon3dName; title: string; body: string; action?: { label: string; onSelect: () => void } }): React.ReactElement {
  return (
    <div className="sk-state">
      <div className="sk-state__body">
        <Icon3d name={tile} size={96} />
        <h2 className="sk-state__title">{title}</h2>
        <p className="sk-state__text">{body}</p>
        {action ? <div className="sk-state__actions"><SkButton onClick={action.onSelect}>{action.label}</SkButton></div> : null}
      </div>
    </div>
  );
}
