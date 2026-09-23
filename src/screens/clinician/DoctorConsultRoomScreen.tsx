import React, { useState } from 'react';
import { ProviderConsultationDialog } from '../../components/health/ProviderConsultationDialog';
import { EncounterNotesPanel } from '../workspace/EncounterNotesPanel';
import { IntegratedTeleconsultSoapScribe } from '../../components/clinician/IntegratedTeleconsultSoapScribe';
import { Video, FileText, ShieldCheck } from 'lucide-react';

export const DoctorConsultRoomScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CONSULT' | 'SOAP_NOTES'>('CONSULT');

  return (
    <div style={{ padding: '20px' }}>
      <div className="wf-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video style={{ color: 'var(--action)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Doctor Integrated Consult Room & SOAP Scribe</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Video consultation, shared health records viewer, and digital SOAP note entry in one workspace. Scoped to student-granted consent.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('CONSULT')}
            style={{
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
            <Video size={15} />
            <span>Video & Shared Records</span>
          </button>
          <button
            onClick={() => setActiveTab('SOAP_NOTES')}
            style={{
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
            <FileText size={15} />
            <span>SOAP Note Entry & Sign</span>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <IntegratedTeleconsultSoapScribe />
      </div>

      {activeTab === 'CONSULT' && <ProviderConsultationDialog appointment={{ id: 'appt-7749', customer: 'Aarav Mehta' }} onClose={() => {}} />}
      {activeTab === 'SOAP_NOTES' && <EncounterNotesPanel />}
    </div>
  );
};
