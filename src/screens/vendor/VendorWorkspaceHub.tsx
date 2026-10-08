import React, { useState } from 'react';
import { AlertCircle, Calendar, DollarSign, FileCheck, FileText, FlaskConical, LayoutDashboard, MapPin, Package, RefreshCw, Store, Thermometer, Truck, Users, Zap } from 'lucide-react';
import { VendorHomeScreen } from './VendorHomeScreen';
import { VendorHandoverScreen } from './VendorHandoverScreen';
import { VendorSubstitutionScreen } from './VendorSubstitutionScreen';
import { DispenseRegisterScreen } from './DispenseRegisterScreen';
import { PharmacyInventoryScreen } from './PharmacyInventoryScreen';
import { LabQueueScreen } from './LabQueueScreen';
import { HomeSamplePickupScreen } from './HomeSamplePickupScreen';
import { CriticalResultEscalationScreen } from './CriticalResultEscalationScreen';
import { GenericSubstitutionScreen } from './GenericSubstitutionScreen';
import { ColdChainLoggerScreen } from './ColdChainLoggerScreen';
import { PincodeCoverageScreen } from './PincodeCoverageScreen';
import { VendorReorderScreen } from './VendorReorderScreen';
import { VendorCampIntakeScreen } from './VendorCampIntakeScreen';
import { VendorConsoleScreen } from './VendorConsoleScreen';
import { VendorSettlementsScreen } from './VendorSettlementsScreen';
import { VendorRxReviewScreen } from './VendorRxReviewScreen';
import { PartnerStaffScreen } from './PartnerStaffScreen';
import { PartnerRequestsPanel } from './PartnerRequestsPanel';
import '../../theme/workflows.css';

type VendorTab =
  | 'requests'
  | 'home'
  | 'console'
  | 'rx-review'
  | 'handover'
  | 'substitutions'
  | 'reorder'
  | 'camp-intake'
  | 'dispensing'
  | 'inventory'
  | 'lab-reports'
  | 'sample-pickup'
  | 'critical-results'
  | 'generic-sub'
  | 'cold-chain'
  | 'pincode-coverage'
  | 'auto-reorder'
  | 'settlements'
  | 'partner-staff';

export function VendorWorkspaceHub() {
  const [activeTab, setActiveTab] = useState<VendorTab>('home');

  const tabs: { id: VendorTab; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Vendor Overview', icon: Store },
    { id: 'console', label: 'Fulfilment Queue', icon: LayoutDashboard },
    { id: 'rx-review', label: 'Rx Review', icon: FileText },
    { id: 'handover', label: 'OTP Handover', icon: Package },
    { id: 'substitutions', label: 'Generic Substitutions', icon: Zap },
    { id: 'reorder', label: 'Reorder Rules', icon: RefreshCw },
    { id: 'camp-intake', label: 'Camp Intake', icon: Calendar },
    { id: 'requests', label: 'Returns, visits & refills', icon: Package },
    { id: 'dispensing', label: 'Pharmacy Dispensing', icon: Package },
    { id: 'inventory', label: 'Inventory Desk', icon: FileCheck },
    { id: 'lab-reports', label: 'Lab Sample & Report', icon: FlaskConical },
    { id: 'sample-pickup', label: 'Home Pickup', icon: Truck },
    { id: 'critical-results', label: 'Critical Escalations', icon: AlertCircle },
    { id: 'generic-sub', label: 'Substitution Config', icon: Zap },
    { id: 'cold-chain', label: 'Cold Chain Logger', icon: Thermometer },
    { id: 'pincode-coverage', label: 'Pincode Coverage', icon: MapPin },
    { id: 'settlements', label: 'Settlements', icon: DollarSign },
    { id: 'partner-staff', label: 'Staff & Roles', icon: Users },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'requests':
        return <PartnerRequestsPanel />;
      case 'home':
        return <VendorHomeScreen _onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'console':
        return <VendorConsoleScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'rx-review':
        return <VendorRxReviewScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'handover':
        return <VendorHandoverScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'substitutions':
        return <VendorSubstitutionScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'reorder':
      case 'auto-reorder':
        return <VendorReorderScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'camp-intake':
        return <VendorCampIntakeScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'dispensing':
        return <DispenseRegisterScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'inventory':
        return <PharmacyInventoryScreen />;
      case 'lab-reports':
        return <LabQueueScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'sample-pickup':
        return <HomeSamplePickupScreen />;
      case 'critical-results':
        return <CriticalResultEscalationScreen />;
      case 'generic-sub':
        return <GenericSubstitutionScreen />;
      case 'cold-chain':
        return <ColdChainLoggerScreen />;
      case 'pincode-coverage':
        return <PincodeCoverageScreen />;
      case 'settlements':
        return <VendorSettlementsScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      case 'partner-staff':
        return <PartnerStaffScreen onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
      default:
        return <VendorHomeScreen _onNavigate={(view: string) => setActiveTab(view as VendorTab)} />;
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
