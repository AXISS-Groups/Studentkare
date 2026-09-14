import React, { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { navigate } from '../../lib/workflowRouting';
import '../../theme/workflows.css';

export interface LabSlotPickerModalProps {
  testName: string;
  catalogItemId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestCare?: () => void;
  token?: string | null;
}

interface LabSlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  available: number;
}

interface LabAppointment { id: string; slotStart: string; slotEnd: string; status: 'REQUESTED' }

function isBookable(slot: LabSlot): boolean {
  return !!slot && typeof slot.id === 'string' && !!slot.id &&
    typeof slot.slotStart === 'string' && typeof slot.slotEnd === 'string' &&
    Date.parse(slot.slotStart) > Date.now() && Date.parse(slot.slotEnd) > Date.parse(slot.slotStart) &&
    Number.isInteger(slot.capacity) && Number.isInteger(slot.booked) && slot.booked >= 0 &&
    slot.capacity > slot.booked && Number.isInteger(slot.available) && slot.available > 0 &&
    slot.available === slot.capacity - slot.booked;
}

export function LabSlotPickerModal(props: LabSlotPickerModalProps) {
  const { user } = useAuth();
  if (!props.isOpen) return null;
  return <LabBookingSession key={`${user?.id || 'guest'}:${props.catalogItemId}`} {...props} signedIn={!!user} />;
}

function LabBookingSession({ testName, catalogItemId, onClose, onRequestCare, signedIn }: LabSlotPickerModalProps & { signedIn: boolean }) {
  const [slots, setSlots] = useState<LabSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(signedIn);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [appointment, setAppointment] = useState<LabAppointment | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSlots([]);
    setSelectedSlot('');
    apiRequest<{ slots: LabSlot[] }>(`/appointments/availability?catalogItemId=${encodeURIComponent(catalogItemId)}`, { signal: controller.signal })
      .then(result => {
        if (!Array.isArray(result?.slots)) throw new Error('The availability service returned an invalid response.');
        if (!controller.signal.aborted) setSlots(result.slots.filter(isBookable));
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load availability.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [catalogItemId, signedIn, revision]);

  const close = () => { request.current?.abort(); onClose(); };
  const handleBookSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signedIn || loading || request.current || appointment) return;
    const slot = slots.find(entry => entry.id === selectedSlot);
    if (!slot || !isBookable(slot)) { setError('Choose a future available slot. Refresh availability to check again.'); return; }
    const controller = new AbortController();
    request.current = controller;
    setBooking(true);
    setError('');
    try {
      const result = await apiRequest<LabAppointment>('/appointments', {
        method: 'POST', body: JSON.stringify({ slotId: slot.id }), signal: controller.signal,
      });
      if (!result || typeof result.id !== 'string' || !result.id || result.status !== 'REQUESTED' ||
        result.slotStart !== slot.slotStart || result.slotEnd !== slot.slotEnd) {
        throw new Error('Could not verify the appointment response. Check your appointments before trying again.');
      }
      if (!controller.signal.aborted) setAppointment(result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(`${cause instanceof Error ? cause.message : 'Could not submit the appointment.'} Check your appointments before retrying if the submission status is uncertain.`);
        setSlots([]);
        setSelectedSlot('');
      }
    } finally {
      if (!controller.signal.aborted) { setBooking(false); request.current = null; }
    }
  };

  return <div className="wf-modal-backdrop" onClick={close}>
    <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title" style={{ maxWidth: 580 }} onClick={event => event.stopPropagation()}>
      <button className="wf-modal-close" onClick={close} aria-label="Close modal"><X size={18} /></button>
      <div className="wf-modal-header"><h3 id="lab-modal-title"><Calendar size={22} /> Request a lab appointment</h3><p>{testName}</p></div>
      <p>Choose a published provider slot. The provider must confirm the appointment, location, and any preparation instructions. Home collection and collector dispatch are not confirmed here.</p>
      {error && <div className="wf-notice" role="alert">{error}</div>}
      {appointment ? <div className="wf-form" role="status">
        <h4>Appointment request saved</h4>
        <p>Reference: {appointment.id} · Status: {appointment.status}</p>
        <p>{displayDate(appointment.slotStart)} – {displayDate(appointment.slotEnd)}</p>
        <p>Provider confirmation is pending. No collector has been dispatched by this booking flow.</p>
      </div> : !signedIn ? <>
        <p>Sign in to view real availability and request an appointment.</p>
        <button className="health-button health-button-primary" onClick={() => { close(); navigate('login', 'shop'); }}>Sign in</button>
      </> : <form className="wf-form" onSubmit={handleBookSlot}>
        {loading && <p role="status">Loading provider availability…</p>}
        {!loading && !error && !slots.length && <p>No bookable slots are currently published for this test.</p>}
        <label htmlFor="lab-provider-slot">Available provider slots</label>
        <select id="lab-provider-slot" value={selectedSlot} onChange={event => setSelectedSlot(event.target.value)} disabled={loading || booking || !slots.length} required>
          <option value="">Select a published slot</option>
          {slots.map(slot => <option key={slot.id} value={slot.id}>{displayDate(slot.slotStart)} – {displayDate(slot.slotEnd)} · {slot.available} available</option>)}
        </select>
        <button className="health-button health-button-primary" type="submit" disabled={loading || booking || !selectedSlot}>{booking ? 'Saving appointment request…' : 'Request selected slot'}</button>
        <button className="health-button" type="button" disabled={loading || booking} onClick={() => setRevision(value => value + 1)}>Refresh availability</button>
      </form>}
      {!appointment && !booking && onRequestCare && <div className="wf-form">
        <p>You can instead prepare a care request. Its requested time will need provider confirmation.</p>
        <button className="health-button" onClick={() => { close(); onRequestCare(); }}>Continue with a care request</button>
      </div>}
      {signedIn && <button className="health-button" onClick={() => { close(); navigate('appointments'); }}>View appointments</button>}
    </div>
  </div>;
}
