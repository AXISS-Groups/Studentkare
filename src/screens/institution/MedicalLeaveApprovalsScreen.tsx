import React, { useState } from 'react';
import { FileCheck, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';
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
  const [requests, setRequests] = useState<LeaveRequest[]>([
    { id: 'l-1', studentName: 'Aarav Sharma', rollNo: '2024-CS-1092', leaveType: 'Acute Upper Respiratory Infection', startDate: '2026-09-22', endDate: '2026-09-25', doctorRegNo: 'NMC-2024-MH-98214', status: 'APPROVED' },
    { id: 'l-2', studentName: 'Kavya Reddy', rollNo: '2024-EE-2041', leaveType: 'Ankle Sprain Recovery', startDate: '2026-09-24', endDate: '2026-09-27', doctorRegNo: 'NMC-2024-TS-44109', status: 'PENDING' }
  ]);

  const updateStatus = (id: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: nextStatus } : r));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">ACADEMIC & HOSTEL COMPLIANCE</span>
          <h2>Student Medical Leave Approvals Desk</h2>
          <p>Verify doctor-issued medical certificates and approve official medical leave for attendance exemption.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {requests.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong> (<code>{item.rollNo}</code>)
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>
                Reason: <strong>{item.leaveType}</strong> · Period: <strong>{item.startDate} to {item.endDate}</strong>
              </p>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Verified NMC Doctor Reg: <code>{item.doctorRegNo}</code></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.status === 'PENDING' ? (
                <>
                  <button className="health-button health-button-primary" style={{ minHeight: 38 }} onClick={() => updateStatus(item.id, 'APPROVED')}>
                    Approve Leave
                  </button>
                  <button className="health-button" style={{ minHeight: 38, color: 'var(--emergency, #ef4444)' }} onClick={() => updateStatus(item.id, 'REJECTED')}>
                    Reject
                  </button>
                </>
              ) : (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                  background: item.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: item.status === 'APPROVED' ? '#065f46' : '#991b1b'
                }}>
                  {item.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
