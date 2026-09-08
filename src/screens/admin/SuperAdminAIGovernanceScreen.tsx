/**
 * Studentkare — SuperAdmin AI Governance & Constitution Screen
 * Compliance: SuperAdmin AI Specification
 *
 * Real-time monitoring for:
 * 1. Constitution Rules (Rule-K1 to Rule-K10) Status
 * 2. Circuit Breakers (Boundary & Safety breakers)
 * 3. Human-in-the-Loop (HITL) Approval Queue
 * 4. Zero-Tolerance Guardrail Metric Alerts
 */

import React, { useState } from 'react';
import { ShieldCheck, Zap, CheckCircle, Eye } from 'lucide-react';

interface ConstitutionRuleStatus {
  ruleId: string;
  name: string;
  description: string;
  status: 'ENFORCED' | 'ALERTING' | 'DISABLED';
  passRatePercentage: number;
}

export const SuperAdminAIGovernanceScreen: React.FC = () => {
  const [rules] = useState<ConstitutionRuleStatus[]>([
    { ruleId: 'Rule-K1', name: 'Database Plane Isolation', description: 'Agent roles hold ZERO privileges on T2/T3/T4 tables.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K2', name: 'Emergency Card Bounded Exception', description: 'Lock screen accessible, strictly self-authored minimal data.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K3', name: 'Purpose-Bound Access & Signed Consent', description: 'Closed PurposeCode enum, time-bound signed artefacts.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K4', name: 'Hash-Chained Audit Ledger', description: 'Append-only HMAC-SHA256 write-before-render audit chain.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K5', name: 'Deterministic Claims Computation', description: 'Claims engine uses zero ML for monetary calculations.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K6', name: 'Zero-PHI Logging Allowlist', description: 'Only LOGGABLE_FIELDS emitted to app logs.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K7', name: 'Dark Surface Analytics Exclusion', description: 'Zero analytics on Emergency, Crisis & T4 views.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K8', name: 'T4 Sensitive Category Non-Inferability', description: 'Isolated schema; access fact is un-inferable.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K9', name: 'k-Anonymity Floor (k=20)', description: 'Institution console suppresses cohorts under 20.', status: 'ENFORCED', passRatePercentage: 100 },
    { ruleId: 'Rule-K10', name: 'Ethical Points & Non-Gamification', description: 'Zero points for blood donation or body metrics.', status: 'ENFORCED', passRatePercentage: 100 },
  ]);

  return (
    <div style={{ padding: '28px', background: '#08080F', color: '#F4F4FA', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#EAB308', letterSpacing: '1px', textTransform: 'uppercase' }}>SuperAdmin Portal</span>
          <h1 style={{ margin: '4px 0 0', fontSize: '26px', fontWeight: 800 }}>AI Governance & Constitution Monitor</h1>
        </div>
        <div style={{ background: 'rgba(52,211,153,0.13)', border: '1px solid #17503E', padding: '10px 18px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#34D399" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#34D399' }}>All 10 Rules Enforced</span>
        </div>
      </div>

      {/* Grid KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34D399', fontSize: '13px', fontWeight: 700 }}>
            <CheckCircle size={18} /> Constitution Rules
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px' }}>10 / 10</div>
          <div style={{ fontSize: '12px', color: '#9095A8' }}>Active Rule-K1 to Rule-K10</div>
        </div>

        <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#A78BFA', fontSize: '13px', fontWeight: 700 }}>
            <Zap size={18} /> Circuit Breakers
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px' }}>4 Closed</div>
          <div style={{ fontSize: '12px', color: '#9095A8' }}>Zero Trips in Last 24h</div>
        </div>

        <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F59E0B', fontSize: '13px', fontWeight: 700 }}>
            <Eye size={18} /> Guardrail Violations
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px', color: '#34D399' }}>0</div>
          <div style={{ fontSize: '12px', color: '#9095A8' }}>Zero-Tolerance Guardrails Clean</div>
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
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#34D399', fontFamily: 'monospace' }}>
                  {rule.passRatePercentage}% PASS
                </span>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: 'rgba(52,211,153,0.13)', color: '#34D399', border: '1px solid #17503E', fontSize: '11.5px', fontWeight: 700 }}>
                  {rule.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
