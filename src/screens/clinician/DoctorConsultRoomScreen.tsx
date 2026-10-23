import React, { useState } from 'react';
import { EncounterNotesPanel } from '../workspace/EncounterNotesPanel';
import { IntegratedTeleconsultSoapScribe } from '../../components/clinician/IntegratedTeleconsultSoapScribe';
import { Video, FileText } from 'lucide-react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';

export const DoctorConsultRoomScreen: React.FC = () => {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'CONSULT' | 'SOAP_NOTES'>('CONSULT');

  return (
    <div style={{ padding: '20px' }}>
      <div className="wf-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video aria-hidden="true" style={{ color: 'var(--action)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{t('partner.clin.consult.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('partner.clin.consult.intro')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            aria-pressed={activeTab === 'CONSULT'}
            onClick={() => setActiveTab('CONSULT')}
            style={{
              minHeight: 44,
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'CONSULT' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'CONSULT' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Video size={15} aria-hidden="true" />
            <span>{t('partner.clin.consult.tabVideo')}</span>
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'SOAP_NOTES'}
            onClick={() => setActiveTab('SOAP_NOTES')}
            style={{
              minHeight: 44,
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'SOAP_NOTES' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'SOAP_NOTES' ? 'var(--action)' : 'var(--text-2)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.clin.consult.tabNotes')}</span>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <IntegratedTeleconsultSoapScribe />
      </div>

      {/* No booked consultation is selected here, so there is nothing to join.
          It used to open a call for an invented appointment and patient. */}
      {activeTab === 'CONSULT' && <EmptyState title={t('partner.clin.consult.emptyTitle')} description={t('partner.clin.consult.emptyBody')} />}
      {activeTab === 'SOAP_NOTES' && <EncounterNotesPanel />}
    </div>
  );
};
