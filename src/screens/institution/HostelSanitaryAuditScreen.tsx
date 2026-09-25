import React, { useState } from 'react';
import { ClipboardCheck, Droplets, Utensils, Bug, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
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
  const [logs, setLogs] = useState<AuditLog[]>([
    { id: 'aud-1', category: 'WATER_QUALITY', location: 'Hostel Block A RO Water Tank #2', inspector: 'Smt. P. Lakshmi', date: '2026-09-23', status: 'PASSED', notes: 'TDS: 110 ppm, Residual Chlorine: 0.5 mg/L. All parameters within IS 10500 standards.' },
    { id: 'aud-2', category: 'KITCHEN_HYGIENE', location: 'Central Mess Kitchen 1', inspector: 'Dr. Ananya Roy', date: '2026-09-22', status: 'ACTION_REQUIRED', notes: 'Deep grease trap cleaning required in dishwashing area. Vendor notified.' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">ENVIRONMENTAL HEALTH & SAFETY</span>
          <h2>Hostel Sanitary Audit & Water Quality Desk</h2>
          <p>Record mess hygiene audits, RO water tank coliform test results, and mosquito breeding inspections.</p>
        </div>
      </div>

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
