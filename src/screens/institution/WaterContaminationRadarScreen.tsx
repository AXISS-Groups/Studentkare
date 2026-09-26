import React, { useState } from 'react';
import '../../theme/workflows.css';

export function WaterContaminationRadarScreen() {
  const [tanks] = useState([
    { id: 't-1', name: 'Hostel Block A Main Overhead RO Tank', tds: '110 ppm', chlorine: '0.5 mg/L', status: 'SAFE' },
    { id: 't-2', name: 'Hostel Block B Underground Storage Sump', tds: '340 ppm (High)', chlorine: '0.1 mg/L (Low)', status: 'ALERT' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">IOT SENSOR TELEMETRY</span>
          <h2>Hostel Water Contamination Radar</h2>
          <p>Real-time water quality monitoring across hostel overhead tanks and drinking water RO stations.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tanks.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{item.name}</strong>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  TDS: <strong>{item.tds}</strong> · Residual Chlorine: <strong>{item.chlorine}</strong>
                </p>
              </div>

              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                background: item.status === 'SAFE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: item.status === 'SAFE' ? '#065f46' : '#991b1b'
              }}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
