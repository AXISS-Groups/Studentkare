import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';
import type { T } from '../shared/clinicalData';

/**
 * ClinicianRenewals (design page 5, Tier 1, approved 2026-10-21). Nothing
 * renews itself. `GET/POST /work/refills` is the PHARMACY's refill queue
 * (scoped to the pharmacy a student sent it to), not a clinician decision, and
 * the dose log is not in it — so production shows the not-connected layout
 * rather than a pharmacy queue dressed as the doctor's.
 */
export function renewalsConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinRenewals.title'),
    subtitle: t('clinRenewals.subtitle'),
    caption: t('clinRenewals.caption'),
    columns: [
      { label: t('clinRenewals.col.student'), width: '140px' },
      { label: t('clinRenewals.col.medicine') },
      { label: t('clinRenewals.col.asked'), width: '150px' },
      { label: t('clinRenewals.col.adherence'), width: '160px' },
      { label: t('clinRenewals.col.decision'), width: '170px', align: 'end' },
    ],
    footnote: t('clinRenewals.footnote'),
    empty: { title: t('clinRenewals.emptyTitle'), body: t('clinRenewals.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinRenewals.unconnectedTitle'), body: t('clinRenewals.unconnectedBody') },
    errorTitle: t('clinRenewals.errorTitle'),
    reference: t('clinRenewals.reference'),
    statLabels: [t('clinRenewals.stat.waiting'), t('clinRenewals.stat.blocked'), t('clinRenewals.stat.escalating'), t('clinRenewals.stat.auto')],
  };
}

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
export function renewalsSample(): ConsoleTableData {
  return {
    badge: { label: '1 needs a test first', tone: 'danger' },
    stats: [
      { value: '4', label: 'Waiting on you' },
      { value: '1', label: 'Blocked pending a test', tone: 'danger' },
      { value: '1', label: 'Escalating use', tone: 'attention' },
      { value: '0', label: 'Auto-renewed', tone: 'positive' },
    ],
    rows: [
      { id: 'n1', cells: [strong('B-214 · KC'), cell('Vitamin D3 60k weekly · on it 8 weeks'), muted('2 h ago'), strong('7 of 8 doses recorded'), pill('Renew 8 weeks', 'positive')] },
      { id: 'n2', cells: [strong('C-108 · AK'), cell('Salbutamol inhaler · issued 14 Aug'), muted('Yesterday'), cell('Used 11 times in 30 days', 'attention'), pill('Review before renewing', 'attention')] },
      { id: 'n3', cells: [strong('A-331 · RM'), cell('Iron + folic · course ended 21 Sep'), muted('3 days ago'), strong('Completed the course'), pill('Needs a repeat Hb first', 'danger')] },
      { id: 'n4', cells: [strong('B-119 · IS'), cell('Chronic — asthma programme'), muted('Today'), strong('Stable'), pill('Auto-eligible, you confirm', 'action')] },
    ],
  };
}

export function ClinicianRenewalsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => renewalsConfig(t), [t]);
  return <ConsoleTableScreen navId="renewals" config={config} source={source ?? sampleInDevelopment(renewalsSample)} />;
}
