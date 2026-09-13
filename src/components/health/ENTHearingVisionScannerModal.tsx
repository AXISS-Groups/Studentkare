import React, { useRef, useState } from 'react';
import { Volume2, Eye, Mic, CheckCircle2, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../interface/WorkflowUI';

export type ENTVisionTab = 'AUDIOMETRY' | 'VISION_ACUITY' | 'VOICE';

const TONES = [250, 500, 1000, 2000, 4000, 8000];

export function ENTHearingVisionScannerModal({ isOpen, onClose, token }: { isOpen: boolean; onClose: () => void; token: string | null }) {
  const [activeTab, setActiveTab] = useState<ENTVisionTab>('AUDIOMETRY');
  const [heard, setHeard] = useState<Record<number, boolean>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [visionCorrect, setVisionCorrect] = useState(0);
  const [visionTotal, setVisionTotal] = useState(0);
  const [eye, setEye] = useState<'left' | 'right'>('right');
  const [optotype, setOptotype] = useState('E F P T O');
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const mutation = useMutation();

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  };

  const playTone = (freqHz: number) => {
    stopTone();
    try {
      const ctx = ensureCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqHz;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      oscRef.current = osc;
            window.setTimeout(() => { if (oscRef.current === osc) { oscRef.current = null; } }, 1250);
    } catch {
      setErrorMsg('Audio playback is not available here.');
    }
  };

  const stopTone = () => {
    try { oscRef.current?.stop(); } catch { /* noop */ }
    oscRef.current = null;
  };

  const markHeard = (freqHz: number) => {
    if (heard[freqHz]) return;
    setHeard(prev => ({ ...prev, [freqHz]: true }));
    setSkipped(prev => ({ ...prev, [freqHz]: false }));
  };
  const markNotHeard = (freqHz: number) => {
    if (heard[freqHz]) return;
    setSkipped(prev => ({ ...prev, [freqHz]: true }));
  };

  const randomOptotype = () => {
    const letters = 'EFPTO';
    let s = '';
    for (let i = 0; i < 5; i++) s += letters[Math.floor(Math.random() * letters.length)] + (i < 4 ? ' ' : '');
    return s;
  };

  const nextOptotype = () => {
    setOptotype(randomOptotype());
     ;
  };

  const recordVision = (answered: 'correct' | 'incorrect') => {
    setVisionTotal(t => t + 1);
    if (answered === 'correct') setVisionCorrect(c => c + 1);
    nextOptotype();
  };

  const toggleVoice = () => setVoiceRecorded(v => !v);

  const saveToVault = () => {
    if (!token) { setErrorMsg('Please sign in to save your vision/hearing self-check.'); return; }
    mutation.run(() => apiRequest<{ status: string }>('/health/ent-vision-scan', {
      method: 'POST',
      body: JSON.stringify({
        completed: true,
        hearingResponses: Object.values(heard).filter(Boolean).length,
        visionResponses: visionTotal,
        voiceRecorded,
      }),
    }), () => setSavedSuccess('Vision/hearing self-check saved. This is a limited self-report, not a clinical result.'));
  };

  const reset = () => {
    stopTone();
    setHeard({}); setSkipped({}); setVisionCorrect(0); setVisionTotal(0); setVoiceRecorded(false);
    setSavedSuccess(''); setErrorMsg('');
  };

  const onCloseAndReset = () => { reset(); onClose(); };
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e9dcf7', boxShadow: '0 25px 50px -12px rgba(124, 60, 237, 0.25)' }}>
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#ffffff', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 14 }}><Volume2 size={24} color="#ffffff" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Vision, Hearing & Voice Self-Check</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Screen yourself. Results are limited self-reports, not a clinical assessment.</p>
            </div>
          </div>
          <button type="button" onClick={onCloseAndReset} aria-label="Close" style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#ffffff', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { id: 'AUDIOMETRY', label: 'Hearing', icon: <Volume2 size={16} /> },
              { id: 'VISION_ACUITY', label: 'Vision', icon: <Eye size={16} /> },
              { id: 'VOICE', label: 'Voice note', icon: <Mic size={16} /> },
            ].map(tab => (
              <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id as ENTVisionTab); setSavedSuccess(''); setErrorMsg(''); }}
                style={{ flex: 1, minWidth: 130, padding: '10px 14px', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, border: '1px solid',  borderColor: activeTab === tab.id ? '#0284c7' : '#e0f2fe',  background: activeTab === tab.id ? '#0284c7' : '#f0f9ff', color: activeTab === tab.id ? '#ffffff' : '#0369a1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'AUDIOMETRY' && (
            <div style={{ background: '#f8fafc', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#0369a1', fontWeight: 700 }}>
                Use headphones in a quiet room. Lower your volume to a comfortable level before testing.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {TONES.map(freq => {
                  const isHeard = !!heard[freq];
                  const isSkipped = !!skipped[freq];
                  return <div key={freq} style={{ border: '1px solid', borderColor: isHeard ? '#10b981' : isSkipped ? '#f59e0b' : '#cbd5e1', borderRadius: 14, padding: 12, background: isHeard ? '#ecfdf5' : isSkipped ? '#fffbeb' : '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{freq} Hz</span>
                      <button type="button" onClick={() => playTone(freq)} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center' }} aria-label={`Play ${freq} Hz tone`}>
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => markHeard(freq)} disabled={isHeard} style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid #a7f3d0', background: isHeard ? '#10b981' : '#ecfdf5', color: isHeard ? '#fff' : '#047857', fontWeight: 700, cursor: isHeard ? 'default' : 'pointer', fontSize: '0.75rem' }}>Heard</button>
                      <button type="button" onClick={() => markNotHeard(freq)} disabled={isHeard} style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid #fde68a', background: isSkipped ? '#f59e0b' : '#fffbeb', color: isSkipped ? '#fff' : '#92400e', fontWeight: 700, cursor: isHeard ? 'default' : 'pointer', fontSize: '0.75rem' }}>Not heard</button>
                    </div>
                  </div>;
                })}
              </div>
              <div className="wf-notice"><AlertTriangle size={16} />Digital tones are not calibrated dB HL. Results do not diagnose hearing loss.</div>
            </div>
          )}

          {activeTab === 'VISION_ACUITY' && (
            <div style={{ background: '#f8fafc', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#0369a1', fontWeight: 700 }}>
                Hold your phone at a comfortable arm's length in good light. Cover each eye in turn.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {['right', 'left'].map(e => (
                  <button key={e} type="button" onClick={() => setEye(e as any)} style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid', borderColor: eye === e ? '#0284c7' : '#cbd5e1', background: eye === e ? '#0284c7' : '#ffffff', color: eye === e ? '#fff' : '#334155', fontWeight: 800, cursor: 'pointer' }}>Test {e} eye</button>
                ))}
              </div>
              <div style={{ background: '#ffffff', padding: 24, borderRadius: 16, border: '2px solid #0f172a', margin: '0 auto 16px', maxWidth: 360 }}>
                <div style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: 10, color: '#0f172a' }}>{optotype}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <button type="button" onClick={() => recordVision('correct')} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: 700, cursor: 'pointer' }}>Could read it</button>
                <button type="button" onClick={() => recordVision('incorrect')} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>Couldn't read it</button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Answered {visionCorrect}/{visionTotal} correctly</p>
              <div className="wf-notice"><AlertTriangle size={16} />Screen size and distance are not calibrated, so this is not a clinical acuity measurement.</div>
            </div>
          )}

          {activeTab === 'VOICE' && (
            <div style={{ background: '#f8fafc', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#0369a1', fontWeight: 700 }}>
                This records a note for your records. It does not analyze vocal health.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#334155' }}>
                <input type="checkbox" checked={voiceRecorded} onChange={toggleVoice} /> I recorded a voice note
              </label>
              <div className="wf-notice"><AlertTriangle size={16} />No automatic vocal-health or dysphonia analysis is performed here.</div>
            </div>
          )}

          <div style={{ marginTop: 20, background: '#f0f9ff', border: '1px solid #bae6fd', padding: 14, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.8rem', color: '#0f172a' }}>
              Hearing responses: {Object.values(heard).filter(Boolean).length}/{TONES.length} · Vision: {visionCorrect}/{visionTotal}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={reset} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Reset</button>
              <button type="button" disabled={mutation.busy} onClick={saveToVault} style={{ padding: '10px 18px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} /> Save self-check
              </button>
            </div>
          </div>

          {savedSuccess && <div style={{ marginTop: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 12, borderRadius: 12, color: '#047857', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} /> {savedSuccess}</div>}
          {errorMsg && <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 12, color: '#dc2626', fontSize: '0.85rem', fontWeight: 700 }}>{errorMsg}</div>}
          <FormError message={mutation.error} />
        </div>
      </div>
    </div>
  );
}
