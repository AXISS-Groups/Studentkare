import React, { useState } from 'react';
import { AiOfficeKillSwitchesModule } from './AiOfficeKillSwitchesModule';
import { IncidentConsoleModule } from './IncidentConsoleModule';
import { MultiCampusOutbreakHeatmap } from '../../components/admin/MultiCampusOutbreakHeatmap';
import { ShieldAlert, AlertTriangle, Cpu } from 'lucide-react';

export const SafetyCentreModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'KILL_SWITCHES'>('INCIDENTS');

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert style={{ color: 'var(--emergency)', width: '26px', height: '26px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Platform Safety & Emergency Crisis Centre</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            SuperAdmin crisis queue oversight, AI model kill switches, SLA escalation, and incident telemetry.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('INCIDENTS')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'INCIDENTS' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'INCIDENTS' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={15} />
            <span>Crisis & Incident Console</span>
          </button>
          <button
            onClick={() => setActiveTab('KILL_SWITCHES')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'KILL_SWITCHES' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'KILL_SWITCHES' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Cpu size={15} />
            <span>AI Kill Switches</span>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <MultiCampusOutbreakHeatmap />
      </div>

      {activeTab === 'INCIDENTS' && <IncidentConsoleModule />}
      {activeTab === 'KILL_SWITCHES' && <AiOfficeKillSwitchesModule />}
    </div>
  );
};
