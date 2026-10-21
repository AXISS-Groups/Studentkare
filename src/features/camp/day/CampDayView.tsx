import React from 'react';
import { Icon } from '@/design-system/icons';
import { SkButton, StatusPill } from '@/design-system/primitives';
import { useT } from '@/i18n';
import { campDayView } from './campDay';
import type { CampDayData, CampDayStationView } from './campDay';
import './camp-day.css';

export interface CampDayViewProps {
  data: CampDayData;
  now?: Date;
  busy?: boolean;
  /** What the server said when check-in or a station failed. */
  error?: string;
  onBack: () => void;
  onCheckIn: () => void;
  onCompleteStation: (stationId: string) => void;
  onSeeResults: () => void;
  /** Kept from the camp panel: add the booked slot to a calendar. */
  onAddToCalendar?: () => void;
}

/**
 * CampDay on the web (student phone frame at ≤ 430 px and the web workspace).
 * The navy hero, the student's slot, their stations, the live queue (not
 * connected), the privacy note and "See results as they arrive". Never a
 * celebration: this is a health check.
 */
export function CampDayView({ data, now, busy = false, error, onBack, onCheckIn, onCompleteStation, onSeeResults, onAddToCalendar }: CampDayViewProps): React.ReactElement {
  const t = useT();
  const view = campDayView(data, now ?? new Date());
  const meta = [data.camp.location || t('care.campus'), data.camp.date, t('pc.day.stations', { count: view.stations.length })].join(' · ');
  return (
    <div className="sk-ds cd-page">
      <header className="cd-hero">
        <div className="cd-hero__bar">
          <button type="button" className="cd-back" aria-label={t('pc.day.back')} onClick={onBack}><Icon name="arrow-left" size={20} strokeWidth={2.2} /></button>
          <span className="cd-hero__kicker">{t('pc.day.kicker')}</span>
          {view.isToday ? <span className="cd-today"><span className="cd-today__dot" aria-hidden="true" />{t('pc.day.today')}</span> : null}
        </div>
        <h1 className="cd-title">{data.camp.name}</h1>
        <p className="cd-meta">{meta}</p>
        <div className="cd-slot">
          <span className="cd-slot__title">{data.slot ? t('pc.day.slot', { start: data.slot.slotStart, end: data.slot.slotEnd }) : t('pc.day.noSlot')}</span>
          <span className="cd-slot__meta">{data.status.checkedIn ? t('pc.day.checkedIn') : t('pc.day.notCheckedIn')}</span>
        </div>
      </header>

      <main className="cd-body">
        {error ? <p className="cd-error" role="alert">{error}</p> : null}
        {!data.status.checkedIn ? (
          <SkButton className="cd-checkin" busy={busy} onClick={onCheckIn}>{t('pc.day.checkIn')}</SkButton>
        ) : null}

        <section aria-labelledby="cd-stations-title">
          <h2 id="cd-stations-title" className="cd-eyebrow">{t('pc.day.yourStations')}</h2>
          {view.stations.length ? (
            <ol className="cd-stations">
              {view.stations.map((station) => (
                <Station key={station.id} station={station} busy={busy} onComplete={() => onCompleteStation(station.id)} />
              ))}
            </ol>
          ) : <p className="cd-muted">{t('pc.day.noStations')}</p>}
          {view.allDone ? <p className="cd-done-note" role="status">{t('pc.day.allDone')}</p> : null}
        </section>

        <section aria-labelledby="cd-queue-title">
          <h2 id="cd-queue-title" className="cd-eyebrow">{t('pc.day.queue')}</h2>
          <p className="cd-queue">{t('pc.day.queueUnconnected')}</p>
        </section>

        <p className="cd-privacy"><Icon name="lock-3" size={18} strokeWidth={2} />{t('pc.day.privacy')}</p>

        <SkButton className="cd-results" onClick={onSeeResults}>{t('pc.day.seeResults')}</SkButton>
        {onAddToCalendar && data.slot ? <button type="button" className="sk-link cd-calendar" onClick={onAddToCalendar}>{t('care.camp.addToCalendar')}</button> : null}
      </main>
    </div>
  );
}

function Station({ station, busy, onComplete }: { station: CampDayStationView; busy: boolean; onComplete: () => void }): React.ReactElement {
  const t = useT();
  return (
    <li className={`cd-station is-${station.state}`}>
      <span className="cd-station__mark" aria-hidden="true">{station.state === 'done' ? <Icon name="check" size={14} strokeWidth={3} /> : null}</span>
      <span className="cd-station__words">
        <span className="cd-station__name">{station.name}</span>
        {station.state === 'now' ? <button type="button" className="sk-link cd-station__complete" disabled={busy} onClick={onComplete}>{t('pc.day.markDone')}</button> : null}
      </span>
      {station.state === 'done' ? <StatusPill tone="positive" small>{t('pc.day.done')}</StatusPill> : null}
      {station.state === 'now' ? <StatusPill tone="action" small>{t('pc.day.now')}</StatusPill> : null}
      <span className="sk-visually-hidden">{t(`pc.day.state.${station.state}`)}</span>
    </li>
  );
}
