import React, { useState } from 'react';
import '../../theme/workflows.css';

export function AutomatedReorderRulesScreen() {
  const [rules] = useState([
    { id: 'r-1', itemCategory: 'Paracetamol 650mg Tablets', minThreshold: 100, autoOrderQty: 500, supplier: 'Micro Labs Ltd. Direct' },
    { id: 'r-2', itemCategory: 'Dengue NS1 Antigen Test Strips', minThreshold: 20, autoOrderQty: 100, supplier: 'Meril Diagnostics' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">AUTOMATED INVENTORY REPLACEMENT</span>
          <h2>Automated Stock Reorder Rules</h2>
          <p>Configure automatic PO generation when medicine stock hits safety reorder thresholds.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rules.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.itemCategory}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Reorder Threshold: <strong>{item.minThreshold} units</strong> · Preferred Supplier: <strong>{item.supplier}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent, #2563eb)' }}>Auto PO: +{item.autoOrderQty} Units</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
