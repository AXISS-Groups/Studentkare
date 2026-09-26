import React, { useState } from 'react';
import { HeartPulse, Activity, Flame, Moon, Thermometer, RefreshCw, Smartphone, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

export function VitalTrendsTelemetryScreen() {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('2 mins ago');

  const vitals = [
    { title: 'Heart Rate', value: '72 bpm', status: 'Normal', icon: HeartPulse, color: '#ef4444', trend: '70 - 78 bpm today' },
    { title: 'Blood Pressure', value: '118/76 mmHg', status: 'Optimal', icon: Activity, color: '#3b82f6', trend: '120/80 baseline' },
    { title: 'SpO2 Oxygen', value: '99%', status: 'Normal', icon: Flame, color: '#10b981', trend: 'Range 98-100%' },
    { title: 'Sleep Quality', value: '7.5 hrs', status: 'Restful', icon: Moon, color: '#8b5cf6', trend: 'Deep sleep 2.1 hrs' },
    { title: 'Body Temp', value: '98.4 °F', status: 'Normal', icon: Thermometer, color: '#f59e0b', trend: 'Afebrile' },
  ];

  const syncDevices = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSynced('Just now');
    }, 1200);
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">CONTINUOUS HEALTH TELEMETRY</span>
          <h2>Vital Trends & Wearable Sync</h2>
          <p>Real-time physiological telemetry ingested from native health sync (Apple Health, Health Connect, Bluetooth sensors).</p>
        </div>

        <button 
          className="health-button health-button-primary"
          disabled={syncing}
          style={{ minHeight: 44 }}
          onClick={syncDevices}
        >
          <RefreshCw size={16} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing Sensors...' : 'Sync Wearables Now'}
        </button>
      </div>

      {/* Sync Status Banner */}
      <div className="wf-card" style={{ padding: 14, marginBottom: 20, background: 'var(--surface-subtle, #f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={18} color="#2563eb" />
          <span style={{ fontSize: 13 }}>Connected Sources: <strong>Apple HealthKit · Noise ColorFit Watch</strong></span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Last synced: {lastSynced}</span>
      </div>

      {/* Vitals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {vitals.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div key={idx} className="wf-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="care-eyebrow" style={{ margin: 0 }}>{item.title}</span>
                <IconComponent size={20} color={item.color} />
              </div>
              <h3 style={{ fontSize: 26, margin: '4px 0 6px' }}>{item.value}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.trend}</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flagged Clinical Telemetry Log */}
      <div className="wf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} color="#10b981" /> Telemetry Stability Log
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          No out-of-range clinical flags detected in the last 72 hours. Automatic baseline monitor active for heart rate spikes and fever thresholds.
        </p>
      </div>
    </div>
  );
}
