import React, { useState } from 'react';
import { ShieldAlert, Droplets, Utensils, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import '../../theme/workflows.css';

interface BlockTelemetry {
  blockCode: string;
  blockName: string;
  feverCount: number;
  gastroCount: number;
  respiratoryCount: number;
  thresholdBreached: boolean;
  waterAuditTaskDispatched: boolean;
}

export function HostelOutbreakEarlyWarningRadar() {
  const [telemetries, setTelemetries] = useState<BlockTelemetry[]>([
    { blockCode: 'BLK-A', blockName: 'Hostel Block A (Ramanujan Hall)', feverCount: 2, gastroCount: 1, respiratoryCount: 3, thresholdBreached: false, waterAuditTaskDispatched: false },
    { blockCode: 'BLK-B', blockName: 'Hostel Block B (Aryabhata Hall)', feverCount: 6, gastroCount: 5, respiratoryCount: 2, thresholdBreached: true, waterAuditTaskDispatched: true },
    { blockCode: 'BLK-C', blockName: 'Hostel Block C (Sarojini Naidu Hall)', feverCount: 1, gastroCount: 0, respiratoryCount: 1, thresholdBreached: false, waterAuditTaskDispatched: false }
  ]);

  const dispatchWaterAudit = (code: string) => {
    setTelemetries(telemetries.map(t => t.blockCode === code ? { ...t, waterAuditTaskDispatched: true } : t));
  };

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">HOSTEL TELEMETRY & RULE L $k \ge 5$ PRIVACY</span>
          <h2>Hostel Outbreak Early Warning Radar</h2>
          <p>Automated cluster detection comparing symptom reports across hostel blocks without compromising individual student identities.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {telemetries.map(item => (
          <div key={item.blockCode} style={{
            border: item.thresholdBreached ? '2px solid var(--emergency, #ef4444)' : '1px solid var(--border)',
            borderRadius: 12,
            padding: 18,
            background: item.thresholdBreached ? 'rgba(239, 68, 68, 0.02)' : 'var(--surface-card, #fff)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{item.blockName}</strong> (<code>{item.blockCode}</code>)
                
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
                  <span>Fever: <strong style={{ color: item.feverCount >= 5 ? '#ef4444' : 'inherit' }}>{item.feverCount} cases</strong></span>
                  <span>Gastro: <strong style={{ color: item.gastroCount >= 5 ? '#ef4444' : 'inherit' }}>{item.gastroCount} cases</strong></span>
                  <span>Respiratory: <strong>{item.respiratoryCount} cases</strong></span>
                </div>
              </div>

              <div>
                {item.thresholdBreached ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#991b1b', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                      ⚠️ Outbreak Threshold Breached (&ge; 5 Cases)
                    </span>

                    {item.waterAuditTaskDispatched ? (
                      <span style={{ fontSize: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={14} /> Mess Water & Kitchen Audit Dispatched
                      </span>
                    ) : (
                      <button 
                        className="health-button"
                        style={{ background: '#ef4444', color: '#fff', border: 'none', minHeight: 36, fontSize: 12, fontWeight: 700 }}
                        onClick={() => dispatchWaterAudit(item.blockCode)}
                      >
                        <Droplets size={14} /> Dispatch Water & Kitchen Audit Task
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                    Normal Baseline
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
