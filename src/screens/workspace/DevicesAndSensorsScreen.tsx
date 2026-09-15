import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CloudUpload, Footprints, Mic, Pause, Play, RefreshCw, Video, Volume2, X, AlertTriangle, Smartphone, Trash2, Activity } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { describeNativeSupport } from '../../lib/nativeHealth';
import { useMovementHistory, formatDuration } from '../../lib/movementHistory';
import '../../theme/workflows.css';

type Capability = 'camera' | 'microphone' | 'motion' | 'audio' | 'bluetooth';
interface CapabilityState { supported: boolean; available: 'yes' | 'no' | 'denied' | 'unknown'; note: string; }

function detectCapabilities(): Record<Capability, CapabilityState> {
  const secure = typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost');
  const media = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const motion = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  const audio = typeof window !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext);
  const bt = typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
  const safe = secure ? 'secure context' : 'require HTTPS in production';
  return {
    camera: { supported: media, available: media ? 'yes' : 'no', note: media ? `Camera available (${safe}). Upload fallback works too.` : 'Camera not available; use image upload.' },
    microphone: { supported: media, available: media ? 'yes' : 'no', note: media ? `Microphone available (${safe}).` : 'Microphone not available; type notes instead.' },
    motion: { supported: motion, available: motion ? 'yes' : 'no', note: motion ? 'Motion available for foreground sessions. Background tracking is limited by the browser.' : 'Motion sensors not exposed by this browser/device.' },
    audio: { supported: audio, available: audio ? 'yes' : 'no', note: audio ? 'Audio available for guided tones.' : 'Audio not available.' },
    bluetooth: { supported: bt, available: bt ? 'yes' : 'no', note: bt ? 'Web Bluetooth may be supported; device support is limited (not universal on iOS).' : 'Web Bluetooth not supported here; native integrations would be needed.' },
  };
}

export function DevicesAndSensorsScreen() {
  const [caps] = useState<Record<Capability, CapabilityState>>(() => detectCapabilities());
  const [native] = useState(() => describeNativeSupport());
  const [tab, setTab] = useState<'camera' | 'pedometer' | 'voice' | 'pulse'>('camera');

  const rows: { key: Capability; label: string; icon: typeof Camera }[] = [
    { key: 'camera', label: 'Camera', icon: Camera },
    { key: 'microphone', label: 'Microphone', icon: Mic },
    { key: 'motion', label: 'Motion sensors', icon: Footprints },
    { key: 'audio', label: 'Audio playback', icon: Volume2 },
    { key: 'bluetooth', label: 'Bluetooth devices', icon: Smartphone },
  ];

  const nativeRow = { key: 'native' as const, label: 'Native health (HealthKit / Health Connect)', icon: Smartphone, available: native.supported ? 'yes' as const : 'no' as const, note: native.detail };

  return <div>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">DEVICES & SENSORS</span>
      <h2>Your devices, your data.</h2>
      <p>Permissions are requested only when you start a session. Nothing is captured in the background.</p>
    </div></div>

    <div className="wf-record-grid" style={{ marginBottom: 26 }}>
      {rows.map(({ key, label, icon: Icon }) => {
        const c = caps[key];
        return <article className="wf-card" key={key}>
          <span className="wf-record-icon"><Icon size={24} /></span>
          <h3>{label}</h3>
          <p>{c.note}</p>
          <span className="wf-status" style={{ background: c.available === 'yes' ? '#ecfdf5' : '#f1f5f9', color: c.available === 'yes' ? '#047857' : '#64748b', borderColor: c.available === 'yes' ? '#a7f3d0' : '#e2e8f0' }}>
            {c.available === 'yes' ? 'Available' : c.available === 'no' ? 'Unavailable' : c.available === 'denied' ? 'Denied' : 'Unknown'}
          </span>
        </article>;
      })}
      <article className="wf-card">
        <span className="wf-record-icon"><nativeRow.icon size={24} /></span>
        <h3>{nativeRow.label}</h3>
        <p>{nativeRow.note}</p>
        <span className="wf-status" style={{ background: nativeRow.available === 'yes' ? '#ecfdf5' : '#f1f5f9', color: nativeRow.available === 'yes' ? '#047857' : '#64748b', borderColor: nativeRow.available === 'yes' ? '#a7f3d0' : '#e2e8f0' }}>
          {nativeRow.available === 'yes' ? 'Available' : 'Unavailable (manual entry available)'}
        </span>
      </article>
    </div>

    <div className="wf-choice-row" style={{ marginBottom: 22 }} aria-label="Device tools">
      <button aria-pressed={tab === 'camera'} onClick={() => setTab('camera')}><Camera size={16} />Camera capture</button>
      <button aria-pressed={tab === 'pedometer'} onClick={() => setTab('pedometer')}><Footprints size={16} />Movement session</button>
      <button aria-pressed={tab === 'voice'} onClick={() => setTab('voice')}><Mic size={16} />Voice note</button>
      <button aria-pressed={tab === 'pulse'} onClick={() => setTab('pulse')}><Activity size={16} />Pulse estimate</button>
    </div>

    {tab === 'camera' && <CameraCapture supported={caps.camera.available === 'yes'} />}
    {tab === 'pedometer' && <MotionPedometer supported={caps.motion.available === 'yes'} />}
    {tab === 'voice' && <VoiceRecorder supported={caps.microphone.available === 'yes'} />}
    {tab === 'pulse' && <PulseEstimator supported={caps.camera.available === 'yes'} />}
  </div>;
}

/* Camera capture with live preview, front/rear, save, and upload fallback. */
function CameraCapture({ supported }: { supported: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const mutation = useMutation();

  const start = useCallback(async () => {
    if (!supported) return;
    setError('');
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setRunning(true);
    } catch (e: any) {
      setError(e?.message || 'Camera access was denied or unavailable.');
      setRunning(false);
    }
  }, [supported, facing]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setRunning(false);
  }, []);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/png'));
  };

  const save = () => mutation.run(() => apiRequest('/health/camera-scan', { method: 'POST', body: JSON.stringify({ captured: true, kind: 'photo', deviceLabel: 'camera' }) }), () => setSnapshot(null));

  const saveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upload) return;
    const form = new FormData();
    form.append('title', 'Camera / device capture');
    form.append('category', 'OTHER');
    form.append('file', upload);
    mutation.run(() => apiRequest('/health/documents', { method: 'POST', body: form }), () => { setUpload(null); });
  };

  if (!supported) {
    return <section className="wf-card">
      <h3>Camera unavailable on this device/browser.</h3>
      <p>You can still attach a photo or PDF below. It will be stored in your records.</p>
      <form className="wf-form" onSubmit={saveUpload}>
        <Field label="Image or document"><input type="file" accept="image/png,image/jpeg,application/pdf" onChange={e => setUpload(e.target.files?.[0] || null)} /></Field>
        <FormError message={mutation.error} />
        <SubmitButton busy={mutation.busy}>Save to records</SubmitButton>
      </form>
    </section>;
  }

  return <section className="wf-card">
    <div className="wf-panel-heading"><div><h3>Capture a photo</h3><p>Preview and save. Use the switch to change cameras.</p></div>
      <button className="health-button" onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')} disabled={!running}>Switch camera</button>
    </div>
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0f172a', minHeight: 260 }}>
      {running && <video ref={videoRef} style={{ width: '100%', display: 'block', maxHeight: 340 }} muted playsInline />}
      {!running && !snapshot && <div style={{ color: '#cbd5e1', padding: 40, textAlign: 'center' }}><Camera size={32} /><p>Preview appears after you start the camera.</p></div>}
      {snapshot && <img src={snapshot} alt="Captured preview" style={{ width: '100%', display: 'block' }} />}
    </div>
    <div className="wf-row-actions" style={{ marginTop: 16 }}>
      {running ? <button className="health-button" onClick={capture}><Camera size={16} />Capture</button> : <button className="health-button health-button-primary" onClick={start}><Video size={16} />Start camera</button>}
      {running && <button className="health-button" onClick={stop}>Stop</button>}
      {snapshot && <>
        <button className="health-button health-button-primary" disabled={mutation.busy} onClick={save}><CloudUpload size={16} />Save</button>
        <button className="health-button" onClick={() => setSnapshot(null)}>Retake</button>
      </>}
    </div>
    {error && <div className="wf-notice" role="alert"><AlertTriangle size={16} />{error}</div>}
    <FormError message={mutation.error} />
    <p className="wf-fineprint">This saves a capture record. It does not produce a medical measurement or diagnosis.</p>
  </section>;
}

/* Foreground motion-based pedometer using real device motion events. */
function MotionPedometer({ supported }: { supported: boolean }) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const { sessions, recordSession, clearHistory } = useMovementHistory();
  const lastPeak = useRef(0);
  const motionRef = useRef<((e: any) => void) | null>(null);
  const stepAccum = useRef(0);

  useEffect(() => {
    if (!running || !supported) return;
    const handler = (e: any) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      const magnitude = acc ? Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2) : 0;
      const now = Date.now();
      const aboveThreshold = magnitude > 10.5;
      if (aboveThreshold && now - lastPeak.current > 320) {
        stepAccum.current += 1;
        lastPeak.current = now;
      }
    };
    window.addEventListener('devicemotion', handler);
    motionRef.current = handler;
    const interval = setInterval(() => { setSteps(stepAccum.current); setDuration(d => d + 1); }, 1000);
    return () => { window.removeEventListener('devicemotion', handler); clearInterval(interval); };
  }, [running, supported]);

  const requestPermission = async () => {
    if (!supported) return;
    try {
      const MotionEvent = (window as any).DeviceMotionEvent;
      if (MotionEvent?.requestPermission) {
        const result = await MotionEvent.requestPermission();
        if (result !== 'granted') { setError('Motion permission was denied.'); return; }
      }
      setRunning(true); setError('');
    } catch (e: any) { setError(e?.message || 'Could not start the movement session.'); }
  };

  const stop = () => {
    if (stepAccum.current > 0) recordSession(stepAccum.current, duration, 'browser');
    setRunning(false);
  };
  const reset = () => { setSteps(0); setDuration(0); stepAccum.current = 0; lastPeak.current = 0; };

  if (!supported) {
    return <section className="wf-card">
      <h3>Motion sensors are not exposed here.</h3>
      <p>This browser/device does not provide device motion. A native app integration is needed for step history. You can still record movement manually.</p>
      <div className="wf-notice"><Footprints size={16} />Step counts here are estimates, not a verified clinical measurement.</div>
    </section>;
  }

  return <section className="wf-card">
    <h3>Movement session (foreground)</h3>
    <p>Counts steps while this tab is open. Background tracking is limited by the browser.</p>
    <div className="wf-metric-grid">
      <div className="wf-metric-card"><span className="wf-metric-icon"><Footprints size={20} /></span><span>Steps (estimate)</span><strong>{steps.toLocaleString('en-IN')}</strong><small>Live, foreground only</small></div>
      <div className="wf-metric-card"><span className="wf-metric-icon"><Activity size={20} /></span><span>Duration</span><strong>{Math.floor(duration / 60)}<small>m</small></strong><small>This session</small></div>
    </div>
    <div className="wf-row-actions">
      {running ? <>
        <button className="health-button health-button-primary" onClick={stop}><Pause size={16} />Stop & save</button>
        <button className="health-button" onClick={reset}><RefreshCw size={16} />Reset</button>
      </> : <button className="health-button health-button-primary" onClick={requestPermission}><Play size={16} />Start session</button>}
    </div>
    {error && <div className="wf-notice" role="alert"><AlertTriangle size={16} />{error}</div>}
    <p className="wf-fineprint">Estimated from motion. Not a verified step count and not used to award points or set goals.</p>
    {sessions.length > 0 && <section className="wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">SESSION HISTORY</span><h3>Recent movement</h3></div><button className="health-text-button" onClick={clearHistory}>Clear</button></div>
      <div className="wf-order-list">{sessions.slice(0, 10).map(s => <div className="wf-order-line" key={s.id}><div><strong>{s.steps.toLocaleString('en-IN')} steps</strong><small>{formatDuration(s.durationSeconds)} · {new Date(s.endedAt).toLocaleString()} · {s.source.replace(/_/g, ' ')}</small></div></div>)}</div>
    </section>}
  </section>;
}

/* Voice note recording with MediaRecorder, playback, and deletion. */
function VoiceRecorder({ supported }: { supported: boolean }) {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    if (!supported) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      chunks.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        setUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      rec.start();
      setRecording(true);
    } catch (e: any) { setError(e?.message || 'Microphone access was denied.'); }
  };
  const stop = () => { mediaRef.current?.stop(); setRecording(false); };
  const clear = () => { if (url) URL.revokeObjectURL(url); setUrl(null); };
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  if (!supported) {
    return <section className="wf-card"><h3>Microphone not available here.</h3><p>You can still write a note manually and save it to your records.</p></section>;
  }
  return <section className="wf-card">
    <h3>Voice note</h3>
    <p>Record, review, and delete. You keep control of the audio.</p>
    <div className="wf-row-actions">
      {recording ? <button className="health-button health-button-primary" onClick={stop}><Pause size={16} />Stop recording</button> : <button className="health-button health-button-primary" onClick={start}><Mic size={16} />Start recording</button>}
      {url && <button className="health-button" onClick={clear}><Trash2 size={16} />Delete</button>}
    </div>
    {url && <audio controls src={url} style={{ width: '100%', marginTop: 16 }} />}
    {error && <div className="wf-notice" role="alert"><AlertTriangle size={16} />{error}</div>}
    <p className="wf-fineprint">Recording stays in this session. Transcription requires a configured provider and would be shown as unavailable until then.</p>
  </section>;
}

/* Experimental camera pulse estimation with real signal acquisition and quality gating. */
function PulseEstimator({ supported }: { supported: boolean }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const raf = useRef<number>(0);
  const samples = useRef<{ g: number; std: number }[]>([]);
  const lastDraw = useRef(0);
  const started = useRef(0);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setRunning(false);
  };
  useEffect(() => () => { stop(); }, []);

  const start = async () => {
    if (!supported) return;
    setError(''); setResult(null); samples.current = []; started.current = Date.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setRunning(true);
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const read = () => {
        if (!videoRef.current || !ctx) return;
        if (Date.now() - lastDraw.current > 60) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let n = 0, mean = 0;
          for (let i = 0; i < data.length; i += 4) { mean += data[i + 1]; n++; }
          mean = mean / (n || 1);
          let variance = 0;
          for (let i = 0; i < data.length; i += 4) variance += (data[i + 1] - mean) ** 2;
          const std = Math.sqrt(variance / (n || 1));
          samples.current.push({ g: mean, std });
          lastDraw.current = Date.now();
        }
        raf.current = requestAnimationFrame(read);
      };
      raf.current = requestAnimationFrame(read);
      setTimeout(finish, 15000);
    } catch (e: any) { setError(e?.message || 'Camera access was denied.'); setRunning(false); }
  };

  const finish = () => {
    const s = samples.current;
    // Quality gate: reject if too little usable signal or high noise.
    if (s.length < 60) { setResult(null); setError('Not enough usable signal. Steady the camera and keep the face lit, then retry.'); stop(); return; }
    const avgStd = s.reduce((a, b) => a + b.std, 0) / s.length;
    if (avgStd > 24) { setResult(null); setError('Signal too noisy. Reduce movement and improve lighting, then retry.'); stop(); return; }
    const series = s.map(x => x.g);
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const normalized = series.map(v => v - mean);
    // Simple peak detection over ~15s of 60ms samples.
    const minPeak = Math.max(...normalized) * 0.45;
    let peaks = 0;
    for (let i = 1; i < normalized.length - 1; i++) {
      if (normalized[i] > minPeak && normalized[i] >= normalized[i - 1] && normalized[i] >= normalized[i + 1]) peaks++;
    }
    const bpm = Math.round(peaks * 4);
    setResult(bpm >= 45 && bpm <= 180 ? `${bpm} bpm (estimate)` : 'Unable to estimate reliably. Steady the camera and retry.');
    stop();
  };

  if (!supported) {
    return <section className="wf-card"><h3>Camera not available.</h3><p>Pulse estimation needs a camera. Use a compatible Bluetooth heart-rate monitor or a device measurement instead.</p><div className="wf-notice"><AlertTriangle size={16} />This is an experimental, unvalidated estimate — not a medical measurement.</div></section>;
  }
  return <section className="wf-card">
    <h3>Experimental pulse estimate</h3>
    <p>Uses live camera frames and rejects poor signal. Results are estimates only.</p>
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0f172a', minHeight: 240 }}>
      {running && <video ref={videoRef} style={{ width: '100%', maxHeight: 300, transform: 'scaleX(-1)' }} muted playsInline />}
      {!running && <div style={{ color: '#cbd5e1', padding: 40, textAlign: 'center' }}><Activity size={32} /><p>Keep your face steady and lit for ~15 seconds.</p></div>}
    </div>
    <div className="wf-row-actions" style={{ marginTop: 16 }}>
      {running ? <button className="health-button" onClick={stop}><X size={16} />Stop</button> : <button className="health-button health-button-primary" onClick={start}><Play size={16} />Start estimate</button>}
    </div>
    {result && <div className="wf-notice" role="status"><Activity size={16} />{result}</div>}
    {error && <div className="wf-notice" role="alert"><AlertTriangle size={16} />{error}</div>}
    <p className="wf-fineprint">Experimental signal processing. Not a validated clinical reading. Do not use for diagnosis or treatment decisions.</p>
  </section>;
}
