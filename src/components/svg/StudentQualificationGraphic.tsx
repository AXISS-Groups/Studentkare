import React from 'react';

interface GraphicProps {
  isDark?: boolean;
}

export const StudentQualificationGraphic: React.FC<GraphicProps> = ({ isDark = true }) => {
  return (
    <div style={{ width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
      <svg
        viewBox="0 0 580 340"
        width="100%"
        height="100%"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="sqBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#0b0d30' : '#14144e'} />
            <stop offset="50%" stopColor={isDark ? '#111344' : '#1c1c63'} />
            <stop offset="100%" stopColor={isDark ? '#070924' : '#0e0f35'} />
          </linearGradient>

          <linearGradient id="sqCardArjun" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 177, 255, 0.18)" />
            <stop offset="70%" stopColor="rgba(0, 177, 255, 0.08)" />
            <stop offset="100%" stopColor="rgba(14, 165, 233, 0.20)" />
          </linearGradient>

          <linearGradient id="sqCardPriya" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 255, 170, 0.14)" />
            <stop offset="60%" stopColor="rgba(0, 177, 255, 0.08)" />
            <stop offset="100%" stopColor="rgba(177, 166, 246, 0.18)" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="sqGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sqGlowMint" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sqCardShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* Pattern */}
          <pattern id="sqGridDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(255, 255, 255, 0.06)" />
          </pattern>
        </defs>

        {/* Outer Blueprint Card */}
        <rect
          x="0"
          y="0"
          width="580"
          height="340"
          rx="24"
          fill="url(#sqBgGrad)"
          stroke="rgba(0, 177, 255, 0.35)"
          strokeWidth="1.5"
        />

        {/* Subtle Grid Dots Pattern */}
        <rect x="1" y="1" width="578" height="338" rx="23" fill="url(#sqGridDots)" />

        {/* Blueprint Circuit Background Lines */}
        <g opacity="0.4">
          <line x1="20" y1="56" x2="560" y2="56" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
          <line x1="20" y1="160" x2="560" y2="160" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
          <line x1="20" y1="264" x2="560" y2="264" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />

          {/* Architectural Corner Crosshairs */}
          <path d="M 16 28 H 28 M 22 22 V 34" stroke="#00b1ff" strokeWidth="1" opacity="0.6" />
          <path d="M 552 28 H 564 M 558 22 V 34" stroke="#00b1ff" strokeWidth="1" opacity="0.6" />
          <path d="M 16 312 H 28 M 22 306 V 318" stroke="#00b1ff" strokeWidth="1" opacity="0.6" />
          <path d="M 552 312 H 564 M 558 306 V 318" stroke="#00b1ff" strokeWidth="1" opacity="0.6" />
        </g>

        {/* Top Status & Gateway Sync Header */}
        <g transform="translate(24, 20)">
          {/* Server Status Chip */}
          <rect x="0" y="0" width="176" height="22" rx="11" fill="rgba(0, 177, 255, 0.12)" stroke="rgba(0, 177, 255, 0.35)" strokeWidth="1" />
          <circle cx="12" cy="11" r="3.5" fill="#00ffaa" style={{ animation: 'sk-ppg-glow 2s infinite' }} filter="url(#sqGlowMint)" />
          <text x="24" y="15" fill="#00ffaa" fontSize="9" fontWeight="700" fontFamily="monospace" letterSpacing="0.5">
            ABHA V3 · DIRECTORY SYNC
          </text>

          {/* FHIR Protocol Pill */}
          <rect x="416" y="0" width="116" height="22" rx="11" fill="rgba(177, 166, 246, 0.12)" stroke="rgba(177, 166, 246, 0.3)" strokeWidth="1" />
          <text x="474" y="15" fill="#b1a6f6" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="monospace">
            FHIR R4 SCHEMA
          </text>
        </g>

        {/* Background Ghost Directory Header */}
        <g transform="translate(24, 52)" opacity="0.35">
          <circle cx="8" cy="8" r="4" fill="#ffffff" />
          <rect x="22" y="5" width="70" height="6" rx="3" fill="#ffffff" />
          <rect x="104" y="5" width="110" height="6" rx="3" fill="#ffffff" />
          <rect x="226" y="5" width="55" height="6" rx="3" fill="#ffffff" />
          <rect x="420" y="5" width="90" height="6" rx="3" fill="#ffffff" />
        </g>

        {/* ================= CARD 1: ARJUN MEHTA ================= */}
        <g transform="translate(24, 72)" filter="url(#sqCardShadow)">
          <rect
            x="0"
            y="0"
            width="532"
            height="88"
            rx="16"
            fill="url(#sqCardArjun)"
            stroke="#00b1ff"
            strokeWidth="1.4"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0, 177, 255, 0.2))' }}
          />

          {/* Left Document/Check Badge */}
          <g transform="translate(16, 22)">
            <rect x="0" y="0" width="44" height="44" rx="12" fill="rgba(0, 177, 255, 0.22)" stroke="rgba(0, 177, 255, 0.5)" strokeWidth="1.2" />
            <path d="M16 14h10l6 6v14a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z" stroke="#00b1ff" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
            <path d="M26 14v6h6" stroke="#00b1ff" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
            <path d="M19 26l3 3 6-6" stroke="#00ffaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>

          {/* Student Name & Roll Details */}
          <g transform="translate(72, 26)">
            <text x="0" y="16" fill="#ffffff" fontSize="16" fontWeight="800" letterSpacing="-0.3">
              Arjun Mehta
            </text>
            <text x="0" y="34" fill="#b1a6f6" fontSize="11" fontWeight="600" fontFamily="monospace">
              Roll #22045 · CSE 3rd Yr · O.U.
            </text>
          </g>

          {/* Center Mini Oscilloscope / ECG */}
          <g transform="translate(258, 20)">
            <rect x="0" y="0" width="118" height="48" rx="8" fill="rgba(2, 6, 28, 0.6)" stroke="rgba(0, 177, 255, 0.25)" strokeWidth="1" />
            <line x1="0" y1="24" x2="118" y2="24" stroke="rgba(0, 177, 255, 0.18)" strokeWidth="0.8" strokeDasharray="2 2" />
            <path
              d="M 4 24 H 28 L 34 10 L 42 38 L 48 16 L 54 28 L 60 24 H 114"
              stroke="#00b1ff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="200"
              style={{ animation: 'sk-cable-flow 3s linear infinite' }}
            />
          </g>

          {/* Right Vitals Status */}
          <g transform="translate(390, 26)">
            <text x="75" y="16" fill="#00ffaa" fontSize="13" fontWeight="800" textAnchor="end">
              Normal Sinus
            </text>
            <text x="75" y="34" fill="#cbd5e1" fontSize="11" fontWeight="600" textAnchor="end" fontFamily="monospace">
              BP 118 / 76 mmHg
            </text>
          </g>

          {/* Verified Student Avatar Badge */}
          <g transform="translate(475, 18)">
            <circle cx="26" cy="26" r="22" fill="rgba(0, 177, 255, 0.15)" stroke="rgba(0, 177, 255, 0.5)" strokeWidth="1.5" />
            <circle cx="26" cy="20" r="8" fill="none" stroke="#00b1ff" strokeWidth="1.5" />
            <circle cx="23" cy="20" r="3" fill="none" stroke="#00b1ff" strokeWidth="1" />
            <circle cx="29" cy="20" r="3" fill="none" stroke="#00b1ff" strokeWidth="1" />
            <line x1="26" y1="20" x2="26" y2="20" stroke="#00b1ff" strokeWidth="1" />
            <path d="M 16 38 Q 26 30 36 38" fill="none" stroke="#00b1ff" strokeWidth="1.5" />
            <circle cx="42" cy="12" r="4" fill="#00ffaa" style={{ animation: 'sk-ppg-glow 2s infinite' }} filter="url(#sqGlowMint)" />
          </g>
        </g>

        {/* Mid-Section Pipeline Connector Bus */}
        <g transform="translate(24, 168)">
          <line x1="38" y1="0" x2="38" y2="16" stroke="#00b1ff" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
          <circle cx="38" cy="8" r="2" fill="#00b1ff" />
          <line x1="490" y1="0" x2="490" y2="16" stroke="#00ffaa" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
          <circle cx="490" cy="8" r="2" fill="#00ffaa" />
        </g>

        {/* ================= CARD 2: PRIYA SHARMA ================= */}
        <g transform="translate(24, 186)" filter="url(#sqCardShadow)">
          <rect
            x="0"
            y="0"
            width="532"
            height="88"
            rx="16"
            fill="url(#sqCardPriya)"
            stroke="rgba(0, 255, 170, 0.45)"
            strokeWidth="1.4"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0, 255, 170, 0.18))' }}
          />

          {/* Left Student Avatar Badge */}
          <g transform="translate(16, 20)">
            <circle cx="24" cy="24" r="22" fill="rgba(0, 255, 170, 0.16)" stroke="rgba(0, 255, 170, 0.5)" strokeWidth="1.5" />
            <path d="M 17 18 C 17 11 31 11 31 18 V 24 C 31 27 27 30 24 30 C 21 30 17 27 17 24 Z" fill="none" stroke="#00ffaa" strokeWidth="1.5" />
            <path d="M 12 40 C 14 32 34 32 36 40" fill="none" stroke="#00ffaa" strokeWidth="1.5" />
            <circle cx="38" cy="12" r="3.5" fill="#ffb020" />
          </g>

          {/* Student Name & Roll Details */}
          <g transform="translate(74, 26)">
            <text x="0" y="16" fill="#ffffff" fontSize="16" fontWeight="800" letterSpacing="-0.3">
              Priya Sharma
            </text>
            <text x="0" y="34" fill="#b1a6f6" fontSize="11" fontWeight="600" fontFamily="monospace">
              Roll #22189 · BioTech 2nd Yr
            </text>
          </g>

          {/* Center Mini Oscilloscope / Pulse */}
          <g transform="translate(258, 20)">
            <rect x="0" y="0" width="118" height="48" rx="8" fill="rgba(2, 6, 28, 0.6)" stroke="rgba(0, 255, 170, 0.25)" strokeWidth="1" />
            <line x1="0" y1="24" x2="118" y2="24" stroke="rgba(0, 255, 170, 0.18)" strokeWidth="0.8" strokeDasharray="2 2" />
            <path
              d="M 4 24 H 32 L 38 12 L 44 34 L 50 18 L 56 26 L 62 24 H 114"
              stroke="#00ffaa"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="200"
              style={{ animation: 'sk-cable-flow 3.4s linear infinite' }}
            />
          </g>

          {/* Right Flagged Metric Status */}
          <g transform="translate(390, 26)">
            <text x="125" y="16" fill="#ffb020" fontSize="13" fontWeight="800" textAnchor="end">
              Review: Ferritin
            </text>
            <text x="125" y="34" fill="#cbd5e1" fontSize="11" fontWeight="600" textAnchor="end" fontFamily="monospace">
              Hb 11.2 g/dL · Low
            </text>
          </g>
        </g>

        {/* Bottom Pipeline Qualification Flow Indicator */}
        <g transform="translate(30, 290)">
          {/* Stage 1 */}
          <circle cx="10" cy="14" r="5" fill="#00b1ff" />
          <text x="22" y="17" fill="#ffffff" fontSize="10" fontWeight="700">
            1. Student Onboarded
          </text>

          {/* Arrow 1 */}
          <line x1="140" y1="14" x2="175" y2="14" stroke="#00b1ff" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Stage 2 */}
          <circle cx="190" cy="14" r="5" fill="#00ffaa" />
          <text x="202" y="17" fill="#ffffff" fontSize="10" fontWeight="700">
            2. Baseline Vitals Synced
          </text>

          {/* Arrow 2 */}
          <line x1="335" y1="14" x2="370" y2="14" stroke="#00ffaa" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Stage 3 */}
          <circle cx="385" cy="14" r="5" fill="#b1a6f6" />
          <text x="397" y="17" fill="#ffffff" fontSize="10" fontWeight="700">
            3. Pass Issued
          </text>
        </g>
      </svg>
    </div>
  );
};
