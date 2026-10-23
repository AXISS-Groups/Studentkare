import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface LeaveRequest {
  id: string;
  studentName: string;
  rollNo: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  doctorRegNo: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export function MedicalLeaveApprovalsScreen() {
  const t = useT();
  // No medical-leave API yet: no invented students, diagnoses or NMC numbers.
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const updateStatus = (id: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: nextStatus } : r));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.leave.eyebrow')}</span>
          <h2>{t('campus.leave.title')}</h2>
          <p>{t('campus.leave.lead')}</p>
        </div>
      </div>

      {requests.length === 0 && <EmptyState title={t('campus.leave.emptyTitle')} description={t('campus.leave.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {requests.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong> (<code>{item.rollNo}</code>)
              <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0' }}>
                {t('campus.leave.reason')} <strong>{item.leaveType}</strong> · {t('campus.leave.period')} <strong>{t('campus.leave.periodRange', { start: item.startDate, end: item.endDate })}</strong>
              </p>
              {/* Nothing checks the number against the NMC register, so it is not called "verified". */}
              <span style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{t('campus.leave.doctorReg')} <code>{item.doctorRegNo}</code></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.status === 'PENDING' ? (
                <>
                  <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={() => updateStatus(item.id, 'APPROVED')}>
                    {t('campus.leave.approve')}
                  </button>
                  <button type="button" className="health-button" style={{ minHeight: 44, color: 'var(--sk-color-danger)' }} onClick={() => updateStatus(item.id, 'REJECTED')}>
                    {t('campus.leave.reject')}
                  </button>
                </>
              ) : (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                  background: item.status === 'APPROVED' ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-danger-bg)',
                  color: item.status === 'APPROVED' ? 'var(--sk-color-positive)' : 'var(--sk-color-danger)'
                }}>
                  {t(`campus.leave.status.${item.status}` as MessageKey)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
