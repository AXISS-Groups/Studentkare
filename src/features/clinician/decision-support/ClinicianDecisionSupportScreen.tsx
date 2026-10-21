import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, pill, strong } from '../shared/cells';
import type { T } from '../shared/clinicalData';

/**
 * ClinicianAi — decision support (design page 5, Tier 1, approved
 * 2026-10-21). Suggests, never acts.
 *
 * This screen only displays suggestions. Any real feed must come from the M18
 * clinician service over its own connection (AGENTS.md guardrail 5) and every
 * model call behind it must pass through the AI constitution (guardrail 3).
 * A critical-value flag must come from the deterministic critical-result
 * rule, never from a model. Until that feed exists, production shows the
 * not-connected state, and there is no "act on it" control at all.
 */
export function decisionSupportConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinAi.title'),
    subtitle: t('clinAi.subtitle'),
    caption: t('clinAi.caption'),
    columns: [
      { label: t('clinAi.col.suggestion') },
      { label: t('clinAi.col.basedOn'), width: '200px' },
      { label: t('clinAi.col.confidence'), width: '160px' },
      { label: t('clinAi.col.cannot'), width: '170px', align: 'end' },
    ],
    footnote: t('clinAi.footnote'),
    empty: { title: t('clinAi.emptyTitle'), body: t('clinAi.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinAi.unconnectedTitle'), body: t('clinAi.unconnectedBody') },
    errorTitle: t('clinAi.errorTitle'),
    reference: t('clinAi.reference'),
    statLabels: [t('clinAi.stat.today'), t('clinAi.stat.declined'), t('clinAi.stat.actions'), t('clinAi.stat.sourced')],
  };
}

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

export function ClinicianDecisionSupportScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => decisionSupportConfig(t), [t]);
  return <ConsoleTableScreen navId="decision-support" config={config} source={source ?? sampleInDevelopment(decisionSupportSample)} />;
}
