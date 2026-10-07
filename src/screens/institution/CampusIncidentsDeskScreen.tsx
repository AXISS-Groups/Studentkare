import React, { useState } from 'react';
import { MeoDashboardScreen } from '@/screens/medical/MeoDashboardScreen';
import { MedicalIncidentScreen } from '@/screens/medical/MedicalIncidentScreen';
import { AlertTriangle, Activity, PhoneCall } from 'lucide-react';

export const CampusIncidentsDeskScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DESK' | 'REPORT_INCIDENT'>('DESK');

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle style={{ color: 'var(--emergency)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Campus Incident & Emergency Triage Desk</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Real-time incident triage, campus ambulance dispatch, hostel visits, and outbreak alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('DESK')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'DESK' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'DESK' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={15} />
            <span>Triage & Ops Desk</span>
          </button>
          <button
            onClick={() => setActiveTab('REPORT_INCIDENT')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'REPORT_INCIDENT' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'REPORT_INCIDENT' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PhoneCall size={15} />
            <span>Report New Incident</span>
          </button>
        </div>
      </div>

      {activeTab === 'DESK' && <MeoDashboardScreen />}
      {activeTab === 'REPORT_INCIDENT' && <MedicalIncidentScreen />}
    </div>
  );
};
