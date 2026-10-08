import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface AmbulanceUnit {
  id: string;
  vehicleNo: string;
  driverName: string;
  phone: string;
  location: string;
  status: 'DISPATCHED' | 'STANDBY';
  eta: string;
  destination: string;
}

export function AmbulanceDispatchTrackerScreen() {
  // No ambulance/GPS feed is connected: no invented vehicles, drivers or phones.
  const [ambulances] = useState<AmbulanceUnit[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">HIGH PRIORITY LOGISTICS</span>
          <h2>Campus Emergency Ambulance GPS Dispatch</h2>
          <p>Real-time vehicle position tracking, driver dispatch hotline, and hospital destination routing during trauma emergencies.</p>
        </div>
      </div>

      {ambulances.length === 0 && <EmptyState title="No ambulances connected yet." description="Live vehicle tracking is not connected, so no ambulance is shown as available. In an emergency, call 112." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ambulances.map(amb => (
          <div key={amb.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="care-eyebrow" style={{ color: amb.status === 'DISPATCHED' ? 'var(--emergency, #ef4444)' : 'inherit' }}>
                  {amb.status}
                </span>
                <h3 style={{ fontSize: 18, marginTop: 4 }}>Vehicle: {amb.vehicleNo}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>
                  Driver: <strong>{amb.driverName}</strong> ({amb.phone}) · Position: <strong>{amb.location}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--accent, #2563eb)' }}>Destination: <strong>{amb.destination}</strong></p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: amb.status === 'DISPATCHED' ? 'var(--emergency, #ef4444)' : '#10b981' }}>
                  ETA: {amb.eta}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
