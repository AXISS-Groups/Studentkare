import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

interface FollowupItem {
  id: string;
  studentName: string;
  diagnosis: string;
  dueDate: string;
  daysRemaining: number;
  status: 'PENDING' | 'ATTENDED' | 'MISSED';
}

export function DoctorFollowupTrackerScreen() {
  const t = useT();
  // No follow-up endpoint exists yet: the list starts empty rather than with
  // invented students and diagnoses. There is no reminder service either, so
  // the "Send SMS Reminder" button (which sent nothing) is gone.
  const [followups] = useState<FollowupItem[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.followup.eyebrow')}</span>
          <h2>{t('partner.clin.followup.title')}</h2>
          <p>{t('partner.clin.followup.intro')}</p>
        </div>
      </div>

      {followups.length === 0 && <EmptyState title={t('partner.clin.followup.emptyTitle')} description={t('partner.clin.followup.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {followups.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {t('partner.clin.followup.line', { diagnosis: item.diagnosis, date: item.dueDate })}
              </p>
            </div>

            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-action)' }}>
              {t('partner.clin.followup.dueIn', { days: item.daysRemaining })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
