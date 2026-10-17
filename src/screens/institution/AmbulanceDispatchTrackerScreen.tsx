import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface AmbulanceUnit {
  id: string;
  vehicleNo: string;
  driverName: string;
  phone: string;
  location: string;
  status: 'DISPATCHED' | 'STANDBY';
  eta: string;
  destination: string;
}

export function AmbulanceDispatchTrackerScreen() {
  const t = useT();
  // No ambulance/GPS feed is connected: no invented vehicles, drivers or phones.
  const [ambulances] = useState<AmbulanceUnit[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.ambulance.eyebrow')}</span>
          <h2>{t('campus.ambulance.title')}</h2>
          <p>{t('campus.ambulance.lead')}</p>
        </div>
      </div>

      {ambulances.length === 0 && <EmptyState title={t('campus.ambulance.emptyTitle')} description={t('campus.ambulance.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ambulances.map(amb => (
          <div key={amb.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="care-eyebrow" style={{ color: amb.status === 'DISPATCHED' ? 'var(--sk-color-danger)' : 'inherit' }}>
                  {t(`campus.ambulance.status.${amb.status}` as MessageKey)}
                </span>
                <h3 style={{ fontSize: 18, marginTop: 4 }}>{t('campus.ambulance.vehicle', { number: amb.vehicleNo })}</h3>
                <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0' }}>
                  {t('campus.ambulance.driver')} <strong>{amb.driverName}</strong> ({amb.phone}) · {t('campus.ambulance.position')} <strong>{amb.location}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--sk-color-action)' }}>{t('campus.ambulance.destination')} <strong>{amb.destination}</strong></p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: amb.status === 'DISPATCHED' ? 'var(--sk-color-danger)' : 'var(--sk-color-positive)' }}>
                  {t('campus.ambulance.eta', { eta: amb.eta })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
