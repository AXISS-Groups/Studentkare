import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface DietLog {
  id: string;
  studentName: string;
  roomNo: string;
  restriction: 'GLUTEN_FREE' | 'LACTOSE_INTOLERANT' | 'DIABETIC_SPECIAL' | 'RECOVERY_LIGHT_DIET';
  prescribedBy: string;
  startDate: string;
}

export function MealDietRestrictionsScreen() {
  const t = useT();
  // No diet-restriction API yet: no invented students or prescribing doctors.
  const [diets] = useState<DietLog[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.diet.eyebrow')}</span>
          <h2>{t('campus.diet.title')}</h2>
          <p>{t('campus.diet.lead')}</p>
        </div>
      </div>

      {diets.length === 0 && <EmptyState title={t('campus.diet.emptyTitle')} description={t('campus.diet.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {diets.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong> (<code>{item.roomNo}</code>)
              <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0 0' }}>
                {t('campus.diet.prescribedBy', { doctor: item.prescribedBy, date: item.startDate })}
              </p>
            </div>

            <span style={{
              fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
              background: 'var(--sk-color-action-soft)', color: 'var(--sk-color-action)'
            }}>
              {t(`campus.diet.restriction.${item.restriction}` as MessageKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
