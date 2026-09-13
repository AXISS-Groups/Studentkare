import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Mic, Phone, PhoneOff, ShieldCheck, AlertTriangle, Video, X } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { createPeerConnection, parseIceServers, webrtcSupported } from '../../lib/webrtc';
import '../../theme/workflows.css';

interface DeviceCheck { camera: 'yes' | 'no' | 'denied'; mic: 'yes' | 'no' | 'denied'; }

function VideoConsultationDialog({ appointment, onClose }: { appointment: { id: string; slotStart: string; customer: string }; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [checking, setChecking] = useState(true);
  const [check, setCheck] = useState<DeviceCheck>({ camera: 'no', mic: 'no' });
  const [inRoom, setInRoom] = useState(false);
  const [live, setLive] = useState(false);
  const [room, setRoom] = useState<{ status: string; studentJoined: boolean; providerJoined: boolean; liveMedia: boolean } | null>(null);
  const [error, setError] = useState('');

  const joinRoom = useCallback(async () => {
    try {
      const res = await apiRequest<{ status: string; studentJoined: boolean; providerJoined: boolean; liveMedia: boolean }>(`/consultation/${appointment.id}/join`, { method: 'POST' });
      setRoom(res);
      setInRoom(true);
      if (res.liveMedia && streamRef.current && webrtcSupported()) {
        try {
          const pc = createPeerConnection({ signallingUrl: '', iceServers: parseIceServers('') }, streamRef.current);
          pc.ontrack = (ev) => { if (remoteRef.current) { remoteRef.current.srcObject = ev.streams[0]; setLive(true); } };
          pcRef.current = pc;
          // Signal offer to the configured channel (contract for the server).
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await apiRequest(`/consultation/${appointment.id}/signal`, { method: 'POST', body: JSON.stringify({ type: 'offer', sdp: pc.localDescription?.sdp }) }).catch(() => {});
        } catch { setLive(false); }
      }
    } catch (e: any) {
      setError(e?.message || 'Could not join the waiting room.');
    }
  }, [appointment.id]);

  const refreshRoom = useCallback(async () => {
    try {
      const res = await apiRequest<{ status: string; studentJoined: boolean; providerJoined: boolean; liveMedia: boolean }>(`/consultation/${appointment.id}/state`);
      setRoom(res);
    } catch { /* keep last known state */ }
  }, [appointment.id]);
  useEffect(() => { if (inRoom) { const i = setInterval(refreshRoom, 5000); return () => clearInterval(i); } }, [inRoom, refreshRoom]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCheck({ camera: 'yes', mic: 'yes' });
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCheck({ camera: 'denied', mic: 'denied' });
        setError('Camera and microphone permission was denied. Enable them in your browser to join a call.');
      } else {
        setCheck({ camera: 'no', mic: 'no' });
        setError('No camera/microphone detected on this device.');
      }
    } finally {
      setChecking(false);
    }
  }, []);

  const stop = useCallback(() => {
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => { runCheck(); }, [runCheck]);

  const join = () => { joinRoom(); };
  const leave = () => { stop(); onClose(); };

  return <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#ffffff', borderRadius: 22, width: '100%', maxWidth: 680, overflow: 'hidden', boxShadow: '0 25px 60px rgba(30, 27, 75, 0.3)' }}>
      <div style={{ padding: '18px 24px', background: '#1e1b4b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: 9, borderRadius: 12 }}><Video size={22} /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Consultation</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.85 }}>With {appointment.customer}</p>
          </div>
        </div>
        <button type="button" onClick={leave} aria-label="Leave" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div style={{ padding: 24 }}>
        {!inRoom && (
          <section>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <DeviceBadge label="Camera" state={check.camera} icon={<Camera size={18} />} />
              <DeviceBadge label="Microphone" state={check.mic} icon={<Mic size={18} />} />
            </div>

            {checking ? <div className="wf-state" role="status"><span className="care-loading-ring" />Checking your camera & microphone…</div> : (
              <>
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#0f172a', minHeight: 240, marginBottom: 16 }}>
                  <video ref={videoRef} style={{ width: '100%', maxHeight: 280, transform: 'scaleX(-1)' }} muted playsInline />
                  {check.camera !== 'yes' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8', textAlign: 'center' }}><div><Video size={32} /><p style={{ marginTop: 8 }}>Preview appears after permission is granted.</p></div></div>}
                </div>

                {check.camera === 'yes' && check.mic === 'yes'
                  ? <div className="wf-notice" role="status" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}><CheckCircle2 size={18} />Camera and microphone are ready. You can join the waiting room.</div>
                  : <div className="wf-notice" role="alert"><AlertTriangle size={18} />{error || 'Fix your devices or check permissions before joining.'}</div>}

                <div className="wf-row-actions" style={{ marginTop: 18 }}>
                  {check.camera === 'yes' && check.mic === 'yes'
                    ? <button className="health-button health-button-primary" onClick={join}><Phone size={16} />Join waiting room</button>
                    : <button className="health-button" onClick={runCheck}><RefreshIcon />Re-check devices</button>}
                  <button className="health-button" onClick={leave}><PhoneOff size={16} />Cancel</button>
                </div>
              </>
            )}
          </section>
        )}

        {inRoom && (
          <section style={{ textAlign: 'center', padding: '20px 0' }}>
            {(room?.liveMedia || live) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 16 }}>
                <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', maxHeight: 260, borderRadius: 14, background: '#0f172a' }} />
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 260, borderRadius: 14, background: '#0f172a', transform: 'scaleX(-1)' }} />
              </div>
            )}
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eef2ff', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={32} color="#4f46e5" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1a102f' }}>{room?.providerJoined || live ? 'Consultation in progress' : "You're in the waiting room."}</h3>
            <p style={{ maxWidth: 420, margin: '10px auto 0', fontSize: '0.9rem', color: '#64748b' }}>
              {room?.providerJoined ? `${appointment.customer} has joined.` : `${appointment.customer} will be notified to join. Live video requires a configured secure signalling channel.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <span className={`wf-status ${room?.providerJoined ? 'status-accepted' : 'status-requested'}`}>{room?.providerJoined ? 'Provider joined' : 'Waiting for provider'}</span>
              <span className={`wf-status ${(room?.liveMedia || live) ? 'status-accepted' : 'status-requested'}`}>{(room?.liveMedia || live) ? 'Live media active' : 'No live media'}</span>
            </div>
            <div className="wf-notice" style={{ textAlign: 'left', marginTop: 18 }}><AlertTriangle size={18} />{(room?.liveMedia || live) ? 'Live audio/video is connected via the configured signalling channel.' : 'Live calling is not connected yet. This room confirms your devices and records intent; no live call is made here.'}</div>
            <button className="health-button" style={{ marginTop: 20 }} onClick={leave}><PhoneOff size={16} />Leave room</button>
          </section>
        )}
      </div>
    </div>
  </div>;
}

function DeviceBadge({ label, state, icon }: { label: string; state: string; icon: React.ReactNode }) {
  const ok = state === 'yes';
  const denied = state === 'denied';
  return <div style={{ flex: 1, border: '1px solid', borderColor: ok ? '#a7f3d0' : denied ? '#fecaca' : '#e2e8f0', background: ok ? '#ecfdf5' : denied ? '#fef2f2' : '#f8fafc', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ color: ok ? '#059669' : denied ? '#dc2626' : '#64748b' }}>{icon}</span>
    <div><strong style={{ fontSize: '0.85rem', color: '#334155', display: 'block' }}>{label}</strong><small style={{ color: '#64748b' }}>{ok ? 'Ready' : denied ? 'Denied' : 'Unavailable'}</small></div>
  </div>;
}

function RefreshIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" /></svg>;
}

export { VideoConsultationDialog };
