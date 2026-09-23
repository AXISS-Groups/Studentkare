import React, { useState } from 'react';
import { AlertOctagon, Utensils, ShieldAlert, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

export function MessFoodPoisoningDeskScreen() {
  const [alerts] = useState([
    { id: 'fp-1', messName: 'Central Mess Kitchen 2', reportedCases: 4, Symptoms: 'Acute vomiting & abdominal cramps', suspectedItem: 'Paneer Butter Masala (Dinner 23 Sep)', status: 'INVESTIGATING' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>RAPID OUTBREAK RESPONSE</span>
          <h2>Mess Food Poisoning Alert & Sample Retention Desk</h2>
          <p>Rapid symptom cluster tracing, food sample retention audits, and kitchen safety isolation.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alerts.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, borderLeft: '4px solid var(--emergency, #ef4444)' }}>
            <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>SUSPECTED FOODBORNE CLUSTER</span>
            <h3 style={{ fontSize: 18, marginTop: 4 }}>{item.messName} — {item.reportedCases} Student Reports</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>
              Symptoms: <strong>{item.Symptoms}</strong> · Suspected Food Item: <strong>{item.suspectedItem}</strong>
            </p>
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#991b1b', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                Status: {item.status} (Sample Sent for Micro Analysis)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
