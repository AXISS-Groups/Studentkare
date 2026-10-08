import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface AuditLog {
  id: string;
  category: 'WATER_QUALITY' | 'KITCHEN_HYGIENE' | 'VECTOR_CONTROL';
  location: string;
  inspector: string;
  date: string;
  status: 'PASSED' | 'ACTION_REQUIRED';
  notes: string;
}

export function HostelSanitaryAuditScreen() {
  // No audit-log API yet: no invented inspectors or test results.
  const [logs] = useState<AuditLog[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">ENVIRONMENTAL HEALTH & SAFETY</span>
          <h2>Hostel Sanitary Audit & Water Quality Desk</h2>
          <p>Record mess hygiene audits, RO water tank coliform test results, and mosquito breeding inspections.</p>
        </div>
      </div>

      {logs.length === 0 && <EmptyState title="No sanitary audits yet." description="Recorded mess, water and vector-control audits will appear here." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {logs.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="care-eyebrow">{item.category.replace(/_/g, ' ')}</span>
                <h3 style={{ fontSize: 16, marginTop: 4 }}>{item.location}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                  Audited by <strong>{item.inspector}</strong> on {item.date}
                </p>
                <p style={{ fontSize: 13 }}>{item.notes}</p>
              </div>

              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                background: item.status === 'PASSED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: item.status === 'PASSED' ? '#065f46' : '#991b1b'
              }}>
                {item.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
