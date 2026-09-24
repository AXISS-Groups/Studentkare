import React from 'react';
import { Flow08ClinicianConsoleScreen } from './Flow08ClinicianConsoleScreen';
import { ClinicalReviewPanel } from '../workspace/ClinicalReviewPanel';
import { UserCheck } from 'lucide-react';

export const DoctorTodayScreen: React.FC = () => {
  return (
    <div style={{ padding: '16px' }}>
      <div className="wf-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck style={{ color: 'var(--action)', width: '22px', height: '22px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Doctor Today Console & Patient Queue</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Appointments, pending lab reviews, critical results, and 72h follow-ups with SLA countdowns.
          </p>
        </div>
      </div>

      <ClinicalReviewPanel />

      <div style={{ marginTop: '24px' }}>
        <Flow08ClinicianConsoleScreen />
      </div>
    </div>
  );
};
