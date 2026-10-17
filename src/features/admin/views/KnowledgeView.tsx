import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Plus, RefreshCw } from 'lucide-react';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { knowledgeRepository } from '../model/knowledgeRepository';
import { count, readable } from '../model/format';
import { KnowledgeViewModel } from '../viewmodels/KnowledgeViewModel';
import { PublishSourceDialog } from './PublishSourceDialog';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** Words for the source states sourceState() returns; anything else is shown as given. */
const SOURCE_STATE_LABEL: Record<string, MessageKey> = {
  'Expired · hidden': 'admin.kb.stateExpired',
  'Awaiting review': 'admin.kb.stateAwaiting',
  'Not indexed': 'admin.kb.stateNotIndexed',
  Live: 'admin.kb.stateLive',
};

/**
 * Knowledge base, following its design (AdminKnowledge) on the data and actions the
 * backend already has. Design parts with no endpoint behind them (Retire/Sign off/
 * Restore, retrieval preview) are not wired as working controls.
 */
export const KnowledgeView = observer(function KnowledgeView() {
  const t = useT();
  const [vm] = useState(() => new KnowledgeViewModel(knowledgeRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Whether the publish dialog is open is presentation state.
  const [adding, setAdding] = useState(false);
  const { index, list, indexTone } = vm;

  return <AdminPage eyebrow={t('admin.eyebrow.contentAi')} title={t('admin.kb.title')} description={t('admin.kb.description')}
    status={index && indexTone ? <AdminStatus tone={indexTone}>{t('admin.kb.chunksIndexed', { count: count(index.chunks) })}</AdminStatus> : undefined}>
    <div className="sk-admin-split">
      <section className="sk-admin-card" aria-labelledby="sk-admin-kb-sources">
        <div className="sk-admin-card-heading">
          <div><h3 id="sk-admin-kb-sources" className="sk-admin-card-title">{t('admin.kb.sources')}</h3><p className="sk-admin-section-description">{t('admin.kb.sourcesBody')}</p></div>
          <button type="button" className="sk-admin-button" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />{t('admin.kb.add')}</button>
        </div>
        {vm.sourcesLoading ? <AdminLoading label={t('admin.kb.loading')} />
          : vm.sourcesError ? <AdminError title={t('admin.kb.error')} message={vm.sourcesError} onRetry={vm.reloadSources} />
            : !list.length ? <AdminEmpty title={t('admin.kb.empty')} description={t('admin.kb.emptyBody')} />
              : <ul className="sk-admin-sources">{vm.sourceRows().map(({ source, state }) => {
                return <li key={source.id}>
                  <div><strong>{source.title}</strong><span>{readable(source.category)} · v{source.version}</span></div>
                  <span>{source.author ? t('admin.kb.by', { author: source.author }) : t('admin.kb.noAuthor')}</span>
                  <span className={`sk-admin-tag ${state.tone}`}>{SOURCE_STATE_LABEL[state.label] ? t(SOURCE_STATE_LABEL[state.label]) : state.label}</span>
                </li>;
              })}</ul>}
      </section>

      <div className="sk-admin-stack">
        <section className="sk-admin-card" aria-labelledby="sk-admin-kb-index">
          <h3 id="sk-admin-kb-index" className="sk-admin-eyebrow">{t('admin.kb.index')}</h3>
          {vm.indexLoading ? <AdminLoading label={t('admin.kb.indexLoading')} />
            : vm.indexError ? <AdminError title={t('admin.kb.indexError')} message={vm.indexError} onRetry={vm.reloadIndex} />
              : index && <>
                <ul className="sk-admin-list">
                  <li><span>{t('admin.kb.indexed')}</span><strong>{t('admin.kb.xOfY', { x: count(index.indexedSources), y: count(index.approvedSources) })}</strong></li>
                  <li><span>{t('admin.kb.chunks')}</span><strong>{count(index.chunks)}</strong></li>
                  <li><span>{t('admin.kb.retrieval')}</span><strong>{index.semantic ? t('admin.kb.semantic') : t('admin.kb.keyword')} · {index.embedder}</strong></li>
                </ul>
                {index.missing.length > 0 && <p className="sk-admin-note">{index.missing.length === 1 ? t('admin.kb.missingOne') : t('admin.kb.missingOther', { count: count(index.missing.length) })}</p>}
                {vm.reindexError && <p className="sk-admin-form-error" role="alert">{vm.reindexError}</p>}
                <button type="button" className="sk-admin-button" disabled={vm.reindexing} onClick={() => void vm.reindex()}><RefreshCw size={15} aria-hidden="true" />{vm.reindexing ? t('admin.kb.rebuilding') : t('admin.kb.rebuild')}</button>
              </>}
        </section>
        <AdminEmptySection title={t('admin.kb.test')} description={t('admin.kb.testBody')} emptyTitle={t('admin.kb.testEmpty')} emptyDescription={t('admin.kb.testEmptyBody')} />
      </div>
    </div>
    {adding && <PublishSourceDialog onClose={() => setAdding(false)} onPublished={() => { setAdding(false); vm.published(); }} />}
  </AdminPage>;
});
