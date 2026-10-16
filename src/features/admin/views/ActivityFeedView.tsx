import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, Check, FlaskConical, GraduationCap, LayoutDashboard, LifeBuoy, Package, Pill, Stethoscope } from 'lucide-react';
import { displayDate } from '@/data/workflowTypes';
import { DataState, EmptyState, FormError } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

/** Feed domains with a translated name; any other domain the server sends is shown as it comes. */
const DOMAIN_LABEL: Record<string, MessageKey> = {
  MARKETPLACE: 'admin.domain.MARKETPLACE',
  CLINICAL: 'admin.domain.CLINICAL',
  PHARMACY: 'admin.domain.PHARMACY',
  LAB: 'admin.domain.LAB',
  CAMPUS: 'admin.domain.CAMPUS',
  SAFETY: 'admin.domain.SAFETY',
  SUPPORT: 'admin.domain.SUPPORT',
  ACCOUNT: 'admin.domain.ACCOUNT',
};

const SEVERITY_LABEL: Record<string, MessageKey> = {
  CRITICAL: 'admin.severity.CRITICAL',
  ATTENTION: 'admin.severity.ATTENTION',
  INFO: 'admin.severity.INFO',
};

/** Super Admin → Operations & SOS → Activity. */
export const ActivityFeedView = observer(function ActivityFeedView() {
  const t = useT();
  const [vm] = useState(() => new ActivityFeedViewModel(opsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  const { domain, outstanding, feed } = vm;
  const domainName = (name: string) => {
    const key = DOMAIN_LABEL[name];
    return key ? t(key) : name.charAt(0) + name.slice(1).toLowerCase();
  };
  const severityName = (severity: string) => {
    const key = SEVERITY_LABEL[severity];
    return key ? t(key) : severity;
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('admin.activity.eyebrow')}</span>
      <h2>{t('admin.activity.title')}</h2>
      <p>{t('admin.activity.intro')}</p>
    </div></div>

    <FormError message={vm.acknowledgeError} />

    <DataState loading={vm.countsLoading} error={vm.countsError} retry={vm.reloadCounts}>
      <div className="wf-metric-grid">
        {vm.visibleDomains.map(name => {
          const Icon = DOMAIN_ICON[name] || Activity;
          const selected = domain === name;
          return <button
            key={name}
            type="button"
            className={`wf-metric-card ${selected ? 'is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => vm.toggleDomain(name)}
          >
            <span className="wf-metric-icon"><Icon size={19} aria-hidden="true" /></span>
            <span>{domainName(name)}</span>
            <strong>{vm.countOf(name)}</strong>
            <small>{t('admin.activity.outstanding')}</small>
          </button>;
        })}
      </div>
    </DataState>

    <div className="wf-choice-row wf-section-gap" role="group" aria-label={t('admin.activity.filterLabel')}>
      <button type="button" aria-pressed={outstanding} onClick={() => vm.setOutstanding(true)}>{t('admin.activity.needsAttention')}</button>
      <button type="button" aria-pressed={!outstanding} onClick={() => vm.setOutstanding(false)}>{t('admin.activity.everything')}</button>
      {domain && <button type="button" onClick={() => vm.setDomain('')}>{t('admin.activity.clearFilter', { domain: domainName(domain).toLowerCase() })}</button>}
    </div>

    <DataState loading={vm.feedLoading} error={vm.feedError} retry={vm.reloadFeed}>
      {feed?.critical ? <div className="wf-notice" role="alert" style={{ marginBottom: 14, borderColor: 'var(--emergency)' }}>
        <AlertTriangle size={18} aria-hidden="true" />
        {feed.critical === 1 ? t('admin.activity.criticalOne') : t('admin.activity.criticalOther', { count: feed.critical })}
      </div> : null}

      {feed?.items.length ? <div className="wf-order-list">
        {feed.items.map(event => {
          const Icon = DOMAIN_ICON[event.domain] || Activity;
          return <article className="wf-card" key={event.id} style={event.severity === 'CRITICAL'
            ? { border: '2px solid var(--emergency)' } : undefined}>
            <div className="wf-panel-heading">
              <div>
                <span className="care-eyebrow" style={event.severity === 'CRITICAL' ? { color: 'var(--emergency)' } : undefined}>
                  {domainName(event.domain)} · {readable(event.kind)}
                </span>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={18} aria-hidden="true" />{event.summary}
                </h3>
                <p>{displayDate(new Date(event.createdAt * 1000).toISOString())}
                  {event.actorRole ? ` · ${t('admin.activity.by', { role: event.actorRole.replace(/_/g, ' ').toLowerCase() })}` : ''}</p>
              </div>
              <span className={`wf-status ${event.severity === 'CRITICAL' ? 'status-declined'
                : event.severity === 'ATTENTION' ? 'status-requested' : 'status-accepted'}`}>
                {severityName(event.severity)}
              </span>
            </div>
            <div className="wf-row-actions">
              {event.acknowledgedAt
                ? <span className="wf-status status-accepted"><Check size={14} aria-hidden="true" /> {t('admin.activity.handled')}</span>
                : <button type="button" className="health-button health-button-primary" disabled={vm.acknowledging}
                    aria-label={t('admin.activity.markHandledFor', { summary: event.summary })} style={{ minHeight: 44 }}
                    onClick={() => void vm.acknowledge(event.id)}>
                    <Check size={16} aria-hidden="true" />{t('admin.activity.markHandled')}
                  </button>}
            </div>
          </article>;
        })}
      </div> : <EmptyState
        title={outstanding ? t('admin.activity.emptyOutstanding') : t('admin.activity.emptyAll')}
        description={outstanding ? t('admin.activity.emptyOutstandingBody') : t('admin.activity.emptyAllBody')}
      />}
    </DataState>
  </>;
});
