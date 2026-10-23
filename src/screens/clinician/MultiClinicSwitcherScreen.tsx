import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

interface PracticeLocation {
  id: string;
  name: string;
  /** ABDM Health Facility Registry (HFR) ID — HPR is the professionals' registry. */
  hprFacilityId: string;
  address: string;
  isCurrent: boolean;
}

export function MultiClinicSwitcherScreen() {
  const t = useT();
  // No practice-location registry is connected yet: the list starts empty
  // rather than with invented facilities and HFR IDs.
  const [locations, setLocations] = useState<PracticeLocation[]>([]);

  const switchLocation = (id: string) => {
    setLocations(locations.map(l => ({ ...l, isCurrent: l.id === id })));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.clinics.eyebrow')}</span>
          <h2>{t('partner.clin.clinics.title')}</h2>
          <p>{t('partner.clin.clinics.intro')}</p>
        </div>
      </div>

      {locations.length === 0 && <EmptyState title={t('partner.clin.clinics.emptyTitle')} description={t('partner.clin.clinics.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {locations.map(loc => (
          <div key={loc.id} className="wf-card" style={{
            padding: 20,
            border: loc.isCurrent ? '2px solid var(--sk-color-action)' : '1px solid var(--border)',
            background: loc.isCurrent ? 'var(--sk-color-surface)' : 'var(--sk-color-surface-2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{loc.name}</strong> {loc.isCurrent && <span style={{ fontSize: 11, background: 'var(--sk-color-action-soft)', color: 'var(--sk-color-action)', padding: '2px 8px', borderRadius: 999, fontWeight: 700, marginLeft: 8 }}>{t('partner.clin.clinics.active')}</span>}
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  {t('partner.clin.clinics.line', { id: loc.hprFacilityId, address: loc.address })}
                </p>
              </div>

              {!loc.isCurrent && (
                <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={() => switchLocation(loc.id)}>
                  {t('partner.clin.clinics.switch')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
