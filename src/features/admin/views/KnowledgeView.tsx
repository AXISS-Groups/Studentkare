import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Plus, RefreshCw } from 'lucide-react';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { knowledgeRepository } from '../model/knowledgeRepository';
import { count, readable } from '../model/format';
import { KnowledgeViewModel } from '../viewmodels/KnowledgeViewModel';
import { PublishSourceDialog } from './PublishSourceDialog';

/**
 * Knowledge base, following its design (AdminKnowledge) on the data and actions the
 * backend already has. Design parts with no endpoint behind them (Retire/Sign off/
 * Restore, retrieval preview) are not wired as working controls.
 */
export const KnowledgeView = observer(function KnowledgeView() {
  const [vm] = useState(() => new KnowledgeViewModel(knowledgeRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Whether the publish dialog is open is presentation state.
  const [adding, setAdding] = useState(false);
  const { index, list, indexTone } = vm;

  return <AdminPage eyebrow="Content & AI" title="Knowledge base" description="What Ayush is allowed to explain from. Every source is cited and versioned."
    status={index && indexTone ? <AdminStatus tone={indexTone}>{count(index.chunks)} chunks indexed</AdminStatus> : undefined}>
    <div className="sk-admin-split">
      <section className="sk-admin-card" aria-labelledby="sk-admin-kb-sources">
        <div className="sk-admin-card-heading">
          <div><h3 id="sk-admin-kb-sources" className="sk-admin-card-title">Sources Ayush may quote</h3><p className="sk-admin-section-description">Only reviewed, non-expired sources are searchable.</p></div>
          <button type="button" className="sk-admin-button" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Add source</button>
        </div>
        {vm.sourcesLoading ? <AdminLoading label="Loading sources…" />
          : vm.sourcesError ? <AdminError title="Couldn’t load sources" message={vm.sourcesError} onRetry={vm.reloadSources} />
            : !list.length ? <AdminEmpty title="No sources yet." description="Add a source so Ayush can answer from it with a citation." />
              : <ul className="sk-admin-sources">{vm.sourceRows().map(({ source, state }) => {
                return <li key={source.id}>
                  <div><strong>{source.title}</strong><span>{readable(source.category)} · v{source.version}</span></div>
                  <span>{source.author ? `By ${source.author}` : 'Author not recorded'}</span>
                  <span className={`sk-admin-tag ${state.tone}`}>{state.label}</span>
                </li>;
              })}</ul>}
      </section>

      <div className="sk-admin-stack">
        <section className="sk-admin-card" aria-labelledby="sk-admin-kb-index">
          <h3 id="sk-admin-kb-index" className="sk-admin-eyebrow">Search index</h3>
          {vm.indexLoading ? <AdminLoading label="Checking the index…" />
            : vm.indexError ? <AdminError title="Couldn’t check the index" message={vm.indexError} onRetry={vm.reloadIndex} />
              : index && <>
                <ul className="sk-admin-list">
                  <li><span>Approved sources indexed</span><strong>{count(index.indexedSources)} of {count(index.approvedSources)}</strong></li>
                  <li><span>Chunks</span><strong>{count(index.chunks)}</strong></li>
                  <li><span>Retrieval</span><strong>{index.semantic ? 'Semantic' : 'Keyword'} · {index.embedder}</strong></li>
                </ul>
                {index.missing.length > 0 && <p className="sk-admin-note">{count(index.missing.length)} approved {index.missing.length === 1 ? 'source is' : 'sources are'} not in the index yet, so Ayush can’t cite {index.missing.length === 1 ? 'it' : 'them'} until the index is rebuilt.</p>}
                {vm.reindexError && <p className="sk-admin-form-error" role="alert">{vm.reindexError}</p>}
                <button type="button" className="sk-admin-button" disabled={vm.reindexing} onClick={() => void vm.reindex()}><RefreshCw size={15} aria-hidden="true" />{vm.reindexing ? 'Rebuilding…' : 'Rebuild index'}</button>
              </>}
        </section>
        <AdminEmptySection title="Test a question" description="See what Ayush would retrieve before students do." emptyTitle="No retrieval preview." emptyDescription="A preview of retrieved passages will appear here once a preview endpoint is connected. Asking Ayush directly would record a real turn, so it isn’t used here." />
      </div>
    </div>
    {adding && <PublishSourceDialog onClose={() => setAdding(false)} onPublished={() => { setAdding(false); vm.published(); }} />}
  </AdminPage>;
});
