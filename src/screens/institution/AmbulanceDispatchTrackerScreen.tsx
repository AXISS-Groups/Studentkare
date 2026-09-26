import React, { useState } from 'react';
import '../../theme/workflows.css';

export function AmbulanceDispatchTrackerScreen() {
  const [ambulances] = useState([
    { id: 'amb-1', vehicleNo: 'TS 07 EQ 9921', driverName: 'M. Krishna', phone: '+91 98123 45678', location: 'Near Hostel Block B Entrance', status: 'DISPATCHED', eta: '4 mins', destination: 'Continental Hospital Emergency' },
    { id: 'amb-2', vehicleNo: 'TS 07 EQ 4401', driverName: 'S. Ramu', phone: '+91 98123 99887', location: 'Campus Health Centre Bay 1', status: 'STANDBY', eta: 'Immediate', destination: 'On-Campus' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">HIGH PRIORITY LOGISTICS</span>
          <h2>Campus Emergency Ambulance GPS Dispatch</h2>
          <p>Real-time vehicle position tracking, driver dispatch hotline, and hospital destination routing during trauma emergencies.</p>
        </div>
      </div>

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
