import React from 'react';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { muted, pill, strong } from '../shared/cells';

/**
 * ClinicianPatients — "My patients" (design page 5, Tier 3). Only people who
 * have shared a record with this doctor. Lapsed shares stay listed (so the
 * doctor's own notes stay findable) but muted: the records behind them are closed.
 */
export const patientsConfig: ConsoleTableConfig = {
  title: 'My patients',
  subtitle: 'Only people who have shared a record with you. Nothing else is reachable.',
  caption: 'Students who have shared records with you, why, and how long access lasts',
  columns: [
    { label: 'Student', width: '186px' },
    { label: 'Block', width: '166px' },
    { label: 'Why you have access' },
    { label: 'Consent', width: '220px' },
    { label: 'Left', width: '110px', align: 'end' },
  ],
  footnote:
    'Lapsed rows stay visible so your own notes remain findable. The records behind them are closed — opening one is a new request to the student, not a click.',
  empty: { title: 'Nobody has shared a record with you yet.', body: 'When a student shares a record for a consult or a care programme, they appear here — and only then.' },
  unconnected: { title: 'My patients isn’t connected yet.', body: 'Students who share records with you will appear here once sharing is connected. Until then this page shows nobody rather than a guess.' },
  errorTitle: 'Couldn’t load your patients',
  reference: 'Ref PATIENTS · ClinicianPatients',
};

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
  return <ConsoleTableScreen navId="my-patients" config={patientsConfig} source={source ?? sampleInDevelopment(patientsSample)} />;
}
