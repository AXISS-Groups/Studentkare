import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Award, Clock, Sparkles } from 'lucide-react';
import '../../theme/workflows.css';

export interface MedicationTrackerWidgetProps {
  token?: string | null;
  onPointsEarned?: (points: number) => void;
}

export function MedicationTrackerWidget({ token, onPointsEarned }: MedicationTrackerWidgetProps) {
  const [schedule, setSchedule] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/meds/schedule', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      } else {
        // Default demo schedule fallback
        setSchedule({
          user_id: 'demo-student',
          current_streak_days: 5,
          total_points_earned: 150,
          daily_completion_rate: 33.3,
          todays_medications: [
            { id: 'm1', name: 'Tata 1mg Multivitamin Daily', dosage: '1 Tablet', timing: '08:30 AM (After Breakfast)', is_taken: true, taken_at: '08:45 AM' },
            { id: 'm2', name: 'Vitamin D3 60K IU', dosage: '1 Capsule', timing: '01:30 PM (After Lunch)', is_taken: false },
            { id: 'm3', name: 'Omega-3 Deep Sea Fish Oil', dosage: '1 Softgel', timing: '09:00 PM (After Dinner)', is_taken: false },
          ],
          loop_status: 'ACTIVE_LOOP_MONITORING',
          last_loop_check: 'Just now',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleMarkTaken = async (medId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/meds/log-dose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ medId }),
      });
      const data = await res.json();
      if (data.points_awarded > 0) {
        setRewardBanner(`🎉 ${data.message} (+10 Care Points Earned!)`);
        if (onPointsEarned) onPointsEarned(data.points_awarded);
      } else {
        setRewardBanner('✅ Dose recorded successfully!');
      }

      // Update local state statefully
      if (schedule) {
        const updatedMeds = schedule.todays_medications.map((m: any) =>
          m.id === medId ? { ...m, is_taken: true, taken_at: 'Just now' } : m
        );
        const takenCount = updatedMeds.filter((m: any) => m.is_taken).length;
        setSchedule({
          ...schedule,
          todays_medications: updatedMeds,
          daily_completion_rate: Math.round((takenCount / updatedMeds.length) * 100),
          current_streak_days: takenCount === updatedMeds.length ? schedule.current_streak_days + 1 : schedule.current_streak_days,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!schedule) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
      }}
      data-ui="medication-tracker-widget"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#ecfdf5', color: '#059669', padding: 8, borderRadius: 8 }}>
            <Pill size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Daily Medication Tracker & Care Points
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Loop Agent Active • Earn +10 Care Points Daily
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
          <Award size={15} />
          <span>{schedule.current_streak_days} Day Streak</span>
        </div>
      </div>

      {rewardBanner && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={16} />
          <span>{rewardBanner}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {schedule.todays_medications.map((med: any) => (
          <div
            key={med.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              background: med.is_taken ? '#f0fdf4' : '#ffffff',
              border: `1px solid ${med.is_taken ? '#bbf7d0' : '#e2e8f0'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: med.is_taken ? '#dcfce7' : '#f1f5f9',
                  color: med.is_taken ? '#15803d' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {med.is_taken ? <CheckCircle2 size={18} /> : <Pill size={16} />}
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{med.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {med.dosage} • <Clock size={12} style={{ display: 'inline', marginRight: 2 }} />
                  {med.timing}
                </div>
              </div>
            </div>

            <div>
              {med.is_taken ? (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '4px 10px', borderRadius: 12 }}>
                  Taken at {med.taken_at || '08:45 AM'}
                </span>
              ) : (
                <button
                  className="health-button health-button-primary"
                  onClick={() => handleMarkTaken(med.id)}
                  disabled={loading}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Mark Taken
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
