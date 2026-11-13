import type { ConsoleTableData } from './ConsoleTableViewModel';
import { cell, muted, pill, strong } from './cells';

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
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
