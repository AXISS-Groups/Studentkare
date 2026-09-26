import React, { useState } from 'react';
import { Calendar, Clock, Save, CheckCircle2, DollarSign } from 'lucide-react';

export interface DaySlot {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

const DEFAULT_SCHEDULE: DaySlot[] = [
  { day: 'Monday', enabled: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 20 },
  { day: 'Tuesday', enabled: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 20 },
  { day: 'Wednesday', enabled: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 20 },
  { day: 'Thursday', enabled: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 20 },
  { day: 'Friday', enabled: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 20 },
  { day: 'Saturday', enabled: false, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30 },
  { day: 'Sunday', enabled: false, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30 },
];

export const DoctorScheduleScreen: React.FC = () => {
  const [schedule, setSchedule] = useState<DaySlot[]>(DEFAULT_SCHEDULE);
  const [consultFee, setConsultFee] = useState<number>(300);
  const [followupFee, setFollowupFee] = useState<number>(150);
  const [savedMsg, setSavedMsg] = useState<string>('');

  const toggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((item, idx) => (idx === dayIndex ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleSave = () => {
    setSavedMsg('Weekly doctor availability slots & consult fees published to student booking system!');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Doctor Schedule & Consultation Fees</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Set weekly OPD availability, slot duration, and consultation fees. Changes reflect immediately in student booking.
          </p>
        </div>

        <button
          className="wf-btn-primary"
          onClick={handleSave}
          style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
        >
          <Save size={16} />
          <span>Save Availability</span>
        </button>
      </div>

      {savedMsg && (
        <div style={{ background: 'var(--positive-fill)', color: '#064e3b', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Fees Configuration */}
      <div className="wf-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Consultation Fees</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>OPD Consultation Fee (₹)</label>
            <input
              type="number"
              value={consultFee}
              onChange={(e) => setConsultFee(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Follow-up Fee (₹)</label>
            <input
              type="number"
              value={followupFee}
              onChange={(e) => setFollowupFee(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
            />
          </div>
        </div>
      </div>

      {/* Weekly Schedule Table */}
      <div className="wf-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', color: 'var(--text-2)' }}>
              <th style={{ padding: '12px 16px' }}>Day of Week</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Start Time</th>
              <th style={{ padding: '12px 16px' }}>End Time</th>
              <th style={{ padding: '12px 16px' }}>Slot Duration</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((item, idx) => (
              <tr key={item.day} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>{item.day}</td>
                <td style={{ padding: '14px 16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => toggleDay(idx)}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: item.enabled ? 'var(--positive)' : 'var(--text-3)' }}>
                      {item.enabled ? 'Available' : 'Off / Leave'}
                    </span>
                  </label>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <input
                    type="time"
                    value={item.startTime}
                    disabled={!item.enabled}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSchedule((prev) => prev.map((s, i) => (i === idx ? { ...s, startTime: val } : s)));
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <input
                    type="time"
                    value={item.endTime}
                    disabled={!item.enabled}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSchedule((prev) => prev.map((s, i) => (i === idx ? { ...s, endTime: val } : s)));
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{item.slotDurationMinutes} mins</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
