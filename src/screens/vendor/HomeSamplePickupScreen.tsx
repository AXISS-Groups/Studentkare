import React, { useState } from 'react';
import { Truck, QrCode, CheckCircle2, MapPin, Clock } from 'lucide-react';
import '../../theme/workflows.css';

interface PickupJob {
  id: string;
  studentName: string;
  address: string;
  testPanel: string[];
  slot: string;
  status: 'ASSIGNED' | 'COLLECTED';
  sampleId?: string;
}

export function HomeSamplePickupScreen() {
  const [jobs, setJobs] = useState<PickupJob[]>([
    { id: 'job-1', studentName: 'Aditya Sen', address: 'Hostel Block A — Room 104', testPanel: ['Complete Blood Count (CBC)'], slot: '07:30 AM - 08:00 AM', status: 'ASSIGNED' },
    { id: 'job-2', studentName: 'Priya Nair', address: 'Hostel Block B — Room 202', testPanel: ['Dengue NS1 Antigen'], slot: '08:30 AM - 09:00 AM', status: 'COLLECTED', sampleId: 'VIAL-889102' }
  ]);

  const markCollected = (id: string) => {
    const vialId = `VIAL-${Math.floor(100000 + Math.random() * 900000)}`;
    setJobs(jobs.map(j => j.id === id ? { ...j, status: 'COLLECTED', sampleId: vialId } : j));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PHLEBOTOMY LOGISTICS</span>
          <h2>Hostel & Home Sample Pickup Dispatch</h2>
          <p>Phlebotomist queue for hostel room sample collection, barcode scanning, and cold-chain logging.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {jobs.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>
                <MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {item.address} · Slot: <strong>{item.slot}</strong>
              </p>
              <p style={{ fontSize: 13, color: 'var(--accent, #2563eb)' }}>Tests: {item.testPanel.join(', ')}</p>
              {item.sampleId && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Vial Barcode: <code>{item.sampleId}</code></span>}
            </div>

            <div>
              {item.status === 'ASSIGNED' ? (
                <button className="health-button health-button-primary" style={{ minHeight: 40 }} onClick={() => markCollected(item.id)}>
                  <QrCode size={16} /> Log Sample Collection
                </button>
              ) : (
                <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 14px', borderRadius: 999, fontWeight: 700 }}>
                  ✓ Collected
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
