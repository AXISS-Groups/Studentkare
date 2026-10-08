import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function VendorSettlementsScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">FINANCIAL RECONCILIATION</span>
          <h2>Vendor Invoice & Payout Settlement Ledger</h2>
          <p>Weekly financial settlement statements, transaction breakdown, and GST tax invoices.</p>
        </div>
      </div>

      <EmptyState title="No settlements yet." description="Settlement statements and payouts will appear here once they are issued." />
    </div>
  );
}
