import React, { useState } from 'react';
import { UserPlus, Shield, AlertCircle, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: 'CAMPUS_ADMIN' | 'HOSTEL_ADMIN' | 'COUNSELLOR';
  scope: string;
  invitedAt: string;
  status: 'ACTIVE' | 'PENDING';
}

const fieldStyle: React.CSSProperties = { width: '100%', minHeight: 44, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' };

export const CampusAdminTeamScreen: React.FC = () => {
  const t = useT();
  const [team, setTeam] = useState<AdminMember[]>([]); // No team API yet — never seed invented staff.
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<AdminMember['role']>('HOSTEL_ADMIN');
  const [scope, setScope] = useState<string>('');
  const [inviteNotice, setInviteNotice] = useState<boolean>(false);

  const handleInvite = () => {
    if (!email || !name) return;
    // There is no invite endpoint yet. Say so instead of pretending an invite
    // was sent or adding a placeholder member to the table.
    setInviteNotice(true);
    setTimeout(() => setInviteNotice(false), 4000);
  };

  const handleRemove = (id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield aria-hidden="true" style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{t('campus.team.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('campus.team.lead')}
          </p>
        </div>
      </div>

      {inviteNotice && (
        <div role="status" style={{ background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-attention)', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>{t('campus.team.inviteUnavailable')}</span>
        </div>
      )}

      {/* Invite Form */}
      <div className="wf-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{t('campus.team.inviteTitle')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label htmlFor="campus-team-name" style={labelStyle}>{t('campus.team.name')}</label>
            <input
              id="campus-team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('campus.team.namePlaceholder')}
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="campus-team-email" style={labelStyle}>{t('campus.team.email')}</label>
            <input
              id="campus-team-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="campus-team-role" style={labelStyle}>{t('campus.team.role')}</label>
            <select
              id="campus-team-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AdminMember['role'])}
              style={fieldStyle}
            >
              <option value="CAMPUS_ADMIN">{t('campus.team.role.CAMPUS_ADMIN')}</option>
              <option value="HOSTEL_ADMIN">{t('campus.team.role.HOSTEL_ADMIN')}</option>
              <option value="COUNSELLOR">{t('campus.team.role.COUNSELLOR')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="campus-team-scope" style={labelStyle}>{t('campus.team.scope')}</label>
            <input
              id="campus-team-scope"
              type="text"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder={t('campus.team.scopePlaceholder')}
              style={fieldStyle}
            />
          </div>
          <button
            type="button"
            className="wf-btn-primary"
            disabled={!name || !email}
            onClick={handleInvite}
            style={{ minHeight: 44, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>{t('campus.team.send')}</span>
          </button>
        </div>
      </div>

      {/* Team Table */}
      {team.length === 0 ? <EmptyState title={t('campus.team.emptyTitle')} description={t('campus.team.emptyBody')} /> : <div className="wf-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', color: 'var(--text-2)' }}>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('campus.team.col.name')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('campus.team.col.role')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('campus.team.col.scope')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('campus.team.col.invited')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('campus.team.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{m.email}</div>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--action)' }}>{t(`campus.team.role.${m.role}` as MessageKey)}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{m.scope}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-3)' }}>{m.invitedAt}</td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    type="button"
                    aria-label={t('campus.team.remove', { name: m.name })}
                    onClick={() => handleRemove(m.id)}
                    style={{ minWidth: 44, minHeight: 44, background: 'none', border: 'none', color: 'var(--emergency)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
};
