import React, { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { useAuth } from '../../data/contexts/AuthContext';
import { apiRequest } from '../../data/services/http';
import { displayDate } from '../../data/types/workflowTypes';
import { navigate } from '../../lib/utils/workflowRouting';
import { say, useT, type MessageKey, type Said } from '@/i18n';
import '../../theme/workflows.css';

export interface LabSlotPickerModalProps {
  testName: string;
  catalogItemId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestCare?: () => void;
  token?: string | null;
  /**
   * A test the student's doctor already ordered: choose its collection time on
   * the order itself (PUT /lab-orders/{id}/slot) instead of requesting an
   * appointment. Nothing is priced or charged.
   */
  labOrder?: { id: string; fastingRequired: boolean };
  /** Called once a collection time is saved on the order. */
  onSlotChosen?: () => void;
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
interface SavedLabOrder { id: string; slotStart: string; status: string }

/** An error of ours (translated when shown), as opposed to a message the server sent. */
class KnownError extends Error {
  constructor(readonly key: MessageKey) { super(key); }
}

function toSaid(cause: unknown, fallback: MessageKey): Said {
  if (cause instanceof KnownError) return { key: cause.key };
  return cause instanceof Error && cause.message ? { raw: cause.message } : { key: fallback };
}

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
  return <LabBookingSession key={`${user?.id || 'guest'}:${props.labOrder?.id || props.catalogItemId}`} {...props} signedIn={!!user} />;
}

function LabBookingSession({ testName, catalogItemId, onClose, onRequestCare, signedIn, labOrder, onSlotChosen }: LabSlotPickerModalProps & { signedIn: boolean }) {
  const t = useT();
  const orderId = labOrder?.id;
  const [slots, setSlots] = useState<LabSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(signedIn);
  const [booking, setBooking] = useState(false);
  /** `checkFirst`: the submission may or may not have gone through. */
  const [error, setError] = useState<{ said: Said; checkFirst: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  const [appointment, setAppointment] = useState<LabAppointment | null>(null);
  /** The collection time saved on a doctor-ordered test. */
  const [chosen, setChosen] = useState<LabSlot | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSlots([]);
    setSelectedSlot('');
    const source = orderId ? `/lab-orders/${encodeURIComponent(orderId)}/slots`
      : `/appointments/availability?catalogItemId=${encodeURIComponent(catalogItemId)}`;
    apiRequest<{ slots: LabSlot[] }>(source, { signal: controller.signal })
      .then(result => {
        if (!Array.isArray(result?.slots)) throw new KnownError('care.lab.invalidResponse');
        if (!controller.signal.aborted) setSlots(result.slots.filter(isBookable));
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError({ said: toSaid(cause, 'care.lab.loadFailed'), checkFirst: false });
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [catalogItemId, orderId, signedIn, revision]);

  const close = () => { request.current?.abort(); onClose(); };
  const handleBookSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signedIn || loading || request.current || appointment || chosen) return;
    const slot = slots.find(entry => entry.id === selectedSlot);
    if (!slot || !isBookable(slot)) { setError({ said: { key: 'care.lab.chooseFuture' }, checkFirst: false }); return; }
    const controller = new AbortController();
    request.current = controller;
    setBooking(true);
    setError(null);
    try {
      if (orderId) {
        const saved = await apiRequest<SavedLabOrder>(`/lab-orders/${encodeURIComponent(orderId)}/slot`, {
          method: 'PUT', body: JSON.stringify({ slotId: slot.id }), signal: controller.signal,
        });
        if (!saved || saved.id !== orderId || saved.slotStart !== slot.slotStart || saved.status !== 'BOOKED') {
          throw new KnownError('care.lab.orderUnverified');
        }
        if (!controller.signal.aborted) { setChosen(slot); onSlotChosen?.(); }
        return;
      }
      const result = await apiRequest<LabAppointment>('/appointments', {
        method: 'POST', body: JSON.stringify({ slotId: slot.id }), signal: controller.signal,
      });
      if (!result || typeof result.id !== 'string' || !result.id || result.status !== 'REQUESTED' ||
        result.slotStart !== slot.slotStart || result.slotEnd !== slot.slotEnd) {
        throw new KnownError('care.lab.unverified');
      }
      if (!controller.signal.aborted) setAppointment(result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError({ said: toSaid(cause, orderId ? 'care.lab.orderSubmitFailed' : 'care.lab.submitFailed'), checkFirst: !orderId });
        setSlots([]);
        setSelectedSlot('');
      }
    } finally {
      if (!controller.signal.aborted) { setBooking(false); request.current = null; }
    }
  };

  return <div className="wf-modal-backdrop" onClick={close}>
    <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title" style={{ maxWidth: 580 }} onClick={event => event.stopPropagation()}>
      <button type="button" className="wf-modal-close" onClick={close} aria-label={t('care.close')}><X size={18} aria-hidden="true" /></button>
      <div className="wf-modal-header"><h3 id="lab-modal-title"><Calendar size={22} aria-hidden="true" /> {t(orderId ? 'care.lab.orderTitle' : 'care.lab.title')}</h3><p>{testName}</p></div>
      <p>{t(orderId ? 'care.lab.orderIntro' : 'care.lab.intro')}</p>
      {labOrder?.fastingRequired && <div className="wf-notice" role="note">{t('care.lab.fastingNote')}</div>}
      {error && <div className="wf-notice" role="alert">{say(t, error.said)}{error.checkFirst ? ` ${t('care.lab.checkBeforeRetry')}` : ''}</div>}
      {chosen ? <div className="wf-form" role="status">
        <h4>{t('care.lab.orderSavedTitle')}</h4>
        <p>{t('care.lab.range', { start: displayDate(chosen.slotStart), end: displayDate(chosen.slotEnd) })}</p>
        <p>{t('care.lab.orderSavedBody')}</p>
      </div> : appointment ? <div className="wf-form" role="status">
        <h4>{t('care.lab.savedTitle')}</h4>
        <p>{t('care.lab.reference', { id: appointment.id })}</p>
        <p>{t('care.lab.range', { start: displayDate(appointment.slotStart), end: displayDate(appointment.slotEnd) })}</p>
        <p>{t('care.lab.pending')}</p>
      </div> : !signedIn ? <>
        <p>{t('care.lab.signInPrompt')}</p>
        <button type="button" className="health-button health-button-primary" onClick={() => { close(); navigate('login', 'shop'); }}>{t('care.signIn')}</button>
      </> : <form className="wf-form" onSubmit={handleBookSlot}>
        {loading && <p role="status">{t('care.lab.loading')}</p>}
        {!loading && !error && !slots.length && <p>{t(orderId ? 'care.lab.orderNoSlots' : 'care.lab.noSlots')}</p>}
        <label htmlFor="lab-provider-slot">{t('care.lab.slotsLabel')}</label>
        <select id="lab-provider-slot" value={selectedSlot} onChange={event => setSelectedSlot(event.target.value)} disabled={loading || booking || !slots.length} required>
          <option value="">{t('care.lab.selectSlot')}</option>
          {slots.map(slot => <option key={slot.id} value={slot.id}>{t('care.lab.slotOption', { start: displayDate(slot.slotStart), end: displayDate(slot.slotEnd), count: slot.available })}</option>)}
        </select>
        <button className="health-button health-button-primary" type="submit" disabled={loading || booking || !selectedSlot}>{booking ? t(orderId ? 'care.lab.orderSaving' : 'care.lab.saving') : t(orderId ? 'care.lab.orderSave' : 'care.lab.request')}</button>
        <button className="health-button" type="button" disabled={loading || booking} onClick={() => setRevision(value => value + 1)}>{t('care.lab.refresh')}</button>
      </form>}
      {!orderId && !appointment && !booking && onRequestCare && <div className="wf-form">
        <p>{t('care.lab.careAlternative')}</p>
        <button type="button" className="health-button" onClick={() => { close(); onRequestCare(); }}>{t('care.lab.careContinue')}</button>
      </div>}
      {signedIn && !orderId && <button type="button" className="health-button" onClick={() => { close(); navigate('appointments'); }}>{t('care.lab.viewAppointments')}</button>}
    </div>
  </div>;
}
