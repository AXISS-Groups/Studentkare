import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function PharmacyInventoryScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">MEDICATION STOCK MANAGEMENT</span>
          <h2>Pharmacy Inventory & Stock Alerts</h2>
          <p>Track Schedule H register balances, low stock alerts, and expiring batch numbers.</p>
        </div>
      </div>

      <EmptyState title="No stock records yet." description="Stock levels, reorder alerts and expiry dates will appear here once your inventory is connected." />
    </div>
  );
}
