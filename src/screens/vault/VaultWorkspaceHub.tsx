import React, { useState } from 'react';
import { ShieldCheck, Share2, FileText } from 'lucide-react';
import { useT } from '@/i18n';
import { navigate } from '@/lib/workflowRouting';
import type { MessageKey } from '@/i18n';
import { RecordsPanel } from '../workspace/MemberPanels';
import { AccessConsentInboxPanel } from './AccessConsentInboxPanel';
import { FamilyAccessShareScreen } from './FamilyAccessShareScreen';
import '../../theme/workflows.css';

type VaultTab = 'records' | 'access' | 'family';

const TABS: { id: VaultTab; label: MessageKey; icon: React.ElementType }[] = [
  { id: 'records', label: 'hub.tab.records', icon: FileText },
  { id: 'access', label: 'hub.tab.access', icon: ShieldCheck },
  { id: 'family', label: 'hub.tab.family', icon: Share2 },
];

export function VaultWorkspaceHub() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<VaultTab>('records');
  const openRecords = () => setActiveTab('records');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'access':
        return <AccessConsentInboxPanel onOpenRecords={openRecords} />;
      case 'family':
        return <FamilyAccessShareScreen onOpenRecords={openRecords} />;
      default:
        return <RecordsPanel />;
    }
  };

  return (
    <div className="wf-vault-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">{t('vault.eyebrow')}</span>
          <h2>{t('hub.title')}</h2>
          <p>{t('hub.intro')}</p>
        </div>
        <button type="button" className="health-button" style={{ minHeight: 44 }} aria-describedby="vault-visit-summaries-hint" onClick={() => navigate('visit-summaries')}>
          {t('care.visit.listTitle')}
        </button>
        <span id="vault-visit-summaries-hint" hidden>{t('care.visit.entryBody')}</span>
      </div>

      <div
        className="wf-tab-bar"
        role="tablist"
        aria-label={t('hub.tabs')}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20, borderBottom: '1px solid var(--rule)' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`vault-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="vault-tab-panel"
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
              <Icon size={16} aria-hidden="true" />
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      <div id="vault-tab-panel" role="tabpanel" aria-labelledby={`vault-tab-${activeTab}`} className="wf-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
