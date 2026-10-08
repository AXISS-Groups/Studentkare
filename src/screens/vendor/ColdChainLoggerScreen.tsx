import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function ColdChainLoggerScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">IOT REFRIGERATION MONITORING</span>
          <h2>Cold-Chain Temperature Logger</h2>
          <p>Real-time continuous temperature telemetry for vaccine refrigerators and diagnostic sample transport boxes.</p>
        </div>
      </div>

      <EmptyState title="No temperature sensors connected yet." description="Readings will appear here once a refrigerator or transport-box sensor is connected. No temperatures are shown until then." />
    </div>
  );
}
