import React, { useState } from 'react';
import { ShieldCheck, Share2, Users } from 'lucide-react';
import { AccessConsentInboxPanel } from './AccessConsentInboxPanel';
import { FamilyAccessShareScreen } from './FamilyAccessShareScreen';
import { FamilyCareCircleScreen } from './FamilyCareCircleScreen';
import '../../theme/workflows.css';

type VaultTab = 'consent' | 'family-share' | 'care-circle';

export function VaultWorkspaceHub() {
  const [activeTab, setActiveTab] = useState<VaultTab>('consent');

  const tabs: { id: VaultTab; label: string; icon: React.ElementType }[] = [
    { id: 'consent', label: 'Consent Inbox', icon: ShieldCheck },
    { id: 'family-share', label: 'Family Share', icon: Share2 },
    { id: 'care-circle', label: 'Care Circle', icon: Users },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'consent':
        return <AccessConsentInboxPanel />;
      case 'family-share':
        return <FamilyAccessShareScreen />;
      case 'care-circle':
        return <FamilyCareCircleScreen />;
      default:
        return <AccessConsentInboxPanel />;
    }
  };

  return (
    <div className="wf-vault-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">HEALTH VAULT & CONSENT MANAGEMENT</span>
          <h2>DPDP Consent, Access & Family Care Sharing.</h2>
          <p>Grant, revoke, and inspect consent requests from doctors, clinics, and family members.</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label="Health vault workspace tabs"
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
