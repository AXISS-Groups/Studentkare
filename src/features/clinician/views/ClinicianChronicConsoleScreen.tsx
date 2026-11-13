import React, { useMemo, useState } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import type { T } from '../model/clinicalData';
import { defaultChronicSource } from '../viewmodel/chronicBoard';

/**
 * ClinicianChronic — chronic tracker (design page 5, Tier 1, approved 2026-10-21).
 *
 * Production reads `/work/chronic`. Students are "B-214 · KC" (room and
 * initials); the API sends no names. A student who leaves keeps their record,
 * stops being chased, and is never reported to their campus — stated on the
 * screen because it is why someone will leave a programme they need to leave.
 */
export function chronicConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinChronic.title'),
    subtitle: t('clinChronic.subtitle'),
    caption: t('clinChronic.caption'),
    columns: [
      { label: t('clinChronic.col.student'), width: '140px' },
      { label: t('clinChronic.col.programme') },
      { label: t('clinChronic.col.last'), width: '150px' },
      { label: t('clinChronic.col.next'), width: '150px' },
      { label: t('clinChronic.col.state'), width: '150px', align: 'end' },
    ],
    footnote: t('clinChronic.footnote'),
    empty: { title: t('clinChronic.emptyTitle'), body: t('clinChronic.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinChronic.unconnectedTitle'), body: t('clinChronic.unconnectedBody') },
    errorTitle: t('clinChronic.errorTitle'),
    reference: t('clinChronic.reference'),
    statLabels: [t('clinChronic.stat.on'), t('clinChronic.stat.overdue'), t('clinChronic.stat.dueWeek'), t('clinChronic.stat.left')],
  };
}

export function ClinicianChronicConsoleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => chronicConfig(t), [t]);
  const [fallback] = useState(() => defaultChronicSource(t));
  return <ConsoleTableScreen navId="chronic-care" config={config} source={source ?? fallback} />;
}
