import React, { useCallback, useEffect, useState } from 'react';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { useCampusScope } from '@/features/campus/console/campusScope';
import { buildCampusOverview } from './campusOverviewModel';
import type { AttentionItem, CampusOverviewInput, OverviewKpi, OverviewView, Phrase } from './campusOverviewModel';
import { liveCampusOverviewSource } from './campusOverviewSource';
import type { CampusOverviewSource } from './campusOverviewSource';
import '@/design-system/design-system.css';
import './campus-overview.css';

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; input: CampusOverviewInput; loadedAt: number }
  | { kind: 'failed'; loadedAt: number };

const MS_PER_SECOND = 1000;

function go(route: RoutePath) {
  return (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(route);
  };
}

const QUICK_ACTIONS: Array<{ label: MessageKey; icon: SkIconName; route: RoutePath; tone: 'action' | 'positive' | 'neutral' | 'attention' }> = [
  { label: 'campusOverview.quick.import', icon: 'upload', route: 'campus/students', tone: 'action' },
  { label: 'campusOverview.quick.plan', icon: 'alert-triangle-2', route: 'campus/camps', tone: 'positive' },
  { label: 'campusOverview.quick.invite', icon: 'user', route: 'campus/team', tone: 'neutral' },
  { label: 'campusOverview.quick.incident', icon: 'alert-triangle', route: 'campus/incidents', tone: 'attention' },
];

/**
 * Campus Overview (design page 4, CampusOverview; Tier 3). Aggregate counts
 * only, scoped to the admin's campus by the server. States: data, loading,
 * empty, error, and "no campus set" (the server's fail-closed 403).
 */
export function CampusOverviewScreen({ source = liveCampusOverviewSource }: { source?: CampusOverviewSource }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const scope = useCampusScope();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let live = true;
    setPhase({ kind: 'loading' });
    source.load()
      .then((input) => { if (live) setPhase({ kind: 'ready', input, loadedAt: Date.now() }); })
      .catch(() => { if (live) setPhase({ kind: 'failed', loadedAt: Date.now() }); });
    return () => { live = false; };
  }, [source, attempt]);

  if (phase.kind === 'loading') return <OverviewSkeleton label={t('campusOverview.loading')} />;
  const { loadedAt } = phase;
  const say = (phrase: Phrase) => t(phrase.key, phrase.vars);
  const view: OverviewView = phase.kind === 'failed'
    ? { kind: 'error', code: 'NET' }
    : buildCampusOverview(phase.input, loadedAt / MS_PER_SECOND, say);

  if (view.kind === 'error') {
    return (
      <div className="sk-state">
        <div className="sk-state__body sk-state__body--card" role="alert">
          <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
          <h1 className="sk-state__title">{t('campusOverview.error.title')}</h1>
          <p className="sk-state__text">{t('campusOverview.error.body')}</p>
          <div className="sk-state__actions">
            <button type="button" className="sk-btn sk-btn--primary" onClick={retry}>{t('campusOverview.error.retry')}</button>
            <a className="sk-btn sk-btn--secondary" href="/support" onClick={go('support')}>{t('campusOverview.error.help')}</a>
          </div>
          <span className="sk-state__ref">{t('campusOverview.error.ref', { status: view.code })}</span>
        </div>
      </div>
    );
  }

  if (view.kind === 'no-campus') {
    return (
      <div className="sk-state">
        <div className="sk-state__body" role="status">
          <span className="sk-cov__badge" aria-hidden="true"><Icon name="info" size={28} strokeWidth={1.9} /></span>
          <h1 className="sk-state__title">{t('campusOverview.noCampus.title')}</h1>
          <p className="sk-state__text">{t('campusOverview.noCampus.body')}</p>
        </div>
      </div>
    );
  }

  if (view.kind === 'empty') {
    return (
      <div className="sk-state">
        <div className="sk-state__body">
          <Icon3d name="chart-alt--p4" size={96} />
          <h1 className="sk-state__title">{t('campusOverview.empty.title')}</h1>
          <p className="sk-state__text">{t('campusOverview.empty.body')}</p>
          <div className="sk-state__actions">
            <a className="sk-btn sk-btn--primary" href="/campus/students" onClick={go('campus/students')}>{t('campusOverview.empty.cta')}</a>
          </div>
        </div>
      </div>
    );
  }

  const time = new Date(loadedAt).toLocaleTimeString(lang === 'en' ? 'en-IN' : `${lang}-IN`, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="sk-cov">
      <div className="sk-cov__head">
        <div className="sk-cov__titles">
          <h1 className="sk-cov__title">{t('campusOverview.title')}</h1>
          <p className="sk-cov__lead">{t('campusOverview.lead', { scope: scope?.label ?? t('campusShell.scope.campus'), time })}</p>
        </div>
        <div className="sk-cov__actions">
          {/* No report export endpoint exists yet: shown in place, disabled, and said so. */}
          <button type="button" className="sk-btn sk-btn--secondary sk-cov__btn" disabled>
            <Icon name="download-2" size={16} strokeWidth={1.9} />
            {t('campusOverview.download')}
            <span className="sk-visually-hidden">{t('campusOverview.downloadUnavailable')}</span>
          </button>
          <a className="sk-btn sk-btn--primary sk-cov__btn" href="/campus/camps" onClick={go('campus/camps')}>
            <Icon name="plus" size={16} strokeWidth={1.9} />
            {t('campusOverview.planCamp')}
          </a>
        </div>
      </div>

      <ul className="sk-cov__kpis" aria-label={t('campusOverview.kpiLabel')}>
        {view.kpis.map((kpi, index) => <KpiTile key={kpi.id} kpi={kpi} index={index} />)}
      </ul>

      <div className="sk-cov__row">
        <section className="sk-card sk-cov__attention" aria-labelledby="cov-attention">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cov-attention" className="sk-card__title">{t('campusOverview.attention.title')}</h2>
              <p className="sk-card__subtitle">{t('campusOverview.attention.lead')}</p>
            </span>
          </div>
          {view.attention.length > 0 ? (
            <ul className="sk-cov__alerts">
              {view.attention.map((item) => <AttentionRow key={item.id} item={item} />)}
            </ul>
          ) : (
            <p className="sk-cov__quiet">{t('campusOverview.attention.empty')}</p>
          )}
          {view.partial ? (
            <div className="sk-note sk-note--attention" role="status">
              <Icon name="info" size={17} strokeWidth={1.9} />
              <span>{t('campusOverview.attention.partial')}</span>
            </div>
          ) : null}
        </section>

        <section className="sk-card sk-cov__coverage" aria-labelledby="cov-coverage">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cov-coverage" className="sk-card__title">{t('campusOverview.coverage.title')}</h2>
              <p className="sk-card__subtitle">{t('campusOverview.coverage.lead')}</p>
            </span>
          </div>
          <div className="sk-cov__legend" aria-hidden="true">
            <span><span className="sk-cov__swatch sk-cov__swatch--1" />{t('campusOverview.coverage.screening')}</span>
            <span><span className="sk-cov__swatch sk-cov__swatch--2" />{t('campusOverview.coverage.vaccination')}</span>
          </div>
          {/* No screening or vaccination source exists: no bars, and it says so. */}
          <div className="sk-cov__chart-empty">
            <Icon name="bar-chart" size={22} strokeWidth={1.9} />
            <p>{t('campusOverview.coverage.notConnected')}</p>
          </div>
        </section>

        <section className="sk-card sk-cov__quick" aria-labelledby="cov-quick">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cov-quick" className="sk-card__title">{t('campusOverview.quick.title')}</h2>
            </span>
          </div>
          <ul className="sk-cov__quick-grid">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.label}>
                <a className={`sk-cov__quick-tile sk-tone--${action.tone}`} href={`/${action.route}`} onClick={go(action.route)}>
                  <Icon name={action.icon} size={18} strokeWidth={1.9} />
                  <span>{t(action.label)}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="sk-note sk-note--info">
            <Icon name="info" size={17} strokeWidth={1.9} />
            <span>{t('campusOverview.quick.note')}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiTile({ kpi, index }: { kpi: OverviewKpi; index: number }): React.ReactElement {
  const t = useT();
  return (
    <li className="sk-cov__kpi-item" style={{ '--sk-stagger': index } as React.CSSProperties}>
      <a className="sk-cov__kpi sk-rise" href={`/${kpi.route}`} onClick={go(kpi.route)}>
        <span className="sk-cov__kpi-label">{t(kpi.label)}</span>
        <span className="sk-cov__kpi-row">
          <span className={`sk-cov__kpi-value${kpi.value === null ? ' is-empty' : ''}`}>
            {kpi.value === null ? t('campusOverview.noValue') : kpi.value.toLocaleString('en-IN')}
          </span>
          <span className={`sk-pill sk-pill--${kpi.chip.tone}`}>{t(kpi.chip.label)}</span>
        </span>
        <span className="sk-cov__kpi-meta">{t(kpi.meta.key, kpi.meta.vars)}</span>
      </a>
    </li>
  );
}

function AttentionRow({ item }: { item: AttentionItem }): React.ReactElement {
  const t = useT();
  return (
    <li>
      <a className="sk-cov__alert" href={`/${item.route}`} onClick={go(item.route)}>
        <span className={`sk-cov__alert-icon sk-tone--${item.tone}`} aria-hidden="true"><Icon name={item.icon} size={18} strokeWidth={1.9} /></span>
        <span className="sk-cov__alert-text">
          <span className="sk-cov__alert-title">{t(item.title.key, item.title.vars)}</span>
          <span className="sk-cov__alert-meta">{t(item.meta.key, item.meta.vars)}</span>
        </span>
        <span className={`sk-pill sk-pill--${item.tone}`}>{t(item.tag)}</span>
        <Icon name="arrow-right" size={16} strokeWidth={1.9} className="sk-cov__alert-arrow" />
      </a>
    </li>
  );
}

function OverviewSkeleton({ label }: { label: string }): React.ReactElement {
  return (
    <div className="sk-cov sk-cov--loading" role="status" aria-busy="true" aria-label={label}>
      <div className="sk-cov__head">
        <div className="sk-cov__titles">
          <span className="sk-skeleton sk-cov__skel-title" />
          <span className="sk-skeleton sk-cov__skel-lead" />
        </div>
        <span className="sk-skeleton sk-cov__skel-button" />
      </div>
      <div className="sk-cov__skel-kpis">
        {[0, 1, 2, 3].map((key) => <span key={key} className="sk-skeleton sk-cov__skel-kpi" />)}
      </div>
      <div className="sk-cov__skel-row">
        <div className="sk-cov__skel-list">
          {[0, 1, 2, 3, 4, 5].map((key) => <span key={key} className="sk-skeleton sk-cov__skel-line" />)}
        </div>
        <span className="sk-skeleton sk-cov__skel-side" />
      </div>
    </div>
  );
}
