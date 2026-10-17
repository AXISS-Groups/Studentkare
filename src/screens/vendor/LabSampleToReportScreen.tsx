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
      {/* The panel carries its own translated heading. Labs file reports; a doctor releases them. */}
      <LabQueuePanel />
    </div>
  );
}
