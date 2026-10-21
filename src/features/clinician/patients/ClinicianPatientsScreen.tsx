import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { unconnectedTableSource } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableSource } from '../shared/consoleTable';

/**
 * ClinicianPatients — "My patients" (design page 5, Tier 2). Only people who
 * have shared a record with this doctor. Lapsed shares stay listed (so the
 * doctor's own notes stay findable) but muted: the records behind them are closed.
 * Copy from the `clinicianPatients.*` catalogue (en/te/hi).
 *
 * No endpoint lists the students who have shared records with a doctor (the
 * shares API answers the student, not the clinician), so every build shows the
 * not-connected layout — never sample rows.
 */
export function patientsConfig(t: (key: MessageKey, vars?: Vars) => string): ConsoleTableConfig {
  return {
    title: t('clinicianPatients.title'),
    subtitle: t('clinicianPatients.subtitle'),
    caption: t('clinicianPatients.caption'),
    columns: [
      { label: t('clinicianPatients.colStudent'), width: '186px' },
      { label: t('clinicianPatients.colBlock'), width: '166px' },
      { label: t('clinicianPatients.colWhy') },
      { label: t('clinicianPatients.colConsent'), width: '220px' },
      { label: t('clinicianPatients.colLeft'), width: '110px', align: 'end' },
    ],
    footnote: t('clinicianPatients.footnote'),
    empty: { title: t('clinicianPatients.emptyTitle'), body: t('clinicianPatients.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    emptyAction: { label: t('clinicianPatients.emptyAction'), route: 'clinician/schedule' },
    unconnected: { title: t('clinicianPatients.unconnectedTitle'), body: t('clinicianPatients.unconnectedBody') },
    errorTitle: t('clinicianPatients.errorTitle'),
    reference: t('clinicianPatients.reference'),
    statLabels: [t('clinicianPatients.statLive'), t('clinicianPatients.statExpiring'), t('clinicianPatients.statLapsed'), t('clinicianPatients.statProgramme')],
  };
}

export function ClinicianPatientsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => patientsConfig(t), [t]);
  return <ConsoleTableScreen navId="my-patients" config={config} source={source ?? unconnectedTableSource} />;
}
