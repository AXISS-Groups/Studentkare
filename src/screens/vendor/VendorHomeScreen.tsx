import React, { useState } from 'react';
import { Pill, FlaskConical, ToggleLeft, ToggleRight } from 'lucide-react';
import { VendorPartnerDashboardScreen } from './VendorPartnerDashboardScreen';
import { PharmacyQueuePanel, LabQueuePanel } from '../workspace/FulfilmentQueuePanel';
import '../../theme/workflows.css';

interface VendorHomeScreenProps {
  _onNavigate?: (route: string) => void;
  onLogout?: () => void;
  onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void;
}

export function VendorHomeScreen({ _onNavigate, onLogout, onSwitchRole }: VendorHomeScreenProps) {
  const [vendorKind, setVendorKind] = useState<'PHARMACY' | 'LAB' | 'CLINIC'>('PHARMACY');
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [showFullConsole] = useState(false);

  if (showFullConsole && onLogout && onSwitchRole) {
    return <VendorPartnerDashboardScreen onLogout={onLogout} onSwitchRole={onSwitchRole} />;
  }

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">FULFILMENT & PARTNER CONSOLE</span>
          <h2>Campus Health Vendor Dashboard</h2>
          <p>Fulfill student prescriptions, manage lab sample collections, and track ABDM delivery records.</p>
        </div>

        {/* Vendor Type Switcher & Online Status */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface-card, #fff)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
            <button 
              className={`health-button ${vendorKind === 'PHARMACY' ? 'health-button-primary' : ''}`}
              style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
              onClick={() => setVendorKind('PHARMACY')}
            >
              <Pill size={14} /> Pharmacy
            </button>
            <button 
              className={`health-button ${vendorKind === 'LAB' ? 'health-button-primary' : ''}`}
              style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
              onClick={() => setVendorKind('LAB')}
            >
              <FlaskConical size={14} /> Diagnostics Lab
            </button>
          </div>

          <button 
            onClick={() => setIsAcceptingOrders(!isAcceptingOrders)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${isAcceptingOrders ? '#10b981' : '#ef4444'}`,
              background: isAcceptingOrders ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isAcceptingOrders ? '#065f46' : '#991b1b',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {isAcceptingOrders ? <ToggleRight size={20} color="#10b981" /> : <ToggleLeft size={20} color="#ef4444" />}
            {isAcceptingOrders ? 'Store Active (Accepting Orders)' : 'Store Paused'}
          </button>
        </div>
      </div>

      {/* Real Queue Panel */}
      <div style={{ marginTop: 16 }}>
        {vendorKind === 'PHARMACY' ? <PharmacyQueuePanel /> : <LabQueuePanel />}
      </div>
    </div>
  );
}
