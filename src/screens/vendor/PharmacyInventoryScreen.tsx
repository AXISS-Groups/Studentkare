import React, { useState } from 'react';
import '../../theme/workflows.css';

interface StockItem {
  id: string;
  name: string;
  brand: string;
  scheduleClass: string;
  stockQty: number;
  reorderLevel: number;
  expiryDate: string;
}

export function PharmacyInventoryScreen() {
  const [items] = useState<StockItem[]>([
    { id: 'sk-1', name: 'Paracetamol 650mg', brand: 'Dolo 650', scheduleClass: 'OTC', stockQty: 450, reorderLevel: 100, expiryDate: '2028-04-30' },
    { id: 'sk-2', name: 'Amoxicillin 500mg', brand: 'Mox 500', scheduleClass: 'Schedule H', stockQty: 24, reorderLevel: 50, expiryDate: '2027-11-30' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">MEDICATION STOCK MANAGEMENT</span>
          <h2>Pharmacy Inventory & Stock Alerts</h2>
          <p>Track Schedule H register balances, low stock alerts, and expiring batch numbers.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.name}</strong> ({item.brand})
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Schedule: <strong>{item.scheduleClass}</strong> · Expiry: {item.expiryDate}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: item.stockQty <= item.reorderLevel ? 'var(--emergency, #ef4444)' : '#10b981' }}>
                {item.stockQty} Units
              </span>
              <small style={{ display: 'block', color: 'var(--text-secondary)' }}>Reorder at {item.reorderLevel}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
