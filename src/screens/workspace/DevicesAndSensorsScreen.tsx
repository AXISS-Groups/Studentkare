import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CloudUpload, Footprints, Mic, Pause, Video, Volume2, AlertTriangle, Smartphone, Trash2, Activity } from 'lucide-react';
import { apiRequest } from '../../data/services/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { describeNativeSupport } from '../../lib/platform/nativeHealth';
import { navigate } from '../../lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

type Capability = 'camera' | 'microphone' | 'motion' | 'audio' | 'bluetooth';
interface CapabilityState { supported: boolean; available: 'yes' | 'no'; note: MessageKey }

function detectCapabilities(): Record<Capability, CapabilityState> {
  const media = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const motion = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  const audio = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  const bt = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const state = (supported: boolean, yes: MessageKey, no: MessageKey): CapabilityState =>
    ({ supported, available: supported ? 'yes' : 'no', note: supported ? yes : no });
  return {
    camera: state(media, 'assist.devices.cap.cameraYes', 'assist.devices.cap.cameraNo'),
    microphone: state(media, 'assist.devices.cap.micYes', 'assist.devices.cap.micNo'),
    motion: state(motion, 'assist.devices.cap.motionYes', 'assist.devices.cap.motionNo'),
    audio: state(audio, 'assist.devices.cap.audioYes', 'assist.devices.cap.audioNo'),
    bluetooth: state(bt, 'assist.devices.cap.btYes', 'assist.devices.cap.btNo'),
  };
}

const STATUS_YES: React.CSSProperties = { background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', borderColor: 'var(--sk-color-positive)' };
const STATUS_NO: React.CSSProperties = { background: 'var(--sk-color-surface-2)', color: 'var(--sk-color-text-2)', borderColor: 'var(--sk-color-rule)' };
const STAGE: React.CSSProperties = { position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--sk-color-brand-navy)', minHeight: 260 };
const STAGE_NOTE: React.CSSProperties = { color: 'var(--sk-color-on-action)', padding: 40, textAlign: 'center' };
const TARGET: React.CSSProperties = { minHeight: 44 };

export function DevicesAndSensorsScreen() {
  const t = useT();
  const [caps] = useState<Record<Capability, CapabilityState>>(() => detectCapabilities());
  const [native] = useState(() => describeNativeSupport());
  const [tab, setTab] = useState<'camera' | 'pedometer' | 'voice' | 'pulse'>('camera');

  const rows: { key: Capability; label: MessageKey; icon: typeof Camera }[] = [
    { key: 'camera', label: 'assist.devices.row.camera', icon: Camera },
    { key: 'microphone', label: 'assist.devices.row.mic', icon: Mic },
    { key: 'motion', label: 'assist.devices.row.motion', icon: Footprints },
    { key: 'audio', label: 'assist.devices.row.audio', icon: Volume2 },
    { key: 'bluetooth', label: 'assist.devices.row.bt', icon: Smartphone },
  ];

  return <div>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('assist.devices.eyebrow')}</span>
      <h2>{t('assist.devices.title')}</h2>
      <p>{t('assist.devices.intro')}</p>
    </div></div>

    <div className="wf-record-grid" style={{ marginBottom: 26 }}>
      {rows.map(({ key, label, icon: Icon }) => {
        const c = caps[key];
        return <article className="wf-card" key={key}>
          <span className="wf-record-icon"><Icon size={24} aria-hidden="true" /></span>
          <h3>{t(label)}</h3>
          <p>{t(c.note)}</p>
          <span className="wf-status" style={c.available === 'yes' ? STATUS_YES : STATUS_NO}>
            {t(c.available === 'yes' ? 'assist.devices.available' : 'assist.devices.unavailable')}
          </span>
        </article>;
      })}
      <article className="wf-card">
        <span className="wf-record-icon"><Smartphone size={24} aria-hidden="true" /></span>
        <h3>{t('assist.devices.row.native')}</h3>
        <p>{t(native.supported ? 'assist.devices.native.yes' : 'assist.devices.native.no')}</p>
        <span className="wf-status" style={native.supported ? STATUS_YES : STATUS_NO}>
          {t(native.supported ? 'assist.devices.available' : 'assist.devices.native.manual')}
        </span>
      </article>
    </div>

    <div className="wf-choice-row" style={{ marginBottom: 22 }} role="group" aria-label={t('assist.devices.tools')}>
      <button type="button" style={TARGET} aria-pressed={tab === 'camera'} onClick={() => setTab('camera')}><Camera size={16} aria-hidden="true" />{t('assist.devices.tab.camera')}</button>
      <button type="button" style={TARGET} aria-pressed={tab === 'pedometer'} onClick={() => setTab('pedometer')}><Footprints size={16} aria-hidden="true" />{t('steps.title')}</button>
      <button type="button" style={TARGET} aria-pressed={tab === 'voice'} onClick={() => setTab('voice')}><Mic size={16} aria-hidden="true" />{t('assist.devices.tab.voice')}</button>
      <button type="button" style={TARGET} aria-pressed={tab === 'pulse'} onClick={() => setTab('pulse')}><Activity size={16} aria-hidden="true" />{t('assist.devices.tab.pulse')}</button>
    </div>

    {tab === 'camera' && <CameraCapture supported={caps.camera.available === 'yes'} />}
    {tab === 'pedometer' && <StepsInThePhoneApp />}
    {tab === 'voice' && <VoiceRecorder supported={caps.microphone.available === 'yes'} />}
    {tab === 'pulse' && <PulseEstimateUnavailable />}
  </div>;
}

/* Camera capture with live preview, front/rear, and upload fallback. Saving sends the
   photo itself to the health records; nothing is "saved" without the file. */
function CameraCapture({ supported }: { supported: boolean }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [snapshot, setSnapshot] = useState<{ blob: Blob; url: string } | null>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const mutation = useMutation();

  const start = useCallback(async () => {
    if (!supported) return;
    setError(null);
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      streamRef.current = stream;
      // The <video> is always mounted, so the stream always has somewhere to go.
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => undefined); }
      setRunning(true);
    } catch {
      setError('assist.devices.camera.denied');
      setRunning(false);
    }
  }, [supported, facing]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }, []);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); }, []);
  useEffect(() => () => { if (snapshot) URL.revokeObjectURL(snapshot.url); }, [snapshot]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setError('assist.devices.camera.captureFailed'); return; }
      setSaved(false);
      setSnapshot({ blob, url: URL.createObjectURL(blob) });
    }, 'image/jpeg', 0.9);
  };

  const sendToRecords = (file: Blob, filename: string, done: () => void) => {
    const form = new FormData();
    form.append('title', t('assist.devices.camera.recordTitle'));
    form.append('category', 'OTHER');
    form.append('file', file, filename);
    mutation.run(() => apiRequest('/health/documents', { method: 'POST', body: form }), () => { setSaved(true); done(); });
  };

  const save = () => { if (snapshot) sendToRecords(snapshot.blob, `camera-${Date.now()}.jpg`, () => setSnapshot(null)); };

  const saveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upload) return;
    sendToRecords(upload, upload.name, () => setUpload(null));
  };

  if (!supported) {
    return <section className="wf-card">
      <h3>{t('assist.devices.camera.unavailableTitle')}</h3>
      <p>{t('assist.devices.camera.unavailableBody')}</p>
      <form className="wf-form" onSubmit={saveUpload}>
        <Field label={t('assist.devices.camera.fileLabel')}><input type="file" accept="image/png,image/jpeg,application/pdf" onChange={e => { setSaved(false); setUpload(e.target.files?.[0] ?? null); }} /></Field>
        <FormError message={mutation.error} />
        {saved && <p className="wf-notice" role="status">{t('assist.devices.camera.saved')}</p>}
        <SubmitButton busy={mutation.busy} disabled={!upload}>{t('assist.devices.camera.saveToRecords')}</SubmitButton>
      </form>
    </section>;
  }

  return <section className="wf-card">
    <div className="wf-panel-heading"><div><h3>{t('assist.devices.camera.title')}</h3><p>{t('assist.devices.camera.body')}</p></div>
      <button type="button" className="health-button" style={TARGET} onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')} disabled={!running}>{t('assist.devices.camera.switch')}</button>
    </div>
    <div style={STAGE}>
      <video ref={videoRef} style={{ width: '100%', display: running ? 'block' : 'none', maxHeight: 340 }} muted playsInline aria-label={t('assist.devices.camera.liveLabel')} />
      {!running && !snapshot && <div style={STAGE_NOTE}><Camera size={32} aria-hidden="true" /><p>{t('assist.devices.camera.previewHint')}</p></div>}
      {snapshot && !running && <img src={snapshot.url} alt={t('assist.devices.camera.previewAlt')} style={{ width: '100%', display: 'block' }} />}
    </div>
    <div className="wf-row-actions" style={{ marginTop: 16 }}>
      {running
        ? <button type="button" className="health-button" style={TARGET} onClick={() => { capture(); stop(); }}><Camera size={16} aria-hidden="true" />{t('assist.devices.camera.capture')}</button>
        : <button type="button" className="health-button health-button-primary" style={TARGET} onClick={() => void start()}><Video size={16} aria-hidden="true" />{t('assist.devices.camera.start')}</button>}
      {running && <button type="button" className="health-button" style={TARGET} onClick={stop}>{t('assist.devices.stop')}</button>}
      {snapshot && <>
        <button type="button" className="health-button health-button-primary" style={TARGET} disabled={mutation.busy} onClick={save}><CloudUpload size={16} aria-hidden="true" />{t('assist.devices.camera.saveToRecords')}</button>
        <button type="button" className="health-button" style={TARGET} onClick={() => { setSnapshot(null); void start(); }}>{t('assist.devices.camera.retake')}</button>
      </>}
    </div>
    {error && <div className="wf-notice" role="alert"><AlertTriangle size={16} aria-hidden="true" />{t(error)}</div>}
    <FormError message={mutation.error} />
    {saved && <p className="wf-notice" role="status">{t('assist.devices.camera.saved')}</p>}
    <p className="wf-fineprint">{t('assist.devices.camera.fineprint')}</p>
  </section>;
}

/* Steps. A browser cannot count steps reliably: this tab used to turn raw
   motion-event peaks (a fixed 10.5 m/s² threshold) into a "step" count, which is
   a guess, not a reading. Steps are counted by the phone app (Apple Health,
   Health Connect or the phone's motion sensor); here they can be typed in. */
function StepsInThePhoneApp() {
  const t = useT();
  return <section className="wf-card" data-testid="devices-steps">
    <h3>{t('steps.sources.webTitle')}</h3>
    <p>{t('steps.sources.webBody')}</p>
    <div className="wf-row-actions">
      <button type="button" className="health-button health-button-primary" style={TARGET} onClick={() => navigate('health/steps')}><Footprints size={16} aria-hidden="true" />{t('steps.web.addTyped')}</button>
    </div>
  </section>;
}

/* Voice note recording with MediaRecorder, playback, and deletion. */
function VoiceRecorder({ supported }: { supported: boolean }) {
  const t = useT();
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    if (!supported) return;
    setError(false);
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
        streamRef.current?.getTracks().forEach(track => track.stop());
      };
      rec.start();
      setRecording(true);
    } catch { setError(true); }
  };
  const stop = () => { mediaRef.current?.stop(); setRecording(false); };
  const clear = () => { if (url) URL.revokeObjectURL(url); setUrl(null); };
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  if (!supported) {
    return <section className="wf-card"><h3>{t('assist.devices.voice.unavailableTitle')}</h3><p>{t('assist.devices.voice.unavailableBody')}</p></section>;
  }
  return <section className="wf-card">
    <h3>{t('assist.devices.voice.title')}</h3>
    <p>{t('assist.devices.voice.body')}</p>
    <div className="wf-row-actions">
      {recording
        ? <button type="button" className="health-button health-button-primary" style={TARGET} onClick={stop}><Pause size={16} aria-hidden="true" />{t('assist.devices.voice.stop')}</button>
        : <button type="button" className="health-button health-button-primary" style={TARGET} onClick={() => void start()}><Mic size={16} aria-hidden="true" />{t('assist.devices.voice.start')}</button>}
      {url && <button type="button" className="health-button" style={TARGET} onClick={clear}><Trash2 size={16} aria-hidden="true" />{t('assist.devices.voice.delete')}</button>}
    </div>
    {url && <audio controls src={url} style={{ width: '100%', marginTop: 16 }} aria-label={t('assist.devices.voice.playback')} />}
    {error && <div className="wf-notice" role="alert"><AlertTriangle size={16} aria-hidden="true" />{t('assist.devices.voice.denied')}</div>}
    <p className="wf-fineprint">{t('assist.devices.voice.fineprint')}</p>
  </section>;
}

/* A camera "pulse" reading from face video has not been validated here, so no number
   is shown. The earlier estimator never received frames (its <video> was not mounted
   when the stream arrived) and left the camera on; a heart rate from an unvalidated
   method is not something a health record should display. */
export function PulseEstimateUnavailable() {
  const t = useT();
  return <section className="wf-card">
    <h3>{t('assist.devices.pulse.title')}</h3>
    <p>{t('assist.devices.pulse.body')}</p>
    <div className="wf-notice" role="note"><AlertTriangle size={16} aria-hidden="true" />{t('assist.devices.pulse.note')}</div>
  </section>;
}
