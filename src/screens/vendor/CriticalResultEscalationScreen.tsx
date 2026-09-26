import React, { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import '../../theme/workflows.css';

interface CriticalAlert {
  id: string;
  testName: string;
  value: string;
  referenceRange: string;
  studentName: string;
  doctorName: string;
  doctorPhone: string;
  acknowledged: boolean;
}

export function CriticalResultEscalationScreen() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([
    { id: 'crit-1', testName: 'Platelet Count', value: '18,000 /mcL', referenceRange: '1.5 - 4.5 Lakhs/mcL', studentName: 'Rohan Mehta', doctorName: 'Dr. V. Prasad', doctorPhone: '+91 98765 11223', acknowledged: false }
  ]);

  const acknowledgeAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>CRITICAL VALUE PROTOCOL</span>
          <h2>Critical Lab Result Escalation Desk</h2>
          <p>Immediate clinician phone call triggers for panic diagnostic values under ABDM safety guidelines.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alerts.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, border: '2px solid var(--emergency, #ef4444)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>CRITICAL VALUE FLAGGED</span>
                <h3 style={{ fontSize: 18, marginTop: 4 }}>{item.testName}: <strong style={{ color: 'var(--emergency, #ef4444)' }}>{item.value}</strong></h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>
                  Normal Range: {item.referenceRange} · Patient: <strong>{item.studentName}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--accent, #2563eb)' }}>
                  Ordering Clinician: <strong>{item.doctorName}</strong> ({item.doctorPhone})
                </p>
              </div>

              <div>
                {item.acknowledged ? (
                  <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 14px', borderRadius: 999, fontWeight: 700 }}>
                    ✓ Clinician Notified & Acknowledged
                  </span>
                ) : (
                  <button className="health-button" style={{ background: 'var(--emergency, #ef4444)', color: '#fff', border: 'none', minHeight: 44, fontWeight: 700 }} onClick={() => acknowledgeAlert(item.id)}>
                    <PhoneCall size={16} /> Mark Doctor Phone Call Logged
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
