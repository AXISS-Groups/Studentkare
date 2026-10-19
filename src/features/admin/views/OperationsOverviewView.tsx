import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { navigate, type RoutePath } from '@/lib/utils/workflowRouting';
import { accountsRepository } from '../model/accountsRepository';
import { auditRepository } from '../model/auditRepository';
import { contractsRepository } from '../model/contractsRepository';
import { opsRepository } from '../model/opsRepository';
import { clockTime, count, readable, SEVERITY_TONE } from '../model/format';
import type { MetricValue, StatusReading } from '../model/types';
import { OperationsOverviewViewModel } from '../viewmodels/OperationsOverviewViewModel';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/screens/workspace/operations-overview.css';

function OverviewSkeleton() {
  const t = useT();
  return <div className="sk-ops-console" aria-busy="true"><div role="status" className="sk-ops-visually-hidden">{t('admin.overview.loading')}</div><div className="sk-ops-skeleton sk-ops-skeleton-title" aria-hidden="true" /><div className="sk-ops-metrics is-primary" aria-hidden="true">{[0, 1, 2, 3].map(key => <div key={key} className="sk-ops-tile sk-ops-skeleton sk-ops-skeleton-tile" />)}</div><div className="sk-ops-columns" aria-hidden="true"><div className="sk-ops-card sk-ops-skeleton sk-ops-skeleton-panel" /><div className="sk-ops-card sk-ops-skeleton sk-ops-skeleton-panel" /></div></div>;
}

function SectionError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const t = useT();
  return <div className="sk-ops-section-state" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><strong>{title}</strong><p>{message}</p></div><button type="button" className="sk-ops-button" onClick={onRetry}><RefreshCw size={15} aria-hidden="true" />{t('common.tryAgain')}</button></div>;
}

/** Opens the detailed screen a summary block is drawn from. */
function ViewLink({ route, name }: { route: RoutePath; name: string }) {
  const t = useT();
  return <button type="button" className="sk-ops-view-link" aria-label={t('admin.overview.viewName', { name })} onClick={() => navigate(route)}>{t('admin.overview.view')}<ArrowRight size={14} aria-hidden="true" /></button>;
}

// ── Platform metrics ─────────────────────────────────────────────────────────
interface PlatformMetric { label: string; meta: string; route: RoutePath; destination: string; value: MetricValue }

// A figure that isn't loaded is shown as unknown, never 0.
const METRIC_NOTE: Record<Exclude<MetricValue['state'], 'ready'>, { shown: string; note: MessageKey; spoken: MessageKey }> = {
  loading: { shown: '…', note: 'admin.overview.metricLoading', spoken: 'admin.overview.metricLoadingSpoken' },
  error: { shown: '—', note: 'admin.overview.metricError', spoken: 'admin.overview.metricErrorSpoken' },
  unreported: { shown: '—', note: 'admin.stat.unreported', spoken: 'admin.overview.metricUnreportedSpoken' },
};

/** A whole-card link to the canonical screen behind the figure. */
function MetricCard({ metric }: { metric: PlatformMetric }) {
  const t = useT();
  const { value } = metric;
  const display = value.state === 'ready' ? { shown: count(value.value), note: metric.meta, spoken: count(value.value) }
    : { shown: METRIC_NOTE[value.state].shown, note: t(METRIC_NOTE[value.state].note), spoken: t(METRIC_NOTE[value.state].spoken) };
  return <li>
    <button type="button" className={`sk-ops-metric${value.state === 'ready' ? '' : ' is-blank'}`} aria-label={t('admin.overview.metricLabel', { label: metric.label, value: display.spoken, destination: metric.destination })} onClick={() => navigate(metric.route)}>
      <span className="sk-ops-metric-label">{metric.label}<ArrowRight size={16} aria-hidden="true" /></span>
      <strong>{display.shown}</strong>
      <span className="sk-ops-metric-note">{display.note}</span>
    </button>
  </li>;
}

function MetricGroup({ id, title, metrics, primary = false }: { id: string; title: string; metrics: PlatformMetric[]; primary?: boolean }) {
  return <section aria-labelledby={id} className="sk-ops-metric-group">
    <h3 id={id} className="sk-ops-eyebrow">{title}</h3>
    <ul className={`sk-ops-metrics${primary ? ' is-primary' : ''}`}>{metrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}</ul>
  </section>;
}

// ── Platform status and governance ───────────────────────────────────────────
interface StatusRow extends StatusReading { label: string; route: RoutePath }

const GUARDRAILS: MessageKey[] = ['admin.overview.guardClinical', 'admin.overview.guardCohort', 'admin.overview.guardVendor', 'admin.overview.guardLedger'];

/**
 * The platform command center: campuses and students first, the care ecosystem next,
 * then recent activity, platform status and governance. It summarises what existing
 * screens already load and links to each of them; nothing here is a source of truth,
 * and nothing missing is filled with a number.
 */
export const OperationsOverviewView = observer(function OperationsOverviewView() {
  const t = useT();
  const [vm] = useState(() => new OperationsOverviewViewModel({ ops: opsRepository, audit: auditRepository, accounts: accountsRepository, billing: contractsRepository }));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);

  if (vm.pageLoading) return <OverviewSkeleton />;
  const data = vm.summary;
  if (vm.pageError || !data) {
    return <div className="sk-ops-console"><div className="sk-ops-page-state" role="alert"><AlertCircle size={28} aria-hidden="true" /><h2>{t('admin.overview.error')}</h2><p>{t('admin.error.ourSide')}</p>{vm.pageError && <p className="sk-ops-fineprint">{vm.pageError}</p>}<button type="button" className="sk-ops-button sk-ops-button-primary" onClick={vm.retryAll}><RefreshCw size={16} aria-hidden="true" />{t('common.tryAgain')}</button></div></div>;
  }

  const services = vm.services;
  const events = vm.events;

  // Campuses have no data source yet (see OrganisationsScreen).
  // Clinician accounts are not "verified": creating one does not check a licence.
  const campusNetwork: PlatformMetric[] = [
    { label: t('admin.overview.campuses'), meta: '', route: 'admin/organisations', destination: t('admin.orgs.title'), value: { state: 'unreported' } },
    { label: t('admin.overview.students'), meta: t('admin.overview.studentsMeta'), route: 'admin/accounts', destination: t('admin.accounts.statAccounts'), value: vm.studentAccounts },
    { label: t('admin.overview.clinicians'), meta: t('admin.overview.cliniciansMeta'), route: 'admin/verification', destination: t('admin.verification.title'), value: vm.clinicianAccounts },
  ];
  const ecosystem: PlatformMetric[] = [
    { label: t('admin.overview.partners'), meta: t('admin.overview.partnersMeta'), route: 'admin/partners', destination: t('admin.partners.title'), value: vm.partnerAccounts },
    { label: t('admin.overview.plans'), meta: t('admin.overview.plansMeta'), route: 'admin/plans', destination: t('admin.plans.title'), value: vm.publishedPlans },
    { label: t('admin.overview.catalogue'), meta: t('admin.catalogue.statEntriesMeta'), route: 'admin/catalog', destination: t('admin.catalogue.title'), value: vm.catalogueEntries },
  ];

  const statusRows: StatusRow[] = [
    { label: t('admin.overview.auditLedger'), route: 'admin/audit', ...vm.auditLedger },
    { label: t('admin.integrations.title'), route: 'admin/integrations', ...vm.integrations },
    { label: t('admin.ops.title'), route: 'admin/ops', ...vm.openSafety },
    { label: t('admin.overview.crisisGate'), route: 'admin/ops', status: t('admin.overview.notReported'), tone: 'neutral' },
  ];

  return <div className="sk-ops-console">
    <header className="sk-ops-header">
      <p className="sk-ops-eyebrow">{t('admin.overview.eyebrow')}</p>
      <h2>{t('admin.overview.title')}</h2>
      <p>{t('admin.overview.headline', { accounts: count(data.accounts), entries: count(data.catalogItems), orders: count(data.orderRequests), support: count(data.openSupport) })} · <span aria-live="polite">{services}</span></p>
    </header>

    <MetricGroup id="sk-ops-network-title" title={t('admin.overview.network')} metrics={campusNetwork} primary />
    <MetricGroup id="sk-ops-ecosystem-title" title={t('admin.overview.ecosystem')} metrics={ecosystem} />

    <div className="sk-ops-columns">
      <section className="sk-ops-card" aria-labelledby="sk-ops-activity-title">
        <div className="sk-ops-card-heading">
          <h3 id="sk-ops-activity-title">{t('admin.overview.recent')}</h3>
          <div className="sk-ops-card-links">
            <button type="button" className="sk-ops-view-link" onClick={() => navigate('admin/activity')}>{t('admin.overview.allActivity')}<ArrowRight size={14} aria-hidden="true" /></button>
            <button type="button" className="sk-ops-view-link" onClick={() => navigate('admin/audit')}>{t('admin.audit.title')}<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        </div>
        {vm.feedLoading ? <div role="status" className="sk-ops-section-loading">{t('admin.overview.recentLoading')}</div>
          : vm.feedError ? <SectionError title={t('admin.overview.recentError')} message={vm.feedError} onRetry={vm.reloadFeed} />
            : !events.length ? <div className="sk-ops-empty"><strong>{t('admin.overview.recentEmpty')}</strong><p>{t('admin.overview.recentEmptyBody')}</p></div>
              : <ul className="sk-ops-feed">{events.map(event => <li key={event.id} className="sk-ops-feed-row">
                <span className={`sk-ops-dot sk-ops-tone-${SEVERITY_TONE[event.severity]}`} aria-hidden="true" />
                <time className="sk-ops-time" dateTime={new Date(event.createdAt * 1000).toISOString()}>{clockTime(event.createdAt)}</time>
                <div className="sk-ops-feed-copy"><strong>{readable(event.kind)}</strong>{event.summary && <span>{event.summary}</span>}</div>
                <span className="sk-ops-tag sk-ops-tone-neutral">{readable(event.domain)}</span>
              </li>)}</ul>}
      </section>

      <div className="sk-ops-stack">
        <section className="sk-ops-card" aria-labelledby="sk-ops-status-title">
          <div className="sk-ops-card-heading"><h3 id="sk-ops-status-title" className="sk-ops-eyebrow">{t('admin.overview.status')}</h3></div>
          <ul className="sk-ops-status-list">{statusRows.map(row => <li key={row.label}>
            <button type="button" className="sk-ops-status-row" onClick={() => navigate(row.route)}>
              <span>{row.label}</span>
              <span className={`sk-ops-status-value sk-ops-tone-${row.tone}`}><span className="sk-ops-dot" aria-hidden="true" />{row.status}</span>
            </button>
          </li>)}</ul>
        </section>

        <section className="sk-ops-card" aria-labelledby="sk-ops-governance-title">
          <div className="sk-ops-card-heading"><h3 id="sk-ops-governance-title" className="sk-ops-eyebrow">{t('admin.overview.security')}</h3><ViewLink route="admin/rule-l" name={t('admin.ruleL.title')} /></div>
          <div className="sk-ops-breakglass-summary">
            <div><span>{t('admin.overview.breakGlass')}</span><strong aria-label={t('admin.overview.notReportedFor', { label: t('admin.overview.breakGlass') })}>—</strong></div>
            <button type="button" className="sk-ops-view-link" onClick={() => navigate('admin/break-glass-log')}>{t('admin.overview.viewBreakGlass')}<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          <h4 className="sk-ops-subheading">{t('admin.overview.guardrails')}</h4>
          <ul className="sk-ops-guardrail-list">{GUARDRAILS.map(key => <li key={key}><span>{t(key)}</span><strong aria-label={t('admin.overview.notReportedFor', { label: t(key) })}>—</strong></li>)}</ul>
          <p className="sk-ops-card-note">{t('admin.overview.guardrailsNote')}</p>
        </section>
      </div>
    </div>
  </div>;
});
