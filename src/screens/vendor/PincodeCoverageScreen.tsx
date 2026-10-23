import React from 'react';
import { ProviderDirectoryPanel } from '../workspace/FulfilmentQueuePanel';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

/**
 * Serviceable-zone configuration has no backend endpoint yet, so no zones are
 * listed or "activated" from here. The provider lookup below is live.
 */
export function PincodeCoverageScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">SERVICEABLE ZONES</span>
          <h2>Vendor Pincode Delivery Coverage Map</h2>
          <p>Configure serviceable pincodes, delivery SLA promises, and home sample collection zones.</p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <EmptyState title="No serviceable pincodes configured yet." description="Editing delivery zones isn’t available yet. Use the lookup below to see which published providers serve a pincode." />
      </div>

      <ProviderDirectoryPanel kind="PHARMACY" />
    </div>
  );
}
