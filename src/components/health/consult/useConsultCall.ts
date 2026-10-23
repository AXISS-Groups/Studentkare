import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createLocalTracks,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
  type RemoteTrack,
} from 'livekit-client';
import { requestMediaToken } from '../../../data/services/consultMedia';

/**
 * One video/voice consult on LiveKit, as a small state machine.
 *
 * Nothing touches the camera or microphone until `join` is called, and `join`
 * asks for them only after the backend has issued a token, so a consult that
 * cannot happen (LiveKit not configured, not confirmed, outside the window)
 * never prompts for devices.
 */
export type CallPhase =
  | 'idle'
  | 'requesting'
  | 'unavailable'
  | 'refused'
  | 'permissionDenied'
  | 'noDevice'
  | 'connecting'
  | 'waiting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error';

export interface ConsultCall {
  phase: CallPhase;
  /** Server text for a refusal (e.g. outside the join window). */
  message: string;
  micOn: boolean;
  cameraOn: boolean;
  hasCamera: boolean;
  localVideo: Track | null;
  remoteVideo: Track | null;
  join: (withVideo: boolean) => Promise<void>;
  leave: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  reset: () => void;
  /** Where remote audio elements are mounted. */
  audioSink: (element: HTMLDivElement | null) => void;
}

const LIVE: readonly CallPhase[] = ['connecting', 'waiting', 'connected', 'reconnecting'];
export const isLive = (phase: CallPhase): boolean => LIVE.includes(phase);

function deviceErrorPhase(cause: unknown): CallPhase {
  const name = cause instanceof Error || (typeof DOMException !== 'undefined' && cause instanceof DOMException) ? cause.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'permissionDenied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'noDevice';
  return 'error';
}

export function useConsultCall(appointmentId: string, beforeJoin?: () => Promise<void>): ConsultCall {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [message, setMessage] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [localVideo, setLocalVideo] = useState<Track | null>(null);
  const [remoteVideo, setRemoteVideo] = useState<Track | null>(null);

  const roomRef = useRef<Room | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const leavingRef = useRef(false);
  const phaseRef = useRef<CallPhase>('idle');
  const generationRef = useRef(0);
  const sinkRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef(new Map<RemoteTrack, HTMLMediaElement>());

  const move = useCallback((next: CallPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const releaseMedia = useCallback(() => {
    tracksRef.current.forEach(track => track.stop());
    tracksRef.current = [];
    audioRef.current.forEach((element, track) => { track.detach(element); element.remove(); });
    audioRef.current.clear();
    setLocalVideo(null);
    setRemoteVideo(null);
    setCameraOn(false);
  }, []);

  const teardown = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect().catch(() => undefined);
    }
    releaseMedia();
  }, [releaseMedia]);

  useEffect(() => () => {
    generationRef.current += 1;
    leavingRef.current = true;
    void teardown();
  }, [teardown]);

  const join = useCallback(async (withVideo: boolean) => {
    if (phaseRef.current !== 'idle') return;
    const generation = ++generationRef.current;
    const stale = () => generation !== generationRef.current;
    leavingRef.current = false;
    setMessage('');
    move('requesting');

    if (beforeJoin) {
      try {
        await beforeJoin();
      } catch (cause) {
        if (stale()) return;
        setMessage(cause instanceof Error ? cause.message : '');
        move('refused');
        return;
      }
    }

    const result = await requestMediaToken(appointmentId);
    if (stale()) return;
    if (result.kind === 'unavailable') { move('unavailable'); return; }
    if (result.kind === 'refused') { setMessage(result.message); move('refused'); return; }
    if (result.kind === 'error') { setMessage(result.message); move('error'); return; }

    // Only now, with a token in hand, ask for the devices.
    let tracks: LocalTrack[];
    try {
      tracks = await createLocalTracks({ audio: true, video: withVideo });
    } catch (cause) {
      if (stale()) return;
      move(deviceErrorPhase(cause));
      return;
    }
    if (stale()) { tracks.forEach(track => track.stop()); return; }
    tracksRef.current = tracks;
    const video = tracks.find(track => track.kind === Track.Kind.Video) ?? null;
    setLocalVideo(video);
    setCameraOn(Boolean(video));
    setMicOn(true);
    move('connecting');

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const settle = () => move(room.remoteParticipants.size > 0 ? 'connected' : 'waiting');
    room
      .on(RoomEvent.ParticipantConnected, () => { if (!stale()) move('connected'); })
      .on(RoomEvent.ParticipantDisconnected, () => { if (!stale() && room.remoteParticipants.size === 0) { setRemoteVideo(null); move('waiting'); } })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (stale()) return;
        if (track.kind === Track.Kind.Video) setRemoteVideo(track);
        else if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
          sinkRef.current?.appendChild(element);
          audioRef.current.set(track, element);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video) setRemoteVideo(current => (current === track ? null : current));
        const element = audioRef.current.get(track);
        if (element) { track.detach(element); element.remove(); audioRef.current.delete(track); }
      })
      .on(RoomEvent.Reconnecting, () => { if (!stale()) move('reconnecting'); })
      .on(RoomEvent.SignalReconnecting, () => { if (!stale()) move('reconnecting'); })
      .on(RoomEvent.Reconnected, () => { if (!stale()) settle(); })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (stale()) return;
        const lost = !leavingRef.current && reason !== DisconnectReason.CLIENT_INITIATED && phaseRef.current === 'reconnecting';
        roomRef.current = null;
        releaseMedia();
        move(lost ? 'error' : 'ended');
      });

    try {
      await room.connect(result.grant.url, result.grant.token);
      if (stale()) return;
      for (const track of tracks) await room.localParticipant.publishTrack(track);
      if (stale()) return;
      settle();
    } catch {
      if (stale()) return;
      await teardown();
      move('error');
    }
  }, [appointmentId, beforeJoin, move, releaseMedia, teardown]);

  const leave = useCallback(async () => {
    leavingRef.current = true;
    generationRef.current += 1;
    await teardown();
    move('ended');
  }, [move, teardown]);

  const toggleMic = useCallback(async () => {
    const mic = tracksRef.current.find(track => track.kind === Track.Kind.Audio);
    if (!mic) return;
    if (micOn) { await mic.mute(); setMicOn(false); } else { await mic.unmute(); setMicOn(true); }
  }, [micOn]);

  const toggleCamera = useCallback(async () => {
    const camera = tracksRef.current.find(track => track.kind === Track.Kind.Video);
    if (!camera) return;
    if (cameraOn) { await camera.mute(); setCameraOn(false); } else { await camera.unmute(); setCameraOn(true); }
  }, [cameraOn]);

  const reset = useCallback(() => {
    if (isLive(phaseRef.current) || phaseRef.current === 'requesting') return;
    setMessage('');
    move('idle');
  }, [move]);

  const audioSink = useCallback((element: HTMLDivElement | null) => { sinkRef.current = element; }, []);

  return {
    phase, message, micOn, cameraOn, hasCamera: localVideo !== null, localVideo, remoteVideo,
    join, leave, toggleMic, toggleCamera, reset, audioSink,
  };
}
