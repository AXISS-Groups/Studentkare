import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function BulkHealthCampIntakeScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">MASS SCREENING INTAKE</span>
          <h2>Bulk Health Camp Sample Intake</h2>
          <p>High-throughput barcode scanning and batch accessioning for campus health camp drives.</p>
        </div>
      </div>

      <EmptyState title="No camp intake sessions yet." description="Batch sample accessioning for health camps isn’t connected yet. No samples are recorded from this screen." />
    </div>
  );
}
