import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

// No Care Circle membership API exists yet, so there are no members to show.
// Never seed this list with placeholder people.
export function FamilyCareCircleScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">FAMILY HEALTH NETWORK</span>
          <h2>Family Care Circle Manager</h2>
          <p>Manage family members enrolled under StudentKare Care Circle for joint health consultations and emergency access.</p>
        </div>
      </div>

      <EmptyState title="No family members yet." description="Care Circle enrolment isn’t available yet. No one has been added and nothing has been shared." />
    </div>
  );
}
