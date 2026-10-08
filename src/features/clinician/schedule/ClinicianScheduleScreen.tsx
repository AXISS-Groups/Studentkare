import React from 'react';
import { DestinationButton } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { muted, pill, strong } from '../shared/cells';

/** ClinicianSchedule (design page 5, Tier 3). */
export const scheduleConfig: ConsoleTableConfig = {
  title: 'Schedule',
  subtitle: 'Your week of consults and camp duty',
  caption: 'Your slots this week: day, time, place, bookings and state',
  tableTitle: 'This week',
  hideColumnHeadings: true,
  columns: [
    { label: 'Day', width: '106px' },
    { label: 'Time', width: '146px' },
    { label: 'Where' },
    { label: 'Bookings', width: '220px' },
    { label: 'State', width: '130px', align: 'end' },
  ],
  footnote:
    'Removing a slot never cancels a booking already in it. Students holding one are offered a new time before anything is released.',
  empty: { title: 'No slots this week.', body: 'Slots you offer appear here with how many are booked.' },
  unconnected: { title: 'Your schedule isn’t connected yet.', body: 'Your slots will appear here once scheduling is connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load your schedule',
  reference: 'Ref SCHEDULE · ClinicianSchedule',
};

export function scheduleSample(): ConsoleTableData {
  return {
    subtitle: 'Week of 29 September · VNR VJIET',
    stats: [
      { value: '27', label: 'Slots offered this week' },
      { value: '19', label: 'Booked' },
      { value: '1', label: 'Camp duty', tone: 'attention' },
      { value: '4h', label: 'Median gap between shifts' },
    ],
    rows: [
      { id: 's1', cells: [strong('Mon 29'), strong('09:00–13:00'), strong('Campus clinic · Block A'), muted('8 of 12 booked'), pill('Open', 'positive')] },
      { id: 's2', cells: [strong('Mon 29'), strong('18:00–20:00'), strong('Teleconsult'), muted('5 of 8 booked'), pill('Open', 'positive')] },
      { id: 's3', cells: [strong('Tue 30'), strong('09:00–13:00'), strong('Campus clinic · Block A'), muted('12 of 12 booked'), pill('Full', 'action')] },
      { id: 's4', cells: [strong('Wed 01'), strong('09:00–13:00'), strong('Not offered'), muted('—'), pill('Not offered', 'neutral')] },
      { id: 's5', cells: [strong('Thu 02'), strong('14:00–18:00'), strong('Health camp · VNR VJIET'), muted('Camp duty, not bookable'), pill('Camp duty', 'attention')] },
      { id: 's6', cells: [strong('Fri 03'), strong('18:00–20:00'), strong('Teleconsult'), muted('2 of 8 booked'), pill('Open', 'positive')] },
    ],
  };
}

export function ClinicianScheduleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return (
    <ConsoleTableScreen
      navId="schedule"
      config={scheduleConfig}
      source={source ?? sampleInDevelopment(scheduleSample)}
      headerAction={
        <DestinationButton route={null} onNavigate={navigate} className="sk-btn sk-btn--primary">
          Add availability
        </DestinationButton>
      }
    />
  );
}
