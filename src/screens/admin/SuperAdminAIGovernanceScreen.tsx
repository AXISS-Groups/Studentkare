/**
 * Studentkare — SuperAdmin AI Governance & Constitution Screen
 * Compliance: SuperAdmin AI Specification (G0.0 / Gate 0)
 *
 * Evaluates compliance assertions dynamically against M35 audit evidence.
 * All compliance assertions return UNKNOWN until cryptographic audit ledger evidence exists.
 */

import React, { useState } from 'react';
import { ShieldAlert, Zap, AlertCircle, Eye } from 'lucide-react';
import { evaluateComplianceAssertion } from '../../lib/complianceStub';

const RULE_DEFINITIONS = [
  { ruleId: 'Rule-K1', name: 'Database Plane Isolation', description: 'Agent roles hold ZERO privileges on T2/T3/T4 tables.' },
  { ruleId: 'Rule-K2', name: 'Emergency Card Bounded Exception', description: 'Lock screen accessible, strictly self-authored minimal data.' },
  { ruleId: 'Rule-K3', name: 'Purpose-Bound Access & Signed Consent', description: 'Closed PurposeCode enum, time-bound signed artefacts.' },
  { ruleId: 'Rule-K4', name: 'Hash-Chained Audit Ledger', description: 'Append-only HMAC-SHA256 write-before-render audit chain.' },
  { ruleId: 'Rule-K5', name: 'Deterministic Claims Computation', description: 'Claims engine uses zero ML for monetary calculations.' },
  { ruleId: 'Rule-K6', name: 'Zero-PHI Logging Allowlist', description: 'Only LOGGABLE_FIELDS emitted to app logs.' },
  { ruleId: 'Rule-K7', name: 'Dark Surface Analytics Exclusion', description: 'Zero analytics on Emergency, Crisis & T4 views.' },
  { ruleId: 'Rule-K8', name: 'T4 Sensitive Category Non-Inferability', description: 'Isolated schema; access fact is un-inferable.' },
  { ruleId: 'Rule-K9', name: 'k-Anonymity Floor (k=20)', description: 'Institution console suppresses cohorts under 20.' },
  { ruleId: 'Rule-K10', name: 'Ethical Points & Non-Gamification', description: 'Zero points for blood donation or body metrics.' },
];

export const SuperAdminAIGovernanceScreen: React.FC = () => {
  const [rules] = useState(() =>
    RULE_DEFINITIONS.map((def) => ({
      ...def,
      assertion: evaluateComplianceAssertion(def.ruleId, def.name),
    }))
  );

  return (
    <div style={{ padding: '28px', background: '#08080F', color: '#F4F4FA', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#EAB308', letterSpacing: '1px', textTransform: 'uppercase' }}>SuperAdmin Portal</span>
          <h1 style={{ margin: '4px 0 0', fontSize: '26px', fontWeight: 800 }}>AI Governance & Constitution Monitor</h1>
        </div>
        <div style={{ background: 'rgba(234,179,8,0.13)', border: '1px solid #854D0E', padding: '10px 18px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="#EAB308" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAB308' }}>Compliance Status: UNKNOWN (Awaiting M35 Evidence)</span>
        </div>
      </div>

      {/* Grid KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#EAB308', fontSize: '13px', fontWeight: 700 }}>
            <AlertCircle size={18} /> Constitution Rules
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px' }}>0 Verified</div>
          <div style={{ fontSize: '12px', color: '#9095A8' }}>Awaiting M35 Ledger Cryptographic Proof</div>
        </div>

        <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#A78BFA', fontSize: '13px', fontWeight: 700 }}>
            <Zap size={18} /> Circuit Breakers
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px' }}>4 Standard</div>
          <div style={{ fontSize: '12px', color: '#9095A8' }}>Circuit Breaker Controls Active</div>
        </div>

        <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F59E0B', fontSize: '13px', fontWeight: 700 }}>
            <Eye size={18} /> Guardrail Status
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px', color: '#EAB308' }}>UNKNOWN</div>
          <div style={{ fontSize: '12px', color: '#9095A8' }}>Pending Audit Ledger Chains</div>
        </div>
      </div>

      {/* Constitution Rules Table */}
      <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Constitution Rule Registry (Rule-K1 to Rule-K10)</h3>

        <div style={{ display: 'grid', gap: '12px' }}>
          {rules.map((rule) => (
            <div key={rule.ruleId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#14141F', border: '1px solid #1F1F30', borderRadius: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#EAB308', background: 'rgba(234,179,8,0.12)', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                    {rule.ruleId}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{rule.name}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#9095A8', marginTop: '4px' }}>{rule.description}</div>
                <div style={{ fontSize: '11px', color: '#EAB308', marginTop: '2px' }}>{rule.assertion.notes}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: 'rgba(234,179,8,0.13)', color: '#EAB308', border: '1px solid #854D0E', fontSize: '11.5px', fontWeight: 700 }}>
                  {rule.assertion.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
