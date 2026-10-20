import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { muted, pill, strong } from '../shared/cells';

/**
 * ClinicianPatients — "My patients" (design page 5, Tier 2). Only people who
 * have shared a record with this doctor. Lapsed shares stay listed (so the
 * doctor's own notes stay findable) but muted: the records behind them are closed.
 * Copy from the `clinicianPatients.*` catalogue (en/te/hi).
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

/** Development sample only (sampleInDevelopment): never shown in a production build. */
export function patientsSample(): ConsoleTableData {
  return {
    stats: [
      { value: '2', label: 'Live shares', tone: 'positive' },
      { value: '1', label: 'Expiring within a week', tone: 'attention' },
      { value: '2', label: 'Lapsed — read-only history' },
      { value: '1', label: 'In a care programme' },
    ],
    rows: [
      { id: 'p1', cells: [strong('Krishna C.'), muted('B-214 · 3rd year'), strong('Vitamin D low · on D3'), muted('Share expires 04 Oct'), pill('14 days', 'positive')] },
      { id: 'p2', cells: [strong('Ayesha K.'), muted('C-108 · 2nd year'), strong('Asthma programme'), muted('Standing consent'), pill('Programme', 'positive')] },
      { id: 'p3', muted: true, cells: [strong('Rahul M.'), muted('A-331 · 4th year'), strong('Post-fever follow-up'), muted('Share expired 21 Sep'), pill('Lapsed', 'neutral')] },
      { id: 'p4', cells: [strong('Nisha P.'), muted('D-042 · 1st year'), strong('Anemia panel reviewed'), muted('Share expires 30 Sep'), pill('6 days', 'attention')] },
      { id: 'p5', muted: true, cells: [strong('Imran S.'), muted('B-119 · 3rd year'), strong('One-off consult'), muted('Share expired 12 Sep'), pill('Lapsed', 'neutral')] },
    ],
  };
}

export function ClinicianPatientsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => patientsConfig(t), [t]);
  return <ConsoleTableScreen navId="my-patients" config={config} source={source ?? sampleInDevelopment(patientsSample)} />;
}
