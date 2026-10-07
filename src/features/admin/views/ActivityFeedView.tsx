import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, Check, FlaskConical, GraduationCap, LayoutDashboard, LifeBuoy, Package, Pill, Stethoscope } from 'lucide-react';
import { displayDate } from '@/data/workflowTypes';
import { DataState, EmptyState, FormError } from '@/components/interface/WorkflowUI';
import '@/theme/workflows.css';
import { opsRepository } from '../model/opsRepository';
import { readable } from '../model/format';
import { ActivityFeedViewModel } from '../viewmodels/ActivityFeedViewModel';

const DOMAIN_ICON: Record<string, LucideIcon> = {
  MARKETPLACE: Package,
  CLINICAL: Stethoscope,
  PHARMACY: Pill,
  LAB: FlaskConical,
  CAMPUS: GraduationCap,
  SAFETY: LifeBuoy,
  SUPPORT: Activity,
  ACCOUNT: LayoutDashboard,
};

/** Super Admin → Operations & SOS → Activity. */
export const ActivityFeedView = observer(function ActivityFeedView() {
  const [vm] = useState(() => new ActivityFeedViewModel(opsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  const { domain, outstanding, feed } = vm;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">ACTIVITY ACROSS EVERY DASHBOARD</span>
      <h2>What is happening right now.</h2>
      <p>Orders, prescriptions, dispensing, lab samples, campus checks and safety events — each routed to whoever is responsible for it. Open the record itself for clinical detail.</p>
    </div></div>

    <FormError message={vm.acknowledgeError} />

    <DataState loading={vm.countsLoading} error={vm.countsError} retry={vm.reloadCounts}>
      <div className="wf-metric-grid">
        {vm.visibleDomains.map(name => {
          const Icon = DOMAIN_ICON[name] || Activity;
          const selected = domain === name;
          return <button
            key={name}
            className={`wf-metric-card ${selected ? 'is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => vm.toggleDomain(name)}
          >
            <span className="wf-metric-icon"><Icon size={19} /></span>
            <span>{name.charAt(0) + name.slice(1).toLowerCase()}</span>
            <strong>{vm.countOf(name)}</strong>
            <small>Outstanding</small>
          </button>;
        })}
      </div>
    </DataState>

    <div className="wf-choice-row wf-section-gap" aria-label="Activity filter">
      <button aria-pressed={outstanding} onClick={() => vm.setOutstanding(true)}>Needs attention</button>
      <button aria-pressed={!outstanding} onClick={() => vm.setOutstanding(false)}>Everything</button>
      {domain && <button onClick={() => vm.setDomain('')}>Clear “{domain.toLowerCase()}” filter</button>}
    </div>

    <DataState loading={vm.feedLoading} error={vm.feedError} retry={vm.reloadFeed}>
      {feed?.critical ? <div className="wf-notice" role="alert" style={{ marginBottom: 14, borderColor: 'var(--emergency)' }}>
        <AlertTriangle size={18} aria-hidden="true" />
        {feed.critical} critical {feed.critical === 1 ? 'event needs' : 'events need'} attention.
      </div> : null}

      {feed?.items.length ? <div className="wf-order-list">
        {feed.items.map(event => {
          const Icon = DOMAIN_ICON[event.domain] || Activity;
          return <article className="wf-card" key={event.id} style={event.severity === 'CRITICAL'
            ? { border: '2px solid var(--emergency)' } : undefined}>
            <div className="wf-panel-heading">
              <div>
                <span className="care-eyebrow" style={event.severity === 'CRITICAL' ? { color: 'var(--emergency)' } : undefined}>
                  {event.domain} · {readable(event.kind)}
                </span>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={18} aria-hidden="true" />{event.summary}
                </h3>
                <p>{displayDate(new Date(event.createdAt * 1000).toISOString())}
                  {event.actorRole ? ` · by ${event.actorRole.replace(/_/g, ' ').toLowerCase()}` : ''}</p>
              </div>
              <span className={`wf-status ${event.severity === 'CRITICAL' ? 'status-declined'
                : event.severity === 'ATTENTION' ? 'status-requested' : 'status-accepted'}`}>
                {event.severity}
              </span>
            </div>
            <div className="wf-row-actions">
              {event.acknowledgedAt
                ? <span className="wf-status status-accepted"><Check size={14} aria-hidden="true" /> Handled</span>
                : <button className="health-button health-button-primary" disabled={vm.acknowledging}
                    aria-label={`Mark handled: ${event.summary}`} style={{ minHeight: 44 }}
                    onClick={() => void vm.acknowledge(event.id)}>
                    <Check size={16} aria-hidden="true" />Mark handled
                  </button>}
            </div>
          </article>;
        })}
      </div> : <EmptyState
        title={outstanding ? 'Nothing needs attention.' : 'No activity recorded yet.'}
        description={outstanding
          ? 'Every event in your scope has been handled. Switch to “Everything” to see the history.'
          : 'Orders, prescriptions and fulfilment activity will appear here as it happens.'}
      />}
    </DataState>
  </>;
});
