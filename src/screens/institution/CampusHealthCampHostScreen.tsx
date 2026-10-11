import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

interface HealthCampEvent {
  id: string;
  title: string;
  partnerName: string;
  venue: string;
  date: string;
  capacity: number;
  rsvps: number;
}

export function CampusHealthCampHostScreen() {
  const t = useT();
  // No camp-hosting API yet: no invented events or third-party partners.
  const [camps] = useState<HealthCampEvent[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.camps.eyebrow')}</span>
          <h2>{t('campus.camps.title')}</h2>
          <p>{t('campus.camps.lead')}</p>
        </div>
      </div>

      {camps.length === 0 && <EmptyState title={t('campus.camps.emptyTitle')} description={t('campus.camps.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {camps.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.title}</strong>
              <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0 0' }}>
                {t('campus.camps.partner')} <strong>{item.partnerName}</strong> · {t('campus.camps.venue')} <strong>{item.venue}</strong> · {t('campus.camps.date')} {item.date}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-action)' }}>{t('campus.camps.rsvps', { count: item.rsvps, capacity: item.capacity })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
