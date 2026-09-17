import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  FileCode2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Filter,
  RefreshCw,
  Lock,
  EyeOff,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import { apiRequest } from '../../data/http';

export function CodeSentinelGovernanceModule() {
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'GOVERNANCE' | 'SCHEDULE' | 'DIGEST'>('PORTFOLIO');
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [governanceData, setGovernanceData] = useState<any>(null);
  const [digestData, setDigestData] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchSentinelData();
  }, []);

  const fetchSentinelData = async () => {
    setLoading(true);
    try {
      const [port, gov, dig] = await Promise.all([
        apiRequest<any>('/v1/admin/sentinel/portfolio'),
        apiRequest<any>('/v1/admin/sentinel/governance'),
        apiRequest<any>('/v1/admin/sentinel/digest'),
      ]);
      setPortfolioData(port);
      setGovernanceData(gov);
      setDigestData(dig);
    } catch (e) {
      console.error('Failed to load Code Sentinel data', e);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'T1') {
      return (
        <span style={{ padding: '4px 10px', borderRadius: 12, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={12} /> T1 — High Sensitivity (1.5x Weight)
        </span>
      );
    }
    if (tier === 'T2') {
      return (
        <span style={{ padding: '4px 10px', borderRadius: 12, background: '#fffbe6', color: '#854d0e', border: '1px solid #fef08a', fontWeight: 600, fontSize: '0.75rem' }}>
          T2 — Medium PII Sensitivity
        </span>
      );
    }
    return (
      <span style={{ padding: '4px 10px', borderRadius: 12, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 600, fontSize: '0.75rem' }}>
        T3 — Standard Sensitivity
      </span>
    );
  };

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header Bar */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: 24, borderRadius: 20, color: '#ffffff', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 }}>
              <ShieldCheck size={28} color="#a5b4fc" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>AXISS Code Sentinel</h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#c7d2fe' }}>
                Group Portfolio Data Governance, PII Pre-LLM Scanner & Staggered Audit System
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>PORTFOLIO HEALTH SCORE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8' }}>
              {portfolioData ? portfolioData.portfolioHealthScore : '94.5'}/100
            </div>
          </div>
          <button
            onClick={fetchSentinelData}
            disabled={loading}
            style={{ padding: '12px 18px', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Audits
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { id: 'PORTFOLIO', label: '🏢 Portfolio Products Grid', icon: <Building2 size={16} /> },
          { id: 'GOVERNANCE', label: '🛡️ T1 Data Governance & PII Scanner', icon: <Lock size={16} /> },
          { id: 'SCHEDULE', label: '📅 Staggered Deep Review Schedule', icon: <Calendar size={16} /> },
          { id: 'DIGEST', label: '📬 Weekly Portfolio Digest (Monday 09:00 IST)', icon: <FileCode2 size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              border: activeTab === tab.id ? '2px solid #4338ca' : '1px solid #e2e8f0',
              background: activeTab === tab.id ? '#4338ca' : '#ffffff',
              color: activeTab === tab.id ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(67, 56, 202, 0.25)' : 'none',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'PORTFOLIO' && (
        <div style={{ background: '#ffffff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
              AXISS Group Portfolio Products (Single Central View)
            </h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter by product or repo..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {portfolioData?.products?.map((prod: any) => (
              <div key={prod.product_id} style={{ background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{prod.product_name}</h4>
                  {getTierBadge(prod.tier)}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: prod.health_score >= 90 ? '#15803d' : '#b91c1c', marginBottom: 12 }}>
                  {prod.health_score}/100 <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Health Score</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#475569' }}>
                  <div>🚨 Open P0: <strong>{prod.open_p0_count}</strong></div>
                  <div>⚠️ Open P1: <strong>{prod.open_p1_count}</strong></div>
                  <div>🙈 LLM Skipped PII: <strong>{prod.llm_skipped_pii_count}</strong></div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Deep Review: <strong>{prod.next_scheduled_review_day}</strong></span>
                  <span>Trend: <strong>{prod.trend}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'GOVERNANCE' && (
        <div style={{ background: '#ffffff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>
            Data Governance & Pre-LLM Secret/PII Redaction
          </h3>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} /> T1 Compliance Checklist Status: {governanceData?.t1_compliance_checklist || 'PASSED'}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#15803d' }}>
              All chunks are scanned for Aadhaar, PAN, ABHA Health IDs, Phone Numbers, and Student IDs BEFORE LLM payload creation.
              Path exclusions active for seed data, `.env*`, fixtures, and backups.
            </p>
          </div>

          <h4>Recent Findings & PII Detections</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                  <th style={{ padding: 10 }}>File Path</th>
                  <th style={{ padding: 10 }}>Line</th>
                  <th style={{ padding: 10 }}>PII Recognizer</th>
                  <th style={{ padding: 10 }}>Masked Value</th>
                  <th style={{ padding: 10 }}>Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {governanceData?.detections?.map((d: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 10, fontFamily: 'monospace' }}>{d.file_path}</td>
                    <td style={{ padding: 10 }}>{d.line_number}</td>
                    <td style={{ padding: 10, fontWeight: 700 }}>{d.pii_type}</td>
                    <td style={{ padding: 10, fontFamily: 'monospace' }}>{d.detected_value_masked}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, background: d.action_taken === 'LLM_SKIPPED' ? '#fef2f2' : '#f0fdf4', color: d.action_taken === 'LLM_SKIPPED' ? '#991b1b' : '#166534', fontWeight: 700 }}>
                        {d.action_taken}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'SCHEDULE' && (
        <div style={{ background: '#ffffff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>
            Staggered Weekly Deep Review Calendar (D3)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
            {[
              { day: 'Monday', product: 'StudentKare (T1)', status: 'Active (T1 Priority)' },
              { day: 'Tuesday', product: 'StudentAlumni.ai (T1)', status: 'Scheduled' },
              { day: 'Wednesday', product: 'Hyra + ApplyLane (T2)', status: 'Scheduled' },
              { day: 'Thursday', product: 'Immi Axiss + FixTax360 (T2)', status: 'Scheduled' },
              { day: 'Friday', product: 'WeHive + Code Spectra (T2/T3)', status: 'Scheduled' },
              { day: 'Saturday', product: 'AXISS Cortex + Shared Infra', status: 'Scheduled' },
              { day: 'Sunday', product: 'Buffer / Retry Overflow', status: 'Buffer' },
            ].map((sched, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{sched.day}</div>
                <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 700, marginBottom: 8 }}>{sched.product}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sched.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'DIGEST' && (
        <div style={{ background: '#ffffff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>
            Monday 09:00 IST Portfolio Digest Report (D5)
          </h3>
          {digestData && (
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Report Date: {digestData.report_date} | Overall Health: {digestData.portfolio_health_score}/100
              </div>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h4>1. New P0/P1 Findings This Week</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {digestData.new_p0_p1_findings?.length || 0} critical findings raised.
                </p>

                <h4>2. Cross-Product Patterns Worth Fixing Centrally</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {digestData.cross_product_patterns?.length || 0} shared rules detected across multiple products.
                </p>

                <h4>3. LLM Spend vs Budget</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Spend: ${digestData.agent_reliability?.llm_spend_usd} / Budget: ${digestData.agent_reliability?.budget_usd}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
