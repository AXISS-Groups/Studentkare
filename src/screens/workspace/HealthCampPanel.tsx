import React, { useEffect, useState } from 'react';
import { pressable } from '@/lib/a11y/pressable';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  UserCheck,
} from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { useT, type MessageKey, type Vars } from '@/i18n';
import '../../theme/workflows.css';

interface Camp {
  id: string;
  name: string;
  date: string;
  location: string;
  whatToBring?: string;
}

interface Slot {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
}

interface Station {
  id: string;
  name: string;
  sort: number;
}

interface CampStatus {
  registered: boolean;
  checkedIn: boolean;
  completedStations: string[];
  slotId?: string | null;
}

interface BookingResponse {
  bookingId: string;
  camp: {
    id: string;
    name: string;
    date: string;
    location: string;
    whatToBring: string;
  };
  slot: {
    id: string;
    slotStart: string;
    slotEnd: string;
  };
}

type Translate = (key: MessageKey, vars?: Vars) => string;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function parseSlotTime(value: string): { hours: number; minutes: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (hours === 12) hours = 0;
  if (meridiem === 'PM') hours += 12;

  return { hours, minutes };
}

function icsDate(date: string, time: string): string | null {
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const parsed = parseSlotTime(time);
  if (!parsed) return null;

  const [year, month, day] = parts;
  const hh = String(parsed.hours).padStart(2, '0');
  const mm = String(parsed.minutes).padStart(2, '0');

  return `${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${hh}${mm}00`;
}

function addBookingToCalendar(booking: BookingResponse, t: Translate): void {
  const start = icsDate(booking.camp.date, booking.slot.slotStart);
  const end = icsDate(booking.camp.date, booking.slot.slotEnd);
  if (!start || !end) return;

  const place = booking.camp.location || t('care.campus');
  const description = [
    t('care.camp.ics.camp', { name: booking.camp.name }),
    t('care.camp.ics.slot', { start: booking.slot.slotStart, end: booking.slot.slotEnd }),
    t('care.camp.ics.place', { place }),
    t('care.camp.ics.bring', { items: booking.camp.whatToBring || t('care.camp.nothingToBring') }),
  ].join('\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Studentkare//Health Camp//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.bookingId}@studentkare`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(booking.camp.name)}`,
    `LOCATION:${escapeIcsText(place)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${booking.camp.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'health-camp'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function HealthCampPanel() {
  const t = useT();
  const camps = useApiResource<{ items: Camp[] }>('/camps');
  const [selected, setSelected] = useState('');
  const status = useApiResource<CampStatus>(selected ? `/camps/${selected}/me` : '');
  const slots = useApiResource<{ items: Slot[] }>(selected ? `/camps/${selected}/slots` : '');
  const stations = useApiResource<{ items: Station[] }>(selected ? `/camps/${selected}/stations` : '');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [confirmation, setConfirmation] = useState<BookingResponse | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const mutation = useMutation();

  const selectedCamp = camps.data?.items.find(camp => camp.id === selected);
  const completed = status.data?.completedStations || [];
  const bookedSlot = slots.data?.items.find(slot => slot.id === status.data?.slotId);
  const availableSlots = slots.data?.items || [];

  useEffect(() => {
    if (
      !selectedCamp ||
      !status.data?.registered ||
      !status.data.slotId ||
      !bookedSlot ||
      confirmation
    ) {
      return;
    }

    setConfirmation({
      bookingId: `${selectedCamp.id}:${bookedSlot.id}`,
      camp: {
        id: selectedCamp.id,
        name: selectedCamp.name,
        date: selectedCamp.date,
        location: selectedCamp.location,
        whatToBring: selectedCamp.whatToBring || '',
      },
      slot: {
        id: bookedSlot.id,
        slotStart: bookedSlot.slotStart,
        slotEnd: bookedSlot.slotEnd,
      },
    });
  }, [selectedCamp, status.data?.registered, status.data?.slotId, bookedSlot, confirmation]);

  const selectCamp = (campId: string) => {
    setSelected(campId);
    setSelectedSlotId('');
    setConfirmation(null);
    setNotice(null);
    status.reload();
    slots.reload();
    stations.reload();
  };

  const bookSlot = () => {
    if (!selected || !selectedSlotId) return;

    mutation.run(
      () => apiRequest<BookingResponse>(`/camps/${selected}/book`, {
        method: 'POST',
        body: JSON.stringify({ slotId: selectedSlotId }),
      }),
      result => {
        setConfirmation(result);
        setNotice('care.camp.confirmationTitle');
        status.reload();
        slots.reload();
        stations.reload();
      },
    );
  };

  const checkIn = () => mutation.run(
    () => apiRequest(`/camps/${selected}/check-in`, { method: 'POST' }),
    () => {
      setNotice('care.camp.checkedIn');
      status.reload();
    },
  );

  const complete = (stationId: string) => mutation.run(
    () => apiRequest(`/camps/${selected}/stations/${stationId}`, { method: 'POST' }),
    () => {
      setNotice('care.camp.stationCompleted');
      status.reload();
    },
  );

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('care.camp.eyebrow')}</span>
          <h2>{t('care.camp.heading')}</h2>
          <p>{t('care.camp.description')}</p>
        </div>
      </div>

      <FormError message={mutation.error} />

      {notice && !confirmation && (
        <div
          className="wf-notice"
          role="status"
          style={{ marginBottom: 16, background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', borderColor: 'var(--sk-color-positive)' }}
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          {t(notice)}
        </div>
      )}

      <DataState {...camps} retry={camps.reload}>
        {camps.data?.items.length ? (
          <div className="wf-record-grid">
            {camps.data.items.map(camp => {
              const isSelected = selected === camp.id;
              const isBooked = isSelected && Boolean(status.data?.slotId);
              const isRegistered = isSelected && status.data?.registered;

              return (
                <article
                  className="wf-card"
                  key={camp.id}
                  {...pressable(() => selectCamp(camp.id))} aria-pressed={isSelected}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--sk-color-action)' : undefined,
                  }}
                >
                  <span className="wf-record-icon" aria-hidden="true">
                    <ClipboardList size={24} />
                  </span>
                  <h3>{camp.name}</h3>
                  <p>
                    {camp.date} · <MapPin size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {camp.location || t('care.campus')}
                  </p>

                  {isBooked ? (
                    <span className="wf-status status-accepted">{t('care.camp.booked')}</span>
                  ) : isRegistered ? (
                    <span className="wf-status">{t('care.camp.registered')}</span>
                  ) : (
                    <button
                      type="button"
                      className="health-button"
                      disabled={mutation.busy}
                      onClick={event => {
                        event.stopPropagation();
                        selectCamp(camp.id);
                      }}
                    >
                      {t('care.camp.chooseSlot')}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t('care.camp.emptyTitle')} description={t('care.camp.emptyBody')} />
        )}
      </DataState>

      {selectedCamp && (
        <section className="wf-card wf-section-gap">
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{selectedCamp.date}</span>
              <h3>{selectedCamp.name}</h3>
              <p>
                <MapPin size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {selectedCamp.location || t('care.campus')}
              </p>
            </div>
          </div>

          <DataState {...slots} retry={slots.reload}>
            {availableSlots.length ? (
              <div className="wf-record-grid">
                {availableSlots.map(slot => {
                  const isBooked = status.data?.slotId === slot.id;
                  const isChosen = selectedSlotId === slot.id || isBooked;

                  return (
                    <button
                      type="button"
                      key={slot.id}
                      className="wf-card"
                      aria-pressed={isChosen}
                      disabled={!slot.available || Boolean(status.data?.slotId) || mutation.busy}
                      onClick={() => setSelectedSlotId(slot.id)}
                      style={{
                        textAlign: 'left',
                        cursor: slot.available ? 'pointer' : 'not-allowed',
                        opacity: slot.available ? 1 : 0.65,
                        borderColor: isChosen ? 'var(--sk-color-action)' : undefined,
                      }}
                    >
                      <span className="wf-record-icon" aria-hidden="true">
                        <Clock3 size={22} />
                      </span>
                      <h3>{slot.slotStart} – {slot.slotEnd}</h3>
                      <p>
                        {isBooked ? t('care.camp.booked') : slot.available ? t('care.camp.remaining', { count: slot.remaining }) : t('care.camp.full')}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title={t('care.camp.noSlots')} description={t('care.camp.noSlotsDescription')} />
            )}
          </DataState>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              className="health-button health-button-primary"
              disabled={!selectedSlotId || Boolean(status.data?.slotId) || mutation.busy}
              onClick={bookSlot}
            >
              {mutation.busy ? t('care.camp.booking') : t('care.camp.bookSlot')}
            </button>
          </div>
        </section>
      )}

      {confirmation && (
        <section className="wf-card wf-section-gap" aria-labelledby="camp-booking-confirmation">
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{t('care.camp.confirmationEyebrow')}</span>
              <h2 id="camp-booking-confirmation">{t('care.camp.confirmationTitle')}</h2>
            </div>
            <CheckCircle2 size={28} aria-hidden="true" />
          </div>

          <div className="wf-status-chart">
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t('care.camp.slot')}</span>
              <strong>{confirmation.slot.slotStart} – {confirmation.slot.slotEnd}</strong>
            </div>
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t('care.camp.place')}</span>
              <strong>{confirmation.camp.location || t('care.campus')}</strong>
            </div>
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t('care.camp.camp')}</span>
              <strong>{confirmation.camp.name}</strong>
            </div>
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t('care.camp.date')}</span>
              <strong>{confirmation.camp.date}</strong>
            </div>
          </div>

          <div className="wf-notice" role="note" style={{ marginTop: 16 }}>
            <ClipboardList size={18} aria-hidden="true" />
            <div>
              <strong>{t('care.camp.whatToBring')}</strong>
              <div style={{ marginTop: 4 }}>
                {confirmation.camp.whatToBring || t('care.camp.nothingToBring')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              className="health-button health-button-primary"
              onClick={() => addBookingToCalendar(confirmation, t)}
            >
              <CalendarDays size={16} aria-hidden="true" />
              {t('care.camp.addToCalendar')}
            </button>
            <button
              type="button"
              className="health-button"
              onClick={() => {
                setConfirmation(null);
                setSelected('');
                setSelectedSlotId('');
                setNotice(null);
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t('care.camp.backToCamps')}
            </button>
          </div>
        </section>
      )}

      {selectedCamp && status.data?.registered && !confirmation && (
        <section className="wf-card wf-section-gap">
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{selectedCamp.date}</span>
              <h3>{t('care.camp.progress')}</h3>
            </div>
            {!status.data.checkedIn && (
              <button
                type="button"
                className="health-button health-button-primary"
                disabled={mutation.busy}
                onClick={checkIn}
              >
                <UserCheck size={16} aria-hidden="true" />
                {t('care.camp.checkIn')}
              </button>
            )}
          </div>

          {status.data.checkedIn && (
            <div className="wf-notice" role="status" style={{ marginBottom: 16 }}>
              <CheckCircle2 size={18} aria-hidden="true" />
              {t('care.camp.checkedIn')}
            </div>
          )}

          <DataState {...stations} retry={stations.reload}>
            <div className="wf-status-chart">
              {stations.data?.items.map(station => {
                const done = completed.includes(station.id);

                return (
                  <div key={station.id} style={{ gridTemplateColumns: '1fr 40px' }}>
                    <span>
                      {done ? <CheckCircle2 size={16} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> : null} {station.name}
                    </span>
                    <button
                      type="button"
                      className="health-button"
                      disabled={done || mutation.busy}
                      onClick={() => complete(station.id)}
                    >
                      {done ? t('care.camp.done') : t('care.camp.complete')}
                    </button>
                  </div>
                );
              })}
            </div>
          </DataState>
        </section>
      )}

      {selectedCamp && status.data?.registered && !status.data?.slotId && !confirmation && (
        <div className="wf-notice" role="status" style={{ marginTop: 16 }}>
          {t('care.camp.chooseSlot')}
        </div>
      )}

      {bookedSlot && !confirmation && (
        <div className="wf-notice" role="status" style={{ marginTop: 16 }}>
          <CheckCircle2 size={18} aria-hidden="true" />
          {t('care.camp.bookedSlot', { start: bookedSlot.slotStart, end: bookedSlot.slotEnd })}
        </div>
      )}
    </>
  );
}
