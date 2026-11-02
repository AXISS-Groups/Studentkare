import type { ConsoleTableData } from './ConsoleTableViewModel';
import { cell, pill, strong } from './cells';

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
export function decisionSupportSample(): ConsoleTableData {
  return {
    badge: { label: 'Advisory only', tone: 'action' },
    stats: [
      { value: '3', label: 'Suggestions today' },
      { value: '1', label: 'Declined to answer', tone: 'positive' },
      { value: '0', label: 'Actions taken', tone: 'positive' },
      { value: '100%', label: 'Sourced', tone: 'positive' },
    ],
    rows: [
      { id: 'd1', cells: [strong('Consider iron studies before repeating Hb'), strong('Hb 7.1, no source identified'), cell('Cites 3 sources', 'action'), pill('Cannot order it', 'action')] },
      { id: 'd2', cells: [strong('Reliever use suggests reviewing control'), strong('11 uses in 30 days'), cell('Cites GINA 2025', 'action'), pill('Cannot change the prescription', 'action')] },
      { id: 'd3', cells: [strong('Flag: potassium 6.8 is a critical value'), strong('Reference range 3.5–5.1'), cell('Deterministic rule', 'action'), pill('Not a suggestion — a rule', 'danger')] },
      { id: 'd4', cells: [strong('No differential offered'), strong('Symptoms too non-specific'), cell('Declined to guess', 'action'), pill('Will not produce a guess', 'neutral')] },
    ],
  };
}
