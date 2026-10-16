import React, { useState } from 'react';
import { HeartHandshake, Clock, PhoneCall } from 'lucide-react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

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

export const CounsellorQueueScreen: React.FC = () => {
  const t = useT();
  const [queue, setQueue] = useState<CrisisQueueItem[]>([]);
  // No crisis-queue API is connected yet. The queue is empty rather than seeded
  // with invented students, and the empty state says so explicitly so an empty
  // list is never read as "no student is in crisis".

  const handleUpdateStatus = (id: string, newStatus: CrisisQueueItem['status']) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const waiting = queue.filter((q) => q.status === 'QUEUED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HeartHandshake aria-hidden="true" style={{ color: 'var(--action)', width: '26px', height: '26px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{t('campus.counsellor.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('campus.counsellor.lead')}
          </p>
        </div>

        {/* A "0 active" badge on a disconnected queue reads as all-quiet; show a count only when there is a queue. */}
        {queue.length > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 700, background: 'var(--sk-color-attention-bg)', padding: '6px 12px', borderRadius: '12px', color: 'var(--sk-color-attention)' }}>
            {t('campus.counsellor.waiting', { count: waiting })}
          </span>
        )}
      </div>

      {/* Queue Items */}
      {queue.length === 0 && <EmptyState title={t('campus.counsellor.emptyTitle')} description={t('campus.counsellor.emptyBody')} />}
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
                  {t('campus.counsellor.roll')} <strong>{item.rollNo}</strong> • {t('campus.counsellor.hostel')} <strong>{item.hostelRoom}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} aria-hidden="true" style={{ color: item.slaMinutesRemaining < 20 ? 'var(--emergency)' : 'var(--text-3)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: item.slaMinutesRemaining < 20 ? 'var(--emergency)' : 'var(--text)' }}>
                  {t('campus.counsellor.timeLeft', { minutes: item.slaMinutesRemaining })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{t('campus.counsellor.categoryLabel')}</span>
              <span style={{ background: 'var(--surface)', padding: '2px 10px', borderRadius: '6px', border: '1px solid var(--rule)', fontWeight: 700, color: 'var(--action)' }}>
                {t(`campus.counsellor.category.${item.crisisCategory}` as MessageKey)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic', marginLeft: 'auto' }}>
                {t('campus.counsellor.privacyNote')}
              </span>
            </div>

            {/* Workflow Actions — local to this screen until a crisis-queue API exists. */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {item.status === 'QUEUED' && (
                <button
                  type="button"
                  className="wf-btn-primary"
                  onClick={() => handleUpdateStatus(item.id, 'ACKNOWLEDGED')}
                  style={{ minHeight: 44, padding: '8px 16px', fontSize: '13px' }}
                >
                  {t('campus.counsellor.acknowledge')}
                </button>
              )}
              {item.status === 'ACKNOWLEDGED' && (
                <button
                  type="button"
                  className="wf-btn-primary"
                  onClick={() => handleUpdateStatus(item.id, 'OUTREACH_STARTED')}
                  style={{ minHeight: 44, padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PhoneCall size={14} aria-hidden="true" />
                  <span>{t('campus.counsellor.startOutreach')}</span>
                </button>
              )}
              {item.status === 'OUTREACH_STARTED' && (
                <button
                  type="button"
                  className="wf-btn-secondary"
                  onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                  style={{ minHeight: 44, padding: '8px 16px', fontSize: '13px', color: 'var(--positive)', borderColor: 'var(--positive)' }}
                >
                  {t('campus.counsellor.markResolved')}
                </button>
              )}
              {item.status === 'RESOLVED' && (
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                  {t('campus.counsellor.resolvedLocal')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
