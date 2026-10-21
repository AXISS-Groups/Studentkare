import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleErrorState, ConsoleLoadingState, ConsolePageHeader, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { knowledgeRepository } from '../model/knowledgeRepository';
import { count, readable } from '../model/format';
import { KnowledgeViewModel } from '../viewmodels/KnowledgeViewModel';
import { BoardToast, boardError } from './AdminBoard';
import { GovCard, GovLines, GovPill, Unavailable } from './GovBoard';
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
        <GovCard title={t('admin.kb.index')}>
          {vm.indexLoading ? <p className="sk-gov-fine" role="status">{t('admin.kb.indexLoading')}</p>
            : vm.indexError ? <p className="sk-gov-error" role="alert"><Icon name="alert-triangle" size={16} />{t('admin.kb.indexError')}</p>
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
