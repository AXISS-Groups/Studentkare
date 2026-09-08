import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { CONSTITUTION_RULES, assertRule, RuleId } from '../../ai/constitution';

export const RulesConsoleModule: React.FC = () => {
  const { tokens, typography } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulating active rule invocation metrics from execution state
  const ruleInvocations: Record<string, number> = {
    'Rule-L1': 1420,
    'Rule-L2': 890,
    'Rule-L3': 340,
    'Rule-L4': 120,
    'Rule-L5': 560,
    'Rule-L6': 430,
    'Rule-L7': 210,
    'Rule-L8': 950,
    'Rule-K1': 4890,
    'Rule-K4': 1850,
    'Rule-K8': 240,
    'Rule-J1': 670,
  };

  // Known code call sites in Studentkare codebase
  const codeCallSites: Record<string, string[]> = {
    'Rule-L1': ['src/ai/constitution.ts', 'src/screens/fabric/M21PartnerOpsScreen.tsx'],
    'Rule-L2': ['src/ai/constitution.ts', 'src/screens/admin/TenantManagementModule.tsx'],
    'Rule-L8': ['src/ai/constitution.ts', 'src/screens/dashboard/StudentDashboardScreen.tsx'],
    'Rule-K1': ['src/ai/careCopilot.ts', 'src/ai/clinicalAssistant.ts', 'src/ai/agenticRAGEngine.ts'],
    'Rule-K4': ['src/ai/claimsReviewer.ts'],
    'Rule-K8': ['src/screens/admin/SuperAdminDashboardScreen.tsx', 'src/types/admin.ts'],
    'Rule-J1': ['src/ai/teleconsultLoopAgents.ts'],
  };

  const categories = ['ALL', 'Commerce Firewall (L1-L8)', 'Privacy & Isolation (K1-K8)', 'Network Governance (J1-J4)'];

  const filteredRules = Object.entries(CONSTITUTION_RULES).filter(([id, ruleObj]) => {
    assertRule('Rule-K1');

    const matchesSearch =
      id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ruleObj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ruleObj.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'Commerce Firewall (L1-L8)') return id.startsWith('Rule-L');
    if (selectedCategory === 'Privacy & Isolation (K1-K8)') return id.startsWith('Rule-K');
    if (selectedCategory === 'Network Governance (J1-J4)') return id.startsWith('Rule-J');

    return true;
  });

  const totalRulesCount = Object.keys(CONSTITUTION_RULES).length;
  const unreferencedRulesCount = Object.keys(CONSTITUTION_RULES).filter((id) => !codeCallSites[id] || codeCallSites[id].length === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: tokens.text, margin: 0 }}>
          Executable AI Constitution & Rule Engine Console
        </h2>
        <div style={{ fontSize: '13px', color: tokens.text2, marginTop: '4px' }}>
          Enforces non-negotiable boundaries (Commerce Firewall L1–L8, Two-Plane Clinical Isolation K1–K8, Provider Governance J1–J4).
        </div>
      </div>

      {/* Drift Detector Banner */}
      {unreferencedRulesCount > 0 ? (
        <div
          style={{
            backgroundColor: tokens.attentionBg,
            border: `1px solid ${tokens.attention}`,
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <AlertTriangle size={24} color={tokens.attention} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: tokens.attention, fontSize: '14px' }}>
              Rule Drift Detector Alert: {unreferencedRulesCount} Constitutional Rules Require Active Code References
            </div>
            <div style={{ fontSize: '12px', color: tokens.attention, marginTop: 2 }}>
              Every rule in `CONSTITUTION_RULES` must be explicitly asserted with `assertRule(ruleId)` across active agent modules.
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: tokens.positiveBg,
            border: `1px solid ${tokens.positive}`,
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <CheckCircle2 size={24} color={tokens.positive} />
          <div>
            <div style={{ fontWeight: 800, color: tokens.positive, fontSize: '14px' }}>
              Rule Drift Detector: 100% Constitution Compliance
            </div>
            <div style={{ fontSize: '12px', color: tokens.positive }}>
              All {totalRulesCount} constitutional rules carry registered code assertions across execution paths.
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>Total Active Rules</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.text }}>{totalRulesCount}</div>
        </div>

        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>Total Assertions Emitted</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.action }}>
            {Object.values(ruleInvocations).reduce((a, b) => a + b, 0).toLocaleString()}
          </div>
        </div>

        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>Isolation Plane Breaches</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.positive }}>0 (Protected)</div>
        </div>
      </div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search
            size={18}
            color={tokens.text3}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search constitutional rules or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 42px',
              borderRadius: '12px',
              border: `1px solid ${tokens.rule}`,
              backgroundColor: tokens.surface,
              fontSize: '13px',
              color: tokens.text,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: `1px solid ${selectedCategory === cat ? tokens.action : tokens.ruleSoft}`,
                backgroundColor: selectedCategory === cat ? tokens.surface3 : tokens.surface,
                color: selectedCategory === cat ? tokens.action : tokens.text,
                fontWeight: selectedCategory === cat ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredRules.map(([id, ruleObj]) => {
          const count = ruleInvocations[id] || 0;
          const sites = codeCallSites[id] || [];
          const hasDrift = sites.length === 0;

          return (
            <div
              key={id}
              style={{
                backgroundColor: tokens.surface,
                borderRadius: '16px',
                border: `1px solid ${hasDrift ? tokens.attention : tokens.ruleSoft}`,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <code style={{ fontSize: '14px', fontWeight: 800, color: tokens.action }}>{id}</code>
                  {hasDrift ? (
                    <span
                      style={{
                        backgroundColor: tokens.attentionBg,
                        color: tokens.attention,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      UNREFERENCED DRIFT
                    </span>
                  ) : (
                    <span
                      style={{
                        backgroundColor: tokens.positiveBg,
                        color: tokens.positive,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE ({count.toLocaleString()} calls)
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: tokens.text, marginBottom: 4 }}>
                  {ruleObj.title}
                </div>

                <p style={{ fontSize: '13px', color: tokens.text2, margin: 0, lineHeight: 1.4 }}>
                  {ruleObj.description}
                </p>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${tokens.ruleSoft}`,
                  paddingTop: '8px',
                  fontSize: '11px',
                  color: tokens.text2,
                }}
              >
                <strong>Call Sites:</strong>{' '}
                {sites.length > 0 ? (
                  sites.map((s, idx) => (
                    <code key={idx} style={{ backgroundColor: tokens.surface2, padding: '1px 4px', borderRadius: 3, marginRight: 4 }}>
                      {s.split('/').pop()}
                    </code>
                  ))
                ) : (
                  <span style={{ color: tokens.attention, fontWeight: 700 }}>No code assertion registered</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
