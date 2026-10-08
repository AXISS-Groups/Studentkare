import React from 'react';
import { PharmacyQueuePanel } from '../workspace/FulfilmentQueuePanel';
import '../../theme/workflows.css';

/**
 * Dispensing desk. The queue below is the live `/dispenses` work queue.
 * Student handover-OTP verification has no backend yet, so it is not offered:
 * a check that cannot run must not show "verified" (fail closed).
 */
export function PharmacyDispensingScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">PHARMACY FULFILMENT WORKSPACE</span>
          <h2>Prescription Dispensing Desk</h2>
          <p>Verify clinician licenses, dispense medications securely, and log student OTP delivery proofs.</p>
        </div>
      </div>

      <p className="wf-fineprint" role="status" style={{ marginBottom: 24 }}>
        Student handover OTP verification isn’t available yet. Nothing is recorded as handed over from this screen.
      </p>

      {/* Main Dispensing Queue Panel */}
      <PharmacyQueuePanel />
    </div>
  );
}
