import type { ConsoleTableData } from './ConsoleTableViewModel';
import { cell, muted, pill, strong } from './cells';

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
export function referralsSample(): ConsoleTableData {
  return {
    badge: { label: '1 awaiting acceptance', tone: 'action' },
    stats: [
      { value: '4', label: 'Open referrals' },
      { value: '1', label: 'Awaiting acceptance', tone: 'attention' },
      { value: '2', label: 'Seen within 14 days', tone: 'positive' },
      { value: null, label: 'Commission taken', meta: 'No ledger yet' },
    ],
    rows: [
      { id: 'r1', cells: [strong('D-042 · NP'), cell('Hb 7.1 with no obvious source — needs GI workup'), cell('Apollo · gastroenterology', 'action'), muted('24 Sep'), pill('Accepted, 02 Oct', 'positive')] },
      { id: 'r2', cells: [strong('B-214 · KC'), cell('Persistent vitamin D deficiency despite adherence'), cell('Visiting endocrinologist · campus', 'action'), muted('22 Sep'), pill('On campus 05 Oct', 'action')] },
      { id: 'r3', cells: [strong('A-331 · RM'), cell('Recurrent chest infection, third this term'), cell('KIMS · pulmonology', 'action'), muted('18 Sep'), pill('Awaiting acceptance', 'attention')] },
      { id: 'r4', cells: [strong('C-108 · AK'), cell('Asked for a second opinion'), cell('Student choice — any listed', 'action'), muted('20 Sep'), pill('Student choosing', 'neutral')] },
    ],
  };
}
