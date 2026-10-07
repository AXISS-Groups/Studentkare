import React, { useState } from 'react';
import '../../theme/workflows.css';

interface PracticeLocation {
  id: string;
  name: string;
  hprFacilityId: string;
  address: string;
  isCurrent: boolean;
}

export function MultiClinicSwitcherScreen() {
  const [locations, setLocations] = useState<PracticeLocation[]>([
    { id: 'loc-1', name: 'IIT Hyderabad Health Centre OPD', hprFacilityId: 'IN3610002890', address: 'Kandi Campus, Sangareddy', isCurrent: true },
    { id: 'loc-2', name: 'Apollo Clinic — Gachibowli', hprFacilityId: 'IN3610009912', address: 'Financial District, Hyderabad', isCurrent: false }
  ]);

  const switchLocation = (id: string) => {
    setLocations(locations.map(l => ({ ...l, isCurrent: l.id === id })));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">CLINICAL PRACTICE CONTEXT</span>
          <h2>Multi-Clinic & OPD Location Switcher</h2>
          <p>Switch active ABDM Health Facility Registry (HPR) facility ID and prescription header for multi-clinic practice.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {locations.map(loc => (
          <div key={loc.id} className="wf-card" style={{
            padding: 20,
            border: loc.isCurrent ? '2px solid var(--accent, #2563eb)' : '1px solid var(--border)',
            background: loc.isCurrent ? 'var(--surface-card, #fff)' : 'var(--surface-subtle, #f8fafc)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{loc.name}</strong> {loc.isCurrent && <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 999, fontWeight: 700, marginLeft: 8 }}>ACTIVE PRACTICE</span>}
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  HPR Facility ID: <code>{loc.hprFacilityId}</code> · Location: <strong>{loc.address}</strong>
                </p>
              </div>

              {!loc.isCurrent && (
                <button className="health-button health-button-primary" style={{ minHeight: 40 }} onClick={() => switchLocation(loc.id)}>
                  Switch Practice Here
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
