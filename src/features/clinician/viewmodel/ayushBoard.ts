import type { ConsoleTableData } from './ConsoleTableViewModel';
import { cell, muted, pill, strong } from './cells';

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
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
