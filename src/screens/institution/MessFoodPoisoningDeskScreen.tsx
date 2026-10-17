import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

interface FoodSafetyAlert {
  id: string;
  messName: string;
  reportedCases: number;
  Symptoms: string;
  suspectedItem: string;
  status: string;
}

export function MessFoodPoisoningDeskScreen() {
  const t = useT();
  // No food-safety alert API yet: no invented clusters or case counts.
  const [alerts] = useState<FoodSafetyAlert[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow" style={{ color: 'var(--sk-color-danger)' }}>{t('campus.mess.eyebrow')}</span>
          <h2>{t('campus.mess.title')}</h2>
          <p>{t('campus.mess.lead')}</p>
        </div>
      </div>

      {alerts.length === 0 && <EmptyState title={t('campus.mess.emptyTitle')} description={t('campus.mess.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alerts.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, borderLeft: '4px solid var(--sk-color-danger)' }}>
            <span className="care-eyebrow" style={{ color: 'var(--sk-color-danger)' }}>{t('campus.mess.clusterEyebrow')}</span>
            <h3 style={{ fontSize: 18, marginTop: 4 }}>{t('campus.mess.clusterTitle', { mess: item.messName, count: item.reportedCases })}</h3>
            <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0' }}>
              {t('campus.mess.symptoms')} <strong>{item.Symptoms}</strong> · {t('campus.mess.suspected')} <strong>{item.suspectedItem}</strong>
            </p>
            <div style={{ marginTop: 12 }}>
              {/* The status comes from the record; no "sample sent for analysis" is claimed on top of it. */}
              <span style={{ fontSize: 12, background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                {t('campus.mess.status', { status: item.status })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
