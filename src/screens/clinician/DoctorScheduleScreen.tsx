import React, { useState } from 'react';
import { Calendar, Info, Save } from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

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

/**
 * No availability or fee endpoint exists. Save used to announce "published to
 * student booking system!" while saving nothing, and the fees started at an
 * invented ₹300 / ₹150. Save is now disabled with the reason on screen, and
 * fees start at zero rather than at a figure that looks like the doctor's own.
 */
export const DoctorScheduleScreen: React.FC = () => {
  const t = useT();
  const [schedule, setSchedule] = useState<DaySlot[]>(DEFAULT_SCHEDULE);
  const [consultFee, setConsultFee] = useState<number>(0);
  const [followupFee, setFollowupFee] = useState<number>(0);

  const toggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((item, idx) => (idx === dayIndex ? { ...item, enabled: !item.enabled } : item))
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar aria-hidden="true" style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{t('partner.clin.schedule.title')}</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            {t('partner.clin.schedule.intro')}
          </p>
        </div>

        <button
          type="button"
          className="wf-btn-primary"
          disabled
          style={{ minHeight: 44, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
        >
          <Save size={16} aria-hidden="true" />
          <span>{t('partner.clin.schedule.save')}</span>
        </button>
      </div>

      <div className="wf-notice" role="note" style={{ marginBottom: '20px' }}>
        <Info size={18} aria-hidden="true" />
        <span>{t('partner.clin.schedule.notConnected')}</span>
      </div>

      {/* Fees Configuration */}
      <div className="wf-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{t('partner.clin.schedule.feesHeading')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label htmlFor="sched-opd-fee" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>{t('partner.clin.schedule.opdFee')}</label>
            <input
              id="sched-opd-fee"
              type="number"
              value={consultFee}
              onChange={(e) => setConsultFee(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
            />
          </div>
          <div>
            <label htmlFor="sched-followup-fee" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>{t('partner.clin.schedule.followupFee')}</label>
            <input
              id="sched-followup-fee"
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
              <th style={{ padding: '12px 16px' }}>{t('partner.clin.schedule.colDay')}</th>
              <th style={{ padding: '12px 16px' }}>{t('partner.clin.schedule.colStatus')}</th>
              <th style={{ padding: '12px 16px' }}>{t('partner.clin.schedule.colStart')}</th>
              <th style={{ padding: '12px 16px' }}>{t('partner.clin.schedule.colEnd')}</th>
              <th style={{ padding: '12px 16px' }}>{t('partner.clin.schedule.colSlot')}</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((item, idx) => {
              const dayName = t(`partner.clin.schedule.day.${item.day}` as MessageKey);
              return (
              <tr key={item.day} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>{dayName}</td>
                <td style={{ padding: '14px 16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minHeight: 44 }}>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => toggleDay(idx)}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: item.enabled ? 'var(--positive)' : 'var(--text-3)' }}>
                      {item.enabled ? t('partner.clin.schedule.available') : t('partner.clin.schedule.off')}
                    </span>
                  </label>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <input
                    type="time"
                    aria-label={t('partner.clin.schedule.startFor', { day: dayName })}
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
                    aria-label={t('partner.clin.schedule.endFor', { day: dayName })}
                    value={item.endTime}
                    disabled={!item.enabled}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSchedule((prev) => prev.map((s, i) => (i === idx ? { ...s, endTime: val } : s)));
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{t('partner.clin.schedule.mins', { n: item.slotDurationMinutes })}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
