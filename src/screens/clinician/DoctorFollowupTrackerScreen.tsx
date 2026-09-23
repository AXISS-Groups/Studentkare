import React, { useState } from 'react';
import { Calendar, Clock, Bell, CheckCircle2, User } from 'lucide-react';
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
  const [followups] = useState<FollowupItem[]>([
    { id: 'f-1', studentName: 'Aarav Sharma', diagnosis: 'Acute URTI', dueDate: '2026-09-29', daysRemaining: 5, status: 'PENDING' },
    { id: 'f-2', studentName: 'Priya Nair', diagnosis: 'Influenza A Isolation', dueDate: '2026-09-26', daysRemaining: 2, status: 'PENDING' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PATIENT CONTINUITY OF CARE</span>
          <h2>Doctor Follow-up & Recovery Tracker</h2>
          <p>Track post-consultation recovery progress and send automated follow-up reminders.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {followups.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Diagnosis: <strong>{item.diagnosis}</strong> · Scheduled Follow-up: <strong>{item.dueDate}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent, #2563eb)' }}>
                Due in {item.daysRemaining} days
              </span>
              <button className="health-button" style={{ minHeight: 38 }}>
                <Bell size={14} /> Send SMS Reminder
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
