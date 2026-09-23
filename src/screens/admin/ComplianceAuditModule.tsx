import React, { useState } from 'react';
import { DpdpConsentModule } from './DpdpConsentModule';
import { AuditExplorerModule } from './AuditExplorerModule';
import { Lock, FileText, Database } from 'lucide-react';

export const ComplianceAuditModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DPDP' | 'AUDIT_LOGS'>('DPDP');

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock style={{ color: 'var(--action)', width: '26px', height: '26px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>DPDP Compliance & Break-Glass Audit Console</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            DPDP consent logs, deletion requests, break-glass audit trail, and export logs (Rule L compliant).
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('DPDP')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'DPDP' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'DPDP' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={15} />
            <span>DPDP Consent & Deletions</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'AUDIT_LOGS' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'AUDIT_LOGS' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Database size={15} />
            <span>Break-Glass Audit Chain</span>
          </button>
        </div>
      </div>

      {activeTab === 'DPDP' && <DpdpConsentModule />}
      {activeTab === 'AUDIT_LOGS' && <AuditExplorerModule />}
    </div>
  );
};
