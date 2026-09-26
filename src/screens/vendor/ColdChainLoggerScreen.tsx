import React, { useState } from 'react';
import '../../theme/workflows.css';

export function ColdChainLoggerScreen() {
  const [sensors] = useState([
    { id: 'cc-1', unitName: 'Vaccine Refrigerator #1 (Hepatitis B & HPV)', currentTemp: '+4.2 °C', targetRange: '+2.0 to +8.0 °C', status: 'OPTIMAL' },
    { id: 'cc-2', unitName: 'Diagnostic Sample Cold Transport Box B', currentTemp: '+3.8 °C', targetRange: '+2.0 to +8.0 °C', status: 'OPTIMAL' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">IOT REFRIGERATION MONITORING</span>
          <h2>Cold-Chain Temperature Logger</h2>
          <p>Real-time continuous temperature telemetry for vaccine refrigerators and diagnostic sample transport boxes.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sensors.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.unitName}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Target Range: <strong>{item.targetRange}</strong></p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{item.currentTemp}</span>
              <small style={{ display: 'block', color: 'var(--text-secondary)' }}>Status: {item.status}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
