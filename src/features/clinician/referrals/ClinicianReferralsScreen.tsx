import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';
import type { T } from '../shared/clinicalData';

/**
 * ClinicianReferral (design page 5, Tier 1, approved 2026-10-21). No referral
 * model exists yet, so production shows the not-connected layout. The
 * "Commission taken" figure is a Rule L statement: it may only ever show a
 * value computed from a ledger, so without one it is "—", never "₹0" or "0".
 */
export function referralsConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinReferral.title'),
    subtitle: t('clinReferral.subtitle'),
    caption: t('clinReferral.caption'),
    columns: [
      { label: t('clinReferral.col.student'), width: '140px' },
      { label: t('clinReferral.col.reason') },
      { label: t('clinReferral.col.to'), width: '190px' },
      { label: t('clinReferral.col.sent'), width: '140px' },
      { label: t('clinReferral.col.state'), width: '150px', align: 'end' },
    ],
    footnote: t('clinReferral.footnote'),
    empty: { title: t('clinReferral.emptyTitle'), body: t('clinReferral.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinReferral.unconnectedTitle'), body: t('clinReferral.unconnectedBody') },
    errorTitle: t('clinReferral.errorTitle'),
    reference: t('clinReferral.reference'),
    statLabels: [t('clinReferral.stat.open'), t('clinReferral.stat.awaiting'), t('clinReferral.stat.seen'), t('clinReferral.stat.commission')],
  };
}

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
export function referralsSample(): ConsoleTableData {
  return {
    badge: { label: '1 awaiting acceptance', tone: 'action' },
    stats: [
      { value: '4', label: 'Open referrals' },
      { value: '1', label: 'Awaiting acceptance', tone: 'attention' },
      { value: '2', label: 'Seen within 14 days', tone: 'positive' },
      { value: null, label: 'Commission taken', meta: 'No ledger yet' },
    ],
    rows: [
      { id: 'r1', cells: [strong('D-042 · NP'), cell('Hb 7.1 with no obvious source — needs GI workup'), cell('Apollo · gastroenterology', 'action'), muted('24 Sep'), pill('Accepted, 02 Oct', 'positive')] },
      { id: 'r2', cells: [strong('B-214 · KC'), cell('Persistent vitamin D deficiency despite adherence'), cell('Visiting endocrinologist · campus', 'action'), muted('22 Sep'), pill('On campus 05 Oct', 'action')] },
      { id: 'r3', cells: [strong('A-331 · RM'), cell('Recurrent chest infection, third this term'), cell('KIMS · pulmonology', 'action'), muted('18 Sep'), pill('Awaiting acceptance', 'attention')] },
      { id: 'r4', cells: [strong('C-108 · AK'), cell('Asked for a second opinion'), cell('Student choice — any listed', 'action'), muted('20 Sep'), pill('Student choosing', 'neutral')] },
    ],
  };
}

export function ClinicianReferralsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => referralsConfig(t), [t]);
  return <ConsoleTableScreen navId="referrals" config={config} source={source ?? sampleInDevelopment(referralsSample)} />;
}
