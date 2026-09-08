import { AbdmSandboxGatewayProxy } from '../../components/AbdmSandboxGatewayProxy';
import { DpdpConsentManagerSimulator } from '../../components/DpdpConsentManagerSimulator';
import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  Clock,
} from 'lucide-react';
import { assertRule } from '../../ai/constitution';

export interface DpdpRequest {
  id: string;
  studentId: string;
  requestType: 'DATA_ACCESS' | 'DATA_PORTABILITY' | 'CORRECTION' | 'ERASURE' | 'GRIEVANCE';
  status: 'PENDING_APPROVAL' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  requestedAt: string;
  slaExpiresAt: string;
  abdmConsentToken: string;
  hipReconciled: boolean;
}

export const DpdpConsentModule: React.FC = () => {
  const { tokens } = useTheme();

  const [ requests ] = useState<DpdpRequest[]>([
    {
      id: 'dpdp_req_001',
      studentId: 'STU-2026-4410',
      requestType: 'DATA_PORTABILITY',
      status: 'PROCESSING',
      requestedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      slaExpiresAt: new Date(Date.now() + 60 * 3600000).toISOString(),
      abdmConsentToken: 'ABDM-CONSENT-991823-OU',
      hipReconciled: true,
    },
    {
      id: 'dpdp_req_002',
      studentId: 'STU-2026-9812',
      requestType: 'DATA_ACCESS',
      status: 'PENDING_APPROVAL',
      requestedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      slaExpiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      abdmConsentToken: 'ABDM-CONSENT-884102-IITH',
      hipReconciled: true,
    },
    {
      id: 'dpdp_req_003',
      studentId: 'STU-2026-1102',
      requestType: 'ERASURE',
      status: 'COMPLETED',
      requestedAt: new Date(Date.now() - 70 * 3600000).toISOString(),
      slaExpiresAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      abdmConsentToken: 'ABDM-CONSENT-771920-BITS',
      hipReconciled: true,
    },
  ]);

  const [ filterType ] = useState<string>('ALL');

  const filteredRequests = requests.filter((r) => {
    assertRule('Rule-K8');
    if (filterType !== 'ALL' && r.requestType !== filterType) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: tokens.text, margin: 0 }}>
          DPDP Act 2023 Consent & Data Principal Operations
        </h2>
        <div style={{ fontSize: '13px', color: tokens.text2, marginTop: '4px' }}>
          Manage student data principal requests (Access, Portability, Erasure, Grievance) under strict 72-hour statutory SLAs.
        </div>
      </div>

      <AbdmSandboxGatewayProxy />
      <DpdpConsentManagerSimulator />
      {/* SLA Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>Statutory SLA Target</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.text }}>72 Hours</div>
        </div>

        <div
          style={{
            backgroundColor: tokens.surface,
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${tokens.ruleSoft}`,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>Active Data Principal Requests</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.action }}>
            {requests.filter((r) => r.status !== 'COMPLETED').length}
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
          <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>ABDM HIP Reconciled</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: tokens.positive }}>100%</div>
        </div>
      </div>

      {/* Requests Table */}
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
                Request ID & Student ID
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Request Type
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                72h Statutory SLA Countdown
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                ABDM HIP Token
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req) => {
              const expiresMs = new Date(req.slaExpiresAt).getTime() - Date.now();
              const hoursLeft = Math.max(0, Math.floor(expiresMs / 3600000));

              return (
                <tr key={req.id} style={{ borderBottom: `1px solid ${tokens.ruleSoft}` }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: tokens.text, fontSize: '13px' }}>{req.id}</div>
                    <code style={{ fontSize: '11px', color: tokens.text3 }}>{req.studentId}</code>
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
                      {req.requestType}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {req.status === 'COMPLETED' ? (
                      <span style={{ color: tokens.positive, fontWeight: 700, fontSize: '13px' }}>Fulfilled within SLA</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: hoursLeft < 24 ? tokens.emergency : tokens.attention }}>
                        <Clock size={16} />
                        <span style={{ fontWeight: 800, fontSize: '13px' }}>{hoursLeft} Hours Remaining</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <code style={{ fontSize: '12px', color: tokens.text }}>{req.abdmConsentToken}</code>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        backgroundColor: req.status === 'COMPLETED' ? tokens.positiveBg : tokens.attentionBg,
                        color: req.status === 'COMPLETED' ? tokens.positive : tokens.attention,
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
