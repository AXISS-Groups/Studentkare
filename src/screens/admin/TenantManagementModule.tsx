import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  Building2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Search,
  X,
} from 'lucide-react';
import { assertRule } from '../../ai/constitution';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  tier: 'ENTERPRISE_CAMPUS' | 'PREMIUM_TIER' | 'BASIC_CLINIC';
  activeSeats: number;
  maxSeats: number;
  abdmFacilityId: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  joinedAt: string;
  rosterSyncHealth: 'SYNCED' | 'SYNCING' | 'LAGGING';
}

export const TenantManagementModule: React.FC = () => {
  const { tokens } = useTheme();

  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: 'inst_osmania_01',
      name: 'Osmania University',
      code: 'OU-HYD',
      tier: 'ENTERPRISE_CAMPUS',
      activeSeats: 24500,
      maxSeats: 30000,
      abdmFacilityId: 'IN3610002491',
      status: 'ACTIVE',
      joinedAt: '2025-08-15',
      rosterSyncHealth: 'SYNCED',
    },
    {
      id: 'inst_iith_02',
      name: 'IIT Hyderabad',
      code: 'IITH-KANDI',
      tier: 'PREMIUM_TIER',
      activeSeats: 8200,
      maxSeats: 10000,
      abdmFacilityId: 'IN3610002890',
      status: 'ACTIVE',
      joinedAt: '2025-10-01',
      rosterSyncHealth: 'SYNCED',
    },
    {
      id: 'inst_bits_03',
      name: 'BITS Pilani Hyderabad Campus',
      code: 'BITS-HYD',
      tier: 'PREMIUM_TIER',
      activeSeats: 5400,
      maxSeats: 7000,
      abdmFacilityId: 'IN3610003112',
      status: 'ACTIVE',
      joinedAt: '2026-01-10',
      rosterSyncHealth: 'SYNCED',
    },
    {
      id: 'inst_uoh_04',
      name: 'University of Hyderabad',
      code: 'UOH-GEC',
      tier: 'ENTERPRISE_CAMPUS',
      activeSeats: 11200,
      maxSeats: 12000,
      abdmFacilityId: 'IN3610004105',
      status: 'ACTIVE',
      joinedAt: '2026-03-20',
      rosterSyncHealth: 'LAGGING',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTier, setNewTier] = useState<'ENTERPRISE_CAMPUS' | 'PREMIUM_TIER' | 'BASIC_CLINIC'>('PREMIUM_TIER');
  const [newMaxSeats, setNewMaxSeats] = useState('5000');
  const [newAbdmFacilityId, setNewAbdmFacilityId] = useState('IN3610009999');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.abdmFacilityId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOnboardSubmit = () => {
    assertRule('Rule-L2'); // Commerce Firewall: Monetization via B2B Institutional Seat Licensing only
    setErrorMsg('');

    if (!newName.trim()) {
      setErrorMsg('Campus Name is required.');
      return;
    }
    if (!newCode.trim()) {
      setErrorMsg('Institution Code is required.');
      return;
    }
    if (!newAbdmFacilityId.trim()) {
      setErrorMsg('ABDM Health Facility ID is required for ABDM Milestone compliance.');
      return;
    }

    const newTenant: Tenant = {
      id: `inst_${newCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      tier: newTier,
      activeSeats: 0,
      maxSeats: parseInt(newMaxSeats, 10) || 5000,
      abdmFacilityId: newAbdmFacilityId.trim(),
      status: 'ACTIVE',
      joinedAt: new Date().toISOString().split('T')[0],
      rosterSyncHealth: 'SYNCED',
    };

    setTenants([newTenant, ...tenants]);
    setShowOnboardModal(false);
    setNewName('');
    setNewCode('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: tokens.text, margin: 0 }}>
            Tenant & Campus Management
          </h2>
          <div style={{ fontSize: '13px', color: tokens.text2, marginTop: '4px' }}>
            Manage B2B institutional seat licensing, ABDM facility registry mappings, and campus roster sync health.
          </div>
        </div>

        <button
          onClick={() => setShowOnboardModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: tokens.action,
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <Plus size={18} />
          Onboard New Campus
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div data-ui="responsive-grid" className="care-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <Building2 size={32} color={tokens.action} />
          <div>
            <div style={{ fontSize: '11px', color: tokens.text3, fontWeight: 700 }}>Total Onboarded Campuses</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.text }}>{tenants.length}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <Users size={32} color={tokens.action} />
          <div>
            <div style={{ fontSize: '11px', color: tokens.text3, fontWeight: 700 }}>Total Active Seat Licenses</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: tokens.text }}>
              {tenants.reduce((acc, t) => acc + t.activeSeats, 0).toLocaleString()} /{' '}
              {tenants.reduce((acc, t) => acc + t.maxSeats, 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <ShieldCheck size={32} color={tokens.positive} />
          <div>
            <div style={{ fontSize: '11px', color: tokens.text3, fontWeight: 700 }}>ABDM Facility Registry Mapped</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.positive }}>100%</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search
          size={18}
          color={tokens.text3}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Filter campuses by name, code, or ABDM Facility ID..."
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

      {/* Tenant Table */}
      <div
        style={{
          backgroundColor: tokens.surface,
          borderRadius: '16px',
          border: `1px solid ${tokens.rule}`,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: tokens.canvas, borderBottom: `1px solid ${tokens.ruleSoft}` }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Campus Name & Code
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                B2B Tier
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Seat Utilization
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                ABDM Facility ID
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Roster Sync
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((t) => {
              const utilPct = Math.round((t.activeSeats / t.maxSeats) * 100);
              const isNearLimit = utilPct >= 85;

              return (
                <tr key={t.id} style={{ borderBottom: `1px solid ${tokens.ruleSoft}` }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: tokens.text, fontSize: '14px' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: tokens.text2, marginTop: 2 }}>
                      Code: <code style={{ backgroundColor: tokens.surface2, padding: '2px 6px', borderRadius: 4 }}>{t.code}</code> · ID: {t.id}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        backgroundColor: tokens.surface3,
                        color: tokens.action,
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {t.tier}
                    </span>
                  </td>
                  <td style={{ padding: '16px', width: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                      <span>
                        {t.activeSeats.toLocaleString()} / {t.maxSeats.toLocaleString()} seats
                      </span>
                      <span style={{ fontWeight: 700, color: isNearLimit ? tokens.emergency : tokens.text }}>
                        {utilPct}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: tokens.surface2, borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${utilPct}%`,
                          height: '100%',
                          backgroundColor: isNearLimit ? tokens.emergency : tokens.action,
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <code style={{ fontSize: '13px', color: tokens.text, fontWeight: 700 }}>{t.abdmFacilityId}</code>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {t.rosterSyncHealth === 'SYNCED' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tokens.positive, fontSize: '12px', fontWeight: 700 }}>
                        <CheckCircle2 size={14} /> Live Synced
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tokens.attention, fontSize: '12px', fontWeight: 700 }}>
                        <AlertTriangle size={14} /> Lagging Sync
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        backgroundColor: tokens.positiveBg,
                        color: tokens.positive,
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: tokens.surface,
              borderRadius: '20px',
              padding: '28px',
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: tokens.text, margin: 0 }}>
                Onboard New Campus Tenant
              </h3>
              <button onClick={() => setShowOnboardModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color={tokens.text3} />
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  backgroundColor: tokens.emergencyBg,
                  color: tokens.emergency,
                  padding: '12px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3, display: 'block', marginBottom: 4 }}>
                  Campus/University Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Osmania University Main Campus"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${tokens.rule}`,
                    boxSizing: 'border-box',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div data-ui="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3, display: 'block', marginBottom: 4 }}>
                    Institution Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OU-HYD"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${tokens.rule}`,
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3, display: 'block', marginBottom: 4 }}>
                    Contract Tier
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${tokens.rule}`,
                      boxSizing: 'border-box',
                      backgroundColor: tokens.surface,
                      fontSize: '13px',
                    }}
                  >
                    <option value="ENTERPRISE_CAMPUS">ENTERPRISE_CAMPUS</option>
                    <option value="PREMIUM_TIER">PREMIUM_TIER</option>
                    <option value="BASIC_CLINIC">BASIC_CLINIC</option>
                  </select>
                </div>
              </div>

              <div data-ui="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3, display: 'block', marginBottom: 4 }}>
                    Licensed Seats
                  </label>
                  <input
                    type="number"
                    value={newMaxSeats}
                    onChange={(e) => setNewMaxSeats(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${tokens.rule}`,
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3, display: 'block', marginBottom: 4 }}>
                    ABDM Health Facility ID
                  </label>
                  <input
                    type="text"
                    placeholder="IN361000..."
                    value={newAbdmFacilityId}
                    onChange={(e) => setNewAbdmFacilityId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${tokens.rule}`,
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => setShowOnboardModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface2,
                    color: tokens.text,
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleOnboardSubmit}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: tokens.action,
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Campus Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
