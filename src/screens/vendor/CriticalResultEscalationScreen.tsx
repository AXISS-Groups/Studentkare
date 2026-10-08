import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function CriticalResultEscalationScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>CRITICAL VALUE PROTOCOL</span>
          <h2>Critical Lab Result Escalation Desk</h2>
          <p>Immediate clinician phone call triggers for panic diagnostic values.</p>
        </div>
      </div>

      <EmptyState title="Critical results aren’t listed on this desk yet." description="This desk is not connected to lab results, so an empty list here does not mean there are none. Critical values flagged on real lab orders are shown on the Lab Sample & Report queue — check there." />
    </div>
  );
}
