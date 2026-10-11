import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminCard, AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage, AdminTile } from '@/screens/workspace/admin/AdminPage';
import { aiGovernanceRepository } from '../model/aiGovernanceRepository';
import { count, percent } from '../model/format';
import { AiGovernanceViewModel } from '../viewmodels/AiGovernanceViewModel';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** Where an Agent Ayush turn ended; an outcome not listed keeps the label the view model gives it. */
const OUTCOME_LABEL: Record<string, MessageKey> = {
  ANSWERED: 'admin.outcome.ANSWERED',
  NO_SOURCE: 'admin.outcome.NO_SOURCE',
  REFUSED_SCOPE: 'admin.outcome.REFUSED_SCOPE',
  REFUSED_PERSONAL: 'admin.outcome.REFUSED_PERSONAL',
  REFUSED_OUTPUT: 'admin.outcome.REFUSED_OUTPUT',
  CRISIS: 'admin.outcome.CRISIS',
};

export const AiGovernanceView = observer(function AiGovernanceView() {
  const t = useT();
  const [vm] = useState(() => new AiGovernanceViewModel(aiGovernanceRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const data = vm.quality;
  return <AdminPage eyebrow={t('admin.eyebrow.governance')} title={t('admin.ai.title')} description={t('admin.ai.description')}>
    <section className="sk-admin-section" aria-labelledby="sk-admin-ai-usage">
      <h3 id="sk-admin-ai-usage" className="sk-admin-eyebrow">{t('admin.ai.usage')}</h3>
      {vm.loading ? <div className="sk-admin-card"><AdminLoading label={t('admin.ai.loading')} /></div>
        : vm.error ? <AdminError title={t('admin.ai.error')} message={vm.error} onRetry={vm.reload} />
          : vm.isEmpty || !data ? <div className="sk-admin-card"><AdminEmpty title={t('admin.ai.empty')} description={t('admin.ai.emptyBody')} /></div>
            : <>
              <div className="sk-admin-tiles">
                <AdminTile label={t('admin.ai.turns')} value={count(data.turns)} meta={t('admin.ai.turnsMeta')} />
                <AdminTile label={t('admin.ai.grounded')} value={percent(data.groundedRate)} meta={t('admin.ai.groundedMeta')} />
                <AdminTile label={t('admin.ai.answerRate')} value={percent(data.answerRate)} meta={t('admin.ai.answerRateMeta')} />
                <AdminTile label={t('admin.ai.latency')} value={`${count(Math.round(data.avgLatencyMs))} ms`} meta={t('admin.ai.latencyMeta')} />
              </div>
              <AdminCard title={t('admin.ai.outcomes')} labelledBy="sk-admin-ai-outcomes">
                <ul className="sk-admin-list">{vm.outcomes.map(({ outcome, label, count: value }) => <li key={outcome}><span>{OUTCOME_LABEL[outcome] ? t(OUTCOME_LABEL[outcome]) : label}</span><strong>{count(value)}</strong></li>)}</ul>
              </AdminCard>
            </>}
    </section>
    <div className="sk-admin-sections">
      <AdminEmptySection title={t('admin.ai.policies')} description={t('admin.ai.policiesBody')} emptyTitle={t('admin.ai.policiesEmpty')} emptyDescription={t('admin.ai.policiesEmptyBody')} />
      <AdminEmptySection title={t('admin.ai.models')} description={t('admin.ai.modelsBody')} emptyTitle={t('admin.ai.modelsEmpty')} emptyDescription={t('admin.ai.modelsEmptyBody')} />
      <AdminEmptySection title={t('admin.ai.approvals')} description={t('admin.ai.approvalsBody')} emptyTitle={t('admin.ai.approvalsEmpty')} emptyDescription={t('admin.ai.approvalsEmptyBody')} />
    </div>
  </AdminPage>;
});
