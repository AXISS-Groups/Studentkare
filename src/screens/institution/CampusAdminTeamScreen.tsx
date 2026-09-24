import React, { useState } from 'react';
import { UserPlus, Shield, CheckCircle2, Trash2 } from 'lucide-react';

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: 'CAMPUS_ADMIN' | 'HOSTEL_ADMIN' | 'COUNSELLOR';
  scope: string;
  invitedAt: string;
  status: 'ACTIVE' | 'PENDING';
}

const MOCK_TEAM: AdminMember[] = [
  { id: 'a1', name: 'Dr. V. Rao', email: 'v.rao@university.edu', role: 'CAMPUS_ADMIN', scope: 'Entire Campus', invitedAt: '2026-08-15', status: 'ACTIVE' },
  { id: 'a2', name: 'S. Suresh (Warden)', email: 'suresh.blocka@university.edu', role: 'HOSTEL_ADMIN', scope: 'Hostel Block A', invitedAt: '2026-09-01', status: 'ACTIVE' },
  { id: 'a3', name: 'P. Sharma (Counsellor)', email: 'sharma.counsellor@university.edu', role: 'COUNSELLOR', scope: 'Campus Crisis Queue', invitedAt: '2026-09-10', status: 'ACTIVE' },
];

export const CampusAdminTeamScreen: React.FC = () => {
  const [team, setTeam] = useState<AdminMember[]>(MOCK_TEAM);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<AdminMember['role']>('HOSTEL_ADMIN');
  const [scope, setScope] = useState<string>('Hostel Block B');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleInvite = () => {
    if (!email || !name) return;
    const newMember: AdminMember = {
      id: `a-${Date.now()}`,
      name,
      email,
      role,
      scope,
      invitedAt: new Date().toISOString().split('T')[0],
      status: 'PENDING',
    };
    setTeam((prev) => [...prev, newMember]);
    setSuccessMsg(`Invitation sent to ${email} as ${role} for scope '${scope}'. Logged to audit trail.`);
    setName('');
    setEmail('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRemove = (id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Campus Admin Team & Role Scope</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Invite admins, wardens, and counsellors with explicit block scope. All role changes audited.
          </p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--positive-fill)', color: '#064e3b', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invite Form */}
      <div className="wf-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Invite New Campus Admin / Warden / Counsellor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminMember['role'])}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value="CAMPUS_ADMIN">Campus Admin</option>
              <option value="HOSTEL_ADMIN">Hostel Admin (Warden)</option>
              <option value="COUNSELLOR">Counsellor</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Block Scope</label>
            <input
              type="text"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. Hostel Block B"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>
          <button
            className="wf-btn-primary"
            disabled={!name || !email}
            onClick={handleInvite}
            style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={16} />
            <span>Send Invite</span>
          </button>
        </div>
      </div>

      {/* Team Table */}
      <div className="wf-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', color: 'var(--text-2)' }}>
              <th style={{ padding: '12px 16px' }}>Name & Email</th>
              <th style={{ padding: '12px 16px' }}>Role</th>
              <th style={{ padding: '12px 16px' }}>Scope</th>
              <th style={{ padding: '12px 16px' }}>Invited Date</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{m.email}</div>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--action)' }}>{m.role}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{m.scope}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-3)' }}>{m.invitedAt}</td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => handleRemove(m.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--emergency)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
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
