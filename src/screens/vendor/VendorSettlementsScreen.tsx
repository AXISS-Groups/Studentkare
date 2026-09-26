import React, { useState } from 'react';
import { CreditCard, FileText, CheckCircle2, Download } from 'lucide-react';
import '../../theme/workflows.css';

interface Settlement {
  id: string;
  period: string;
  grossAmount: string;
  commission: string;
  netPayout: string;
  status: 'SETTLED' | 'PROCESSING';
  payoutDate: string;
}

export function VendorSettlementsScreen() {
  const [settlements] = useState<Settlement[]>([
    { id: 'set-1', period: '15 Sep - 21 Sep 2026', grossAmount: '₹ 48,500', commission: '₹ 2,425 (5%)', netPayout: '₹ 46,075', status: 'SETTLED', payoutDate: '2026-09-22' },
    { id: 'set-2', period: '08 Sep - 14 Sep 2026', grossAmount: '₹ 62,100', commission: '₹ 3,105 (5%)', netPayout: '₹ 58,995', status: 'SETTLED', payoutDate: '2026-09-15' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">FINANCIAL RECONCILIATION</span>
          <h2>Vendor Invoice & Payout Settlement Ledger</h2>
          <p>Weekly financial settlement statements, transaction breakdown, and GST tax invoices.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {settlements.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>Period: {item.period}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Gross: <strong>{item.grossAmount}</strong> · Platform Fee: {item.commission}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>Net Payout: {item.netPayout}</span>
              <small style={{ display: 'block', color: 'var(--text-secondary)' }}>Paid on {item.payoutDate}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
