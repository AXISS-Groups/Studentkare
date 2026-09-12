import React, { useState, useEffect } from 'react';
import { Eye, Wind, Play, CheckCircle2, ShieldCheck, Sparkles, RotateCcw } from 'lucide-react';
import '../../theme/workflows.css';

export function StudyPostureCoachWidget() {
  const [secondsLeft, setSecondsLeft] = useState(1200); // 20 minutes countdown
  const [isPaused, setIsPaused] = useState(false);
  const [eyeRestAlert, setEyeRestAlert] = useState(false);
  const [activeStretch, setActiveStretch] = useState<string | null>(null);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setEyeRestAlert(true);
          return 1200;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
        border: '1px solid #bae6fd',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.05)',
      }}
      data-ui="study-posture-coach-widget"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: 8, borderRadius: 8 }}>
            <Eye size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0369a1' }}>
              Study Posture & 20-20-20 Eye Strain Coach
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#0284c7' }}>
              Digital Ergonomics • Privacy-First Workday Assistant
            </span>
          </div>
        </div>

        <div style={{ background: '#0284c7', color: '#ffffff', padding: '4px 12px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700 }}>
          ⏱️ {formatTimer(secondsLeft)}
        </div>
      </div>

      {eyeRestAlert && (
        <div style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: 10, borderRadius: 8, fontSize: '0.84rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>👁️ <strong>20-20-20 Eye Rest Time!</strong> Look at an object 20 feet away for 20 seconds.</span>
          <button className="health-button" onClick={() => setEyeRestAlert(false)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Posture Checks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155' }}>
          ✅ Top of laptop screen at eye level
        </div>
        <div style={{ background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155' }}>
          ✅ Shoulders relaxed, feet flat on floor
        </div>
      </div>

      {/* Stretch Player Quick Triggers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wind size={18} color="#059669" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>5-Minute Seated Desk Stretch Session</span>
        </div>
        <button
          className="health-button health-button-primary"
          onClick={() => setActiveStretch(activeStretch ? null : 'desk_stretch')}
          style={{ padding: '4px 12px', fontSize: '0.78rem' }}
        >
          {activeStretch ? 'Pause Stretch' : 'Start 5-Min Stretch'}
        </button>
      </div>

      {activeStretch && (
        <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 8, border: '1px solid #a7f3d0', marginTop: 10, color: '#065f46', fontSize: '0.84rem' }}>
          🧘 <strong>Active Session:</strong> 1. Roll shoulders backward 5 times. 2. Gently tilt head right then left for 10 seconds. 3. Extend arms overhead.
        </div>
      )}
    </div>
  );
}
