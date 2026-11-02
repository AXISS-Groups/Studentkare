import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import { sampleInDevelopment } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import type { T } from '../model/clinicalData';
import { renewalsSample } from '../viewmodel/renewalsBoard';

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

export function ClinicianRenewalsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => renewalsConfig(t), [t]);
  return <ConsoleTableScreen navId="renewals" config={config} source={source ?? sampleInDevelopment(renewalsSample)} />;
}
