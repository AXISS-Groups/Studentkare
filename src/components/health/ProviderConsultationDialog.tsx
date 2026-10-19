import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Info, X } from 'lucide-react';
import { apiRequest } from '../../data/services/http';
import { say, useT, type Said } from '@/i18n';
import { ConsultCallPanel } from './consult/ConsultCallPanel';
import '../../theme/workflows.css';

interface SessionState { status: string; studentJoined: boolean; providerJoined: boolean; liveMedia: boolean; }

/**
 * Provider-side consultation: shows whether the student has checked in, lets
 * the provider record that the consultation started and, when the backend
 * reports a configured LiveKit server (`liveMedia`), join a real video or
 * voice call with the student. The camera and microphone are requested only
 * after "Join" and a granted token. Without LiveKit it says plainly that no
 * call happens here.
 */
export function ProviderConsultationDialog({ appointment, onClose }: { appointment: { id: string; customer: string }; onClose: () => void }) {
  const t = useT();
  const [state, setState] = useState<SessionState | null>(null);
  const [stateFailed, setStateFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Said | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await apiRequest<SessionState>(`/consultation/${appointment.id}/state`));
      setStateFailed(false);
    } catch {
      setStateFailed(true);
    }
  }, [appointment.id]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const markStarted = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(await apiRequest<SessionState>(`/consultation/${appointment.id}/join-provider`, { method: 'POST' }));
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? { raw: cause.message } : { key: 'care.providerConsult.startFailed' });
    } finally {
      setBusy(false);
    }
  };

  const studentReady = Boolean(state?.studentJoined);
  const started = Boolean(state?.providerJoined);
  // Calls only when the server says LiveKit is configured; unknown or failed = no call.
  const liveMedia = state?.liveMedia === true;
  const noCallNote = <div className="wf-notice" role="note">
    <Info size={18} aria-hidden="true" />
    <div><strong>{t('consult.noteTitle')}</strong><div>{t('care.providerConsult.noCallBody')}</div></div>
  </div>;

  // During a call a stray click outside must not hang up; use Close instead.
  return <div className="wf-modal-backdrop" onClick={liveMedia ? undefined : onClose}>
    <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="provider-consult-title" style={{ maxWidth: 560 }} onClick={event => event.stopPropagation()}>
      <button type="button" className="wf-modal-close" onClick={onClose} aria-label={t('care.close')}><X size={18} aria-hidden="true" /></button>
      <div className="wf-modal-header">
        <h3 id="provider-consult-title"><ClipboardCheck size={22} aria-hidden="true" /> {t('care.providerConsult.title')}</h3>
        <p>{t('care.providerConsult.with', { name: appointment.customer })}</p>
      </div>

      {(state !== null || stateFailed) && !liveMedia && noCallNote}

      <div className="wf-row-actions" role="status" style={{ marginTop: 16 }}>
        <span className={`wf-status ${studentReady ? 'status-accepted' : 'status-requested'}`}>{studentReady ? t('care.providerConsult.studentReady') : t('care.providerConsult.studentNotYet')}</span>
        {started && <span className="wf-status status-accepted"><CheckCircle2 size={14} aria-hidden="true" /> {t('care.providerConsult.started')}</span>}
      </div>
      {stateFailed && <p className="wf-fineprint" role="status">{t('care.providerConsult.stateFailed')}</p>}
      {error && <div className="wf-notice" role="alert" style={{ marginTop: 16 }}>{say(t, error)}</div>}
      {liveMedia && <ConsultCallPanel appointmentId={appointment.id} party={t('care.call.partyStudent')} unavailableNote={noCallNote} />}

      <div className="wf-row-actions" style={{ marginTop: 18 }}>
        {!started && <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} disabled={!studentReady || busy} aria-busy={busy} onClick={() => { void markStarted(); }}>
          {t('care.providerConsult.markStarted')}
        </button>}
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onClose}>{t('care.close')}</button>
      </div>
    </div>
  </div>;
}
