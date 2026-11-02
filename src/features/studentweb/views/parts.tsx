import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Illustration } from '@/design-system/icons';
import type { SkIconName, SkIllustrationName } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import '../studentweb.css';

/** Page title, its one-line context and the page's actions (canvas 3b page heads). */
export function PageHead({ title, sub, actions, id }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode; id?: string }) {
  return (
    <header className="sk-sw-head">
      <div className="sk-sw-head__text">
        <h1 id={id} className="sk-sw-title">{title}</h1>
        {sub ? <p className="sk-sw-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="sk-sw-head__actions">{actions}</div> : null}
    </header>
  );
}

export type PillTone = 'action' | 'positive' | 'attention' | 'danger' | 'muted';

/** A status pill: tone carries meaning together with the words, never alone. */
export function Pill({ tone, children, dot = false }: { tone: PillTone; children: React.ReactNode; dot?: boolean }) {
  return <span className={`sk-sw-pill sk-sw-pill--${tone}`}>{dot ? <span className="sk-sw-pill__dot" aria-hidden="true" /> : null}{children}</span>;
}

/** An eyebrow label (caption, 800, 1 px tracking, uppercase). */
export function Eyebrow({ children, id }: { children: React.ReactNode; id?: string }) {
  return <span id={id} className="sk-sw-eyebrow">{children}</span>;
}

/** Loading placeholder rows shaped like the content they stand in for. */
export function LoadingRows({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div className="sk-sw-skeleton" role="progressbar" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, index) => <span key={index} className="sk-sw-skeleton__row" />)}
    </div>
  );
}

/** Calm error: what went wrong, whose side, one retry (DESIGN.md §7). */
export function ErrorPanel({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="sk-sw-card sk-sw-state" role="alert">
      <h2 className="sk-sw-state__title">{title}</h2>
      <p className="sk-sw-state__body">{body}</p>
      <button type="button" className="sk-sw-btn sk-sw-btn--primary" onClick={onRetry}>{t('common.tryAgain')}</button>
    </div>
  );
}

/** Empty state: what this is for and the one next step. */
export function EmptyPanel({ title, body, art, icon3d, action, secondary }: {
  title: string; body: string;
  art?: SkIllustrationName;
  icon3d?: React.ReactNode;
  action?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  return (
    <div className="sk-sw-card sk-sw-state">
      {art ? <Illustration name={art} size={180} /> : null}
      {icon3d}
      <h2 className="sk-sw-state__title">{title}</h2>
      <p className="sk-sw-state__body">{body}</p>
      {action || secondary ? (
        <div className="sk-sw-state__actions">
          {action ? <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={action.onPress}>{action.label}</button> : null}
          {secondary ? <button type="button" className="sk-sw-btn sk-sw-btn--ghost" onClick={secondary.onPress}>{secondary.label}</button> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Offline (boards WebDashboard / WebOrders, "Offline"): names what still works
 * without a connection. Never offers an action that needs the network.
 */
export function OfflinePanel({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  const works: MessageKey[] = ['sw.offline.works.card', 'sw.offline.works.pass', 'sw.offline.works.crisis'];
  return (
    <div className="sk-sw-card sk-sw-offline" role="status">
      <div className="sk-sw-offline__head">
        <div>
          <h2 className="sk-sw-state__title">{t('sw.offline.title')}</h2>
          <p className="sk-sw-state__body">{t('sw.offline.body')}</p>
        </div>
        <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={onRetry}>{t('sw.offline.retry')}</button>
      </div>
      <Eyebrow>{t('sw.offline.worksTitle')}</Eyebrow>
      <ul className="sk-sw-offline__list">
        {works.map((key) => (
          <li key={key}><Icon name="check" size={16} color="var(--sk-color-positive)" />{t(key)}</li>
        ))}
      </ul>
    </div>
  );
}

/** The four promises (boards WebReorder, WebAccount), with the same honest copy as the public site. */
const PROMISES: ReadonlyArray<{ title: MessageKey; body: MessageKey; art: SkIllustrationName }> = [
  { title: 'landing.home.promise.private.title', body: 'landing.home.promise.private.body', art: 'illustration-lock-shield' },
  { title: 'landing.home.promise.review.title', body: 'landing.home.promise.review.body', art: 'illustration-verified-badge' },
  { title: 'landing.home.promise.collection.title', body: 'landing.home.promise.collection.body', art: 'illustration-hostel-pin' },
  { title: 'landing.home.promise.price.title', body: 'landing.home.promise.price.body', art: 'illustration-rupee-receipt' },
];

export function TrustBand() {
  const t = useT();
  return (
    <section className="sk-sw-trust" aria-label={t('sw.trust.aria')}>
      {PROMISES.map((promise) => (
        <div key={promise.title} className="sk-sw-trust__item">
          <Illustration name={promise.art} size={84} />
          <h3>{t(promise.title)}</h3>
          <p>{t(promise.body)}</p>
        </div>
      ))}
    </section>
  );
}

/** A row that opens another page: icon, title, meta, chevron. */
export function LinkRow({ icon, title, meta, tone = 'default', onPress }: { icon: SkIconName; title: string; meta: string; tone?: 'default' | 'danger'; onPress: () => void }) {
  return (
    <button type="button" className={`sk-sw-linkrow${tone === 'danger' ? ' is-danger' : ''}`} onClick={onPress}>
      <span className="sk-sw-linkrow__icon" aria-hidden="true"><Icon name={icon} size={18} /></span>
      <span className="sk-sw-linkrow__text"><strong>{title}</strong><small>{meta}</small></span>
      <Icon name="chevron-right" size={18} color="var(--sk-color-text-3)" />
    </button>
  );
}

/** Help stays one tap away on commerce pages too (DESIGN.md §2.4). */
export function UrgentNote() {
  const t = useT();
  return (
    <button type="button" className="sk-sw-urgent" onClick={() => navigate('sos')}>
      <Icon name="shield-2" size={18} color="var(--sk-color-danger)" />
      <span>{t('sw.urgent')}</span>
    </button>
  );
}
