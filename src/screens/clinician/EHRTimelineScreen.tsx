import React, { useState } from 'react';
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
  const [events] = useState<EHREvent[]>([
    { id: 'e-1', date: '2026-09-24', type: 'PRESCRIPTION', title: 'Paracetamol & Cetirizine Rx Issued', doctorName: 'Dr. V. Prasad', details: 'Upper Respiratory Infection treatment plan' },
    { id: 'e-2', date: '2026-09-15', type: 'LAB_RESULT', title: 'Complete Blood Count (CBC)', doctorName: 'SRL PathLabs', details: 'Hb: 14.2 g/dL, Platelets: 2.4 Lakhs/mcL (Normal)' },
    { id: 'e-3', date: '2025-09-10', type: 'VACCINATION', title: 'Hepatitis B Dose 3', doctorName: 'Campus Health Centre', details: 'Batch HEP-B-2025-9982' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">ABDM FHIR R4 CLINICAL HISTORY</span>
          <h2>EHR Patient History Timeline</h2>
          <p>Longitudinal health records timeline aggregated under ABDM patient consent token.</p>
        </div>
      </div>

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
