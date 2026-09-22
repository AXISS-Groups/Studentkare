import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, Check, FlaskConical, GraduationCap, LayoutDashboard, LifeBuoy, Package, Pill, Stethoscope } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { DataState, EmptyState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface OpsEvent {
  id: string;
  kind: string;
  domain: string;
  severity: 'INFO' | 'ATTENTION' | 'CRITICAL';
  actorRole: string;
  summary: string;
  resourceType: string;
  resourceId: string;
  createdAt: number;
  acknowledgedAt: number | null;
  acknowledgedBy: string;
}
interface Feed { items: OpsEvent[]; total: number; critical: number; scope: string }

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

const DOMAINS = ['MARKETPLACE', 'CLINICAL', 'PHARMACY', 'LAB', 'CAMPUS', 'SAFETY', 'SUPPORT'];

/** Reads the event kind back as something a person would say. */
function readable(kind: string): string {
  return kind.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
}

export function ActivityFeedPanel() {
  const [domain, setDomain] = useState('');
  const [outstanding, setOutstanding] = useState(true);
  const query = `/ops/feed?limit=50${domain ? `&domain=${domain}` : ''}${outstanding ? '&unacknowledgedOnly=true' : ''}`;
  const feed = useApiResource<Feed>(query);
  const counts = useApiResource<{ domains: Record<string, number> }>('/ops/feed/counts');
  const mutation = useMutation();

  const acknowledge = (id: string) => mutation.run(
    () => apiRequest(`/ops/feed/${id}/acknowledge`, { method: 'POST' }),
    () => { feed.reload(); counts.reload(); },
  );

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">ACTIVITY ACROSS EVERY DASHBOARD</span>
      <h2>What is happening right now.</h2>
      <p>Orders, prescriptions, dispensing, lab samples, campus checks and safety events — each routed to whoever is responsible for it. Open the record itself for clinical detail.</p>
    </div></div>

    <FormError message={mutation.error} />

    <DataState {...counts} retry={counts.reload}>
      <div className="wf-metric-grid">
        {DOMAINS.filter(name => (counts.data?.domains[name] ?? 0) > 0 || domain === name).map(name => {
          const Icon = DOMAIN_ICON[name] || Activity;
          const selected = domain === name;
          return <button
            key={name}
            className={`wf-metric-card ${selected ? 'is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => setDomain(selected ? '' : name)}
          >
            <span className="wf-metric-icon"><Icon size={19} /></span>
            <span>{name.charAt(0) + name.slice(1).toLowerCase()}</span>
            <strong>{counts.data?.domains[name] ?? 0}</strong>
            <small>Outstanding</small>
          </button>;
        })}
      </div>
    </DataState>

    <div className="wf-choice-row wf-section-gap" aria-label="Activity filter">
      <button aria-pressed={outstanding} onClick={() => setOutstanding(true)}>Needs attention</button>
      <button aria-pressed={!outstanding} onClick={() => setOutstanding(false)}>Everything</button>
      {domain && <button onClick={() => setDomain('')}>Clear “{domain.toLowerCase()}” filter</button>}
    </div>

    <DataState {...feed} retry={feed.reload}>
      {feed.data?.critical ? <div className="wf-notice" role="alert" style={{ marginBottom: 14, borderColor: 'var(--emergency)' }}>
        <AlertTriangle size={18} aria-hidden="true" />
        {feed.data.critical} critical {feed.data.critical === 1 ? 'event needs' : 'events need'} attention.
      </div> : null}

      {feed.data?.items.length ? <div className="wf-order-list">
        {feed.data.items.map(event => {
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
                : <button className="health-button health-button-primary" disabled={mutation.busy}
                    aria-label={`Mark handled: ${event.summary}`} style={{ minHeight: 44 }}
                    onClick={() => acknowledge(event.id)}>
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
}
