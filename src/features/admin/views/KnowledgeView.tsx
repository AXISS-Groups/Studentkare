import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleErrorState, ConsoleLoadingState, ConsolePageHeader, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { knowledgeRepository } from '../model/knowledgeRepository';
import { count, readable, when } from '../model/format';
import type { AyushHealth } from '../model/types';
import { KnowledgeViewModel } from '../viewmodels/KnowledgeViewModel';
import { BoardToast, boardError } from './AdminBoard';
import { GovCard, GovLines, GovPill, Unavailable } from './GovBoard';
import type { LineTone } from './GovBoard';
import { PublishSourceDialog } from './PublishSourceDialog';
import './gov-board.css';

/** Words for the source states sourceState() returns; anything else is shown as given. */
const SOURCE_STATE_LABEL: Record<string, MessageKey> = {
  'Expired · hidden': 'admin.kb.stateExpired',
  'Awaiting review': 'admin.kb.stateAwaiting',
  'Not indexed': 'admin.kb.stateNotIndexed',
  Live: 'admin.kb.stateLive',
};
const STATE_TONE: Record<string, 'positive' | 'attention' | 'neutral' | 'danger'> = { 'is-positive': 'positive', 'is-attention': 'attention', 'is-danger': 'danger' };

const HEALTH_HEADLINE: Record<AyushHealth['status'], MessageKey> = {
  ok: 'admin.kb.health.ok', attention: 'admin.kb.health.attention', down: 'admin.kb.health.down',
};
const HEALTH_PILL: Record<AyushHealth['status'], MessageKey> = {
  ok: 'admin.kb.health.pill.ok', attention: 'admin.kb.health.pill.attention', down: 'admin.kb.health.pill.down',
};
const HEALTH_TONE: Record<AyushHealth['status'], 'positive' | 'attention' | 'danger'> = { ok: 'positive', attention: 'attention', down: 'danger' };
const ERROR_WHERE: Record<string, MessageKey> = {
  embedding: 'admin.kb.health.where.embedding', generation: 'admin.kb.health.where.generation',
  indexing: 'admin.kb.health.where.indexing', retrieval: 'admin.kb.health.where.retrieval', startup: 'admin.kb.health.where.startup',
};

/** Ayush health in plain words (GET /ops/agents/ayush/health): can it answer, how, and what last went wrong. */
const AyushHealthCard = observer(function AyushHealthCard({ vm }: { vm: KnowledgeViewModel }) {
  const t = useT();
  const health = vm.health;
  if (vm.healthLoading) return <GovCard title={t('admin.kb.health.title')}><p className="sk-gov-fine" role="status">{t('admin.kb.health.loading')}</p></GovCard>;
  if (vm.healthError || !health) {
    return <GovCard title={t('admin.kb.health.title')}>
      <div className="sk-gov-error" role="alert"><Icon name="alert-triangle" size={16} /><span>{t('admin.kb.health.error')}{vm.healthError ? ` · ${vm.healthError}` : ''}</span>
        <button type="button" className="sk-gov-link" onClick={vm.reloadHealth}>{t('common.tryAgain')}</button></div>
    </GovCard>;
  }
  const { retrieval, answers, lastError } = health;
  const retrievalValue = retrieval.mode === 'semantic' ? t('admin.kb.health.retrievalSemantic', { model: retrieval.model })
    : retrieval.mode === 'degraded' ? t('admin.kb.health.retrievalDegraded', { count: count(retrieval.fallbackPassages) })
      : t('admin.kb.health.retrievalKeyword');
  const modelLine: { value: string; tone?: LineTone } | null = answers.mode !== 'rephrased' ? null
    : answers.reachable === false ? { value: t('admin.kb.health.modelDown'), tone: 'attention' }
      : answers.modelPulled === false ? { value: t('admin.kb.health.modelNotPulled', { model: answers.model }), tone: 'attention' }
        : answers.reachable ? { value: t('admin.kb.health.modelOk'), tone: 'positive' } : null;
  const lines: { label: string; value: string | null; tone?: LineTone }[] = [
    { label: t('admin.kb.health.published'), value: count(health.published), tone: health.published ? undefined : 'danger' },
    { label: t('admin.kb.health.indexed'), value: t('admin.kb.xOfY', { x: count(health.indexed), y: count(health.published) }), tone: health.missing || health.stale ? 'attention' : undefined },
    { label: t('admin.kb.health.helpPack'), value: t('admin.kb.xOfY', { x: count(health.helpPack.published), y: count(health.helpPack.articles) }) },
    { label: t('admin.kb.health.retrieval'), value: retrievalValue, tone: retrieval.mode === 'degraded' ? 'attention' : undefined },
    { label: t('admin.kb.health.answers'), value: answers.mode === 'rephrased' ? t('admin.kb.health.answersRephrased', { model: answers.model }) : t('admin.kb.health.answersQuotes') },
    ...(modelLine ? [{ label: t('admin.kb.health.modelServer'), ...modelLine }] : []),
    { label: t('admin.kb.health.recent'), value: t('admin.kb.health.recentValue', { rephrased: count(answers.recent.rephrased), quoted: count(answers.recent.quoted), fellBack: count(answers.recent.fellBack) }) },
    {
      label: t('admin.kb.health.lastError'),
      value: lastError ? t('admin.kb.health.errorValue', { error: lastError.error, where: ERROR_WHERE[lastError.where] ? t(ERROR_WHERE[lastError.where]) : lastError.where, when: when(lastError.at) }) : t('admin.kb.health.noError'),
      tone: lastError ? 'attention' : undefined,
    },
  ];
  return <GovCard title={t('admin.kb.health.title')} aside={<GovPill tone={HEALTH_TONE[health.status]} dot>{t(HEALTH_PILL[health.status])}</GovPill>}>
    <p className={health.status === 'down' ? 'sk-gov-unavailable' : 'sk-gov-text'} role={health.status === 'down' ? 'alert' : undefined}>{t(HEALTH_HEADLINE[health.status])}</p>
    {retrieval.misconfigured ? <p className="sk-gov-unavailable">{t('admin.kb.health.misconfigured', { provider: retrieval.requestedProvider })}</p> : null}
    <GovLines label={t('admin.kb.health.title')} lines={lines} />
  </GovCard>;
});

/**
 * Knowledge base (design: AdminKnowledge, Tier 1), on the data and actions the backend
 * has: the sources Ayush may quote, publishing a source, the index and a rebuild. Not
 * offered, because nothing behind them exists: Retire / Sign off / Restore per source,
 * per-source chunk counts, and "Test a question" (a retrieval preview needs its own
 * read-only endpoint; asking Ayush would record a real turn). The board's "reviewed by a
 * clinician" is not claimed: publishing marks a source reviewed by the super admin who
 * publishes it, and there is no clinician sign-off step.
 */
export const KnowledgeView = observer(function KnowledgeView() {
  const t = useT();
  const [vm] = useState(() => new KnowledgeViewModel(knowledgeRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Whether the publish dialog is open, and the last confirmation, are presentation state.
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { index, list } = vm;

  if (vm.sourcesLoading && !list.length) return <div className="sk-ds sk-ctp"><ConsoleLoadingState label={t('admin.kb.loading')} plainStats={false} /></div>;
  if (vm.sourcesError) return <div className="sk-ds sk-ctp"><ConsoleErrorState error={boardError(t, t('gov.kb.what'), 'AdminKnowledge', vm.reloadSources, vm.sourcesError)} headingLevel={1} /></div>;

  const rebuild = async () => {
    await vm.reindex();
    if (!vm.reindexError) setToast(t('gov.kb.rebuilt'));
  };

  return <div className="sk-ds sk-admin-page sk-gov">
    <ConsolePageHeader title={t('admin.kb.title')} subtitle={t('admin.kb.description')}
      badge={index ? { label: t('admin.kb.chunksIndexed', { count: count(index.chunks) }), tone: index.missing.length ? 'attention' : 'positive' } : undefined} />
    <div className="sk-gov-grid sk-gov-grid--main-side">
      <GovCard title={t('admin.kb.sources')} aside={<SkButton variant="secondary" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t('admin.kb.add')}</SkButton>}>
        <p className="sk-gov-text">{t('admin.kb.sourcesBody')}</p>
        {!list.length ? <div className="sk-gov-empty"><strong>{t('admin.kb.empty')}</strong><p className="sk-gov-fine">{t('admin.kb.emptyBody')}</p></div>
          : <ul className="sk-gov-sources">{vm.sourceRows().map(({ source, state }) => <li key={source.id} className="sk-gov-source">
            <div><strong>{source.title}</strong><span>{t('gov.kb.version', { category: readable(source.category), version: source.version })}</span></div>
            <span>{source.author ? t('admin.kb.by', { author: source.author }) : t('admin.kb.noAuthor')}</span>
            <GovPill tone={STATE_TONE[state.tone] ?? 'neutral'}>{SOURCE_STATE_LABEL[state.label] ? t(SOURCE_STATE_LABEL[state.label]) : state.label}</GovPill>
          </li>)}</ul>}
      </GovCard>
      <div className="sk-gov-stack">
        <AyushHealthCard vm={vm} />
        <GovCard title={t('admin.kb.index')}>
          {vm.indexLoading ? <p className="sk-gov-fine" role="status">{t('admin.kb.indexLoading')}</p>
            : vm.indexError ? <div className="sk-gov-error" role="alert"><Icon name="alert-triangle" size={16} /><span>{t('admin.kb.indexError')} · {vm.indexError}</span><button type="button" className="sk-gov-link" onClick={vm.reloadIndex}>{t('common.tryAgain')}</button></div>
              : index ? <>
                <GovLines label={t('admin.kb.index')} lines={[
                  { label: t('admin.kb.indexed'), value: t('admin.kb.xOfY', { x: count(index.indexedSources), y: count(index.approvedSources) }), tone: index.missing.length ? 'attention' : undefined },
                  { label: t('admin.kb.chunks'), value: count(index.chunks) },
                  { label: t('admin.kb.retrieval'), value: `${index.semantic ? t('admin.kb.semantic') : t('admin.kb.keyword')} · ${index.embedder}` },
                ]} />
                {index.missing.length ? <p className="sk-gov-unavailable">{index.missing.length === 1 ? t('admin.kb.missingOne') : t('admin.kb.missingOther', { count: count(index.missing.length) })}</p> : null}
                {vm.reindexError ? <p className="sk-gov-error" role="alert"><Icon name="alert-triangle" size={16} />{vm.reindexError}</p> : null}
                <SkButton variant="secondary" busy={vm.reindexing} onClick={() => void rebuild()}><Icon name="refresh" size={15} />{vm.reindexing ? t('admin.kb.rebuilding') : t('admin.kb.rebuild')}</SkButton>
              </> : null}
        </GovCard>
        <GovCard title={t('admin.kb.test')}>
          <p className="sk-gov-text">{t('admin.kb.testBody')}</p>
          <div className="sk-gov-search">
            <input type="search" disabled aria-label={t('gov.kb.testLabel')} aria-describedby="sk-gov-kb-test" placeholder={t('gov.kb.testPlaceholder')} />
            <SkButton disabled>{t('gov.kb.search')}</SkButton>
          </div>
          <Unavailable><span id="sk-gov-kb-test">{t('admin.kb.testEmptyBody')}</span></Unavailable>
        </GovCard>
      </div>
    </div>
    {adding && <PublishSourceDialog onClose={() => setAdding(false)} onPublished={() => { setAdding(false); vm.published(); setToast(t('gov.kb.published')); }} />}
    <BoardToast message={toast} onDone={() => setToast(null)} />
  </div>;
});
