import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface WaterTankReading {
  id: string;
  name: string;
  tds: string;
  chlorine: string;
  status: 'SAFE' | 'ALERT';
}

export function WaterContaminationRadarScreen() {
  const t = useT();
  // No water-sensor feed is connected: no invented tanks or readings.
  const [tanks] = useState<WaterTankReading[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.water.eyebrow')}</span>
          <h2>{t('campus.water.title')}</h2>
          <p>{t('campus.water.lead')}</p>
        </div>
      </div>

      {tanks.length === 0 && <EmptyState title={t('campus.water.emptyTitle')} description={t('campus.water.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tanks.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{item.name}</strong>
                <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0 0' }}>
                  {t('campus.water.tds')} <strong>{item.tds}</strong> · {t('campus.water.chlorine')} <strong>{item.chlorine}</strong>
                </p>
              </div>

              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                background: item.status === 'SAFE' ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-danger-bg)',
                color: item.status === 'SAFE' ? 'var(--sk-color-positive)' : 'var(--sk-color-danger)'
              }}>
                {t(`campus.water.status.${item.status}` as MessageKey)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
