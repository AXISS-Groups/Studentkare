import React, { useEffect, useState } from 'react';
import type { Track } from 'livekit-client';
import { AnimatedIllustration, Icon } from '@/design-system/icons';
import { useT, type MessageKey } from '@/i18n';
import { isLive, useConsultCall, type CallPhase } from './useConsultCall';
import './consultCall.css';

function VideoView({ track, className, label }: { track: Track | null; className: string; label: string }) {
  const [element, setElement] = useState<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!element || !track) return undefined;
    track.attach(element);
    return () => { track.detach(element); };
  }, [element, track]);
  if (!track) return null;
  return <video ref={setElement} className={className} autoPlay playsInline muted aria-label={label} />;
}

const STATUS: Partial<Record<CallPhase, MessageKey>> = {
  requesting: 'care.call.preparing',
  connecting: 'care.call.connecting',
  waiting: 'care.call.waiting',
  connected: 'care.call.connected',
  reconnecting: 'care.call.reconnecting',
  ended: 'care.call.ended',
  permissionDenied: 'care.call.permissionDenied',
  noDevice: 'care.call.noDevice',
};

/**
 * Join, see and hear the other party, mute, camera off, leave.
 *
 * Shown only when the backend reports a configured LiveKit server. Devices are
 * requested only after "Join" and a granted token (see useConsultCall).
 * `unavailableNote` is what to show if the server turns out not to be
 * connected after all, so the copy stays truthful.
 */
export function ConsultCallPanel({ appointmentId, party, beforeJoin, unavailableNote }: {
  appointmentId: string;
  /** Who the user is waiting for, already translated ("your doctor"). */
  party: string;
  beforeJoin?: () => Promise<void>;
  unavailableNote: React.ReactNode;
}) {
  const t = useT();
  const call = useConsultCall(appointmentId, beforeJoin);
  const { phase } = call;
  const live = isLive(phase);

  if (phase === 'unavailable') return <>{unavailableNote}</>;

  const statusKey = STATUS[phase];
  const failed = phase === 'error' || phase === 'refused';
  const failure = phase === 'error' ? (call.message || t('care.call.failed')) : call.message;

  return <section className="sk-call" aria-label={t('care.call.region')}>
    {phase === 'idle' && <p className="sk-call-status">{t('care.call.privacy')}</p>}
    {statusKey && <p className="sk-call-status" role="status" aria-live="polite">{t(statusKey, { party })}</p>}
    {failed && <div className="wf-notice" role="alert"><Icon name="alert-circle" size={18} />{failure}</div>}

    {live && <div className="sk-call-stage">
      {call.remoteVideo
        ? <VideoView track={call.remoteVideo} className="sk-call-remote" label={t('care.call.remoteVideo', { party })} />
        : <div className="sk-call-placeholder">{phase === 'connected'
          ? <Icon name="user" size={40} />
          : <span className="sk-call-scene"><AnimatedIllustration name="scene-doctor-consult" size="sm" poster={<Icon name="user" size={40} />} /></span>}<span>{phase === 'connected' ? t('care.call.voiceOnly', { party }) : t('care.call.waitingVideo', { party })}</span></div>}
      <VideoView track={call.cameraOn ? call.localVideo : null} className="sk-call-local" label={t('care.call.localVideo')} />
    </div>}
    <div ref={call.audioSink} className="sk-call-audio" aria-hidden="true" />

    {phase === 'idle' && <div className="sk-call-controls">
      <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={() => { void call.join(true); }}>
        <Icon name="video-2" size={18} />{t('care.call.joinVideo')}
      </button>
      <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => { void call.join(false); }}>
        <Icon name="mic" size={18} />{t('care.call.joinVoice')}
      </button>
    </div>}

    {live && <div className="sk-call-controls" role="group" aria-label={t('care.call.controls')}>
      <button type="button" className="sk-call-control" aria-pressed={!call.micOn} aria-label={call.micOn ? t('care.call.muteMic') : t('care.call.unmuteMic')} onClick={() => { void call.toggleMic(); }}>
        <Icon name={call.micOn ? 'mic' : 'mic-off'} size={20} />
      </button>
      {call.hasCamera && <button type="button" className="sk-call-control" aria-pressed={!call.cameraOn} aria-label={call.cameraOn ? t('care.call.cameraOff') : t('care.call.cameraOn')} onClick={() => { void call.toggleCamera(); }}>
        <Icon name="video-2" size={20} />
      </button>}
      <button type="button" className="sk-call-control sk-call-control-leave" onClick={() => { void call.leave(); }}>
        <Icon name="phone-off" size={20} />{t('care.call.leave')}
      </button>
    </div>}

    {(phase === 'ended' || phase === 'error' || phase === 'refused' || phase === 'permissionDenied' || phase === 'noDevice') && <div className="sk-call-controls">
      <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={call.reset}>
        <Icon name="refresh" size={18} />{phase === 'ended' ? t('care.call.joinAgain') : t('care.call.tryAgain')}
      </button>
    </div>}
  </section>;
}
