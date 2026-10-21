import React, { useCallback } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import type { SkTone } from '@/design-system/primitives';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE, usePartnerLoad } from '@/features/partner/PartnerPage';
import { loadLabOrders } from '@/features/partner/work/labWork';
import type { LabOrder, LabQueue } from '@/features/partner/work/labWork';
import { minutesAgo } from '@/features/partner/work/workCopy';
import '@/features/partner/work/partner-work.css';

/**
 * LabReporting — the board's "Release results", named "Lab reports" (design page 6,
 * Tier 1, approved 2026-10-21): the lab does not release, so the page is not called that.
 *
 * Where every report this lab filed has got to, from the lab's own queue
 * (`GET /work/lab-orders`, filed and released orders). The approved split
 * stands: the lab files, the reviewing doctor releases. So:
 * - there is no "Release batch" button (the lab has no release endpoint);
 * - "Signed, awaiting release" reads "Filed, with the doctor";
 * - the flag column shows only the lab's own critical flag and note; a filed
 *   report carries no value, reference range or high/low flag the server
 *   returns, so those cells say the result is in the filed report;
 * - the student column is the order reference only: the lab payload carries
 *   no name or room, and the lab surface needs neither;
 * - "Median to clinician" has no source: "—".
 * A critical row is never batched: the server lists critical reports first and
 * the doctor's queue reads them first.
 */

export type ReportsSource = (signal: AbortSignal) => Promise<LabQueue>;

const FILED = new Set(['REPORT_READY', 'REPORT_RELEASED']);

function releaseState(order: LabOrder): { key: 'pt.rel.state.withDoctor' | 'pt.rel.state.released' | 'pt.rel.state.notAcknowledged' | 'pt.rel.state.acknowledged'; tone: SkTone } {
  if (order.status === 'REPORT_READY') return { key: 'pt.rel.state.withDoctor', tone: order.criticalFlag ? 'danger' : 'action' };
  if (order.criticalFlag) return order.criticalAcknowledgedAt ? { key: 'pt.rel.state.acknowledged', tone: 'positive' } : { key: 'pt.rel.state.notAcknowledged', tone: 'danger' };
  return { key: 'pt.rel.state.released', tone: 'positive' };
}

export function LabReportingScreen({ source = loadLabOrders, onNavigate }: { source?: ReportsSource; onNavigate?: (route: string) => void }) {
  const t = useT();
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const reports = usePartnerLoad<LabQueue>(load);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const filed = (reports.data?.items ?? []).filter((order) => FILED.has(order.status))
    // Critical first, then the newest: a critical row never waits behind the batch.
    .sort((a, b) => Number(b.criticalFlag) - Number(a.criticalFlag) || b.updatedAt - a.updatedAt);
  const status: ConsoleTableStatus = reports.status === 'loading' && !reports.data ? 'loading' : reports.status === 'error' ? 'error' : 'ready';
  const criticalReleased = filed.filter((order) => order.criticalFlag && order.status === 'REPORT_RELEASED').length;
  const notAcknowledged = filed.filter((order) => order.criticalFlag && order.status === 'REPORT_RELEASED' && !order.criticalAcknowledgedAt).length;
  const withDoctor = filed.filter((order) => order.status === 'REPORT_READY').length;

  const rows: DataTableRow[] = filed.map((order) => {
    const state = releaseState(order);
    return {
      id: order.id,
      cells: [
        { text: order.testPanel.join(', '), sub: order.sampleId ? t('pt.rel.sample', { id: order.sampleId }) : undefined, weight: 'strong', tone: order.criticalFlag ? 'danger' : undefined },
        { text: t('pt.lab.orderRef', { ref: order.id.slice(0, 8).toUpperCase() }), mono: true, weight: 'regular' },
        { text: t('pt.rel.inReport'), weight: 'muted' },
        order.criticalFlag
          ? { text: t('pt.rel.flag.critical'), sub: order.criticalNote, tone: 'danger', weight: 'strong' }
          : { text: t('pt.rel.flag.none'), weight: 'muted' },
        { pill: { label: t(state.key, { when: minutesAgo(t, order.updatedAt) }), tone: state.tone } },
      ],
    };
  });

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{ title: t('pt.rel.title'), subtitle: t('pt.rel.sub') }}
        stats={[
          { label: t('pt.rel.stat.criticalReleased'), value: String(criticalReleased), tone: criticalReleased ? 'danger' : 'text' },
          { label: t('pt.rel.stat.notAcknowledged'), value: String(notAcknowledged), tone: notAcknowledged ? 'danger' : 'text' },
          { label: t('pt.rel.stat.withDoctor'), value: String(withDoctor) },
          { label: t('pt.rel.stat.median'), value: null },
        ]}
        statsLabel={t('pt.rel.statsLabel')}
        table={{
          caption: t('pt.rel.caption'),
          columns: [
            { label: t('pt.rel.col.result') },
            { label: t('pt.rel.col.student'), width: '170px' },
            { label: t('pt.rel.col.reference'), width: '170px' },
            { label: t('pt.rel.col.flag'), width: '220px' },
            { label: t('pt.rel.col.release'), width: '230px', align: 'end' },
          ],
          rows,
          footnote: t('pt.rel.footnote'),
        }}
        empty={{ title: t('pt.rel.emptyTitle'), body: t('pt.rel.emptyBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('pt.rel.emptyAction'), onSelect: () => go('lab-queue') } }}
        unconnected={{ title: t('pt.rel.emptyTitle'), body: t('pt.rel.emptyBody') }}
        error={{ title: t('pt.rel.errorTitle'), reference: t('pt.rel.ref'), detail: reports.error || undefined, onRetry: reports.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.rel.title') })}
      />
    </main>
  );
}
