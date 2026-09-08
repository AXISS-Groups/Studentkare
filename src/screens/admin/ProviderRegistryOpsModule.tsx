import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import { assertRule } from '../../ai/constitution';

export interface ProviderPanelSummary {
  pincode: string;
  locationName: string;
  activeProviderCount: number;
  slaComplianceRate: number;
  staleListingCount: number;
  ruleJ1Violation: boolean;
}

export const ProviderRegistryOpsModule: React.FC = () => {
  const { tokens, typography } = useTheme();
  assertRule('Rule-J1'); // Deterministic provider routing rule

  const [panels, setPanels] = useState<ProviderPanelSummary[]>([
    {
      pincode: '500032',
      locationName: 'Gachibowli / Financial District',
      activeProviderCount: 1, // Rule-J1 breach (< 2 providers)
      slaComplianceRate: 94.2,
      staleListingCount: 3,
      ruleJ1Violation: true,
    },
    {
      pincode: '500081',
      locationName: 'Madhapur / Hitech City',
      activeProviderCount: 4,
      slaComplianceRate: 98.8,
      staleListingCount: 0,
      ruleJ1Violation: false,
    },
    {
      pincode: '500007',
      locationName: 'Tarnaka / Osmania Campus',
      activeProviderCount: 5,
      slaComplianceRate: 99.1,
      staleListingCount: 1,
      ruleJ1Violation: false,
    },
    {
      pincode: '502285',
      locationName: 'Kandi / Sangareddy (IIT-H)',
      activeProviderCount: 1, // Rule-J1 breach (< 2 providers)
      slaComplianceRate: 91.5,
      staleListingCount: 2,
      ruleJ1Violation: true,
    },
  ]);

  const [refreshingPincode, setRefreshingPincode] = useState<string | null>(null);

  const handleRefreshPanel = (pincode: string) => {
    setRefreshingPincode(pincode);
    setTimeout(() => {
      setPanels((prev) =>
        prev.map((p) =>
          p.pincode === pincode
            ? {
                ...p,
                activeProviderCount: p.activeProviderCount < 2 ? 3 : p.activeProviderCount,
                staleListingCount: 0,
                ruleJ1Violation: false,
              }
            : p
        )
      );
      setRefreshingPincode(null);
    }, 800);
  };

  const j1ViolationsCount = panels.filter((p) => p.ruleJ1Violation).length;

  return (
    <div style={{ backgroundColor: tokens.surface, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}`, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: tokens.text, fontFamily: typography.fontFamily, margin: 0 }}>
            M19 Provider Registry Operations (SA-1.6)
          </h2>
          <p style={{ fontSize: 12, color: tokens.text3, margin: '4px 0 0 0' }}>
            Pincode coverage gaps, vendor SLA metrics, stale listing purges, and Rule-J1 minimum panel enforcement.
          </p>
        </div>

        {j1ViolationsCount > 0 ? (
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.emergencyBg, color: tokens.emergency, padding: '6px 12px', borderRadius: 8, fontWeight: 800 }}>
            🚨 {j1ViolationsCount} RULE-J1 PANEL VIOLATIONS DETECTED
          </span>
        ) : (
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.positiveBg, color: tokens.positive, padding: '6px 12px', borderRadius: 8, fontWeight: 800 }}>
            ✓ ALL PANELS COMPLIANT WITH RULE-J1
          </span>
        )}
      </div>

      {/* Rules Notice */}
      <div style={{ backgroundColor: tokens.surface2, border: `1px solid ${tokens.rule}`, borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 12 }}>
        <div style={{ fontWeight: 800, color: tokens.text, fontFamily: typography.fontMono }}>
          RULE-J1 COVERAGE RULE (MINIMUM 2 LIVE PROVIDERS PER PINCODE)
        </div>
        <div style={{ color: tokens.text2, marginTop: 4 }}>
          Every covered pincode must retain at least 2 active, verified providers on panel. Panels with fewer than 2 providers raise a Rule-J1 violation and trigger emergency vendor recruitment.
        </div>
      </div>

      {/* Panels Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${tokens.rule}`, textAlign: 'left', color: tokens.text3, fontFamily: typography.fontMono }}>
              <th style={{ padding: '10px 12px' }}>PINCODE</th>
              <th style={{ padding: '10px 12px' }}>LOCATION / CLUSTER</th>
              <th style={{ padding: '10px 12px' }}>ACTIVE PROVIDERS</th>
              <th style={{ padding: '10px 12px' }}>SLA COMPLIANCE</th>
              <th style={{ padding: '10px 12px' }}>STALE LISTINGS</th>
              <th style={{ padding: '10px 12px' }}>RULE-J1 STATUS</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {panels.map((p) => (
              <tr key={p.pincode} style={{ borderBottom: `1px solid ${tokens.ruleSoft}`, backgroundColor: p.ruleJ1Violation ? 'rgba(230,57,70,0.03)' : 'transparent' }}>
                <td style={{ padding: '12px', fontFamily: typography.fontMono, fontWeight: 800, color: tokens.text }}>{p.pincode}</td>
                <td style={{ padding: '12px', fontWeight: 700, color: tokens.text }}>{p.locationName}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontWeight: 800, color: p.activeProviderCount < 2 ? tokens.emergency : tokens.text }}>
                    {p.activeProviderCount} Live Providers
                  </span>
                </td>
                <td style={{ padding: '12px', color: p.slaComplianceRate < 95 ? tokens.attention : tokens.positive, fontWeight: 700 }}>
                  {p.slaComplianceRate}%
                </td>
                <td style={{ padding: '12px', color: p.staleListingCount > 0 ? tokens.attention : tokens.text3 }}>
                  {p.staleListingCount} stale
                </td>
                <td style={{ padding: '12px' }}>
                  {p.ruleJ1Violation ? (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, backgroundColor: tokens.emergencyBg, color: tokens.emergency, fontFamily: typography.fontMono }}>
                      VIOLATION (&lt; 2 PROVIDERS)
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, backgroundColor: tokens.positiveBg, color: tokens.positive, fontFamily: typography.fontMono }}>
                      PASS
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleRefreshPanel(p.pincode)}
                    disabled={refreshingPincode === p.pincode}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      backgroundColor: p.ruleJ1Violation ? tokens.emergency : tokens.surface3,
                      color: p.ruleJ1Violation ? '#ffffff' : tokens.text,
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {refreshingPincode === p.pincode ? 'Syncing...' : p.ruleJ1Violation ? 'Recruit & Auto-Refresh' : 'Refresh Roster'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
