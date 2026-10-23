import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function AutomatedReorderRulesScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">AUTOMATED INVENTORY REPLACEMENT</span>
          <h2>Automated Stock Reorder Rules</h2>
          <p>Configure automatic PO generation when medicine stock hits safety reorder thresholds.</p>
        </div>
      </div>

      <EmptyState title="No reorder rules yet." description="Automatic reordering isn’t connected yet. No purchase orders are generated from this screen." />
    </div>
  );
}
