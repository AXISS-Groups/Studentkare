import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, SkButton, StatRow } from '@/design-system';
import type { Stat } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { accountsRepository } from '../model/accountsRepository';
import { auditRepository } from '../model/auditRepository';
import { contractsRepository } from '../model/contractsRepository';
import { opsRepository } from '../model/opsRepository';
import { governanceRepository } from '../model/governanceRepository';
import { clockTime, count, readable } from '../model/format';
import type { MetricValue } from '../model/types';
import { OperationsOverviewViewModel } from '../viewmodels/OperationsOverviewViewModel';
import { isDenied } from '../viewmodels/AuditExplorerViewModel';
import { BoardFailure, BoardLoading, GovCard, GovLines, GovPill, Unavailable, ViewLink, useResource } from './GovBoard';
import './gov-board.css';

/** The board's break-glass scope chips. Drawn, never selectable: the request below is not available. */
const SCOPES: readonly MessageKey[] = ['gov.console.scopeLab', 'gov.console.scopeRx', 'gov.console.scopeVitals', 'gov.console.scopeDischarge'];
/** Guardrails the board says should read zero, other than the Rule L one computed below. None has a counter yet. */
const UNCOUNTED_GUARDRAILS: readonly MessageKey[] = ['admin.overview.guardCohort', 'admin.overview.guardVendor', 'admin.overview.guardLedger'];

const metricValue = (metric: MetricValue): string | null => metric.state === 'ready' ? count(metric.value) : null;

/**
 * Super admin overview (design: SuperAdminConsole, Tier 1). Header, figures and the audit
 * ledger come from what the server reports (/ops/summary, /ops/audit, account counts,
 * /ops/integration-health); a figure with no source reads "—", never 0. The guardrail
 * "clinical tables commerce can read" is computed from /ops/rule-l; the others have no
 * counter. Not shown, because nothing computes them: "all services nominal" (the services
 * line is the real probe result), "DELETE revoked for every role" and "Section 12
 * compliant" (guardrail 6). The board's dual-custody break-glass request needs a second
 * approver and a backend session that don't exist, so it is drawn disabled with a plain
 * note; emergency access stays the campus emergency card (WP-11).
 */
export const OperationsOverviewView = observer(function OperationsOverviewView() {
  const t = useT();
  const [vm] = useState(() => new OperationsOverviewViewModel({ ops: opsRepository, audit: auditRepository, accounts: accountsRepository, billing: contractsRepository }));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  const ruleL = useResource(governanceRepository.ruleL);

  if (vm.pageLoading) return <BoardLoading label={t('admin.overview.loading')} />;
  const data = vm.summary;
  if (vm.pageError || !data) return <BoardFailure t={t} what={t('gov.console.what')} screen="SuperAdminConsole" onRetry={vm.retryAll} detail={vm.pageError} />;

  const stats: Stat[] = [
    { label: t('gov.console.statTenants'), value: null },
    { label: t('admin.overview.students'), value: metricValue(vm.studentAccounts) },
    { label: t('gov.console.statBreakGlass'), value: null },
    { label: t('admin.overview.crisisGate'), value: null },
  ];
  const leaks = ruleL.data?.checks.commerceLeaks;
  const total = vm.auditTotal;

  return <div className="sk-ds sk-admin-page sk-gov">
    <ConsolePageHeader title={t('admin.overview.title')}
      subtitle={<>{t('admin.overview.headline', { accounts: count(data.accounts), entries: count(data.catalogItems), orders: count(data.orderRequests), support: count(data.openSupport) })} · <span aria-live="polite">{vm.services}</span></>}
      badge={total !== null ? { label: t('gov.console.ledgerBadge', { count: count(total) }), tone: 'positive' } : undefined} />
    <StatRow stats={stats} label={t('gov.console.summary')} />
    <div className="sk-gov-grid sk-gov-grid--main-side">
      <GovCard title={t('admin.overview.auditLedger')} aside={<>{total !== null ? <span>{t('gov.console.entries', { count: count(total) })}</span> : null}<ViewLink route="admin/audit" label={t('admin.audit.title')} /></>}>
        {vm.auditLoading ? <p className="sk-gov-fine" role="status">{t('admin.audit.loading')}</p>
          : vm.auditFailed ? <div className="sk-gov-error" role="alert"><Icon name="alert-triangle" size={16} />{t('admin.audit.error')}<button type="button" className="sk-gov-link" onClick={vm.reloadAudit}>{t('common.tryAgain')}</button></div>
            : !vm.auditEntries.length ? <p className="sk-gov-fine">{t('admin.audit.emptyBody')}</p>
              : <ol className="sk-gov-events">{vm.auditEntries.map(entry => {
                const denied = isDenied(entry.action);
                return <li key={entry.id} className="sk-gov-event">
                  <span className={`sk-gov-dot${denied ? ' sk-gov-dot--danger' : ''}`} aria-hidden="true" />
                  <time dateTime={new Date(entry.createdAt * 1000).toISOString()}>{clockTime(entry.createdAt)}</time>
                  <div className="sk-gov-event__copy"><strong>{readable(entry.action)}</strong><span className="sk-mono">{entry.actorId || t('gov.audit.system')} · {entry.resourceId}</span></div>
                  {denied ? <GovPill tone="danger">{t('gov.audit.denied')}</GovPill> : <span />}
                </li>;
              })}</ol>}
      </GovCard>
      <div className="sk-gov-stack">
        <GovCard tone="danger" eyebrow={t('gov.console.breakGlass')} aside={<Icon name="shield-alert" size={18} strokeWidth={2.2} />}>
          <p className="sk-gov-text">{t('gov.console.breakGlassBody')}</p>
          <p className="sk-gov-eyebrow" id="sk-gov-bg-reason">{t('gov.console.reason')}</p>
          <button type="button" className="sk-gov-select" disabled aria-labelledby="sk-gov-bg-reason sk-gov-bg-reason-value" aria-describedby="sk-gov-bg-unavailable"><span id="sk-gov-bg-reason-value">{t('gov.console.reasonPlaceholder')}</span><Icon name="chevron-down" size={16} /></button>
          <p className="sk-gov-eyebrow">{t('gov.console.scope')}</p>
          <div className="sk-gov-chips">{SCOPES.map(key => <span key={key} className="sk-gov-chip">{t(key)}</span>)}</div>
          <div className="sk-gov-approver"><Icon name="user-4" size={18} /><div><strong>{t('gov.console.approver')}</strong>{t('gov.console.approverNone')}</div></div>
          <SkButton variant="danger" className="sk-gov-full" disabled aria-describedby="sk-gov-bg-unavailable">{t('gov.console.request')}</SkButton>
          <Unavailable><span id="sk-gov-bg-unavailable">{t('gov.console.breakGlassUnavailable')}</span></Unavailable>
        </GovCard>
        <GovCard eyebrow={t('admin.overview.guardrails')} aside={<ViewLink route="admin/rule-l" label={t('admin.ruleL.title')} />}>
          <GovLines label={t('admin.overview.guardrails')} lines={[
            { label: t('gov.console.guardCommerce'), value: leaks === undefined ? null : count(leaks.length), tone: leaks?.length ? 'danger' : 'positive' },
            ...UNCOUNTED_GUARDRAILS.map(key => ({ label: t(key), value: null })),
          ]} />
          <p className="sk-gov-fine">{t('gov.console.guardNote')}</p>
        </GovCard>
      </div>
    </div>
  </div>;
});
