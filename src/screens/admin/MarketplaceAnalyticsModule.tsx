import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Store, ShieldCheck } from 'lucide-react';
import '../../theme/workflows.css';

export function MarketplaceAnalyticsModule() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">SUPERADMIN FINANCIAL INSIGHTS</span>
          <h2>Marketplace Analytics & Revenue Share Console</h2>
          <p>Track GMV, vendor commission splits (5%), campus revenue distribution, and subscription ARR.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">MONTHLY GMV</span>
          <h3 style={{ fontSize: 26, margin: '6px 0 4px', color: 'var(--accent, #2563eb)' }}>₹ 42.8 Lakhs</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Across 18 campus networks</p>
        </div>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">PLATFORM REVENUE</span>
          <h3 style={{ fontSize: 26, margin: '6px 0 4px', color: '#10b981' }}>₹ 2.14 Lakhs</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>5% net vendor commission</p>
        </div>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">ACTIVE VENDORS</span>
          <h3 style={{ fontSize: 26, margin: '6px 0 4px' }}>42 Partners</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Pharmacies, Labs, Clinics</p>
        </div>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">SUBSCRIPTION MRR</span>
          <h3 style={{ fontSize: 26, margin: '6px 0 4px', color: '#8b5cf6' }}>₹ 14.5 Lakhs</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>₹199 / ₹249 plan recurring</p>
        </div>
      </div>
    </div>
  );
}
