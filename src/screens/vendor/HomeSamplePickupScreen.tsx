import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function HomeSamplePickupScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PHLEBOTOMY LOGISTICS</span>
          <h2>Hostel & Home Sample Pickup Dispatch</h2>
          <p>Phlebotomist queue for hostel room sample collection, barcode scanning, and cold-chain logging.</p>
        </div>
      </div>

      <EmptyState title="No pickup jobs yet." description="Pickup dispatch isn’t connected yet. Booked lab orders, including collection details, are on the Lab Sample & Report queue." />
    </div>
  );
}
