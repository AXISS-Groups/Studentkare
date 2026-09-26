import React from 'react';
import { Award } from 'lucide-react';
import '../../theme/workflows.css';

export function CampusHealthScorecardScreen() {
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">INSTITUTIONAL BENCHMARK</span>
          <h2>Campus Health Rating Scorecard & Audit Index</h2>
          <p>Composite health governance rating based on immunization coverage, sanitary audits, and ambulance SLAs.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 28, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>OVERALL HEALTH GOVERNANCE GRADE</span>
            <h3 style={{ fontSize: 36, marginTop: 4, color: '#34d399' }}>Grade A+ (98.4 / 100)</h3>
            <p style={{ fontSize: 13, color: '#cbd5e1', margin: '4px 0 0' }}>
              IIT Hyderabad (Kandi Campus) · Certified Health-First Campus 2026
            </p>
          </div>
          <Award size={64} color="#34d399" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">IMMUNIZATION COVERAGE</span>
          <h3 style={{ fontSize: 24, margin: '6px 0 4px', color: '#10b981' }}>100% Compliant</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>All 8,200 students verified</p>
        </div>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">AMBULANCE RESPONSE SLA</span>
          <h3 style={{ fontSize: 24, margin: '6px 0 4px', color: 'var(--accent, #2563eb)' }}>4.2 mins</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Target &lt; 6 mins</p>
        </div>
        <div className="wf-card" style={{ padding: 20 }}>
          <span className="care-eyebrow">SANITARY AUDIT GRADE</span>
          <h3 style={{ fontSize: 24, margin: '6px 0 4px' }}>99.2% Passed</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Water & Mess Hygiene</p>
        </div>
      </div>
    </div>
  );
}
