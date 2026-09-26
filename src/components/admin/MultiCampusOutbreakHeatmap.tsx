import React, { useState } from 'react';
import { MapPin, Power } from 'lucide-react';
import '../../theme/workflows.css';

interface CampusNode {
  id: string;
  name: string;
  location: string;
  activeStudents: number;
  riskScore: 'LOW' | 'MODERATE' | 'HIGH_ALERT';
  symptomCluster: string;
  quarantineCount: number;
  aiGuardStatus: 'ACTIVE' | 'PAUSED';
}

export function MultiCampusOutbreakHeatmap() {
  const [campuses, setCampuses] = useState<CampusNode[]>([
    {
      id: 'c-iith',
      name: 'IIT Hyderabad (Kandi Campus)',
      location: 'Sangareddy, Telangana',
      activeStudents: 8200,
      riskScore: 'MODERATE',
      symptomCluster: 'Fever & Respiratory (12 cases)',
      quarantineCount: 2,
      aiGuardStatus: 'ACTIVE'
    },
    {
      id: 'c-ou',
      name: 'Osmania University',
      location: 'Hyderabad, Telangana',
      activeStudents: 24500,
      riskScore: 'LOW',
      symptomCluster: 'Normal Baseline (0 active clusters)',
      quarantineCount: 0,
      aiGuardStatus: 'ACTIVE'
    },
    {
      id: 'c-bits',
      name: 'BITS Pilani Hyderabad Campus',
      location: 'Jawaharnagar, Telangana',
      activeStudents: 6100,
      riskScore: 'HIGH_ALERT',
      symptomCluster: 'Acute Gastroenteritis (18 cases in Hostel Block 3)',
      quarantineCount: 5,
      aiGuardStatus: 'ACTIVE'
    }
  ]);

  const toggleAiGuard = (id: string) => {
    setCampuses(campuses.map(c => c.id === id ? { ...c, aiGuardStatus: c.aiGuardStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : c));
  };

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">NATIONAL MULTI-CAMPUS GIS COMMAND</span>
          <h2>Cross-Campus Epidemic Radar & AI Governance Map</h2>
          <p>Real-time telemetry across onboarded university campuses with 1-click AI & ABDM service isolation switches.</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 12px', borderRadius: 999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ● 3 Campuses Online
          </span>
        </div>
      </div>

      {/* Simulated Map Visual Container */}
      <div style={{
        height: 180,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center' }}>
          <MapPin size={28} color="#f59e0b" style={{ margin: '0 auto 4px' }} />
          <strong style={{ fontSize: 13, display: 'block' }}>IIT Hyderabad</strong>
          <span style={{ fontSize: 11, color: '#fcd34d' }}>Moderate Risk (Score 42)</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <MapPin size={28} color="#10b981" style={{ margin: '0 auto 4px' }} />
          <strong style={{ fontSize: 13, display: 'block' }}>Osmania University</strong>
          <span style={{ fontSize: 11, color: '#6ee7b7' }}>Low Risk (Score 10)</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <MapPin size={28} color="#ef4444" style={{ margin: '0 auto 4px' }} />
          <strong style={{ fontSize: 13, display: 'block' }}>BITS Hyderabad</strong>
          <span style={{ fontSize: 11, color: '#fca5a5' }}>High Alert (Score 88)</span>
        </div>
      </div>

      {/* Campus Nodes Roster */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {campuses.map(node => (
          <div key={node.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface-card, #fff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{node.name}</strong> <small style={{ color: 'var(--text-secondary)' }}>({node.location})</small>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Students: <strong>{node.activeStudents.toLocaleString()}</strong> · Quarantine: <strong>{node.quarantineCount} isolated</strong>
                </p>
                <p style={{ fontSize: 13, color: node.riskScore === 'HIGH_ALERT' ? 'var(--emergency, #ef4444)' : 'inherit', marginTop: 2 }}>
                  Active Telemetry: <strong>{node.symptomCluster}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                  background: node.riskScore === 'HIGH_ALERT' ? 'rgba(239, 68, 68, 0.1)' : node.riskScore === 'MODERATE' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: node.riskScore === 'HIGH_ALERT' ? '#991b1b' : node.riskScore === 'MODERATE' ? '#92400e' : '#065f46'
                }}>
                  {node.riskScore.replace(/_/g, ' ')}
                </span>

                <button 
                  className="health-button"
                  style={{
                    minHeight: 36, fontSize: 12,
                    background: node.aiGuardStatus === 'ACTIVE' ? 'var(--surface-subtle, #f8fafc)' : 'rgba(239, 68, 68, 0.1)',
                    color: node.aiGuardStatus === 'ACTIVE' ? 'var(--text)' : '#ef4444',
                    borderColor: node.aiGuardStatus === 'ACTIVE' ? 'var(--border)' : '#ef4444'
                  }}
                  onClick={() => toggleAiGuard(node.id)}
                >
                  <Power size={14} /> {node.aiGuardStatus === 'ACTIVE' ? 'Isolate AI Service' : 'Resume AI Service'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
