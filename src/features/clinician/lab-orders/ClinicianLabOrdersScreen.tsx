import React from 'react';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';

/** ClinicianLabOrder (design page 5, Tier 2). */
export const labOrdersConfig: ConsoleTableConfig = {
  title: 'Lab orders',
  subtitle: 'Panels you have ordered · NABL labs only',
  caption: 'Lab orders you have placed, with the reason for each and its state',
  columns: [
    { label: 'Student', width: '140px' },
    { label: 'Panel & indication' },
    { label: 'Preparation', width: '160px' },
    { label: 'Lab', width: '140px' },
    { label: 'State', width: '150px', align: 'end' },
  ],
  footnote:
    'Every order carries the clinical indication that justified it. The last row shows the case we refuse to make easy — a student asking for a full panel with nothing to investigate is not an order, and the screen will not create one without a reason typed in.',
  empty: { title: 'No lab orders open.', body: 'Panels you order during a consult appear here until the result is released.' },
  unconnected: { title: 'Lab orders aren’t connected yet.', body: 'Orders you place will appear here once the lab service is connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load lab orders',
  reference: 'Ref LAB-ORDERS · ClinicianLabOrder',
};

const FASTING = '10 h fasting · morning slot only';

export function labOrdersSample(): ConsoleTableData {
  return {
    badge: { label: '1 urgent, same day', tone: 'danger' },
    stats: [
      { value: '4', label: 'Open orders' },
      { value: '1', label: 'Urgent', tone: 'danger' },
      { value: '2', label: 'Need fasting', tone: 'attention' },
      { value: '100%', label: 'With an indication', tone: 'positive' },
    ],
    rows: [
      { id: 'l1', cells: [strong('B-214 · KC'), cell('Repeat vitamin D — low on 20 Sep'), cell(FASTING, 'attention'), muted('Kare Labs · NABL'), pill('Booked, 30 Sep', 'positive')] },
      { id: 'l2', cells: [strong('C-108 · AK'), cell('Thyroid profile — fatigue, 6 weeks'), cell('No fasting', 'attention'), muted('Kare Labs · NABL'), pill('Awaiting student slot', 'action')] },
      { id: 'l3', cells: [strong('A-331 · RM'), cell('CBC — post-fever follow-up'), cell('No fasting', 'attention'), muted('Kare Labs · NABL'), pill('Sample collected', 'positive')] },
      { id: 'l4', cells: [strong('D-042 · NP'), cell('Iron studies — Hb 7.1'), cell(FASTING, 'attention'), muted('Kare Labs · NABL'), pill('Urgent — same day', 'danger')] },
      { id: 'l5', cells: [strong('B-119 · IS'), cell('Full body panel — student asked'), muted('No clinical indication recorded'), muted('—'), pill('Not ordered', 'neutral')] },
    ],
  };
}

export function ClinicianLabOrdersScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return <ConsoleTableScreen navId="lab-orders" config={labOrdersConfig} source={source ?? sampleInDevelopment(labOrdersSample)} />;
}
