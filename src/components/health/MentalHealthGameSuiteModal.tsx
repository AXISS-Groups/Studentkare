import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Heart, Sparkles, X, CheckCircle2, RefreshCw, PhoneCall, ShieldAlert, Award, Smile } from 'lucide-react';
import { apiRequest } from '../../data/http';

export function MentalHealthGameSuiteModal({ isOpen, onClose, token }: { isOpen: boolean; onClose: () => void; token: string | null }) {
  const [activeGame, setActiveGame] = useState<'ZEN_BREATHING' | 'BUBBLE_POP' | 'STRESS_RADAR'>('ZEN_BREATHING');
  const [gameScore, setGameScore] = useState(0);
  const [bubblesPopped, setBubblesPopped] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathTimer, setBreathTimer] = useState(4);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Thought Bubbles for De-Stress Game
  const [bubbles, setBubbles] = useState([
    { id: 1, text: 'Exam Anxiety', x: 20, y: 30, color: '#ef4444' },
    { id: 2, text: 'Late Night Overthinking', x: 60, y: 50, color: '#f59e0b' },
    { id: 3, text: 'Placement Deadlines', x: 35, y: 70, color: '#3b82f6' },
    { id: 4, text: 'Sleep Deprivation', x: 75, y: 25, color: '#8b5cf6' },
    { id: 5, text: 'Hostel Noise Fatigue', x: 45, y: 40, color: '#ec4899' },
  ]);

  // Breathing Game Rhythm Effect
  useEffect(() => {
    if (!isOpen || activeGame !== 'ZEN_BREATHING') return;

    const phases: Array<{ name: 'Inhale' | 'Hold' | 'Exhale'; sec: number }> = [
      { name: 'Inhale', sec: 4 },
      { name: 'Hold', sec: 7 },
      { name: 'Exhale', sec: 8 },
    ];
    let pIdx = 0;
    let secLeft = phases[0].sec;

    const interval = setInterval(() => {
      secLeft -= 1;
      if (secLeft <= 0) {
        pIdx = (pIdx + 1) % phases.length;
        setBreathPhase(phases[pIdx].name);
        secLeft = phases[pIdx].sec;
        setGameScore(prev => prev + 10);
      }
      setBreathTimer(secLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeGame]);

  const popBubble = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setBubblesPopped(prev => prev + 1);
    setGameScore(prev => prev + 20);
  };

  const resetBubbles = () => {
    setBubbles([
      { id: 1, text: 'Exam Stress', x: 25, y: 35, color: '#ef4444' },
      { id: 2, text: 'Assignment Backlog', x: 65, y: 45, color: '#f59e0b' },
      { id: 3, text: 'Social Fatigue', x: 40, y: 65, color: '#3b82f6' },
      { id: 4, text: 'Project Deadlines', x: 80, y: 30, color: '#8b5cf6' },
      { id: 5, text: 'Sleep Hygiene', x: 50, y: 20, color: '#ec4899' },
    ]);
  };

  const saveGameSession = async () => {
    if (!token) {
      setErrorMsg('Please sign in to record your de-stress sessions and earn Care Points.');
      return;
    }
    try {
      const res = await apiRequest<{ status: string; pointsEarned: number; message: string }>('/health/mental-game', {
        method: 'POST',
        body: JSON.stringify({
          gameType: activeGame,
          score: gameScore,
          mood: 'relaxed',
          pointsEarned: 25,
        }),
      });
      if (res.status === 'SUCCESS') {
        setSavedSuccess(`Session completed! +${res.pointsEarned} Care Points added to your wallet.`);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save game session.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e9dcf7', boxShadow: '0 25px 50px -12px rgba(124, 60, 237, 0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 14 }}>
              <Gamepad2 size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Mental Health Bio-Feedback & De-Stress Gaming Suite</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Interactive Mindfulness Games, Thought Pop & Stress Radar</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#ffffff', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Game Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { id: 'ZEN_BREATHING', label: '🧘 Zen Breathwork Game', icon: <Smile size={16} /> },
              { id: 'BUBBLE_POP', label: '🎈 Thought Bubble Pop', icon: <Sparkles size={16} /> },
              { id: 'STRESS_RADAR', label: '📊 Exam Stress Radar', icon: <ShieldAlert size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveGame(tab.id as any); setSavedSuccess(''); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: activeGame === tab.id ? '#8b5cf6' : '#e2d5f3',
                  background: activeGame === tab.id ? '#8b5cf6' : '#fcfaff',
                  color: activeGame === tab.id ? '#ffffff' : '#5b3e85',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Game 1: Zen Bio-Feedback Breathwork */}
          {activeGame === 'ZEN_BREATHING' && (
            <div style={{ textAlign: 'center', background: 'linear-gradient(180deg, #fdf4ff, #fae8ff)', borderRadius: 20, padding: 32, border: '1px solid #f0abfc' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c026d3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Guided 4-7-8 Rhythmic Breathing
              </div>
              <div style={{ margin: '24px auto', width: 160, height: 160, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)', transition: 'all 1s ease' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{breathPhase}</span>
                <span style={{ fontSize: '2rem', fontWeight: 800 }}>{breathTimer}s</span>
              </div>
              <p style={{ color: '#701a75', fontWeight: 600, fontSize: '0.9rem', maxWidth: 460, margin: '0 auto' }}>
                Follow the expanding ring. Inhale gently for 4s, hold for 7s, and exhale for 8s to lower your resting pulse rate.
              </p>
            </div>
          )}

          {/* Game 2: Thought Bubble Pop */}
          {activeGame === 'BUBBLE_POP' && (
            <div style={{ background: '#0f172a', borderRadius: 20, padding: 24, minHeight: 280, position: 'relative', border: '1px solid #334155', color: '#ffffff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f472b6' }}>CLICK TO POP STRESS THOUGHTS</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399' }}>Popped: {bubblesPopped}</span>
              </div>

              {bubbles.length === 0 ? (
                <div style={{ textAlign: 'center', paddingBlock: 48 }}>
                  <Award size={48} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Mind Clear & Stress Released!</h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 16 }}>You popped all negative exam stress thoughts.</p>
                  <button type="button" onClick={resetBubbles} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                    Play Another Round
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative', height: 200 }}>
                  {bubbles.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => popBubble(b.id)}
                      style={{
                        position: 'absolute',
                        left: `${b.x}%`,
                        top: `${b.y}%`,
                        background: b.color,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 30,
                        padding: '10px 18px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                        transform: 'translate(-50%, -50%)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      💥 {b.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Game 3: Stress Radar & Tele-MANAS SOS */}
          {activeGame === 'STRESS_RADAR' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Campus Cohort Exam Stress Index</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>k-Anonymity (k≥20) Protected Stress Telemetry</p>
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 10, color: '#dc2626', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PhoneCall size={14} /> Tele-MANAS 14416
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { cohort: 'Hostel 4 · B.Tech 3rd Year CSE', stress: 78, level: 'HIGH (Exam & Placement Prep)' },
                  { cohort: 'Hostel 1 · M.Tech BioTech', stress: 42, level: 'LOW (Lab Thesis)' },
                  { cohort: 'Hostel 7 · 1st Year Undergrads', stress: 65, level: 'ELEVATED (Campus Adaptation)' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#ffffff', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      <span>{item.cohort}</span>
                      <span style={{ color: item.stress > 70 ? '#dc2626' : '#059669' }}>{item.stress}/100</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 6, height: 6, marginBlock: 6 }}>
                      <div style={{ width: `${item.stress}%`, background: item.stress > 70 ? '#ef4444' : '#10b981', height: '100%', borderRadius: 6 }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.level}</div>
                  </div>
                ))}
              </div>
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

          {/* Footer Actions */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={18} /> Session Score: {gameScore} PTS
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #d1d5db', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
              <button
                type="button"
                onClick={saveGameSession}
                style={{ padding: '10px 20px', borderRadius: 12, background: '#8b5cf6', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Sparkles size={16} /> Complete & Claim +25 Care Points
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
