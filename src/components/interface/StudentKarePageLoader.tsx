import React, { useEffect, useState } from 'react';
import { StudentKareShield } from '../StudentKareLogo';

export function StudentKarePageLoader({
  onComplete,
  duration = 7000,
}: {
  onComplete?: () => void;
  duration?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 40);
    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div
      className="sk-full-page-loader"
      role="status"
      aria-label="Loading Studentkare workspace"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#070614',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Manrope, sans-serif',
        animation: 'skFadeIn 300ms ease-out',
      }}
    >
      <style>{`
        @keyframes skFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes skShieldPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 35px rgba(168, 85, 247, 0.65)) drop-shadow(0 0 75px rgba(124, 58, 237, 0.45));
          }
          50% {
            transform: scale(1.07);
            filter: drop-shadow(0 0 55px rgba(192, 132, 252, 0.85)) drop-shadow(0 0 100px rgba(168, 85, 247, 0.6));
          }
        }
        @keyframes skGlowRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {/* Official StudentKare Shield Logo with Glow */}
        <div
          style={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 28,
          }}
        >
          {/* Animated Background Glow Aura */}
          <div
            style={{
              position: 'absolute',
              inset: -30,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(124, 58, 237, 0.15) 70%, transparent 100%)',
              filter: 'blur(25px)',
              animation: 'skGlowRotate 8s linear infinite',
            }}
          />

          {/* Official StudentKare Shield Logo */}
          <div
            style={{
              position: 'relative',
              animation: 'skShieldPulse 2.4s ease-in-out infinite',
            }}
          >
            <StudentKareShield size={110} id="loader_sk_official" />
          </div>
        </div>

        {/* Hashtag Title */}
        <h2
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: '#c084fc',
            letterSpacing: -0.8,
            margin: '0 0 8px 0',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          #studentkare
        </h2>

        {/* Updated Tagline */}
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.75)',
            margin: '0 0 32px 0',
            fontWeight: 500,
          }}
        >
          Built with love for student health care <span style={{ color: '#a855f7' }}>💜</span> across whole campus
        </p>

        {/* 7-Second Progress Bar */}
        <div
          style={{
            width: 230,
            height: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 999,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #c084fc 0%, #a855f7 50%, #6366f1 100%)',
              borderRadius: 999,
              transition: 'width 40ms linear',
              boxShadow: '0 0 14px #c084fc',
            }}
          />
        </div>
      </div>
    </div>
  );
}
