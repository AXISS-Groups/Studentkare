import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, ShieldCheck, UserCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { VideoConsultationDialog } from '../../components/health/VideoConsultationDialog';
import { useT, type MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface Slot { id: string; slotStart: string; slotEnd: string; capacity: number; booked: number; available: number; }
interface Appointment { id: string; catalogItemId: string; providerId: string; slotStart: string; slotEnd: string; status: string; createdAt: number; /** The booked service, when the server knows it. */ serviceName?: string }
/** The stored preferences. Other fields (consents this dialog does not show) are kept and sent back untouched. */
interface Prefs { [field: string]: unknown; emailEnabled?: boolean; pushEnabled?: boolean; remindersEnabled?: boolean; timezone?: string; quietStart?: string; quietEnd?: string; }

const KNOWN_STATUS = new Set(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

export function AppointmentsPanel() {
  const t = useT();
  const resource = useApiResource<{ items: Appointment[] }>('/appointments');
  const prefs = useApiResource<Prefs>('/notifications/preferences');
  const [booking, setBooking] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [consulting, setConsulting] = useState<Appointment | null>(null);
  const mutation = useMutation();
  const prefMutation = useMutation();

  const statusClass = (s: string) => s === 'CONFIRMED' ? 'status-accepted' : s === 'COMPLETED' ? 'status-completed' : s === 'CANCELLED' ? 'status-cancelled' : s === 'NO_SHOW' ? 'status-declined' : 'status-requested';
  const statusLabel = (s: string) => KNOWN_STATUS.has(s) ? t(`care.appts.status.${s}` as MessageKey) : s;

  return <>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">{t('care.appts.eyebrow')}</span>
        <h2>{t('care.appts.title')}</h2>
        <p>{t('care.appts.intro')}</p>
      </div>
      <div className="wf-row-actions">
        <button type="button" className="health-button" onClick={() => { setReminderOpen(true); prefs.reload(); }}><ShieldCheck size={16} aria-hidden="true" />{t('care.appts.reminderSettings')}</button>
        <button type="button" className="health-button health-button-primary" onClick={() => setBooking(true)}><Plus size={16} aria-hidden="true" />{t('care.appts.book')}</button>
      </div>
    </div>

    <FormError message={mutation.error} />

    <DataState {...resource} retry={resource.reload}>
      {resource.data?.items.length ? <div className="wf-order-list">
        {resource.data.items.map(appt => <article className="wf-card" key={appt.id}>
          <div className="wf-panel-heading">
            <div><span className="care-eyebrow">{appt.serviceName || t('care.appts.ref', { ref: appt.id.slice(0, 8).toUpperCase() })}</span><h3>{formatDate(appt.slotStart)}</h3></div>
            <span className={`wf-status ${statusClass(appt.status)}`}>{statusLabel(appt.status)}</span>
          </div>
          <div className="wf-order-meta">
            <span>{t('care.appts.endsAt', { when: formatDate(appt.slotEnd) })}</span>
            <small>{t('care.appts.confirmNote')}</small>
          </div>
          {appt.status === 'REQUESTED' && <button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/appointments/${appt.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }), resource.reload)}>{t('care.appts.cancel')}</button>}
          {/* There is no video service: this records that the student is ready, nothing more. */}
          {appt.status === 'CONFIRMED' && <button type="button" className="health-button" onClick={() => setConsulting(appt)}><UserCheck size={16} aria-hidden="true" />{t('care.appts.checkIn')}</button>}
        </article>)}
      </div> : <EmptyState title={t('care.appts.emptyTitle')} description={t('care.appts.emptyBody')} action={t('care.appts.book')} onAction={() => setBooking(true)} animation="anim-calendar" />}
    </DataState>

    {booking && <BookAppointmentDialog onClose={() => setBooking(false)} onDone={() => { setBooking(false); resource.reload(); }} />}
    {reminderOpen && <ReminderSettingsDialog onClose={() => setReminderOpen(false)} prefs={prefs.data} mutation={prefMutation} />}
    {consulting && <VideoConsultationDialog appointment={{ id: consulting.id, slotStart: consulting.slotStart }} onClose={() => setConsulting(null)} />}
  </>;
}

/** `initialItemId`: the consultation already picked (Mobile 2.0 Doctor consults' "Book"). */
export function BookAppointmentDialog({ onClose, onDone, initialItemId = '' }: { onClose: () => void; onDone: () => void; initialItemId?: string }) {
  const t = useT();
  const catalog = useApiResource<{ items: { id: string; name: string; kind: string; brand: string }[] }>('/catalog?kind=consultation&limit=50');
  const [catalogItemId, setCatalogItemId] = useState(initialItemId);
  const [date, setDate] = useState('');
  const availability = useApiResource<{ slots: Slot[] }>(catalogItemId ? `/appointments/availability?catalogItemId=${encodeURIComponent(catalogItemId)}&date=${encodeURIComponent(date)}` : '');
  const [selectedSlot, setSelectedSlot] = useState('');
  const mutation = useMutation();
  const consults = catalog.data?.items || [];

  const book = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.run(() => apiRequest('/appointments', { method: 'POST', body: JSON.stringify({ slotId: selectedSlot }) }), onDone);
  };

  return <ShopDialog title={t('care.appts.book')} onClose={onClose} wide>
    <form className="wf-form" onSubmit={book}>
      <FormError message={mutation.error} />
      <Field label={t('care.appts.service')} hint={t('care.appts.serviceHint')}>
        <select value={catalogItemId} onChange={e => { setCatalogItemId(e.target.value); setSelectedSlot(''); availability.reload(); }}>
          <option value="">{t('care.appts.chooseService')}</option>
          {consults.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label={t('care.appts.date')}><input type="date" value={date} onChange={e => { setDate(e.target.value); setSelectedSlot(''); availability.reload(); }} /></Field>

      {catalogItemId && <div>
        <span className="wf-status" style={{ display: 'inline-block', marginBottom: 8 }}>{t('care.appts.slots')}</span>
        <DataState {...availability} retry={availability.reload}>
          {availability.data?.slots.length ? <div className="wf-choice-row" role="group" aria-label={t('care.appts.slots')}>
            {availability.data.slots.map(slot => <button key={slot.id} type="button" aria-pressed={selectedSlot === slot.id} disabled={slot.available < 1} onClick={() => setSelectedSlot(slot.id)}>
              <CalendarDays size={15} aria-hidden="true" />{formatDate(slot.slotStart)}{slot.available < slot.capacity ? ` · ${t('appt.left', { count: slot.available })}` : ''}
            </button>)}
          </div> : <p className="wf-notice">{t('care.appts.noSlots')}</p>}
        </DataState>
      </div>}

      <div className="wf-notice"><ShieldCheck size={18} aria-hidden="true" />{t('care.appts.bookingNote')}</div>
      <SubmitButton busy={mutation.busy} disabled={!selectedSlot}>{t('appt.request')}</SubmitButton>
    </form>
  </ShopDialog>;
}

function ReminderSettingsDialog({ onClose, prefs, mutation }: { onClose: () => void; prefs: Prefs | null; mutation: ReturnType<typeof useMutation> }) {
  const t = useT();
  const [emailEnabled, setEmailEnabled] = useState(prefs?.emailEnabled ?? true);
  const [pushEnabled, setPushEnabled] = useState(prefs?.pushEnabled ?? true);
  const [remindersEnabled, setRemindersEnabled] = useState(prefs?.remindersEnabled ?? true);
  const [timezone, setTimezone] = useState(prefs?.timezone ?? '');
  const [quietStart, setQuietStart] = useState(prefs?.quietStart ?? '22:00');
  const [quietEnd, setQuietEnd] = useState(prefs?.quietEnd ?? '08:00');
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.emailEnabled ?? true);
      setPushEnabled(prefs.pushEnabled ?? true);
      setRemindersEnabled(prefs.remindersEnabled ?? true);
      setTimezone(prefs.timezone ?? '');
      setQuietStart(prefs.quietStart ?? '22:00');
      setQuietEnd(prefs.quietEnd ?? '08:00');
    }
  }, [prefs]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    // PUT replaces every field. Without the stored values this would reset the
    // two consents this dialog does not show (pickup location, Ayush history),
    // and if they never loaded it would write defaults over the student's
    // choices — so it refuses to save rather than guess, and says so.
    if (!prefs) { mutation.setError(t('care.appts.prefs.notLoaded')); return; }
    mutation.run(() => apiRequest('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ ...prefs, emailEnabled, pushEnabled, remindersEnabled, timezone: timezone || undefined, quietStart, quietEnd }) }), () => setSaved(true));
  };

  return <ShopDialog title={t('care.appts.reminderSettings')} onClose={onClose}>
    <form className="wf-form" onSubmit={save}>
      <FormError message={mutation.error} />
      <label className="wf-checkbox"><input type="checkbox" checked={remindersEnabled} onChange={e => setRemindersEnabled(e.target.checked)} /><span>{t('care.appts.prefs.reminders')}</span></label>
      <label className="wf-checkbox"><input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} disabled={!remindersEnabled} /><span>{t('care.appts.prefs.email')}</span></label>
      <label className="wf-checkbox"><input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} disabled={!remindersEnabled} aria-describedby="pref-push-note" /><span>{t('care.appts.prefs.push')}</span></label>
      {/* Stored and honoured the day push ships. Saying so beats a checkbox that
          quietly does nothing: there is no push delivery path in the app today. */}
      <small id="pref-push-note" className="wf-fineprint">{t('care.appts.prefs.pushNote')}</small>
      <Field label={t('care.appts.prefs.timezone')}><input value={timezone} maxLength={40} onChange={e => setTimezone(e.target.value)} /></Field>
      <div className="wf-form-grid">
        <Field label={t('care.appts.prefs.quietStart')}><input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} /></Field>
        <Field label={t('care.appts.prefs.quietEnd')}><input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} /></Field>
      </div>
      <p className="wf-fineprint">{t('care.appts.prefs.channelsNote')}</p>
      {saved && <div className="wf-notice" role="status" style={{ background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', borderColor: 'var(--sk-color-positive)' }}><CheckCircle2 size={18} aria-hidden="true" />{t('care.appts.prefs.saved')}</div>}
      <SubmitButton busy={mutation.busy}>{t('care.appts.prefs.save')}</SubmitButton>
    </form>
  </ShopDialog>;
}
