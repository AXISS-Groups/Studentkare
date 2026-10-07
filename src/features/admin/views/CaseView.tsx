import React from 'react';
import { navigate } from '@/lib/workflowRouting';
import { AdminEmpty, AdminEmptySection, AdminPage } from '@/screens/workspace/admin/AdminPage';

// Check-in audit → Case (“This wasn’t me”). Check-ins have no data source, so there is
// no case to open. The case screen keeps the design's sections; calling the student and
// closing the case need a backend and hold a phone number and a counter photo, so
// neither is here.
export function CaseView() {
  return <AdminPage eyebrow="Check-in audit" title="Case" description="A “This wasn’t me” report from a check-in: its timeline, the evidence, and the outcome.">
    <button type="button" className="sk-admin-back" onClick={() => navigate('admin/checkins')}>← Check-in audit</button>
    <div className="sk-admin-card"><AdminEmpty title="No case selected." description="Open a “This wasn’t me” report from Check-in audit to review it here. Reports will appear there once check-in data is connected." /></div>
    <div className="sk-admin-sections">
      <AdminEmptySection title="Timeline" description="Each step from the pass scan to the student’s report." emptyTitle="No timeline." emptyDescription="The case’s events will be listed here." />
      <AdminEmptySection title="Evidence" description="The photo on file and the counter photo, held only while the case is open." emptyTitle="No evidence." emptyDescription="Evidence will appear here for an open case." />
      <AdminEmptySection title="Outcome" description="What happened, and what the student is told." emptyTitle="No outcome recorded." emptyDescription="The outcome will be recorded here once case handling is connected." />
    </div>
  </AdminPage>;
}
