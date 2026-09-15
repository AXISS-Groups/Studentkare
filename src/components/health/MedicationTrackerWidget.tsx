import React, { useCallback, useEffect, useState } from 'react';
import { Pill, CheckCircle2, Award, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../data/http';
import '../../theme/workflows.css';

export interface MedicationTrackerWidgetProps {
  onPointsEarned?: (points: number) => void;
}

interface Plan { id: string; name: string; dosage: string; frequency: string; source: string; }
interface Schedule { plans: Plan[]; daily_completion_rate: number; todays_taken: number; loop_status: string; }

export function MedicationTrackerWidget({ onPointsEarned }: MedicationTrackerWidgetProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await apiRequest<Schedule>('/meds/schedule');
      setSchedule(data);
    } catch (e: any) {
      setSchedule(null);
      setNotice(e?.message || 'Medication plan unavailable.');
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const markTaken = async (plan: Plan) => {
    setLoading(true); setNotice('');
    try {
      const res = await apiRequest<{ already_logged: boolean; message: string }>('/meds/log-dose', { method: 'POST', body: JSON.stringify({ medId: plan.id }) });
      setNotice(res.message || (res.already_logged ? 'Already logged today.' : 'Dose recorded.'));
      if (!res.already_logged && onPointsEarned) onPointsEarned(10);
      fetchSchedule();
    } catch (e: any) {
      setNotice(e?.message || 'Could not log the dose.');
    } finally { setLoading(false); }
  };

  const refill = async (plan: Plan) => {
    setLoading(true); setNotice('');
    try {
      const res = await apiRequest<{ queued: boolean; message: string }>('/meds/refill-reminder', { method: 'POST', body: JSON.stringify({ medId: plan.id, daysBefore: 3 }) });
      setNotice(res.message || (res.queued ? 'Refill reminder queued.' : 'Reminder unavailable.'));
    } catch (e: any) {
      setNotice(e?.message || 'Could not queue a refill reminder.');
    } finally { setLoading(false); }
  };

  const plans = schedule?.plans || [];
  const rate = schedule?.daily_completion_rate ?? 0;

  if (!schedule && !notice) return null;

  return <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' }} data-ui="medication-tracker-widget">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: '#ecfdf5', color: '#059669', padding: 8, borderRadius: 8 }}><Pill size={20} /></div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Daily Medication Tracker</h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Your account-scoped plan. A reminder never implies a dose was taken.</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
        <Award size={15} /><span>{rate}% today</span>
      </div>
    </div>

    {notice && <div className="wf-notice" role="status" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', marginBottom: 12 }}><CheckCircle2 size={15} />{notice}</div>}

    {plans.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {plans.map(plan => <div key={plan.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pill size={16} /></div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{plan.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{plan.dosage ? `${plan.dosage} · ` : ''}{plan.frequency || 'as advised'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="health-button" disabled={loading} onClick={() => refill(plan)} style={{ padding: '6px 10px', fontSize: '0.78rem' }}><RefreshCw size={13} />Refill</button>
          <button className="health-button health-button-primary" disabled={loading} onClick={() => markTaken(plan)} style={{ padding: '6px 10px', fontSize: '0.78rem' }}>Mark taken</button>
        </div>
      </div>)}
    </div> : <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>No medications tracked yet. Add a medication plan to log doses and set refill reminders.</p>}
  </div>;
}
