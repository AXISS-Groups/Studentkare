import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Info, UserCheck, X } from 'lucide-react';
import { apiRequest } from '../../data/services/http';
import { say, useT, type Said } from '@/i18n';
import { ConsultCallPanel } from './consult/ConsultCallPanel';
import '../../theme/workflows.css';

interface SessionState { status: string; studentJoined: boolean; providerJoined: boolean; liveMedia: boolean; }

function formatWhen(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Student side of a confirmed consultation.
 *
 * When the backend reports a configured LiveKit server (`liveMedia`), the
 * student can join a real video or voice call; joining also checks them in.
 * The camera and microphone are requested only after "Join" and a granted
 * token. Without LiveKit (or while that cannot be confirmed) it does the one
 * real thing, telling the provider the student is ready, and says plainly that
 * no call happens here.
 */
function VideoConsultationDialog({ appointment, onClose }: { appointment: { id: string; slotStart: string }; onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<Said | null>(null);
  // null until /state answers; a failed answer counts as "no live media" (fail closed).
  const [liveMedia, setLiveMedia] = useState<boolean | null>(null);
  const checkedIn = Boolean(session?.studentJoined);
  const checkedInRef = useRef(false);
  useEffect(() => { checkedInRef.current = checkedIn; }, [checkedIn]);

  useEffect(() => {
    let active = true;
    apiRequest<SessionState>(`/consultation/${appointment.id}/state`)
      .then(state => { if (active) { setLiveMedia(state.liveMedia === true); if (state.studentJoined) setSession(state); } })
      .catch(() => { if (active) setLiveMedia(false); });
    return () => { active = false; };
  }, [appointment.id]);

  // Joining the call checks the student in, once: re-joining after a drop must
  // not reset a consultation the provider has already started.
  const checkInForCall = useCallback(async () => {
    if (checkedInRef.current) return;
    setSession(await apiRequest<SessionState>(`/consultation/${appointment.id}/join`, { method: 'POST' }));
  }, [appointment.id]);

  const checkIn = async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await apiRequest<SessionState>(`/consultation/${appointment.id}/join`, { method: 'POST' }));
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? { raw: cause.message } : { key: 'care.consult.checkInFailed' });
    } finally {
      setBusy(false);
    }
  };

  const refresh = useCallback(async () => {
    try {
      setSession(await apiRequest<SessionState>(`/consultation/${appointment.id}/state`));
    } catch { /* display only: keep the last known state */ }
  }, [appointment.id]);
  useEffect(() => {
    if (!checkedIn) return undefined;
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [checkedIn, refresh]);

  const noCallNote = <div className="wf-notice" role="note">
    <Info size={18} aria-hidden="true" />
    <div><strong>{t('consult.noteTitle')}</strong><div>{t('care.consult.noCallBody')}</div></div>
  </div>;

  // During a call a stray click outside must not hang up; use Close instead.
  return <div className="wf-modal-backdrop" onClick={liveMedia ? undefined : onClose}>
    <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="consult-checkin-title" style={{ maxWidth: 560 }} onClick={event => event.stopPropagation()}>
      <button type="button" className="wf-modal-close" onClick={onClose} aria-label={t('care.close')}><X size={18} aria-hidden="true" /></button>
      <div className="wf-modal-header">
        <h3 id="consult-checkin-title"><UserCheck size={22} aria-hidden="true" /> {t('care.consult.title')}</h3>
        <p>{t('care.consult.when', { when: formatWhen(appointment.slotStart) })}</p>
      </div>

      {liveMedia === null && <p role="status">{t('care.call.loading')}</p>}
      {liveMedia === true && <>
        <p>{t('care.call.checkInFirst')}</p>
        <ConsultCallPanel appointmentId={appointment.id} party={t('care.call.partyDoctor')} beforeJoin={checkInForCall} unavailableNote={noCallNote} />
      </>}
      {liveMedia === false && <>
        {noCallNote}

        {error && <div className="wf-notice" role="alert" style={{ marginTop: 16 }}>{say(t, error)}</div>}

        {checkedIn ? <div style={{ marginTop: 16 }}>
          <div className="wf-notice" role="status" style={{ background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', borderColor: 'var(--sk-color-positive)' }}>
            <CheckCircle2 size={18} aria-hidden="true" />{t('care.consult.checkedIn')}
          </div>
          <p role="status">{session?.providerJoined ? t('care.consult.providerStarted') : t('care.consult.providerNotYet')}</p>
        </div> : <div style={{ marginTop: 16 }}>
          <p>{t('care.consult.checkInExplain')}</p>
          <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} disabled={busy} aria-busy={busy} onClick={() => { void checkIn(); }}>
            <UserCheck size={16} aria-hidden="true" />{busy ? t('care.consult.checkingIn') : t('care.consult.checkIn')}
          </button>
        </div>}
      </>}

      <div className="wf-row-actions" style={{ marginTop: 18 }}>
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onClose}>{t('care.close')}</button>
      </div>
    </div>
  </div>;
}

export { VideoConsultationDialog };
