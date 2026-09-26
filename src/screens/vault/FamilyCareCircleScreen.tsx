import React, { useState } from 'react';
import '../../theme/workflows.css';

interface CircleMember {
  id: string;
  name: string;
  relationship: string;
  plan: string;
  status: 'ACTIVE' | 'PENDING';
}

export function FamilyCareCircleScreen() {
  const [members] = useState<CircleMember[]>([
    { id: 'm-1', name: 'Dr. Ramesh Sharma', relationship: 'Father', plan: 'Care Circle ₹249/mo', status: 'ACTIVE' },
    { id: 'm-2', name: 'Smt. Sunita Sharma', relationship: 'Mother', plan: 'Care Circle ₹249/mo', status: 'ACTIVE' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">FAMILY HEALTH NETWORK</span>
          <h2>Family Care Circle Manager</h2>
          <p>Manage family members enrolled under StudentKare Care Circle for joint health consultations and emergency access.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {members.map(m => (
          <div key={m.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{m.name}</strong> ({m.relationship})
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Plan: <strong>{m.plan}</strong></p>
            </div>

            <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 14px', borderRadius: 999, fontWeight: 700 }}>
              ✓ ACTIVE IN CIRCLE
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
