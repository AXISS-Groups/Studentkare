import React, { useEffect, useState } from 'react';

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
            box-shadow: 0 0 50px rgba(168, 85, 247, 0.5), 0 0 100px rgba(147, 51, 234, 0.3);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 80px rgba(192, 132, 252, 0.75), 0 0 140px rgba(168, 85, 247, 0.5);
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
        {/* Glowing Shield Badge */}
        <div
          style={{
            position: 'relative',
            width: 120,
            height: 120,
            display: 'grid',
            placeItems: 'center',
            marginBottom: 32,
          }}
        >
          {/* Animated Background Aura */}
          <div
            style={{
              position: 'absolute',
              inset: -20,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(124, 58, 237, 0.1) 70%, transparent 100%)',
              filter: 'blur(20px)',
              animation: 'skGlowRotate 8s linear infinite',
            }}
          />

          {/* Shield Badge Container */}
          <div
            style={{
              position: 'relative',
              width: 90,
              height: 100,
              borderRadius: '24px 24px 44px 44px',
              background: 'linear-gradient(145deg, #a855f7 0%, #6366f1 60%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'skShieldPulse 2.4s ease-in-out infinite',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 12px 36px rgba(124, 58, 237, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
            }}
          >
            <span
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: -1,
                fontFamily: 'Outfit, sans-serif',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              }}
            >
              SK
            </span>
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

        {/* Subtext */}
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.7)',
            margin: '0 0 32px 0',
            fontWeight: 500,
          }}
        >
          Built with love for student health <span style={{ color: '#a855f7' }}>💜</span> across all campuses
        </p>

        {/* 7-Second Progress Bar */}
        <div
          style={{
            width: 220,
            height: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
              transition: 'width 50ms linear',
              boxShadow: '0 0 12px #c084fc',
            }}
          />
        </div>
      </div>
    </div>
  );
}
