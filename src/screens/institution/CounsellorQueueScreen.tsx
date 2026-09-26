import React, { useState } from 'react';
import { HeartHandshake, Clock, PhoneCall } from 'lucide-react';

export interface CrisisQueueItem {
  id: string;
  studentName: string;
  rollNo: string;
  hostelRoom: string;
  crisisCategory: 'ACADEMIC_STRESS' | 'ANXIETY_PANIC' | 'DEPRESSION_ISOLATION' | 'EXAM_BURNOUT';
  slaMinutesRemaining: number;
  signalledAt: string;
  status: 'QUEUED' | 'ACKNOWLEDGED' | 'OUTREACH_STARTED' | 'RESOLVED';
}

const MOCK_CRISIS_QUEUE: CrisisQueueItem[] = [
  {
    id: 'c1',
    studentName: 'Karan Verma',
    rollNo: '2025-ME-045',
    hostelRoom: 'Block B - Rm 102',
    crisisCategory: 'ANXIETY_PANIC',
    slaMinutesRemaining: 15,
    signalledAt: '2026-09-24T00:45:00Z',
    status: 'QUEUED',
  },
  {
    id: 'c2',
    studentName: 'Priya Nair',
    rollNo: '2024-BT-112',
    hostelRoom: 'Block C - Rm 401',
    crisisCategory: 'EXAM_BURNOUT',
    slaMinutesRemaining: 45,
    signalledAt: '2026-09-24T00:15:00Z',
    status: 'ACKNOWLEDGED',
  },
];

export const CounsellorQueueScreen: React.FC = () => {
  const [queue, setQueue] = useState<CrisisQueueItem[]>(MOCK_CRISIS_QUEUE);

  const handleUpdateStatus = (id: string, newStatus: CrisisQueueItem['status']) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HeartHandshake style={{ color: 'var(--action)', width: '26px', height: '26px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Campus Counsellor Crisis Queue</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Crisis follow-up queue. SLA countdown enforced; counsellor sees student & crisis category (Message text is strictly private to student).
          </p>
        </div>

        <span style={{ fontSize: '13px', fontWeight: 700, background: 'var(--attention-fill)', padding: '6px 12px', borderRadius: '12px', color: '#7c2d12' }}>
          {queue.filter((q) => q.status === 'QUEUED').length} Active Signals
        </span>
      </div>

      {/* Queue Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {queue.map((item) => (
          <div
            key={item.id}
            className="wf-card"
            style={{
              padding: '20px',
              borderLeft: `4px solid ${item.slaMinutesRemaining < 20 ? 'var(--emergency)' : 'var(--action)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{item.studentName}</span>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Roll: <strong>{item.rollNo}</strong> • Hostel: <strong>{item.hostelRoom}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: item.slaMinutesRemaining < 20 ? 'var(--emergency)' : 'var(--text-3)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: item.slaMinutesRemaining < 20 ? 'var(--emergency)' : 'var(--text)' }}>
                  SLA: {item.slaMinutesRemaining}m remaining
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Crisis Signal Category:</span>
              <span style={{ background: 'var(--surface)', padding: '2px 10px', borderRadius: '6px', border: '1px solid var(--rule)', fontWeight: 700, color: 'var(--action)' }}>
                {item.crisisCategory.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic', marginLeft: 'auto' }}>
                Rule L Privacy: Message body text non-searchable
              </span>
            </div>

            {/* Workflow Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {item.status === 'QUEUED' && (
                <button
                  className="wf-btn-primary"
                  onClick={() => handleUpdateStatus(item.id, 'ACKNOWLEDGED')}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Acknowledge Signal
                </button>
              )}
              {item.status === 'ACKNOWLEDGED' && (
                <button
                  className="wf-btn-primary"
                  onClick={() => handleUpdateStatus(item.id, 'OUTREACH_STARTED')}
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PhoneCall size={14} />
                  <span>Start Outbound Outreach</span>
                </button>
              )}
              {item.status === 'OUTREACH_STARTED' && (
                <button
                  className="wf-btn-secondary"
                  onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                  style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--positive)', borderColor: 'var(--positive)' }}
                >
                  Mark Case Resolved
                </button>
              )}
              {item.status === 'RESOLVED' && (
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--positive)' }}>
                  Case closed & logged to counsellor report.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
