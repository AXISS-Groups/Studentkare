import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Sparkles, X, CheckCircle2, PhoneCall, ShieldAlert, Award, Smile, Pause, Play, RotateCcw, EyeOff, Brain, Focus, PenLine, Moon, Eraser } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../interface/WorkflowUI';

export function MentalHealthGameSuiteModal({ isOpen, onClose, token }: { isOpen: boolean; onClose: () => void; token: string | null }) {
  const [activeGame, setActiveGame] = useState<'ZEN_BREATHING' | 'BUBBLE_POP' | 'CHECK_IN' | 'GROUNDING' | 'MEMORY' | 'TRACING' | 'DRAWING' | 'SLEEP'>('ZEN_BREATHING');
  const [bubblesPopped, setBubblesPopped] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathTimer, setBreathTimer] = useState(4);
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathSessionSecs, setBreathSessionSecs] = useState(0);
  const [selfMood, setSelfMood] = useState('');
  const [grounded, setGrounded] = useState<Record<string, boolean>>({});
  const [sequence, setSequence] = useState<number[]>([]);
  const [sequenceInput, setSequenceInput] = useState<number[]>([]);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [traceProg, setTraceProg] = useState(0);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [sleepRunning, setSleepRunning] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const mutation = useMutation();

  const [bubbles, setBubbles] = useState([
    { id: 1, text: 'Exam Anxiety', x: 20, y: 30, color: '#ef4444' },
    { id: 2, text: 'Late Night Overthinking', x: 60, y: 50, color: '#f59e0b' },
    { id: 3, text: 'Placement Deadlines', x: 35, y: 70, color: '#3b82f6' },
    { id: 4, text: 'Sleep Deprivation', x: 75, y: 25, color: '#8b5cf6' },
    { id: 5, text: 'Hostel Noise Fatigue', x: 45, y: 40, color: '#ec4899' },
  ]);

  // Breathing only advances while a session is started.
  useEffect(() => {
    if (!isOpen || activeGame !== 'ZEN_BREATHING' || !breathRunning) return;

    const phases: Array<{ name: 'Inhale' | 'Hold' | 'Exhale'; sec: number }> = [
      { name: 'Inhale', sec: 4 },
      { name: 'Hold', sec: 7 },
      { name: 'Exhale', sec: 8 },
    ];
    let pIdx = 0;
    let secLeft = phases[0].sec;

    const interval = setInterval(() => {
      secLeft -= 1;
      setBreathSessionSecs(s => s + 1);
      if (secLeft <= 0) {
        pIdx = (pIdx + 1) % phases.length;
        setBreathPhase(phases[pIdx].name);
        secLeft = phases[pIdx].sec;
      }
      setBreathTimer(secLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeGame, breathRunning]);

  useEffect(() => {
    if (!isOpen) {
      setBreathRunning(false);
      setBreathSessionSecs(0);
      setSavedSuccess('');
      setErrorMsg('');
      setSelfMood('');
      setGrounded({});
      setTracing(false);
      setTraceProg(0);
      setSleepRunning(false);
      setSleepTimer(0);
      setSequenceDone(false);
      setSequence([]);
      setSequenceInput([]);
    }
  }, [isOpen]);

  // Sleep wind-down timer.
  useEffect(() => {
    if (!isOpen || !sleepRunning) return;
    const interval = setInterval(() => setSleepTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen, sleepRunning]);

  // Tracing animation.
  useEffect(() => {
    if (!isOpen || activeGame !== 'TRACING' || !tracing) return;
    const interval = setInterval(() => setTraceProg(p => Math.min(100, p + 5)), 120);
    return () => clearInterval(interval);
  }, [isOpen, activeGame, tracing]);

  const popBubble = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setBubblesPopped(prev => prev + 1);
  };

  const resetBubbles = () => {
    setBubblesPopped(0);
    setBubbles([
      { id: 1, text: 'Exam Stress', x: 25, y: 35, color: '#ef4444' },
      { id: 2, text: 'Assignment Backlog', x: 65, y: 45, color: '#f59e0b' },
      { id: 3, text: 'Social Fatigue', x: 40, y: 65, color: '#3b82f6' },
      { id: 4, text: 'Project Deadlines', x: 80, y: 30, color: '#8b5cf6' },
      { id: 5, text: 'Sleep Hygiene', x: 50, y: 20, color: '#ec4899' },
    ]);
  };

  const startMemory = () => {
    const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 9));
    setSequence(seq);
    setSequenceInput([]);
    setSequenceDone(false);
  };

  const tapMemory = (digit: number) => {
    if (sequenceDone) return;
    setSequenceInput(prev => {
      const next = [...prev, digit];
      const idx = next.length - 1;
      if (next[idx] !== sequence[idx]) { setSequenceDone(true); return next; }
      if (next.length === sequence.length) { setSequenceDone(true); }
      return next;
    });
  };

  const memoryCorrect = () => sequenceDone && sequenceInput.length === sequence.length && sequenceInput.every((d, i) => d === sequence[i]);

  const saveGameSession = () => {
    if (!token) {
      setErrorMsg('Please sign in to record your wellbeing activity.');
      return;
    }
    const completed = activeGame === 'BUBBLE_POP' ? bubblesPopped > 0 : breathSessionSecs > 0;
    mutation.run(() => apiRequest<{ status: string; message: string }>('/health/mental-game', {
      method: 'POST',
      body: JSON.stringify({
        gameType: activeGame,
        durationSeconds: activeGame === 'ZEN_BREATHING' ? breathSessionSecs : 0,
        completed,
        selfReportedMood: selfMood,
      }),
    }), () => setSavedSuccess(`Session recorded.${selfMood ? ' Thank you for sharing how you feel.' : ''}`));
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e9dcf7', boxShadow: '0 25px 50px -12px rgba(124, 60, 237, 0.25)' }}>
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 14 }}>
              <Gamepad2 size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Mental Wellbeing Activities</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Mindfulness games, thought sorting & calming breaks</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#ffffff', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { id: 'ZEN_BREATHING', label: 'Breathwork', icon: <Smile size={16} /> },
              { id: 'BUBBLE_POP', label: 'Thought Pop', icon: <Sparkles size={16} /> },
              { id: 'CHECK_IN', label: 'Check-in', icon: <ShieldAlert size={16} /> },
              { id: 'GROUNDING', label: 'Grounding', icon: <EyeOff size={16} /> },
              { id: 'MEMORY', label: 'Memory', icon: <Brain size={16} /> },
              { id: 'TRACING', label: 'Tracing', icon: <Focus size={16} /> },
              { id: 'DRAWING', label: 'Drawing', icon: <PenLine size={16} /> },
              { id: 'SLEEP', label: 'Wind-down', icon: <Moon size={16} /> },
            ].map(tab => (
              <button key={tab.id} type="button" onClick={() => { setActiveGame(tab.id as any); setSavedSuccess(''); setErrorMsg(''); }}
                style={{ flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, border: '1px solid', borderColor: activeGame === tab.id ? '#8b5cf6' : '#e2d5f3', background: activeGame === tab.id ? '#8b5cf6' : '#fcfaff', color: activeGame === tab.id ? '#ffffff' : '#5b3e85', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeGame === 'ZEN_BREATHING' && (
            <div style={{ textAlign: 'center', background: 'linear-gradient(180deg, #fdf4ff, #fae8ff)', borderRadius: 20, padding: 32, border: '1px solid #f0abfc' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c026d3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Guided 4-7-8 Rhythmic Breathing
              </div>
              <div style={{ margin: '24px auto', width: 160, height: 160, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)', transition: 'transform 1s ease', transform: breathRunning && breathPhase === 'Inhale' ? 'scale(1.15)' : 'scale(1)' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{breathRunning ? breathPhase : 'Ready'}</span>
                <span style={{ fontSize: '2rem', fontWeight: 800 }}>{breathRunning ? `${breathTimer}s` : '0s'}</span>
              </div>
              <p style={{ color: '#701a75', fontWeight: 600, fontSize: '0.9rem', maxWidth: 460, margin: '0 auto' }}>
                Follow the pacing. Inhale gently, hold if comfortable, then exhale. Pause any time.
              </p>
              <div className="wf-row-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
                {breathRunning
                  ? <button className="health-button" onClick={() => setBreathRunning(false)}><Pause size={16} />Pause</button>
                  : <button className="health-button health-button-primary" onClick={() => { setBreathRunning(true); setBreathPhase('Inhale'); setBreathTimer(4); }}><Play size={16} />Start</button>}
                <button className="health-button" onClick={() => { setBreathRunning(false); setBreathSessionSecs(0); }}><RotateCcw size={16} />Reset</button>
              </div>
            </div>
          )}

          {activeGame === 'BUBBLE_POP' && (
            <div style={{ background: '#0f172a', borderRadius: 20, padding: 24, minHeight: 280, position: 'relative', border: '1px solid #334155', color: '#ffffff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f472b6' }}>TAP TO SET A THOUGHT DOWN</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399' }}>Cleared: {bubblesPopped}</span>
              </div>
              {bubbles.length === 0 ? (
                <div style={{ textAlign: 'center', paddingBlock: 48 }}>
                  <Award size={48} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Nice pause.</h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 16 }}>You set those thoughts down for a moment. Take a breath and continue when ready.</p>
                  <button type="button" onClick={resetBubbles} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                    Another round
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative', height: 200 }}>
                  {bubbles.map(b => (
                    <button key={b.id} type="button" onClick={() => popBubble(b.id)}
                      style={{ position: 'absolute', left: `${Math.min(b.x, 80)}%`, top: `${Math.min(b.y, 80)}%`, background: b.color, color: '#ffffff', border: 'none', borderRadius: 30, padding: '10px 18px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)', transform: 'translate(-50%, -50%)', transition: 'transform 0.2s ease', maxWidth: '80%' }}>
                      {b.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeGame === 'CHECK_IN' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>How are you feeling right now?</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748b' }}>This is private and optional. It is not a diagnosis.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['Calm', 'Okay', 'Worried', 'Stressed', 'Overwhelmed'].map(mood => (
                  <button key={mood} type="button" onClick={() => setSelfMood(mood)}
                    style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid', borderColor: selfMood === mood ? '#8b5cf6' : '#cbd5e1', background: selfMood === mood ? '#8b5cf6' : '#ffffff', color: selfMood === mood ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer' }}>
                    {mood}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: 10, color: '#dc2626', fontSize: '0.75rem', fontWeight: 800 }}>
                <PhoneCall size={14} /> If you're in crisis, call Tele-MANAS or your local helpline immediately.
              </div>
            </div>
          )}

          {activeGame === 'GROUNDING' && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: 22 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#4c1d95' }}>5-4-3-2-1 Grounding</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#6d28d9' }}>Notice your surroundings, one sense at a time. Tap each when you've found it.</p>
              {[
                { key: 'sight', label: '5 things you can SEE', prompt: 'Look around and name 5 things you can see.' },
                { key: 'touch', label: '4 things you can TOUCH', prompt: 'Notice 4 things you can feel or touch.' },
                { key: 'sound', label: '3 things you can HEAR', prompt: 'Listen for 3 sounds around you.' },
                { key: 'smell', label: '2 things you can SMELL', prompt: 'Notice 2 smells (or 2 you like).' },
                { key: 'taste', label: '1 thing you can TASTE', prompt: 'Notice 1 taste, or a sip of water.' },
              ].map(step => <div key={step.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, color: '#4c1d95' }}>
                  <input type="checkbox" checked={!!grounded[step.key]} onChange={() => setGrounded(g => ({ ...g, [step.key]: !g[step.key] }))} style={{ width: 18, height: 18 }} />
                  {step.label}
                </label>
                {!grounded[step.key] && <p style={{ margin: '6px 0 0 28px', fontSize: '0.78rem', color: '#7c6f9e' }}>{step.prompt}</p>}
              </div>)}
              <div className="wf-notice" style={{ marginTop: 8 }}><EyeOff size={16} />This helps you come back to the present. It is not a treatment.</div>
            </div>
          )}

          {activeGame === 'MEMORY' && (
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 20, padding: 22, textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#3730a3' }}>Memory Pattern</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#4338ca' }}>Remember the sequence, then tap it in order.</p>
              {sequence.length === 0 ? (
                <button className="health-button health-button-primary" onClick={startMemory}><Brain size={16} />Start a sequence</button>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                    {sequence.map((d, i) => <div key={i} style={{ width: 40, height: 52, display: 'grid', placeItems: 'center', borderRadius: 10, background: sequenceInput[i] !== undefined ? '#4338ca' : '#e0e7ff', color: sequenceInput[i] !== undefined ? '#fff' : '#4338ca', fontWeight: 800, fontSize: '1.2rem' }}>{sequenceInput[i] !== undefined ? sequenceInput[i] : '?'}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 240, margin: '0 auto' }}>
                    {[0,1,2,3,4,5,6,7,8].map(n => <button key={n} type="button" disabled={sequenceDone} onClick={() => tapMemory(n)} style={{ padding: 14, borderRadius: 12, border: '1px solid #c7d2fe', background: '#ffffff', color: '#3730a3', fontWeight: 800, fontSize: '1.1rem', cursor: sequenceDone ? 'default' : 'pointer' }}>{n}</button>)}
                  </div>
                  {sequenceDone && <div className="wf-notice" style={{ marginTop: 16 }} role="status">{memoryCorrect() ? 'Nice recall!' : 'Not quite — try again.'}<button className="health-text-button" onClick={startMemory}>Play again</button></div>}
                </>
              )}
            </div>
          )}

          {activeGame === 'TRACING' && (
            <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: 20, padding: 22, textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#a21caf' }}>Calm Tracing</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#c026d3' }}>Follow the line with your finger, slowly.</p>
              <div style={{ position: 'relative', maxWidth: 340, margin: '0 auto', height: 150, border: '1px solid #f0abfc', borderRadius: 16, overflow: 'hidden', background: '#fdf4ff' }}>
                <svg viewBox="0 0 300 130" style={{ width: '100%', height: '100%' }}>
                  <path d="M20 80 C 80 10, 140 120, 200 60 S 280 30, 280 90" fill="none" stroke="#e9d5ff" strokeWidth="6" strokeLinecap="round" />
                  <path d="M20 80 C 80 10, 140 120, 200 60 S 280 30, 280 90" fill="none" stroke="#a21caf" strokeWidth="6" strokeLinecap="round" strokeDasharray={600} strokeDashoffset={600 - (traceProg / 100) * 600} />
                </svg>
              </div>
              <div className="wf-row-actions" style={{ justifyContent: 'center', marginTop: 14 }}>
                {tracing ? <button className="health-button" onClick={() => setTracing(false)}>Pause</button> : <button className="health-button health-button-primary" onClick={() => { setTracing(true); setTraceProg(0); }}><Focus size={16} />Start tracing</button>}
              </div>
              {traceProg >= 100 && <div className="wf-notice" role="status" style={{ marginTop: 14 }}><CheckCircle2 size={16} />Slow and steady. Nicely done.</div>}
            </div>
          )}

          {activeGame === 'DRAWING' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: 22 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#166534' }}>Mindful Drawing</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#15803d' }}>Draw freely. There's no right or wrong — just follow your hand.</p>
              <DoodleCanvas />
            </div>
          )}

          {activeGame === 'SLEEP' && (
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 20, padding: 22, textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#3730a3' }}>Wind-Down Timer</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#4338ca' }}>Dim the lights, put the phone down, and let a quiet routine begin.</p>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#4338ca', fontVariantNumeric: 'tabular-nums' }}>
                {Math.floor(sleepTimer / 60)}:{String(sleepTimer % 60).padStart(2, '0')}
              </div>
              <div className="wf-row-actions" style={{ justifyContent: 'center', marginTop: 14 }}>
                {sleepRunning ? <button className="health-button" onClick={() => setSleepRunning(false)}><Pause size={16} />Pause</button> : <button className="health-button health-button-primary" onClick={() => setSleepRunning(true)}><Moon size={16} />Start</button>}
                <button className="health-button" onClick={() => { setSleepRunning(false); setSleepTimer(0); }}><RotateCcw size={16} />Reset</button>
              </div>
              <p className="wf-fineprint" style={{ marginTop: 12 }}>A calm down routine is not medical treatment. See a professional if sleep problems persist.</p>
            </div>
          )}

          {savedSuccess && (
            <div style={{ marginTop: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 12, borderRadius: 12, color: '#047857', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} /> {savedSuccess}
            </div>
          )}
          {errorMsg && (
            <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 12, color: '#dc2626', fontSize: '0.85rem', fontWeight: 700 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={18} /> Session recorded — rewards are optional
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #d1d5db', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Close</button>
              <button type="button" disabled={mutation.busy} onClick={saveGameSession} style={{ padding: '10px 20px', borderRadius: 12, background: '#8b5cf6', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} /> Save session
              </button>
            </div>
          </div>
          <FormError message={mutation.error} />
        </div>
      </div>
    </div>
  );
}

function DoodleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [cleared, setCleared] = useState(false);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = pos(e);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !canvasRef.current || !last.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCleared(true);
  };

  return <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto' }}>
    <canvas ref={canvasRef} width={460} height={260} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
      style={{ width: '100%', height: 260, border: '1px solid #bbf7d0', borderRadius: 14, background: '#ffffff', touchAction: 'none', cursor: 'crosshair' }}
      aria-label="Free drawing canvas" />
    <button className="health-button" style={{ marginTop: 10 }} onClick={clear}><Eraser size={16} />Clear</button>
    {cleared && <p className="wf-fineprint">Sketch is session-only and is not saved unless you choose to.</p>}
  </div>;
}
