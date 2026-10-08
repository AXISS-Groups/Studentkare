import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface WaterTankReading {
  id: string;
  name: string;
  tds: string;
  chlorine: string;
  status: 'SAFE' | 'ALERT';
}

export function WaterContaminationRadarScreen() {
  // No water-sensor feed is connected: no invented tanks or readings.
  const [tanks] = useState<WaterTankReading[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">IOT SENSOR TELEMETRY</span>
          <h2>Hostel Water Contamination Radar</h2>
          <p>Real-time water quality monitoring across hostel overhead tanks and drinking water RO stations.</p>
        </div>
      </div>

      {tanks.length === 0 && <EmptyState title="No water quality readings yet." description="No water sensors are connected yet. Readings will appear here once a sensor or lab result is recorded." />}
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
