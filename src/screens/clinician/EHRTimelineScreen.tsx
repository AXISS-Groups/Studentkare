import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface EHREvent {
  id: string;
  date: string;
  type: 'DIAGNOSIS' | 'PRESCRIPTION' | 'LAB_RESULT' | 'VACCINATION';
  title: string;
  doctorName: string;
  details: string;
}

export function EHRTimelineScreen() {
  // No consented patient timeline reaches this screen yet: it starts empty
  // rather than with invented prescriptions, lab values and vaccinations.
  const [events] = useState<EHREvent[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">FHIR R4 CLINICAL HISTORY</span>
          <h2>EHR Patient History Timeline</h2>
          <p>Longitudinal health records timeline aggregated under patient consent.</p>
        </div>
      </div>

      {events.length === 0 && <EmptyState title="No patient history yet." description="Records a patient has consented to share with you will appear here." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {events.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="care-eyebrow">{item.type}</span>
                <h3 style={{ fontSize: 16, marginTop: 4 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>
                  Recorded by <strong>{item.doctorName}</strong> on {item.date}
                </p>
                <p style={{ fontSize: 13 }}>{item.details}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
