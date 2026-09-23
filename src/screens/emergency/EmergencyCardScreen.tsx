import React from 'react';
import { OfflineEmergencyHealthCard } from '@/components/OfflineEmergencyHealthCard';
import { OfflineEmergencyPassLocker } from '@/components/OfflineEmergencyPassLocker';
import { AlertOctagon, Download, ShieldCheck } from 'lucide-react';

export const EmergencyCardScreen: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '24px auto', padding: '0 16px' }}>
      {/* Header Banner */}
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon style={{ color: 'var(--emergency)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Offline Emergency Card & Locker</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Readable offline via PWA cache. Break-glass view notifies student and audits to SuperAdmin.
          </p>
        </div>
        <button
          className="wf-btn-secondary"
          onClick={() => window.print()}
          style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={15} />
          <span>Save Printable PDF</span>
        </button>
      </div>

      {/* Main Health Card Component */}
      <div style={{ marginBottom: '24px' }}>
        <OfflineEmergencyHealthCard />
      </div>

      {/* Pass Locker */}
      <div>
        <OfflineEmergencyPassLocker />
      </div>
    </div>
  );
};
