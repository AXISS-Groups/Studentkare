import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import { sampleInDevelopment } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import type { T } from '../model/clinicalData';
import { referralsSample } from '../viewmodel/referralsBoard';

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

export function ClinicianReferralsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => referralsConfig(t), [t]);
  return <ConsoleTableScreen navId="referrals" config={config} source={source ?? sampleInDevelopment(referralsSample)} />;
}
