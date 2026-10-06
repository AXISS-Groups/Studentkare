import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminCard, AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage, AdminTile } from '@/screens/workspace/admin/AdminPage';
import { aiGovernanceRepository } from '../model/aiGovernanceRepository';
import { count, percent } from '../model/format';
import { AiGovernanceViewModel } from '../viewmodels/AiGovernanceViewModel';

export const AiGovernanceView = observer(function AiGovernanceView() {
  const [vm] = useState(() => new AiGovernanceViewModel(aiGovernanceRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const data = vm.quality;
  return <AdminPage eyebrow="Governance" title="AI governance" description="Review how the AI agents behave, and the policies, models and approvals that govern them.">
    <section className="sk-admin-section" aria-labelledby="sk-admin-ai-usage">
      <h3 id="sk-admin-ai-usage" className="sk-admin-eyebrow">Usage · Agent Ayush</h3>
      {vm.loading ? <div className="sk-admin-card"><AdminLoading label="Loading Agent Ayush usage…" /></div>
        : vm.error ? <AdminError title="Couldn’t load AI usage" message={vm.error} onRetry={vm.reload} />
          : vm.isEmpty || !data ? <div className="sk-admin-card"><AdminEmpty title="No AI usage recorded yet." description="Agent Ayush has no recorded turns, so there is nothing to measure." /></div>
            : <>
              <div className="sk-admin-tiles">
                <AdminTile label="Recorded turns" value={count(data.turns)} meta="Most recent, up to 500" />
                <AdminTile label="Grounded rate" value={percent(data.groundedRate)} meta="Answers that carried a citation" />
                <AdminTile label="Answer rate" value={percent(data.answerRate)} meta="Turns that ended in an answer" />
                <AdminTile label="Average latency" value={`${count(Math.round(data.avgLatencyMs))} ms`} meta="Across recorded turns" />
              </div>
              <AdminCard title="Where the pipeline stops" labelledBy="sk-admin-ai-outcomes">
                <ul className="sk-admin-list">{vm.outcomes.map(({ outcome, label, count: value }) => <li key={outcome}><span>{label}</span><strong>{count(value)}</strong></li>)}</ul>
              </AdminCard>
            </>}
    </section>
    <div className="sk-admin-sections">
      <AdminEmptySection title="Policies" description="The rules each agent must follow, and what it must refuse." emptyTitle="AI governance policies aren’t available yet." emptyDescription="Policies will appear here once a policy source is connected." />
      <AdminEmptySection title="Models" description="The models in use, where they run, and which agent calls them." emptyTitle="No model register connected." emptyDescription="Models will appear here once the model register is connected." />
      <AdminEmptySection title="Approvals" description="Changes to agents, prompts or models waiting for sign-off." emptyTitle="No approvals to review." emptyDescription="Approval requests will appear here once the approval workflow is connected." />
    </div>
  </AdminPage>;
});
