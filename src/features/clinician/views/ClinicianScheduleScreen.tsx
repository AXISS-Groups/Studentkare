import React, { useMemo } from 'react';
import { DestinationButton } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import { bookingsScheduleSource } from '../viewmodel/scheduleBoard';

type T = (key: MessageKey, vars?: Vars) => string;

/** ClinicianSchedule (design page 5, Tier 3). Copy from `clinSchedule.*` (en/te/hi). */
export function scheduleConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinSchedule.title'),
    subtitle: t('clinSchedule.subtitle'),
    caption: t('clinSchedule.caption'),
    tableTitle: t('clinSchedule.tableTitle'),
    hideColumnHeadings: true,
    columns: [
      { label: t('clinSchedule.colDay'), width: '106px' },
      { label: t('clinSchedule.colTime'), width: '146px' },
      { label: t('clinSchedule.colWhere') },
      { label: t('clinSchedule.colBookings'), width: '220px' },
      { label: t('clinSchedule.colState'), width: '130px', align: 'end' },
    ],
    footnote: t('clinSchedule.footnote'),
    empty: { title: t('clinSchedule.emptyTitle'), body: t('clinSchedule.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinSchedule.unconnectedTitle'), body: t('clinSchedule.unconnectedBody') },
    errorTitle: t('clinSchedule.errorTitle'),
    reference: t('clinSchedule.reference'),
    statLabels: [t('clinSchedule.statOffered'), t('clinSchedule.statBooked'), t('clinSchedule.statCamp'), t('clinSchedule.statGap')],
  };
}

export function ClinicianScheduleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => scheduleConfig(t), [t]);
  const [fallback] = React.useState(() => bookingsScheduleSource(t));
  return (
    <ConsoleTableScreen
      navId="schedule"
      config={config}
      source={source ?? fallback}
      headerAction={
        // No endpoint lets a doctor publish their own slots from here yet.
        <DestinationButton route={null} onNavigate={navigate} className="sk-btn sk-btn--primary">
          {t('clinSchedule.addAvailability')}
        </DestinationButton>
      }
    />
  );
}
