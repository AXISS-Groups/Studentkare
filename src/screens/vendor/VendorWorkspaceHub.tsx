import React, { useState } from 'react';
import { AlertCircle, Calendar, DollarSign, FileCheck, FlaskConical, MapPin, Package, RefreshCw, Store, Thermometer, Truck, Zap } from 'lucide-react';
import { VendorHomeScreen } from './VendorHomeScreen';
import { PharmacyDispensingScreen } from './PharmacyDispensingScreen';
import { PharmacyInventoryScreen } from './PharmacyInventoryScreen';
import { LabSampleToReportScreen } from './LabSampleToReportScreen';
import { HomeSamplePickupScreen } from './HomeSamplePickupScreen';
import { CriticalResultEscalationScreen } from './CriticalResultEscalationScreen';
import { GenericSubstitutionScreen } from './GenericSubstitutionScreen';
import { BulkHealthCampIntakeScreen } from './BulkHealthCampIntakeScreen';
import { ColdChainLoggerScreen } from './ColdChainLoggerScreen';
import { PincodeCoverageScreen } from './PincodeCoverageScreen';
import { AutomatedReorderRulesScreen } from './AutomatedReorderRulesScreen';
import { VendorSettlementsScreen } from './VendorSettlementsScreen';
import '../../theme/workflows.css';

type VendorTab =
  | 'home'
  | 'dispensing'
  | 'inventory'
  | 'lab-reports'
  | 'sample-pickup'
  | 'critical-results'
  | 'generic-sub'
  | 'camp-intake'
  | 'cold-chain'
  | 'pincode-coverage'
  | 'auto-reorder'
  | 'settlements';

export function VendorWorkspaceHub() {
  const [activeTab, setActiveTab] = useState<VendorTab>('home');

  const tabs: { id: VendorTab; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Vendor Overview', icon: Store },
    { id: 'dispensing', label: 'Pharmacy Dispensing', icon: Package },
    { id: 'inventory', label: 'Inventory Desk', icon: FileCheck },
    { id: 'lab-reports', label: 'Lab Sample & Report', icon: FlaskConical },
    { id: 'sample-pickup', label: 'Home Pickup', icon: Truck },
    { id: 'critical-results', label: 'Critical Escalations', icon: AlertCircle },
    { id: 'generic-sub', label: 'Generic Substitutions', icon: Zap },
    { id: 'camp-intake', label: 'Camp Intake', icon: Calendar },
    { id: 'cold-chain', label: 'Cold Chain Logger', icon: Thermometer },
    { id: 'pincode-coverage', label: 'Pincode Coverage', icon: MapPin },
    { id: 'auto-reorder', label: 'Auto Reorder Rules', icon: RefreshCw },
    { id: 'settlements', label: 'Settlements', icon: DollarSign },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <VendorHomeScreen onNavigate={(view) => setActiveTab(view as VendorTab)} />;
      case 'dispensing':
        return <PharmacyDispensingScreen />;
      case 'inventory':
        return <PharmacyInventoryScreen />;
      case 'lab-reports':
        return <LabSampleToReportScreen />;
      case 'sample-pickup':
        return <HomeSamplePickupScreen />;
      case 'critical-results':
        return <CriticalResultEscalationScreen />;
      case 'generic-sub':
        return <GenericSubstitutionScreen />;
      case 'camp-intake':
        return <BulkHealthCampIntakeScreen />;
      case 'cold-chain':
        return <ColdChainLoggerScreen />;
      case 'pincode-coverage':
        return <PincodeCoverageScreen />;
      case 'auto-reorder':
        return <AutomatedReorderRulesScreen />;
      case 'settlements':
        return <VendorSettlementsScreen />;
      default:
        return <VendorHomeScreen onNavigate={(view) => setActiveTab(view as VendorTab)} />;
    }
  };

  return (
    <div className="wf-vendor-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">PARTNER & VENDOR FULFILMENT DESK</span>
          <h2>Pharmacy, Lab & Diagnostic Fulfilment.</h2>
          <p>Process orders, dispatch home sample collection, manage cold chain logs, and track settlements.</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label="Vendor workspace tabs"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
          borderBottom: '1px solid #e7d8ef',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => setActiveTab(tab.id)}
              className={`health-button ${isActive ? 'health-button-primary' : ''}`}
              style={{
                minHeight: 44,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <main className="wf-tab-content">{renderTabContent()}</main>
    </div>
  );
}
