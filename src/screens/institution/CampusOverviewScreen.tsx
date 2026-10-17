import React from 'react';
import { Flow11InstitutionConsoleScreen } from './Flow11InstitutionConsoleScreen';
import { HostelOutbreakEarlyWarningRadar } from '../../components/institution/HostelOutbreakEarlyWarningRadar';
import { Building } from 'lucide-react';
import { useT } from '@/i18n';

export const CampusOverviewScreen: React.FC = () => {
  const t = useT();
  return (
    <div style={{ padding: '16px' }}>
      <div className="wf-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building aria-hidden="true" style={{ color: 'var(--action)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{t('campus.overview.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('campus.overview.lead')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-2)' }}>
            {t('campus.overview.scopeLabel')} <strong>{t('campus.overview.scopeNone')}</strong>
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
