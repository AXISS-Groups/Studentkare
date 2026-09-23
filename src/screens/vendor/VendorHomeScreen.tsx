import React, { useState } from 'react';
import { Store, Pill, FlaskConical, CheckCircle2, Clock, PackageCheck, AlertCircle, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import { VendorPartnerDashboardScreen } from './VendorPartnerDashboardScreen';
import '../../theme/workflows.css';

interface VendorHomeScreenProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
  onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void;
}

export function VendorHomeScreen({ onNavigate, onLogout, onSwitchRole }: VendorHomeScreenProps) {
  const [vendorKind, setVendorKind] = useState<'PHARMACY' | 'LAB' | 'CLINIC'>('PHARMACY');
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [showFullConsole, setShowFullConsole] = useState(false);

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

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">PENDING QUEUE</span>
          <h3 style={{ fontSize: 28, margin: '8px 0 4px', color: 'var(--accent, #2563eb)' }}>12 Orders</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {vendorKind === 'PHARMACY' ? '8 Rx verification, 4 packing' : '5 Sample pickups, 7 pending reports'}
          </p>
        </div>

        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">FULFILLED TODAY</span>
          <h3 style={{ fontSize: 28, margin: '8px 0 4px', color: '#10b981' }}>48 Items</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>100% SLA compliance (Avg 18 min)</p>
        </div>

        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">CRITICAL / ALERTS</span>
          <h3 style={{ fontSize: 28, margin: '8px 0 4px', color: 'var(--emergency, #ef4444)' }}>1 Item</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {vendorKind === 'PHARMACY' ? '1 Substitution approval pending' : '1 Critical lab result flagged'}
          </p>
        </div>

        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">CAMPUS RATING</span>
          <h3 style={{ fontSize: 28, margin: '8px 0 4px' }}>4.9 ★</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Based on 142 student reviews</p>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="care-eyebrow">{vendorKind === 'PHARMACY' ? 'PHARMACY DISPENSING' : 'LAB SAMPLE MANAGEMENT'}</span>
            <h3 style={{ fontSize: 18, marginTop: 4 }}>
              {vendorKind === 'PHARMACY' ? 'Dispense Prescriptions & Verify OTP' : 'Sample Tracking & PDF Report Release'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
              {vendorKind === 'PHARMACY'
                ? 'Process digital prescriptions issued by campus doctors, verify student delivery OTP, and propose generic substitutions.'
                : 'Log sample collection barcodes, enter diagnostic test values, trigger critical result alerts, and release PDF reports to student vault.'}
            </p>
          </div>
          <button 
            className="health-button health-button-primary"
            style={{ minHeight: 44, width: 'fit-content' }}
            onClick={() => onNavigate?.(vendorKind === 'PHARMACY' ? '/vendor/pharmacy-dispensing' : '/vendor/lab-reports')}
          >
            Open {vendorKind === 'PHARMACY' ? 'Pharmacy Dispense Queue' : 'Lab Diagnostic Queue'} <ArrowRight size={16} />
          </button>
        </div>

        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="care-eyebrow">PARTNER CONSOLE</span>
            <h3 style={{ fontSize: 18, marginTop: 4 }}>Full Inventory & Logistics Console</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
              View overall partner metrics, stock levels, delivery fleet tracking, and financial settlement statements.
            </p>
          </div>
          <button 
            className="health-button"
            style={{ minHeight: 44, width: 'fit-content' }}
            onClick={() => setShowFullConsole(true)}
          >
            Launch Full Partner Console <Store size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
