import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import { sampleInDevelopment } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import type { T } from '../model/clinicalData';
import { ayushSample } from '../viewmodel/ayushBoard';

/**
 * ClinicianAyush (design page 5, Tier 1, approved 2026-10-21). Alongside
 * allopathic care, never instead of it. No AYUSH consultation model exists
 * yet, so production shows the not-connected layout; the refusal rule needs a
 * named owner and a server check before this desk can be connected.
 */
export function ayushConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinAyush.title'),
    subtitle: t('clinAyush.subtitle'),
    caption: t('clinAyush.caption'),
    columns: [
      { label: t('clinAyush.col.student'), width: '140px' },
      { label: t('clinAyush.col.presenting') },
      { label: t('clinAyush.col.practitioner'), width: '170px' },
      { label: t('clinAyush.col.comanaged'), width: '150px' },
      { label: t('clinAyush.col.state'), width: '150px', align: 'end' },
    ],
    footnote: t('clinAyush.footnote'),
    empty: { title: t('clinAyush.emptyTitle'), body: t('clinAyush.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinAyush.unconnectedTitle'), body: t('clinAyush.unconnectedBody') },
    errorTitle: t('clinAyush.errorTitle'),
    reference: t('clinAyush.reference'),
    statLabels: [t('clinAyush.stat.open'), t('clinAyush.stat.comanaged'), t('clinAyush.stat.refused'), t('clinAyush.stat.replacing')],
  };
}

export function ClinicianAyushScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => ayushConfig(t), [t]);
  return <ConsoleTableScreen navId="ayush" config={config} source={source ?? sampleInDevelopment(ayushSample)} />;
}
