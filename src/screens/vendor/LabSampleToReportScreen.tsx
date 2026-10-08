import React from 'react';
import { LabQueuePanel } from '../workspace/FulfilmentQueuePanel';
import '../../theme/workflows.css';

/**
 * Sample-to-report desk. Sample intake is recorded through the live lab queue
 * below (`/lab-orders/:id`), which captures the sample identifier on the order.
 * There is no separate barcode-intake endpoint, so no stand-alone scanner that
 * claims "Sample Logged" without saving anything is offered.
 */
export function LabSampleToReportScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">DIAGNOSTICS & LAB WORKSPACE</span>
          <h2>Sample-to-Report Diagnostic Desk</h2>
          <p>Track sample chain of custody, log test values, flag critical findings, and publish reports.</p>
        </div>
      </div>

      {/* Main Lab Queue Panel */}
      <LabQueuePanel />
    </div>
  );
}
