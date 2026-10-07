import React from 'react';
import { Flow11InstitutionConsoleScreen } from './Flow11InstitutionConsoleScreen';
import { HostelOutbreakEarlyWarningRadar } from '../../components/institution/HostelOutbreakEarlyWarningRadar';
import { Building } from 'lucide-react';

export const CampusOverviewScreen: React.FC = () => {
  return (
    <div style={{ padding: '16px' }}>
      <div className="wf-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building style={{ color: 'var(--action)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Campus & Hostel Scoped Overview</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Wardens see assigned blocks only. Health metrics aggregate (groups &lt; 5 suppressed per DPDP Rule L).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-2)' }}>
            Assigned Scope: <strong>Knowledge Park Block A & B</strong>
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <HostelOutbreakEarlyWarningRadar />
      </div>

      <Flow11InstitutionConsoleScreen />
    </div>
  );
};
