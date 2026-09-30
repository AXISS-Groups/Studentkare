import React from 'react';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';

/** ClinicianAyush (design page 5, Tier 3). Alongside allopathic care, never instead of it. */
export const ayushConfig: ConsoleTableConfig = {
  title: 'AYUSH desk',
  subtitle: 'Ayurveda, Yoga, Unani, Siddha and Homeopathy · alongside allopathic care, never instead of it',
  caption: 'AYUSH consultations, their practitioner, and who is co-managing',
  columns: [
    { label: 'Student', width: '140px' },
    { label: 'Presenting & system' },
    { label: 'Practitioner', width: '170px' },
    { label: 'Co-managed with', width: '150px' },
    { label: 'State', width: '150px', align: 'end' },
  ],
  footnote:
    'The refused row is the reason this desk has rules. Substituting AYUSH for an inhaler in asthma is not a choice we facilitate — the student was told why, offered a co-managed plan instead, and their allopathic clinician was informed.',
  empty: { title: 'No AYUSH consultations open.', body: 'When a student you care for opens an AYUSH consultation, it appears here so care stays co-ordinated.' },
  unconnected: { title: 'The AYUSH desk isn’t connected yet.', body: 'Consultations will appear here once the desk is connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load the AYUSH desk',
  reference: 'Ref AYUSH · ClinicianAyush',
};

export function ayushSample(): ConsoleTableData {
  return {
    badge: { label: '1 request refused', tone: 'danger' },
    stats: [
      { value: '3', label: 'Open consultations' },
      { value: '2', label: 'Co-managed', tone: 'positive' },
      { value: '1', label: 'Refused', tone: 'danger' },
      { value: '0', label: 'Replacing a prescription', tone: 'positive' },
    ],
    rows: [
      { id: 'y1', cells: [strong('C-108 · AK'), cell('Exam-period stress · Ayurveda'), cell('Dr. L. Sharma · BAMS', 'action'), muted('Dr. A. Reddy, informed'), pill('Open', 'positive')] },
      { id: 'y2', cells: [strong('B-119 · IS'), cell('Seasonal allergic rhinitis · Homeopathy'), cell('Dr. P. Roy · BHMS', 'action'), muted('Not co-managed'), pill('Open', 'action')] },
      { id: 'y3', cells: [strong('D-042 · NP'), cell('Menstrual pain · Yoga therapy'), cell('R. Iyer · certified', 'action'), muted('Gynaecology, informed'), pill('Open', 'positive')] },
      { id: 'y4', cells: [strong('A-331 · RM'), cell('Asked to stop inhaler and use Ayurveda only', 'danger'), muted('—'), muted('—'), pill('Refused, explained', 'danger')] },
    ],
  };
}

export function ClinicianAyushScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return <ConsoleTableScreen navId="ayush" config={ayushConfig} source={source ?? sampleInDevelopment(ayushSample)} />;
}
