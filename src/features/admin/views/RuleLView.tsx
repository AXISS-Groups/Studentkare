import React from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage } from '@/design-system';
import type { DataTableRow, Stat } from '@/design-system';
import { useT } from '@/i18n';
import { clockTime, count } from '../model/format';
import { governanceRepository } from '../model/governanceRepository';
import type { RuleLStatus } from '../model/governanceTypes';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';
import { GovCard, useResource } from './GovBoard';

type Translate = ReturnType<typeof useT>;

/** One check the server ran, as a row: what was checked, and whether it held. */
interface Check { id: string; label: string; held: boolean; failure: string; detail?: string }

/** The checks /ops/rule-l reports, in the order the server runs them. Missing checks are not invented. */
export function ruleLChecks(t: Translate, status: RuleLStatus): Check[] {
  const { checks } = status;
  const rows: Check[] = [];
  Object.entries(checks.rolesPresent ?? {}).forEach(([role, present]) => {
    rows.push({ id: `role-${role}`, label: t('gov.ruleL.checkRole', { role }), held: present, failure: t('gov.ruleL.missing') });
  });
  const list = (id: string, label: string, tables: string[] | undefined, failure: (n: number) => string) => {
    if (tables === undefined) return;
    rows.push({ id, label, held: tables.length === 0, failure: failure(tables.length), detail: tables.length ? tables.join(', ') : undefined });
  };
  list('unclassified', t('gov.ruleL.checkClassified'), checks.unclassifiedTables, n => t('gov.ruleL.tables', { count: count(n) }));
  if (checks.loginCanAssumeCommerce !== undefined) {
    rows.push({ id: 'assume', label: t('gov.ruleL.checkAssume'), held: checks.loginCanAssumeCommerce, failure: t('gov.ruleL.cannot') });
  }
  list('leaks', t('gov.ruleL.checkLeaks'), checks.commerceLeaks, n => t('gov.ruleL.tables', { count: count(n) }));
  list('commerce-missing', t('gov.ruleL.checkCommerceReads'), checks.commerceMissing, n => t('gov.ruleL.tables', { count: count(n) }));
  list('clinical-on-commerce', t('gov.ruleL.checkClinical'), checks.clinicalOnCommerce, n => t('gov.ruleL.tables', { count: count(n) }));
  return rows;
}

/**
 * Rule L firewall (design: AdminRuleL, Tier 1). Wired to GET /ops/rule-l, which reads
 * the live database grants on every request (guardrail 6: computed, never asserted).
 * "Holding" only when the server says `enforced`; on a database without role grants it
 * says Rule L is not enforced in this environment, with the server's reasons. The
 * board's rows naming services we don't run (reco-worker, warehouse, growth) are not
 * shown; the check interval is "on request" because nothing schedules it.
 */
export const RuleLView = observer(function RuleLView() {
  const t = useT();
  const vm = useResource(governanceRepository.ruleL);
  const status = vm.data;
  const checkedAt = Date.now() / 1000;
  const checks = status ? ruleLChecks(t, status) : [];
  const reasons = status?.reasons ?? [];
  // Without per-check results (no role grants at all) every reason the server gave is a failure.
  const failing = checks.length ? checks.filter(check => !check.held).length : reasons.length;

  const rows: DataTableRow[] = checks.length ? checks.map(check => ({
    id: check.id,
    cells: [
      { text: check.label, weight: 'strong', sub: check.detail },
      { text: status?.database ?? '', mono: true, tone: 'action' },
      { text: clockTime(checkedAt), weight: 'muted', mono: true },
      { pill: check.held ? { label: t('gov.ruleL.held'), tone: 'positive' } : { label: check.failure, tone: 'danger' } },
    ],
  })) : reasons.map((reason, index) => ({
    id: `reason-${index}`,
    cells: [
      { text: t('gov.ruleL.checkDatabase'), weight: 'strong', sub: reason },
      { text: status?.database ?? '', mono: true, tone: 'action' },
      { text: clockTime(checkedAt), weight: 'muted', mono: true },
      { pill: { label: t('gov.ruleL.notEnforced'), tone: 'danger' } },
    ],
  }));

  const stats: Stat[] = [
    { label: t('gov.ruleL.statChecks'), value: count(checks.length) },
    { label: t('gov.ruleL.statFailing'), value: count(failing), tone: failing || !status?.enforced ? 'danger' : 'positive' },
    { label: t('admin.ruleL.statInterval'), value: t('gov.ruleL.onRequest') },
    { label: t('gov.ruleL.statFailClosed'), value: status?.commercePaths ? (status.commercePaths.failClosed ? t('gov.yes') : t('gov.no')) : null, tone: status?.commercePaths?.failClosed ? 'positive' : 'attention' },
  ];

  const title = t('admin.ruleL.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={vm.status}
      header={{
        title,
        subtitle: t('gov.ruleL.subtitle'),
        badge: status ? (status.enforced
          ? { label: t('gov.ruleL.badgeHolding', { held: count(checks.length - failing), total: count(checks.length) }), tone: 'positive' }
          : { label: t('gov.ruleL.badgeNotEnforced'), tone: 'danger' }) : undefined,
      }}
      note={status && !status.enforced ? <BoardNote icon="alert-triangle" tone="attention">{t('gov.ruleL.notEnforcedNote', { database: status.database, reasons: reasons.join('; ') })}</BoardNote> : undefined}
      stats={stats}
      statLabels={[t('gov.ruleL.statChecks'), t('gov.ruleL.statFailing'), t('admin.ruleL.statInterval'), t('gov.ruleL.statFailClosed')]}
      statsLabel={t('admin.summaryOf', { title })}
      table={{
        caption: title,
        columns: [{ label: t('admin.ruleL.colGrant'), width: '46%' }, { label: t('gov.ruleL.colWhere') }, { label: t('admin.ruleL.colVerified') }, { label: t('admin.ruleL.colResult'), align: 'end' }],
        rows,
        footnote: t('gov.ruleL.footnote'),
      }}
      empty={boardEmpty(t, t('gov.ruleL.empty'))}
      unconnected={{ title: t('gov.ruleL.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.ruleL.what'), 'AdminRuleL', vm.reload, vm.error)}
      loadingLabel={t('gov.ruleL.loading')}
    >
      {status?.commercePaths ? <GovCard eyebrow={t('gov.ruleL.pathsTitle', { role: status.commercePaths.runAs })}>
        <p className="sk-gov-text">{t('gov.ruleL.pathsBody', { count: count(status.commercePaths.endpoints.length) })}</p>
        <details className="sk-gov-details">
          <summary>{t('gov.ruleL.pathsShow')}</summary>
          <ul className="sk-gov-paths">{status.commercePaths.endpoints.map(path => <li key={path} className="sk-mono">{path}</li>)}</ul>
        </details>
      </GovCard> : null}
    </ConsoleTablePage>
  </div>;
});
