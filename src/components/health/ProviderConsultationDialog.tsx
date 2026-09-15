import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Mic, PhoneOff, AlertTriangle, Video, X } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { createPeerConnection, parseIceServers, webrtcSupported } from '../../lib/webrtc';
import '../../theme/workflows.css';

interface SessionState { status: string; studentJoined: boolean; providerJoined: boolean; liveMedia: boolean; }

/** Provider-side teleconsult view: shows student status and joins the session. */
export function ProviderConsultationDialog({ appointment, onClose }: { appointment: { id: string; customer: string }; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(false);
  const [live, setLive] = useState(false);
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState('');

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setReady(true);
    } catch {
      setReady(false);
      setError('Camera/microphone unavailable. Enable them to join the consultation.');
    } finally { setChecking(false); }
  }, []);
  useEffect(() => { runCheck(); }, [runCheck]);

  const refresh = useCallback(async () => {
    try {
      const res = await apiRequest<SessionState>(`/consultation/${appointment.id}/state`);
      setState(res);
    } catch { /* keep last */ }
  }, [appointment.id]);

  const join = useCallback(async () => {
    try {
      const res = await apiRequest<SessionState>(`/consultation/${appointment.id}/join-provider`, { method: 'POST' });
      setState(res);
      setJoined(true);
      if (res.liveMedia && streamRef.current && webrtcSupported()) {
        const pc = createPeerConnection({ signallingUrl: '', iceServers: parseIceServers('') }, streamRef.current);
        pc.ontrack = (ev) => { if (remoteRef.current) { remoteRef.current.srcObject = ev.streams[0]; setLive(true); } };
        pcRef.current = pc;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await apiRequest(`/consultation/${appointment.id}/signal`, { method: 'POST', body: JSON.stringify({ type: 'answer', sdp: pc.localDescription?.sdp }) }).catch(() => {});
      }
    } catch (e: any) { setError(e?.message || 'Could not join.'); }
  }, [appointment.id]);
  useEffect(() => { refresh(); const i = setInterval(refresh, 5000); return () => clearInterval(i); }, [refresh]);

  const leave = useCallback(() => {
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    onClose();
  }, [onClose]);

  return <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#ffffff', borderRadius: 22, width: '100%', maxWidth: 680, overflow: 'hidden', boxShadow: '0 25px 60px rgba(30, 27, 75, 0.3)' }}>
      <div style={{ padding: '18px 24px', background: '#1e1b4b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: 9, borderRadius: 12 }}><Video size={22} /></div>
          <div><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Consultation</h3><p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.85 }}>With {appointment.customer}</p></div>
        </div>
        <button type="button" onClick={leave} aria-label="Leave" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, border: '1px solid', borderColor: ready ? '#a7f3d0' : '#e2e8f0', background: ready ? '#ecfdf5' : '#f8fafc', borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ color: ready ? '#059669' : '#64748b' }}><Camera size={18} /></span>
            <div><strong style={{ fontSize: '0.85rem', display: 'block' }}>Camera</strong><small>{ready ? 'Ready' : 'Unavailable'}</small></div>
          </div>
          <div style={{ flex: 1, border: '1px solid', borderColor: ready ? '#a7f3d0' : '#e2e8f0', background: ready ? '#ecfdf5' : '#f8fafc', borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ color: ready ? '#059669' : '#64748b' }}><Mic size={18} /></span>
            <div><strong style={{ fontSize: '0.85rem', display: 'block' }}>Microphone</strong><small>{ready ? 'Ready' : 'Unavailable'}</small></div>
          </div>
        </div>

        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#0f172a', minHeight: 240, marginBottom: 16 }}>
          <video ref={videoRef} style={{ width: '100%', maxHeight: 280, transform: 'scaleX(-1)' }} muted playsInline />
          {!ready && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>{checking ? <span className="care-loading-ring" /> : <div><Video size={32} /><p>Camera preview appears after permission.</p></div>}</div>}
        </div>

        {(live || state?.liveMedia) && <div style={{ borderRadius: 14, overflow: 'hidden', background: '#0f172a', marginBottom: 16 }}><video ref={remoteRef} autoPlay playsInline style={{ width: '100%', maxHeight: 260 }} /></div>}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <span className={`wf-status ${state?.studentJoined ? 'status-accepted' : 'status-requested'}`}>{state?.studentJoined ? 'Student joined' : 'Waiting for student'}</span>
          <span className={`wf-status ${(state?.liveMedia || live) ? 'status-accepted' : 'status-requested'}`}>{(state?.liveMedia || live) ? 'Live media' : 'No live media'}</span>
        </div>

        <div className="wf-notice" style={{ marginTop: 16 }}><AlertTriangle size={18} />{ready ? 'Your devices are ready.' : error || 'Fix your devices to join.'}</div>

        <div className="wf-row-actions" style={{ marginTop: 18, justifyContent: 'center' }}>
          {joined
            ? <button className="health-button" onClick={leave}><PhoneOff size={16} />Leave consultation</button>
            : <button className="health-button health-button-primary" disabled={!ready} onClick={join}><Video size={16} />Join consultation</button>}
          {!joined && <button className="health-button" onClick={runCheck}><Camera size={16} />Re-check devices</button>}
        </div>
      </div>
    </div>
  </div>;
}
