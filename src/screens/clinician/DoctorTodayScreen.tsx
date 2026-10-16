import React from 'react';
import { ClinicalReviewPanel } from '../workspace/ClinicalReviewPanel';
import { UserCheck } from 'lucide-react';
import { useT } from '@/i18n';

export const DoctorTodayScreen: React.FC = () => {
  const t = useT();
  return (
    <div style={{ padding: '16px' }}>
      <div className="wf-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck aria-hidden="true" style={{ color: 'var(--action)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{t('partner.clin.today.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('partner.clin.today.intro')}
          </p>
        </div>
      </div>

      <ClinicalReviewPanel />
      {/* Clinician decision support (differentials, risk scores) is M18: a
          separate service with its own Postgres role (AGENTS.md guardrail 5).
          It is not rendered from the main app. */}
    </div>
  );
};
