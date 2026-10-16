import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { useT } from '../../i18n';
import '../../theme/workflows.css';

export interface HITLApprovalConsoleProps {
  token?: string | null;
}

interface PendingAction {
  id: string;
  action_type: string;
  title: string;
  patient_name: string;
  requested_by: string;
  summary: string;
  risk_level: string;
  status: string;
  created_at: string;
}

type Problem = 'load' | 'approve' | null;

export function HITLApprovalConsole({ token }: HITLApprovalConsoleProps) {
  const t = useT();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  // A server message is shown as sent; otherwise our own (translated) confirmation.
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Fail closed: a failed request shows an error, never sample sign-off items.
  // This used to fall back to two invented actions, one naming a student.
  // apiRequest sends the session cookie and CSRF token the bare fetch calls did not.
  const fetchApprovals = async () => {
    try {
      const data = await apiRequest<{ pending_actions?: PendingAction[] }>('/ops/approvals', { headers: auth });
      setPendingActions(data.pending_actions ?? []);
      setProblem(null);
    } catch {
      setPendingActions([]);
      setProblem('load');
    }
  };

  useEffect(() => {
    void fetchApprovals();
    // Loads once on mount, as before.
  }, []);

  const handleApprove = async (actionId: string) => {
    try {
      const data = await apiRequest<{ message?: string }>('/ops/approve-action', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ actionId }),
      });
      // Only mark approved when the server accepted the sign-off (apiRequest throws otherwise).
      setNotice(data.message ?? t('admin.hitl.recorded'));
      setProblem(null);
      setPendingActions(actions => actions.map(a => a.id === actionId ? { ...a, status: 'APPROVED_BY_CLINICIAN' } : a));
    } catch {
      setNotice(null);
      setProblem('approve');
    }
  };

  const pending = pendingActions.filter(a => a.status.startsWith('PENDING')).length;

  return (
    <div
      style={{
        background: 'var(--sk-color-surface)',
        border: '1px solid var(--sk-color-rule)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
      }}
      data-ui="hitl-approval-console"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--sk-color-action-soft)', color: 'var(--sk-color-action)', padding: 8, borderRadius: 8 }}>
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--sk-color-text)' }}>
              {t('admin.hitl.title')}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--sk-color-text-3)' }}>
              {t('admin.hitl.subtitle')}
            </span>
          </div>
        </div>

        <span style={{ background: 'var(--sk-color-action-soft)', color: 'var(--sk-color-action)', padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700 }}>
          {problem === 'load' ? t('admin.hitl.pendingUnknown') : t('admin.hitl.pendingCount', { count: pending })}
        </span>
      </div>

      {notice && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', border: '1px solid var(--sk-color-positive)', padding: 8, borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, marginBottom: 10 }}>
          <CheckCircle2 size={16} aria-hidden="true" />{notice}
        </div>
      )}

      {problem && (
        <div role="alert" style={{ background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)', border: '1px solid var(--sk-color-danger)', padding: 8, borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, marginBottom: 10 }}>
          {problem === 'load' ? t('admin.hitl.loadError') : t('admin.hitl.approveError')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {problem !== 'load' && pendingActions.length === 0 && (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--sk-color-text-3)' }}>{t('admin.hitl.empty')}</p>
        )}
        {pendingActions.map(act => (
          <div
            key={act.id}
            style={{
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${act.status === 'APPROVED_BY_CLINICIAN' ? 'var(--sk-color-positive)' : 'var(--sk-color-rule)'}`,
              background: act.status === 'APPROVED_BY_CLINICIAN' ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: '0.88rem', color: 'var(--sk-color-text)' }}>{act.title}</strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: act.risk_level === 'HIGH' ? 'var(--sk-color-danger-bg)' : 'var(--sk-color-attention-bg)',
                    color: act.risk_level === 'HIGH' ? 'var(--sk-color-danger)' : 'var(--sk-color-attention)',
                  }}
                >
                  {t('admin.hitl.risk', { level: act.risk_level })}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--sk-color-text-2)', marginTop: 2 }}>{act.summary}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--sk-color-text-3)', marginTop: 4 }}>
                {t('admin.hitl.requestedBy', { by: act.requested_by, patient: act.patient_name })}
              </div>
            </div>

            <div>
              {act.status === 'APPROVED_BY_CLINICIAN' ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--sk-color-positive)', fontWeight: 700, background: 'var(--sk-color-positive-bg)', padding: '4px 10px', borderRadius: 12 }}>
                  <span aria-hidden="true">✓ </span>{t('admin.hitl.approved')}
                </span>
              ) : (
                <button
                  type="button"
                  className="health-button health-button-primary"
                  onClick={() => void handleApprove(act.id)}
                  aria-label={t('admin.hitl.approveFor', { title: act.title })}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 44 }}
                >
                  {t('admin.hitl.approve')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
