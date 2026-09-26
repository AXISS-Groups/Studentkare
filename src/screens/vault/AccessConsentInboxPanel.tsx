import React, { useState } from 'react';
import { DpdpDataPortabilityExportModal } from '../../components/vault/DpdpDataPortabilityExportModal';
import { ShieldCheck, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export interface ConsentRequestItem {
  id: string;
  requesterName: string;
  requesterRole: 'DOCTOR' | 'CAMPUS_ADMIN' | 'HOSTEL_ADMIN' | 'HIU';
  purpose: string;
  fields: string[];
  expiryHours: number;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
}

const MOCK_REQUESTS: ConsentRequestItem[] = [
  {
    id: 'req-01',
    requesterName: 'Dr. Anita Sharma (NMC Reg: 74829)',
    requesterRole: 'DOCTOR',
    purpose: 'OPD Consultation & Medication Prescription Entry',
    fields: ['Vitals (BP, Pulse, SpO2)', 'Active Medications', 'Allergies'],
    expiryHours: 24,
    createdAt: '2026-09-24T00:15:00Z',
    status: 'PENDING',
  },
  {
    id: 'req-02',
    requesterName: 'Hostel Block A Warden (Campus Admin)',
    requesterRole: 'HOSTEL_ADMIN',
    purpose: 'Campus Health Camp Screening Compliance Verification',
    fields: ['Vaccination Status Only'],
    expiryHours: 72,
    createdAt: '2026-09-23T14:30:00Z',
    status: 'APPROVED',
  },
];

export const AccessConsentInboxPanel: React.FC = () => {
  const [requests, setRequests] = useState<ConsentRequestItem[]>(MOCK_REQUESTS);

  const handleAction = (id: string, newStatus: 'APPROVED' | 'DENIED' | 'REVOKED') => {
    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  return (
    <div className="wf-card" style={{ padding: '24px', margin: '20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--rule)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Access & Consent Inbox</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Manage health record access grants & instant revokes (DPDP Rule L)</span>
          </div>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-2)' }}>
          {requests.filter((r) => r.status === 'PENDING').length} Pending Requests
        </span>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <DpdpDataPortabilityExportModal />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {requests.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${item.status === 'PENDING' ? 'var(--action)' : 'var(--rule)'}`,
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{item.requesterName}</span>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  <strong>Role:</strong> {item.requesterRole} • <strong>Purpose:</strong> {item.purpose}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    item.status === 'PENDING'
                      ? 'var(--attention-fill)'
                      : item.status === 'APPROVED'
                      ? 'var(--positive-fill)'
                      : 'var(--surface-2)',
                  color:
                    item.status === 'PENDING'
                      ? '#7c2d12'
                      : item.status === 'APPROVED'
                      ? '#064e3b'
                      : 'var(--text-3)',
                }}
              >
                {item.status}
              </span>
            </div>

            {/* Fields Requested */}
            <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                Fields Requested ({item.expiryHours}h Duration):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {item.fields.map((f, i) => (
                  <span key={i} style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--rule)', fontSize: '12px', color: 'var(--text)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {item.status === 'PENDING' && (
                <>
                  <button
                    className="wf-btn-secondary"
                    onClick={() => handleAction(item.id, 'DENIED')}
                    style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <XCircle size={14} />
                    <span>Deny</span>
                  </button>
                  <button
                    className="wf-btn-primary"
                    onClick={() => handleAction(item.id, 'APPROVED')}
                    style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle size={14} />
                    <span>Approve Grant</span>
                  </button>
                </>
              )}
              {item.status === 'APPROVED' && (
                <button
                  className="wf-btn-secondary"
                  onClick={() => handleAction(item.id, 'REVOKED')}
                  style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--emergency)', borderColor: 'var(--emergency)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} />
                  <span>Revoke Access Immediately</span>
                </button>
              )}
              {(item.status === 'DENIED' || item.status === 'REVOKED') && (
                <span style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic', alignSelf: 'center' }}>
                  Access closed and logged to audit trail.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
