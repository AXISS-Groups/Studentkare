import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { navigate, type RoutePath } from '@/lib/workflowRouting';
import { accountsRepository } from '../model/accountsRepository';
import { auditRepository } from '../model/auditRepository';
import { contractsRepository } from '../model/contractsRepository';
import { opsRepository } from '../model/opsRepository';
import { clockTime, count, readable, SEVERITY_TONE } from '../model/format';
import type { MetricValue, StatusReading } from '../model/types';
import { OperationsOverviewViewModel } from '../viewmodels/OperationsOverviewViewModel';
import '@/screens/workspace/operations-overview.css';

function OverviewSkeleton() {
  return <div className="sk-ops-console" aria-busy="true"><div role="status" className="sk-ops-visually-hidden">Loading platform operations…</div><div className="sk-ops-skeleton sk-ops-skeleton-title" aria-hidden="true" /><div className="sk-ops-metrics is-primary" aria-hidden="true">{[0, 1, 2, 3].map(key => <div key={key} className="sk-ops-tile sk-ops-skeleton sk-ops-skeleton-tile" />)}</div><div className="sk-ops-columns" aria-hidden="true"><div className="sk-ops-card sk-ops-skeleton sk-ops-skeleton-panel" /><div className="sk-ops-card sk-ops-skeleton sk-ops-skeleton-panel" /></div></div>;
}

function SectionError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <div className="sk-ops-section-state" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><strong>{title}</strong><p>{message}</p></div><button type="button" className="sk-ops-button" onClick={onRetry}><RefreshCw size={15} aria-hidden="true" />Try again</button></div>;
}

/** Opens the detailed screen a summary block is drawn from. */
function ViewLink({ route, name }: { route: RoutePath; name: string }) {
  return <button type="button" className="sk-ops-view-link" aria-label={`View ${name}`} onClick={() => navigate(route)}>View<ArrowRight size={14} aria-hidden="true" /></button>;
}

// ── Platform metrics ─────────────────────────────────────────────────────────
interface PlatformMetric { label: string; meta: string; route: RoutePath; destination: string; value: MetricValue }

const METRIC_NOTE: Record<Exclude<MetricValue['state'], 'ready'>, { shown: string; note: string; spoken: string }> = {
  loading: { shown: '…', note: 'Loading…', spoken: 'loading' },
  error: { shown: '—', note: 'Couldn’t load this figure', spoken: 'couldn’t load' },
  unreported: { shown: '—', note: 'Not reported · no data source yet', spoken: 'not reported' },
};

/** A whole-card link to the canonical screen behind the figure. */
function MetricCard({ metric }: { metric: PlatformMetric }) {
  const { value } = metric;
  const display = value.state === 'ready' ? { shown: count(value.value), note: metric.meta, spoken: count(value.value) } : METRIC_NOTE[value.state];
  return <li>
    <button type="button" className={`sk-ops-metric${value.state === 'ready' ? '' : ' is-blank'}`} aria-label={`${metric.label}: ${display.spoken}. Open ${metric.destination}`} onClick={() => navigate(metric.route)}>
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

const GUARDRAILS = ['Clinical rows on commercial surfaces', 'Aggregates served under cohort floor', 'Vendor reads of clinical fields', 'Ledger delete attempts'];

/**
 * The platform command center: campuses and students first, the care ecosystem next,
 * then recent activity, platform status and governance. It summarises what existing
 * screens already load and links to each of them; nothing here is a source of truth,
 * and nothing missing is filled with a number.
 */
export const OperationsOverviewView = observer(function OperationsOverviewView() {
  const [vm] = useState(() => new OperationsOverviewViewModel({ ops: opsRepository, audit: auditRepository, accounts: accountsRepository, billing: contractsRepository }));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);

  if (vm.pageLoading) return <OverviewSkeleton />;
  const data = vm.summary;
  if (vm.pageError || !data) {
    return <div className="sk-ops-console"><div className="sk-ops-page-state" role="alert"><AlertCircle size={28} aria-hidden="true" /><h2>Couldn’t load platform operations</h2><p>This is on our side, not yours — nothing was lost.</p>{vm.pageError && <p className="sk-ops-fineprint">{vm.pageError}</p>}<button type="button" className="sk-ops-button sk-ops-button-primary" onClick={vm.retryAll}><RefreshCw size={16} aria-hidden="true" />Try again</button></div></div>;
  }

  const services = vm.services;
  const events = vm.events;

  // Campuses have no data source yet (see OrganisationsScreen).
  // Clinician accounts are not "verified": creating one does not check a licence.
  const campusNetwork: PlatformMetric[] = [
    { label: 'Campuses', meta: '', route: 'admin/organisations', destination: 'Organisations', value: { state: 'unreported' } },
    { label: 'Student accounts', meta: 'Accounts with the student role', route: 'admin/accounts', destination: 'Accounts', value: vm.studentAccounts },
    { label: 'Clinician accounts', meta: 'Licence verification isn’t reported here', route: 'admin/verification', destination: 'Clinician verification', value: vm.clinicianAccounts },
  ];
  const ecosystem: PlatformMetric[] = [
    { label: 'Partner accounts', meta: 'Pharmacy, lab and provider accounts', route: 'admin/partners', destination: 'Partner applications', value: vm.partnerAccounts },
    { label: 'Published plans', meta: 'Subscriptions aren’t reported', route: 'admin/plans', destination: 'Plans & pricing', value: vm.publishedPlans },
    { label: 'Catalogue entries', meta: 'Products and services', route: 'admin/catalog', destination: 'Catalogue ops', value: vm.catalogueEntries },
  ];

  const statusRows: StatusRow[] = [
    { label: 'Audit ledger', route: 'admin/audit', ...vm.auditLedger },
    { label: 'Integrations', route: 'admin/integrations', ...vm.integrations },
    { label: 'Operations & SOS', route: 'admin/ops', ...vm.openSafety },
    { label: 'Crisis gate', route: 'admin/ops', status: 'Not reported', tone: 'neutral' },
  ];

  return <div className="sk-ops-console">
    <header className="sk-ops-header">
      <p className="sk-ops-eyebrow">StudentKare command center</p>
      <h2>Platform operations</h2>
      <p>{count(data.accounts)} accounts · {count(data.catalogItems)} catalogue entries · {count(data.orderRequests)} orders · {count(data.openSupport)} open support · <span aria-live="polite">{services}</span></p>
    </header>

    <MetricGroup id="sk-ops-network-title" title="Campus network" metrics={campusNetwork} primary />
    <MetricGroup id="sk-ops-ecosystem-title" title="Care ecosystem" metrics={ecosystem} />

    <div className="sk-ops-columns">
      <section className="sk-ops-card" aria-labelledby="sk-ops-activity-title">
        <div className="sk-ops-card-heading">
          <h3 id="sk-ops-activity-title">Recent activity</h3>
          <div className="sk-ops-card-links">
            <button type="button" className="sk-ops-view-link" onClick={() => navigate('admin/activity')}>All activity<ArrowRight size={14} aria-hidden="true" /></button>
            <button type="button" className="sk-ops-view-link" onClick={() => navigate('admin/audit')}>Audit explorer<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        </div>
        {vm.feedLoading ? <div role="status" className="sk-ops-section-loading">Loading recent activity…</div>
          : vm.feedError ? <SectionError title="Couldn’t load recent activity" message={vm.feedError} onRetry={vm.reloadFeed} />
            : !events.length ? <div className="sk-ops-empty"><strong>No recent platform activity</strong><p>Platform events will appear here as they happen.</p></div>
              : <ul className="sk-ops-feed">{events.map(event => <li key={event.id} className="sk-ops-feed-row">
                <span className={`sk-ops-dot sk-ops-tone-${SEVERITY_TONE[event.severity]}`} aria-hidden="true" />
                <time className="sk-ops-time" dateTime={new Date(event.createdAt * 1000).toISOString()}>{clockTime(event.createdAt)}</time>
                <div className="sk-ops-feed-copy"><strong>{readable(event.kind)}</strong>{event.summary && <span>{event.summary}</span>}</div>
                <span className="sk-ops-tag sk-ops-tone-neutral">{readable(event.domain)}</span>
              </li>)}</ul>}
      </section>

      <div className="sk-ops-stack">
        <section className="sk-ops-card" aria-labelledby="sk-ops-status-title">
          <div className="sk-ops-card-heading"><h3 id="sk-ops-status-title" className="sk-ops-eyebrow">Platform status</h3></div>
          <ul className="sk-ops-status-list">{statusRows.map(row => <li key={row.label}>
            <button type="button" className="sk-ops-status-row" onClick={() => navigate(row.route)}>
              <span>{row.label}</span>
              <span className={`sk-ops-status-value sk-ops-tone-${row.tone}`}><span className="sk-ops-dot" aria-hidden="true" />{row.status}</span>
            </button>
          </li>)}</ul>
        </section>

        <section className="sk-ops-card" aria-labelledby="sk-ops-governance-title">
          <div className="sk-ops-card-heading"><h3 id="sk-ops-governance-title" className="sk-ops-eyebrow">Security & governance</h3><ViewLink route="admin/rule-l" name="Rule L firewall" /></div>
          <div className="sk-ops-breakglass-summary">
            <div><span>Break-glass events</span><strong aria-label="Break-glass events: not reported">—</strong></div>
            <button type="button" className="sk-ops-view-link" onClick={() => navigate('admin/break-glass-log')}>View break-glass log<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          <h4 className="sk-ops-subheading">Guardrails — should read zero</h4>
          <ul className="sk-ops-guardrail-list">{GUARDRAILS.map(label => <li key={label}><span>{label}</span><strong aria-label={`${label}: not reported`}>—</strong></li>)}</ul>
          <p className="sk-ops-card-note">Not reported: no counter is connected, so nothing is shown rather than a zero.</p>
        </section>
      </div>
    </div>
  </div>;
});
