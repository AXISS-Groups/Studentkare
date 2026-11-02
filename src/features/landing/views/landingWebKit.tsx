import React, { useId, useState } from 'react';
import { useT } from '@/i18n';
import { Icon, type SkIconName } from '@/design-system/icons';
import './landingWeb.css';

/**
 * Building blocks the public web pages share (canvas page 3a): the navy
 * banner, section headings, the dark yes/never panel, numbered steps and the
 * question list. Copy arrives already translated; tokens only.
 */

function LwSection({ children, className, label, labelledBy }: { children: React.ReactNode; className?: string; label?: string; labelledBy?: string }): React.ReactElement {
  return (
    <section className={`lw-section${className ? ` ${className}` : ''}`} aria-label={label} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

export function LwHeading({ eyebrow, title, id, lede, aside }: { eyebrow?: string; title: string; id?: string; lede?: string; aside?: React.ReactNode }): React.ReactElement {
  return (
    <div className="lw-heading">
      <div className="lw-heading__text">
        {eyebrow ? <span className="lw-eyebrow">{eyebrow}</span> : null}
        <h2 className="lw-h2" id={id}>{title}</h2>
        {lede ? <p className="lw-lede">{lede}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/** The navy banner at the top of a page, with decorative media on the right. */
export function LwBanner({ label, eyebrow, title, chips, media }: { label: string; eyebrow: string; title: string; chips: readonly string[]; media?: React.ReactNode }): React.ReactElement {
  return (
    <section className="lw-banner" aria-label={label}>
      {media ? <div className="lw-banner__media">{media}</div> : null}
      <span className="lw-banner__veil" aria-hidden="true" />
      <div className="lw-banner__copy">
        <span className="lw-banner__eyebrow">{eyebrow}</span>
        <p className="lw-banner__title">{title}</p>
        {chips.length > 0 ? (
          <ul className="lw-chips">
            {chips.map((c) => (
              <li key={c} className="lw-chip">{c}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export interface LwRule {
  label: string;
  /** `yes` is what does happen; `no` is what never happens. */
  tone: 'yes' | 'no';
  tag: string;
}

/** The dark panel listing what does and never happens (consent, firewall). */
export function LwRulesPanel({ eyebrow, title, lede, rules, label }: { eyebrow: string; title: string; lede: string; rules: readonly LwRule[]; label?: string }): React.ReactElement {
  return (
    <section className="lw-rules" aria-label={label ?? title}>
      <div className="lw-rules__copy">
        <span className="lw-rules__eyebrow">{eyebrow}</span>
        <h2 className="lw-rules__title">{title}</h2>
        <p className="lw-rules__lede">{lede}</p>
      </div>
      <ul className="lw-rules__list">
        {rules.map((r) => (
          <li key={r.label} className="lw-rules__row">
            <span className={`lw-rules__dot lw-rules__dot--${r.tone}`} aria-hidden="true" />
            <span className="lw-rules__label">{r.label}</span>
            <span className={`lw-rules__tag lw-rules__tag--${r.tone}`}>{r.tag}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Numbered steps under a heading, on a white card. */
export function LwSteps({ title, lede, steps, eyebrow }: { title: string; lede?: string; eyebrow?: string; steps: ReadonlyArray<{ title: string; body: string; tag?: React.ReactNode }> }): React.ReactElement {
  return (
    <section className="lw-card lw-steps" aria-label={title}>
      <LwHeading eyebrow={eyebrow} title={title} lede={lede} />
      <ol className="lw-steps__list">
        {steps.map((s, i) => (
          <li key={s.title} className="lw-steps__item">
            <span className="lw-steps__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="lw-steps__title">{s.title}</span>
            <span className="lw-steps__body">{s.body}</span>
            {s.tag}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The question list: one answer open at a time, the first open by default. */
export function LwFaq({ title, items }: { title: string; items: ReadonlyArray<{ q: string; a: string }> }): React.ReactElement {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <section className="lw-section lw-faq" aria-label={title}>
      <h2 className="lw-h2">{title}</h2>
      <div className="lw-faq__list">
        {items.map((f, i) => {
          const isOpen = open === i;
          const panel = `${id}-a${i}`;
          return (
            <div key={f.q} className="lw-faq__item">
              <button type="button" className="lw-faq__q" aria-expanded={isOpen} aria-controls={panel} onClick={() => setOpen(isOpen ? null : i)}>
                <span>{f.q}</span>
                <Icon name="chevron-down" size={18} className={`lw-faq__chev${isOpen ? ' lw-faq__chev--open' : ''}`} />
              </button>
              <p id={panel} className="lw-faq__a" hidden={!isOpen}>
                {f.a}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** A small icon tile, as on the canvas's category and feature cards. */
export function LwIconTile({ icon, tone = 'action', size = 40 }: { icon: SkIconName; tone?: 'action' | 'positive' | 'attention' | 'danger' | 'info'; size?: number }): React.ReactElement {
  return (
    <span className={`lw-tile lw-tile--${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name={icon} size={Math.round(size * 0.45)} strokeWidth={1.9} />
    </span>
  );
}

/** A one-line note with a leading icon (clinical notes, honest gaps). */
export function LwNote({ icon, children, tone = 'quiet' }: { icon: SkIconName; children: React.ReactNode; tone?: 'quiet' | 'attention' }): React.ReactElement {
  return (
    <p className={`lw-note lw-note--${tone}`}>
      <Icon name={icon} size={16} strokeWidth={2} className="lw-note__icon" />
      <span>{children}</span>
    </p>
  );
}

/** The public pages' standard load states: a status line, or a calm error with retry. */
export function LwLoadState({ loading, failed, empty, onRetry, text }: { loading: boolean; failed: boolean; empty: boolean; onRetry: () => void; text: { loading: string; errorTitle: string; errorBody?: string; empty: string } }): React.ReactElement | null {
  const t = useT();
  if (loading) return <p role="status" className="lw-state">{text.loading}</p>;
  if (failed) {
    return (
      <div role="alert" className="lw-state lw-state--error">
        <span className="lw-state__title">{text.errorTitle}</span>
        {text.errorBody ? <span className="lw-state__body">{text.errorBody}</span> : null}
        <button type="button" className="lw-btn lw-btn--primary" onClick={onRetry}>
          {t('common.tryAgain')}
        </button>
      </div>
    );
  }
  if (empty) return <p className="lw-state">{text.empty}</p>;
  return null;
}

/** Whole-percent saving from published paise values; 0 when there is none. */
export function offPercent(mrpPaise: number, pricePaise: number): number {
  return mrpPaise > pricePaise && mrpPaise > 0 ? Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100) : 0;
}

/**
 * Lab search strip. The shop takes no search query yet, so like the site
 * header's search this is a link that opens the lab list, not a box that would
 * silently drop what was typed. The canvas names a campus block here; a
 * visitor's campus is not known before sign-in, so the label says where
 * collection happens instead.
 */
export function LwLabSearch({ compact = false, href }: { compact?: boolean; href: string }): React.ReactElement {
  const t = useT();
  return (
    <a href={href} className={`lw-search${compact ? ' lw-search--compact' : ''}`}>
      <span className="lw-search__where">
        <Icon name="map-pin-3" size={16} strokeWidth={2} />
        {t('landing.lablist.where')}
      </span>
      <span className="lw-search__input">{t('landing.labtests.searchPlaceholder')}</span>
      <span className="lw-search__go">
        <Icon name="search-2" size={18} strokeWidth={2.2} />
      </span>
    </a>
  );
}
