import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from './ConsoleTableScreen';
import { sampleInDevelopment } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import type { T } from '../model/clinicalData';
import { decisionSupportSample } from '../viewmodel/decisionSupportBoard';

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

export function ClinicianDecisionSupportScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => decisionSupportConfig(t), [t]);
  return <ConsoleTableScreen navId="decision-support" config={config} source={source ?? sampleInDevelopment(decisionSupportSample)} />;
}
