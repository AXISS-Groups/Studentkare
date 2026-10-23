import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleEmptyState, ConsolePageHeader } from '@/design-system';
import type { SkTone } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { aiGovernanceRepository } from '../model/aiGovernanceRepository';
import { knowledgeRepository } from '../model/knowledgeRepository';
import { count, percent } from '../model/format';
import type { AyushQuality } from '../model/types';
import { AiGovernanceViewModel } from '../viewmodels/AiGovernanceViewModel';
import { boardEmpty } from './AdminBoard';
import { BoardFailure, BoardLoading, GovBar, GovCard, GovLines, Unavailable, useResource } from './GovBoard';
import './gov-board.css';

/**
 * The seven stages of an Agent Ayush turn, in order. `outcome` is the refusal the quality
 * endpoint counts for that stage; retrieval and generation cannot refuse, so they have
 * no count ("—"), never 0.
 */
const STAGES: readonly { id: string; label: MessageKey; meta: MessageKey; outcome?: string; tone: SkTone }[] = [
  { id: 'crisis', label: 'gov.ai.stageCrisis', meta: 'gov.ai.stageCrisisMeta', outcome: 'CRISIS', tone: 'danger' },
  { id: 'scope', label: 'gov.ai.stageScope', meta: 'gov.ai.stageScopeMeta', outcome: 'REFUSED_SCOPE', tone: 'attention' },
  { id: 'vault', label: 'gov.ai.stageVault', meta: 'gov.ai.stageVaultMeta', outcome: 'REFUSED_PERSONAL', tone: 'attention' },
  { id: 'retrieval', label: 'gov.ai.stageRetrieval', meta: 'gov.ai.stageRetrievalMeta', tone: 'neutral' },
  { id: 'grounding', label: 'gov.ai.stageGrounding', meta: 'gov.ai.stageGroundingMeta', outcome: 'NO_SOURCE', tone: 'attention' },
  { id: 'generation', label: 'gov.ai.stageGeneration', meta: 'gov.ai.stageGenerationMeta', tone: 'neutral' },
  { id: 'output', label: 'gov.ai.stageOutput', meta: 'gov.ai.stageOutputMeta', outcome: 'REFUSED_OUTPUT', tone: 'danger' },
];

/** Turns that ended in a refusal (anything but an answer), as a share of all recorded turns. */
export const refusalRate = (quality: AyushQuality) => 1 - quality.answerRate;

/**
 * AI governance (design: AiGovernance, Tier 1). From GET /ops/agents/ayush/quality (the
 * latest recorded turns, up to 500, not a 7-day window) and the knowledge index status.
 * Each pipeline stage shows the refusals the server counts for it. The grounding note
 * appears only when the index really is character n-gram hashing (index status says
 * the retrieval is not semantic). Transcript retention has no setting, so it reads "Not
 * set". The module register needs a computed import check (guardrail 3: an unreachable
 * safety module is a bug to report, not a row), so it is not connected.
 */
export const AiGovernanceView = observer(function AiGovernanceView() {
  const t = useT();
  const [vm] = useState(() => new AiGovernanceViewModel(aiGovernanceRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const index = useResource(knowledgeRepository.indexStatus);
  const data = vm.quality;

  if (vm.loading) return <BoardLoading label={t('admin.ai.loading')} />;
  if (vm.error) return <BoardFailure t={t} what={t('gov.ai.what')} screen="AiGovernance" onRetry={vm.reload} detail={vm.error} />;
  if (vm.isEmpty || !data) return <div className="sk-ds sk-ctp"><ConsoleEmptyState empty={boardEmpty(t, t('admin.ai.empty'), t('admin.ai.emptyBody'))} headingLevel={1} /></div>;

  const breakdown = data.refusalBreakdown;
  const crisis = breakdown.CRISIS ?? 0;
  const idx = index.data;
  return <div className="sk-ds sk-admin-page sk-gov">
    <ConsolePageHeader eyebrow={t('gov.ai.eyebrow')} title={t('admin.ai.title')} subtitle={t('gov.ai.subtitle')} />
    <dl className="sk-gov-figures" aria-label={t('admin.ai.usage')}>
      <div className="sk-gov-figure"><dt>{t('admin.ai.turns')}</dt><dd>{count(data.turns)}</dd><dd className="sk-gov-figure__meta">{t('admin.ai.turnsMeta')}</dd></div>
      <div className="sk-gov-figure"><dt>{t('gov.ai.refusalRate')}</dt><dd>{percent(refusalRate(data))}</dd><dd className="sk-gov-figure__meta">{t('gov.ai.refusalRateMeta')}</dd></div>
      <div className="sk-gov-figure"><dt>{t('gov.ai.crisisRoutes')}</dt><dd className={crisis ? 'is-danger' : undefined}>{count(crisis)}</dd><dd className="sk-gov-figure__meta">{t('gov.ai.crisisRoutesMeta')}</dd></div>
      <div className="sk-gov-figure"><dt>{t('admin.ai.grounded')}</dt><dd className="is-positive">{percent(data.groundedRate)}</dd><dd className="sk-gov-figure__meta">{t('admin.ai.groundedMeta')}</dd></div>
    </dl>
    <div className="sk-gov-grid sk-gov-grid--split">
      <GovCard eyebrow={t('gov.ai.pipeline')}>
        <ol className="sk-gov-stages">{STAGES.map(stage => {
          const value = stage.outcome ? breakdown[stage.outcome] ?? 0 : null;
          return <li key={stage.id} className="sk-gov-stage">
            <span className={`sk-gov-dot sk-gov-dot--${value ? stage.tone : 'neutral'}`} aria-hidden="true" />
            <strong>{t(stage.label)}</strong>
            <span className={`sk-gov-stage__count ${value === null ? 'is-unknown' : value ? `is-${stage.tone}` : ''}`}
              aria-label={value === null ? t('gov.ai.cannotRefuse', { stage: t(stage.label) }) : undefined}>{value === null ? '—' : count(value)}</span>
            <GovBar value={value ?? 0} max={data.turns} tone={stage.tone} />
            <p>{t(stage.meta)}</p>
          </li>;
        })}</ol>
      </GovCard>
      <div className="sk-gov-stack">
        <GovCard eyebrow={t('gov.ai.grounding')}>
          <GovLines label={t('gov.ai.grounding')} lines={[
            { label: t('admin.kb.indexed'), value: idx ? t('admin.kb.xOfY', { x: count(idx.indexedSources), y: count(idx.approvedSources) }) : null },
            { label: t('gov.ai.waitingReindex'), value: idx ? count(idx.missing.length) : null, tone: idx?.missing.length ? 'attention' : undefined },
            { label: t('gov.ai.relevance'), value: data.avgTopScore.toFixed(2), mono: true },
            { label: t('gov.ai.retention'), value: t('gov.plans.notSet'), tone: 'attention' },
          ]} />
          {idx && !idx.semantic ? <p className="sk-gov-fine">{t('gov.ai.ngramNote')}</p> : null}
          {index.status === 'error' ? <p className="sk-gov-error" role="alert">{t('admin.kb.indexError')}</p> : null}
        </GovCard>
        <GovCard eyebrow={t('gov.ai.register')}>
          <Unavailable>{t('gov.ai.registerNote')}</Unavailable>
        </GovCard>
      </div>
    </div>
  </div>;
});
