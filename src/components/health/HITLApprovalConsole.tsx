import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import '../../theme/workflows.css';

export interface HITLApprovalConsoleProps {
  token?: string | null;
}

export function HITLApprovalConsole({ token }: HITLApprovalConsoleProps) {
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/ops/approvals');
      if (res.ok) {
        const data = await res.json();
        setPendingActions(data.pending_actions);
      } else {
        setPendingActions([
          {
            id: 'act_01',
            action_type: 'PRESCRIPTION_APPROVAL',
            title: 'Rx Prescription Order #rx_94102 Review',
            patient_name: 'Demo Student',
            requested_by: 'Rx Extractor AI Agent',
            summary: 'Extracted items: Paracetamol 650mg & Vitamin D3 60K. Requires doctor signature sign-off.',
            risk_level: 'MEDIUM',
            status: 'PENDING_DOCTOR_APPROVAL',
            created_at: '15 mins ago',
          },
          {
            id: 'act_02',
            action_type: 'EMERGENCY_SOS_BROADCAST',
            title: 'Campus O- Blood SOS Alert #sos_3104',
            patient_name: 'Rohan Verma',
            requested_by: 'Campus Blood Emergency Agent',
            summary: 'Requesting urgent dispatch of SMS/WhatsApp alert to 5 campus O- donors.',
            risk_level: 'HIGH',
            status: 'PENDING_CLINICIAN_APPROVAL',
            created_at: '5 mins ago',
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (actionId: string) => {
    try {
      const res = await fetch('/api/ops/approve-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      setNotice(data.message);
      setPendingActions(pendingActions.map(a => a.id === actionId ? { ...a, status: 'APPROVED_BY_CLINICIAN' } : a));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
      }}
      data-ui="hitl-approval-console"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Human-in-the-Loop Clinician Sign-Off Console
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Safety Gate • Doctor Sign-off for High-Stakes AI Actions
            </span>
          </div>
        </div>

        <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700 }}>
          {pendingActions.filter(a => a.status.startsWith('PENDING')).length} Pending Sign-offs
        </span>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: 8, borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, marginBottom: 10 }}>
          ✅ {notice}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendingActions.map(act => (
          <div
            key={act.id}
            style={{
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${act.status === 'APPROVED_BY_CLINICIAN' ? '#bbf7d0' : '#e2e8f0'}`,
              background: act.status === 'APPROVED_BY_CLINICIAN' ? '#f0fdf4' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{act.title}</strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: act.risk_level === 'HIGH' ? '#ffe4e6' : '#fef3c7',
                    color: act.risk_level === 'HIGH' ? '#e11d48' : '#b45309',
                  }}
                >
                  {act.risk_level} RISK
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>{act.summary}</div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                Requested by: {act.requested_by} • Patient: {act.patient_name}
              </div>
            </div>

            <div>
              {act.status === 'APPROVED_BY_CLINICIAN' ? (
                <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '4px 10px', borderRadius: 12 }}>
                  ✓ Approved
                </span>
              ) : (
                <button
                  className="health-button health-button-primary"
                  onClick={() => handleApprove(act.id)}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Approve Sign-off
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
