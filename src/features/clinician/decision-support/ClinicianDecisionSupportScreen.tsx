import React from 'react';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, pill, strong } from '../shared/cells';

/**
 * ClinicianAi — decision support (design page 5, Tier 3). Suggests, never acts.
 *
 * This screen only displays suggestions. Any real feed must come from the M18
 * clinician service over its own connection (AGENTS.md guardrail 5) and every
 * model call behind it must pass through the AI constitution (guardrail 3).
 * Until that feed exists, production shows the not-connected state.
 */
export const decisionSupportConfig: ConsoleTableConfig = {
  title: 'Decision support',
  subtitle: 'Isolated from the vault and from commerce · suggests, never acts',
  caption: 'Decision-support suggestions, what each is based on, its source, and what it cannot do',
  columns: [
    { label: 'Suggestion' },
    { label: 'Based on', width: '200px' },
    { label: 'Confidence', width: '160px' },
    { label: 'What it cannot do', width: '160px', align: 'end' },
  ],
  footnote:
    'It reads what you are looking at and nothing else — no vault access, no purchase history, no other student’s record. It cannot order, prescribe or message anyone. The fourth row matters most: when the input is too thin, it says so instead of producing a plausible differential.',
  empty: { title: 'No suggestions today.', body: 'Suggestions appear here only for what you are looking at in a consult, each with its source.' },
  unconnected: { title: 'Decision support isn’t connected yet.', body: 'Suggestions will appear here once the clinician service is connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load decision support',
  reference: 'Ref CDSS · ClinicianAi',
};

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

export function ClinicianDecisionSupportScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return <ConsoleTableScreen navId="decision-support" config={decisionSupportConfig} source={source ?? sampleInDevelopment(decisionSupportSample)} />;
}
