import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, ShieldCheck, Video } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { VideoConsultationDialog } from '../../components/health/VideoConsultationDialog';
import '../../theme/workflows.css';

interface Slot { id: string; slotStart: string; slotEnd: string; capacity: number; booked: number; available: number; }
interface Appointment { id: string; catalogItemId: string; providerId: string; slotStart: string; slotEnd: string; status: string; createdAt: number; }

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

export function AppointmentsPanel() {
  const resource = useApiResource<{ items: Appointment[] }>('/appointments');
  const prefs = useApiResource<any>('/notifications/preferences');
  const [booking, setBooking] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [consulting, setConsulting] = useState<Appointment | null>(null);
  const mutation = useMutation();
  const prefMutation = useMutation();

  const statusClass = (s: string) => s === 'CONFIRMED' ? 'status-accepted' : s === 'COMPLETED' ? 'status-completed' : s === 'CANCELLED' ? 'status-cancelled' : s === 'NO_SHOW' ? 'status-declined' : 'status-requested';

  return <>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">CARE THAT YOU CAN FOLLOW</span>
        <h2>Your appointments.</h2>
        <p>Book a confirmed time, review your visits, and set reminder preferences.</p>
      </div>
      <div className="wf-row-actions">
        <button className="health-button" onClick={() => { setReminderOpen(true); prefs.reload(); }}><ShieldCheck size={16} />Reminder settings</button>
        <button className="health-button health-button-primary" onClick={() => setBooking(true)}><Plus size={16} />Book an appointment</button>
      </div>
    </div>

    <FormError message={mutation.error} />

    <DataState {...resource} retry={resource.reload}>
      {resource.data?.items.length ? <div className="wf-order-list">
        {resource.data.items.map(appt => <article className="wf-card" key={appt.id}>
          <div className="wf-panel-heading">
            <div><span className="care-eyebrow">APPOINTMENT {appt.id.slice(0, 8).toUpperCase()}</span><h3>{formatDate(appt.slotStart)}</h3></div>
            <span className={`wf-status ${statusClass(appt.status)}`}>{STATUS_LABEL[appt.status] || appt.status}</span>
          </div>
          <div className="wf-order-meta">
            <span>{formatDate(appt.slotEnd)}</span>
            <small>Requests are confirmed by the provider. A requested time is not a booked slot until confirmed.</small>
          </div>
          {appt.status === 'REQUESTED' && <button className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/appointments/${appt.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }), resource.reload)}>Cancel this appointment</button>}
          {appt.status === 'CONFIRMED' && <button className="health-button" onClick={() => setConsulting(appt)}><Video size={16} />Join consultation</button>}
        </article>)}
      </div> : <EmptyState title="No appointments yet." description="Book a time from available provider slots and it will appear here with its status." action="Book an appointment" onAction={() => setBooking(true)} />}
    </DataState>

    {booking && <BookAppointmentDialog onClose={() => setBooking(false)} onDone={() => { setBooking(false); resource.reload(); }} />}
    {reminderOpen && <ReminderSettingsDialog onClose={() => setReminderOpen(false)} prefs={prefs} mutation={prefMutation} />}
    {consulting && <VideoConsultationDialog appointment={{ id: consulting.id, slotStart: consulting.slotStart, customer: 'your provider' }} onClose={() => setConsulting(null)} />}
  </>;
}

function BookAppointmentDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const catalog = useApiResource<{ items: { id: string; name: string; kind: string; brand: string }[] }>('/catalog?kind=consultation&limit=50');
  const [catalogItemId, setCatalogItemId] = useState('');
  const [date, setDate] = useState('');
  const availability = useApiResource<{ slots: Slot[] }>(catalogItemId ? `/appointments/availability?catalogItemId=${encodeURIComponent(catalogItemId)}&date=${encodeURIComponent(date)}` : '');
  const [selectedSlot, setSelectedSlot] = useState('');
  const mutation = useMutation();
  const consults = catalog.data?.items || [];

  const book = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.run(() => apiRequest('/appointments', { method: 'POST', body: JSON.stringify({ slotId: selectedSlot }) }), onDone);
  };

  return <ShopDialog title="Book an appointment" onClose={onClose} wide>
    <form className="wf-form" onSubmit={book}>
      <FormError message={mutation.error} />
      <Field label="Service" hint="Published consultation services">
        <select value={catalogItemId} onChange={e => { setCatalogItemId(e.target.value); setSelectedSlot(''); availability.reload(); }}>
          <option value="">Choose a service…</option>
          {consults.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" value={date} onChange={e => { setDate(e.target.value); setSelectedSlot(''); availability.reload(); }} /></Field>

      {catalogItemId && <div>
        <span className="wf-status" style={{ display: 'inline-block', marginBottom: 8 }}>AVAILABLE SLOTS</span>
        <DataState {...availability} retry={availability.reload}>
          {availability.data?.slots.length ? <div className="wf-choice-row" aria-label="Available slots">
            {availability.data.slots.map(slot => <button key={slot.id} type="button" aria-pressed={selectedSlot === slot.id} disabled={slot.available < 1} onClick={() => setSelectedSlot(slot.id)}>
              <CalendarDays size={15} />{formatDate(slot.slotStart)}{slot.available < slot.capacity ? ` · ${slot.available} left` : ''}
            </button>)}
          </div> : <p className="wf-notice">No slots published for this service and date yet.</p>}
        </DataState>
      </div>}

      <div className="wf-notice"><ShieldCheck size={18} />Booking reserves a slot. The provider confirms before it becomes a confirmed appointment. No payment is collected here.</div>
      <SubmitButton busy={mutation.busy} disabled={!selectedSlot}>Request this appointment</SubmitButton>
    </form>
  </ShopDialog>;
}

function ReminderSettingsDialog({ onClose, prefs, mutation }: { onClose: () => void; prefs: any; mutation: any }) {
  const [emailEnabled, setEmailEnabled] = useState(prefs.data?.emailEnabled ?? true);
  const [pushEnabled, setPushEnabled] = useState(prefs.data?.pushEnabled ?? true);
  const [remindersEnabled, setRemindersEnabled] = useState(prefs.data?.remindersEnabled ?? true);
  const [timezone, setTimezone] = useState(prefs.data?.timezone ?? 'Asia/Kolkata');
  const [quietStart, setQuietStart] = useState(prefs.data?.quietStart ?? '22:00');
  const [quietEnd, setQuietEnd] = useState(prefs.data?.quietEnd ?? '08:00');
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (prefs.data) {
      setEmailEnabled(prefs.data.emailEnabled ?? true);
      setPushEnabled(prefs.data.pushEnabled ?? true);
      setRemindersEnabled(prefs.data.remindersEnabled ?? true);
      setTimezone(prefs.data.timezone ?? 'Asia/Kolkata');
      setQuietStart(prefs.data.quietStart ?? '22:00');
      setQuietEnd(prefs.data.quietEnd ?? '08:00');
    }
  }, [prefs.data]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.run(() => apiRequest('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ emailEnabled, pushEnabled, remindersEnabled, timezone, quietStart, quietEnd }) }), () => setSaved(true));
  };

  return <ShopDialog title="Reminder settings" onClose={onClose}>
    <form className="wf-form" onSubmit={save}>
      <FormError message={mutation.error} />
      <label className="wf-checkbox"><input type="checkbox" checked={remindersEnabled} onChange={e => setRemindersEnabled(e.target.checked)} /><span>Appointment & medication reminders</span></label>
      <label className="wf-checkbox"><input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} disabled={!remindersEnabled} /><span>Email notifications</span></label>
      <label className="wf-checkbox"><input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} disabled={!remindersEnabled} aria-describedby="pref-push-note" /><span>Push notifications</span></label>
      {/* Stored and honoured the day push ships. Saying so beats a checkbox that
          quietly does nothing: there is no push delivery path in the app today. */}
      <small id="pref-push-note" className="wf-fineprint">Push is not available in this app yet. Your choice is saved and will apply as soon as it is.</small>
      <Field label="Timezone"><input value={timezone} maxLength={40} onChange={e => setTimezone(e.target.value)} /></Field>
      <div className="wf-form-grid">
        <Field label="Quiet hours start"><input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} /></Field>
        <Field label="Quiet hours end"><input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} /></Field>
      </div>
      <p className="wf-fineprint">Reminders are delivered through configured channels. If a channel is not configured, reminders stay queued and are not claimed as sent.</p>
      {saved && <div className="wf-notice" role="status" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}><CheckCircle2 size={18} />Reminder preferences saved.</div>}
      <SubmitButton busy={mutation.busy}>Save preferences</SubmitButton>
    </form>
  </ShopDialog>;
}
