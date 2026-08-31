import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/theme';

interface PageLoaderOverlayProps {
  isLoading: boolean;
  label?: string;
}

export const PageLoaderOverlay: React.FC<PageLoaderOverlayProps> = ({
  isLoading,
  label = 'OPENING',
}) => {
  const { tokens, typography } = useTheme();

  const [phase, setPhase] = useState<'idle' | 'rise' | 'hold' | 'lift'>('idle');
  const [pct, setPct] = useState<number>(0);

  useEffect(() => {
    let tickTimer: any;
    let t1: any;
    let t2: any;
    let t3: any;

    if (isLoading) {
      setPhase('rise');
      setPct(0);

      // Smooth 5-Second Percentage Count (0% -> 100%)
      let p = 0;
      tickTimer = setInterval(() => {
        p = Math.min(100, p + 1);
        setPct(p);
        if (p >= 100) clearInterval(tickTimer);
      }, 45); // 45ms * 100 = 4500ms hold

      t1 = setTimeout(() => setPhase('hold'), 420);
      t2 = setTimeout(() => setPhase('lift'), 4600);
      t3 = setTimeout(() => {
        clearInterval(tickTimer);
        setPhase('idle');
        setPct(0);
      }, 5080);
    } else {
      setPhase('idle');
      setPct(0);
    }

    return () => {
      clearInterval(tickTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading]);

  if (phase === 'idle' && !isLoading) return null;

  const veilLabel = phase === 'lift' || pct >= 100 ? 'READY' : label || 'OPENING';

  return (
    <>
      <div
        className={`sk-veil-container sk-veil-${phase}`}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#16165c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 999999,
          padding: '0 24px',
          pointerEvents: phase === 'idle' ? 'none' : 'auto',
        }}
      >
        {/* Large 110px SK Shield Logo with Heartbeat Pulse Animation */}
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <svg
            width="110"
            height="129"
            viewBox="0 0 118 139"
            fill="none"
            style={{
              display: 'block',
              animation: 'sk-beat 1.6s cubic-bezier(.35,0,.35,1) infinite',
              transformOrigin: 'center',
              filter: 'drop-shadow(0 0 36px rgba(124, 92, 255, 0.75)) drop-shadow(0 0 16px rgba(0, 177, 255, 0.4))',
            }}
          >
            <defs>
              <linearGradient id="skgradVeilLarge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7c5cff" />
                <stop offset="1" stopColor="#4f2fd8" />
              </linearGradient>
            </defs>
            <path d="M59 4 114 24v54c0 26-20 46-55 57C24 124 4 104 4 78V24z" fill="url(#skgradVeilLarge)" />
            <text x="59" y="90" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="52" letterSpacing="-2" fill="#ffffff">
              SK
            </text>
          </svg>
        </div>

        {/* Giant #studentkare Hashtag */}
        <div style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', letterSpacing: -0.8, marginBottom: 6, textShadow: '0 0 20px rgba(0, 177, 255, 0.5)' }}>
          #student<span style={{ color: '#00b1ff' }}>kare</span>
        </div>

        {/* Official Tagline */}
        <div style={{ fontSize: 13.5, color: '#b1a6f6', textAlign: 'center', maxWidth: 460, lineHeight: 1.5, marginBottom: 24, fontWeight: 600 }}>
          Verified student health & digital telemetry network across Indian campuses.
        </div>

        {/* Animated Heartbeat EKG Pulse Waveform Line */}
        <div style={{ width: '100%', maxWidth: 360, height: 40, position: 'relative', marginBottom: 20 }}>
          <svg width="100%" height="40" viewBox="0 0 360 40" fill="none">
            <path
              d="M0 20 H120 L128 5 L136 35 L144 10 L152 28 L160 20 H360"
              stroke="#00ffaa"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 360,
                strokeDashoffset: 360,
                animation: 'sk-trace 2.2s linear infinite',
                filter: 'drop-shadow(0 0 8px #00ffaa)',
              }}
            />
          </svg>
        </div>

        {/* Monospace Counter Readout & Veil Label */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 12, zIndex: 20 }}>
          <span style={{ fontFamily: typography.fontMono, fontSize: 18, fontWeight: 900, color: '#00ffaa', textShadow: '0 0 12px rgba(0, 255, 170, 0.4)' }}>
            {String(pct).padStart(2, '0')}%
          </span>
          <span style={{ fontFamily: typography.fontMono, fontSize: 12, letterSpacing: 1, color: '#b9b6e8', fontWeight: 800 }}>
            {veilLabel}
          </span>
        </div>
      </div>

      {/* Official Impilo Veil & Cardiac Heartbeat Keyframe Specifications */}
      <style>{`
        .sk-veil-rise {
          animation: sk-veil-in 420ms cubic-bezier(.7,0,.24,1) forwards;
        }
        .sk-veil-hold {
          transform: translateY(0);
        }
        .sk-veil-lift {
          animation: sk-veil-out 480ms cubic-bezier(.7,0,.24,1) forwards;
        }

        @keyframes sk-veil-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes sk-veil-out {
          from { transform: translateY(0); }
          to { transform: translateY(-100%); }
        }

        @keyframes sk-beat {
          0%   { transform: scale(1); }
          12%  { transform: scale(1.12); }
          22%  { transform: scale(1.01); }
          32%  { transform: scale(1.07); }
          44%  { transform: scale(1); }
          100% { transform: scale(1); }
        }

        @keyframes sk-trace {
          0%   { stroke-dashoffset: 360; }
          55%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -360; }
        }
      `}</style>
    </>
  );
};
