import React from 'react';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';

/** ClinicianRenewals (design page 5, Tier 3). Nothing renews itself. */
export const renewalsConfig: ConsoleTableConfig = {
  title: 'Renewals',
  subtitle: 'Refill requests from students · you decide, always',
  caption: 'Refill requests waiting for your decision, with adherence',
  columns: [
    { label: 'Student', width: '140px' },
    { label: 'Medicine & history' },
    { label: 'Asked', width: '150px' },
    { label: 'Adherence', width: '140px' },
    { label: 'Your decision', width: '160px', align: 'end' },
  ],
  footnote:
    'Nothing renews itself. Inhaler use of eleven times in thirty days is surfaced because rising reliever use is how uncontrolled asthma announces itself — the screen shows you the pattern rather than quietly reissuing the prescription.',
  empty: { title: 'No refill requests.', body: 'When a student asks to renew a medicine you prescribed, it waits here for your decision.' },
  unconnected: { title: 'Renewals aren’t connected yet.', body: 'Refill requests will appear here once they are connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load renewals',
  reference: 'Ref RENEWALS · ClinicianRenewals',
};

export function renewalsSample(): ConsoleTableData {
  return {
    badge: { label: '1 needs a test first', tone: 'danger' },
    stats: [
      { value: '4', label: 'Waiting on you' },
      { value: '1', label: 'Blocked pending a test', tone: 'danger' },
      { value: '1', label: 'Escalating use', tone: 'attention' },
      { value: '0', label: 'Auto-renewed', tone: 'positive' },
    ],
    rows: [
      { id: 'n1', cells: [strong('B-214 · KC'), cell('Vitamin D3 60k weekly · on it 8 weeks'), muted('2 h ago'), strong('7 of 8 doses recorded'), pill('Renew 8 weeks', 'positive')] },
      { id: 'n2', cells: [strong('C-108 · AK'), cell('Salbutamol inhaler · issued 14 Aug'), muted('Yesterday'), cell('Used 11 times in 30 days', 'attention'), pill('Review before renewing', 'attention')] },
      { id: 'n3', cells: [strong('A-331 · RM'), cell('Iron + folic · course ended 21 Sep'), muted('3 days ago'), strong('Completed the course'), pill('Needs a repeat Hb first', 'danger')] },
      { id: 'n4', cells: [strong('B-119 · IS'), cell('Chronic — asthma programme'), muted('Today'), strong('Stable'), pill('Auto-eligible, you confirm', 'action')] },
    ],
  };
}

export function ClinicianRenewalsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return <ConsoleTableScreen navId="renewals" config={renewalsConfig} source={source ?? sampleInDevelopment(renewalsSample)} />;
}
