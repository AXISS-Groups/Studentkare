import React, { useState } from 'react';
import { Users, ShieldCheck, Clock, UserCheck, Key, Lock, AlertCircle, Trash2, Plus } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface FamilyGrant {
  id: string;
  guardianName: string;
  relationship: string;
  phone: string;
  scope: 'EMERGENCY_ONLY' | 'RECORDS_ONLY' | 'FULL_ACCESS';
  expiresAt: string;
  grantedAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

export function FamilyAccessShareScreen() {
  const [grants, setGrants] = useState<FamilyGrant[]>([
    {
      id: 'g-1',
      guardianName: 'Dr. Ramesh Sharma',
      relationship: 'Father',
      phone: '+91 98765 43210',
      scope: 'FULL_ACCESS',
      expiresAt: '2027-05-31',
      grantedAt: '2026-08-01',
      status: 'ACTIVE'
    }
  ]);

  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [scope, setScope] = useState<'EMERGENCY_ONLY' | 'RECORDS_ONLY' | 'FULL_ACCESS'>('RECORDS_ONLY');
  const [expiryMonths, setExpiryMonths] = useState(6);

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (guardianName.trim() && phone.trim()) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + expiryMonths);

      setGrants([
        ...grants,
        {
          id: `g-${Date.now()}`,
          guardianName,
          relationship: 'Parent / Family Member',
          phone,
          scope,
          expiresAt: expDate.toISOString().split('T')[0],
          grantedAt: new Date().toISOString().split('T')[0],
          status: 'ACTIVE'
        }
      ]);

      setGuardianName('');
      setPhone('');
    }
  };

  const handleRevoke = (id: string) => {
    setGrants(grants.map(g => g.id === id ? { ...g, status: 'REVOKED' } : g));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 940, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DPDP CONSENT DELEGATION</span>
          <h2>Family & Guardian Access Manager</h2>
          <p>Share health records securely with parents or guardians under explicit consent with automatic expiration dates.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Family Grants */}
          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} /> Active Family Access Grants ({grants.filter(g => g.status === 'ACTIVE').length})
            </h3>

            {grants.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>No family access grants issued yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grants.map(g => (
                  <div key={g.id} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    background: g.status === 'ACTIVE' ? 'var(--surface-card, #fff)' : 'var(--surface-subtle, #f8fafc)',
                    opacity: g.status === 'ACTIVE' ? 1 : 0.6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: 15 }}>{g.guardianName}</strong> ({g.relationship})
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 6px' }}>
                          Phone: <strong>{g.phone}</strong> · Scope: <strong style={{ color: 'var(--accent, #2563eb)' }}>{g.scope.replace(/_/g, ' ')}</strong>
                        </p>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Granted: {g.grantedAt} · Expires: <strong>{g.expiresAt}</strong>
                        </span>
                      </div>

                      {g.status === 'ACTIVE' ? (
                        <button 
                          className="health-button"
                          style={{ minHeight: 36, padding: '0 10px', color: 'var(--emergency, #ef4444)' }}
                          onClick={() => handleRevoke(g.id)}
                        >
                          Revoke Access Now
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                          REVOKED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Issue New Family Grant */}
          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} /> Grant New Family Access
            </h3>
            <form onSubmit={handleGrant} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Guardian Full Name">
                  <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="e.g. Smt. Sunita Sharma" required />
                </Field>
                <Field label="Guardian Phone Number">
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Permission Scope">
                  <select value={scope} onChange={e => setScope(e.target.value as any)}>
                    <option value="EMERGENCY_ONLY">Emergency Vitals & Allergies Only</option>
                    <option value="RECORDS_ONLY">Lab Reports & Prescriptions</option>
                    <option value="FULL_ACCESS">Full Health Vault Access</option>
                  </select>
                </Field>

                <Field label="Auto-Expiry Duration">
                  <select value={expiryMonths} onChange={e => setExpiryMonths(Number(e.target.value))}>
                    <option value={1}>1 Month</option>
                    <option value={6}>6 Months (Academic Term)</option>
                    <option value={12}>1 Year (Academic Year)</option>
                  </select>
                </Field>
              </div>

              <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44, width: 'fit-content' }}>
                Grant Family Access
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="care-eyebrow">YOUR DIGITAL RIGHTS</span>
          <h4 style={{ fontSize: 15, marginTop: 4 }}>You Are Always In Control</h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            As an adult student (18+), you own your health records. Family access is granted purely at your discretion and can be instantly revoked anytime with immediate server-side cache clearing.
          </p>
          <div style={{ fontSize: 12, color: '#065f46', background: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 8 }}>
            <Lock size={14} /> Rule L Firewall: Family members receive zero payment rights or commercial profiling.
          </div>
        </div>
      </div>
    </div>
  );
}
