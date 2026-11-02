import React, { useMemo, useState } from 'react';
import { DestinationButton } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import { earningsApiSource } from '../viewmodel/earningsBoard';

type T = (key: MessageKey, vars?: Vars) => string;

/**
 * ClinicianEarnings (design page 5, Tier 3), from `GET /work/earnings` in every
 * build. Every amount on this page is one the server sent. The endpoint reports
 * volume and gross only: no commission rate is configured and no settlement
 * exists, so where the design prints commission, net, a payout date and
 * "Paid 18 Sep", this screen says they are not set up. It never works out a
 * commission or a net itself — a figure a doctor would plan around has to come
 * from the server that will pay it.
 */
export function earningsConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinEarnings.title'),
    subtitle: t('clinEarnings.subtitle'),
    caption: t('clinEarnings.caption'),
    columns: [
      { label: t('clinEarnings.colPeriod'), width: '146px' },
      { label: t('clinEarnings.colVolume'), width: '136px' },
      { label: t('clinEarnings.colGross'), width: '126px' },
      { label: t('clinEarnings.colCommission'), width: '126px' },
      { label: t('clinEarnings.colNet') },
      { label: t('clinEarnings.colStatus'), width: '170px', align: 'end' },
    ],
    footnote: t('clinEarnings.footnote'),
    empty: { title: t('clinEarnings.emptyTitle'), body: t('clinEarnings.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    emptyAction: { label: t('clinEarnings.emptyAction'), route: 'clinician/schedule' },
    unconnected: { title: t('clinEarnings.unconnectedTitle'), body: t('clinEarnings.unconnectedBody') },
    errorTitle: t('clinEarnings.errorTitle'),
    reference: t('clinEarnings.reference'),
    statLabels: [t('clinEarnings.statGrossPlain'), t('clinEarnings.statConsults'), t('clinEarnings.statCommission'), t('clinEarnings.statPayout')],
  };
}

export function ClinicianEarningsConsoleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => earningsConfig(t), [t]);
  const [fallback] = useState(() => earningsApiSource(t));
  return (
    <ConsoleTableScreen
      navId="earnings"
      config={config}
      source={source ?? fallback}
      headerAction={
        // Nothing generates a statement yet; a file finance has not defined is worse than none.
        <DestinationButton route={null} onNavigate={navigate} className="sk-btn sk-btn--secondary">
          {t('clinEarnings.download')}
        </DestinationButton>
      }
    />
  );
}
