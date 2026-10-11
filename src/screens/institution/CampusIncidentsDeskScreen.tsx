import React, { useState } from 'react';
import { MeoDashboardScreen } from '@/screens/medical/MeoDashboardScreen';
import { MedicalIncidentScreen } from '@/screens/medical/MedicalIncidentScreen';
import { AlertTriangle, Activity, PhoneCall } from 'lucide-react';
import { useT } from '@/i18n';

export const CampusIncidentsDeskScreen: React.FC = () => {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'DESK' | 'REPORT_INCIDENT'>('DESK');

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle aria-hidden="true" style={{ color: 'var(--emergency)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{t('campus.incidents.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('campus.incidents.lead')}
          </p>
        </div>

        <div role="group" aria-label={t('campus.incidents.tabsLabel')} style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            aria-pressed={activeTab === 'DESK'}
            onClick={() => setActiveTab('DESK')}
            style={{
              minHeight: 44,
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
            <Activity size={15} aria-hidden="true" />
            <span>{t('campus.incidents.tabDesk')}</span>
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'REPORT_INCIDENT'}
            onClick={() => setActiveTab('REPORT_INCIDENT')}
            style={{
              minHeight: 44,
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
            <PhoneCall size={15} aria-hidden="true" />
            <span>{t('campus.incidents.tabReport')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'DESK' && <MeoDashboardScreen />}
      {activeTab === 'REPORT_INCIDENT' && <MedicalIncidentScreen />}
    </div>
  );
};
