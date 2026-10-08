import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface FoodSafetyAlert {
  id: string;
  messName: string;
  reportedCases: number;
  Symptoms: string;
  suspectedItem: string;
  status: string;
}

export function MessFoodPoisoningDeskScreen() {
  // No food-safety alert API yet: no invented clusters or case counts.
  const [alerts] = useState<FoodSafetyAlert[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>RAPID OUTBREAK RESPONSE</span>
          <h2>Mess Food Poisoning Alert & Sample Retention Desk</h2>
          <p>Rapid symptom cluster tracing, food sample retention audits, and kitchen safety isolation.</p>
        </div>
      </div>

      {alerts.length === 0 && <EmptyState title="No food safety alerts yet." description="This desk is not connected to live symptom reports yet, so an empty list does not mean there is no outbreak." />}
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
