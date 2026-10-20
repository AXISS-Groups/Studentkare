import React from 'react';

interface GraphicProps {
  isDark?: boolean;
}

export const ConnectedHardwareGraphic: React.FC<GraphicProps> = ({ isDark = true }) => {
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
          {/* Background Gradient */}
          <linearGradient id="chBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sk-color-illustration-ink)" />
            <stop offset="50%" stopColor={isDark ? 'var(--sk-color-illustration-ink)' : 'var(--sk-color-illustration-indigo-deep)'} />
            <stop offset="100%" stopColor="var(--sk-color-illustration-ink)" />
          </linearGradient>

          {/* Scale Gradients */}
          <linearGradient id="chScaleGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sk-color-illustration-mint)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--sk-color-illustration-sky)" stopOpacity="0.05" />
          </linearGradient>

          {/* BP Monitor Console Gradients */}
          <linearGradient id="chBpConsoleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--sk-color-illustration-ink)" />
            <stop offset="100%" stopColor="var(--sk-color-illustration-ink)" />
          </linearGradient>

          <linearGradient id="chScreenBezel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--sk-color-illustration-ink)" />
            <stop offset="100%" stopColor="var(--sk-color-illustration-ink)" />
          </linearGradient>

          {/* Smart Card Gradient */}
          <linearGradient id="chCardBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sk-color-illustration-ink)" stopOpacity="0.92" />
            <stop offset="100%" stopColor="var(--sk-color-illustration-ink)" stopOpacity="0.96" />
          </linearGradient>

          <linearGradient id="chGoldChip" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sk-color-illustration-gold-soft)" />
            <stop offset="50%" stopColor="var(--sk-color-illustration-gold)" />
            <stop offset="100%" stopColor="var(--sk-color-illustration-gold-deep)" />
          </linearGradient>

          {/* Glow & Shadow Filters */}
          <filter id="chGlowMint" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="chGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="chHwShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="var(--sk-color-illustration-ink)" floodOpacity="0.6" />
          </filter>

          {/* Patterns */}
          <pattern id="chGridDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--sk-color-illustration-mint)" fillOpacity="0.06" />
          </pattern>
        </defs>

        {/* Outer Blueprint Housing Frame */}
        <rect
          x="0"
          y="0"
          width="580"
          height="340"
          rx="24"
          fill="url(#chBgGrad)"
          stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.3"
          strokeWidth="1.5"
        />

        {/* Subtle Grid Dots Pattern */}
        <rect x="1" y="1" width="578" height="338" rx="23" fill="url(#chGridDots)" />

        {/* Ambient Concentric Radar Rings in Background */}
        <g opacity="0.35">
          <circle cx="340" cy="170" r="140" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="340" cy="170" r="80" stroke="var(--sk-color-illustration-sky)" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="2 6" />
          <line x1="20" y1="170" x2="560" y2="170" stroke="var(--sk-color-on-hero)" strokeOpacity="0.03" strokeWidth="1" />
          <line x1="340" y1="20" x2="340" y2="320" stroke="var(--sk-color-on-hero)" strokeOpacity="0.03" strokeWidth="1" />
        </g>

        {/* Top Status Badge */}
        <g transform="translate(24, 20)">
          <rect x="0" y="0" width="192" height="22" rx="11" fill="var(--sk-color-illustration-mint)" fillOpacity="0.12" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.35" strokeWidth="1" />
          <circle cx="12" cy="11" r="3.5" fill="var(--sk-color-illustration-mint)" style={{ animation: 'sk-ppg-glow 2s infinite' }} filter="url(#chGlowMint)" />
          <text x="24" y="15" fill="var(--sk-color-illustration-mint)" fontSize="9" fontWeight="700" fontFamily="monospace" letterSpacing="0.5">
            CAMPUS CLINIC KIT · ZERO-CONF
          </text>

          <rect x="424" y="0" width="132" height="22" rx="11" fill="var(--sk-color-illustration-sky)" fillOpacity="0.12" stroke="var(--sk-color-illustration-sky)" strokeOpacity="0.3" strokeWidth="1" />
          <text x="490" y="15" fill="var(--sk-color-illustration-sky)" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="monospace">
            ISO / CE CERTIFIED
          </text>
        </g>

        {/* ================= 1. CONNECTING SILICONE / OPTICAL STREAM ================= */}
        <path
          d="M 175 140 C 205 140, 215 220, 260 220"
          stroke="var(--sk-color-illustration-mint)"
          strokeWidth="2.4"
          fill="none"
          strokeDasharray="8 6"
          style={{ animation: 'sk-cable-flow 3s linear infinite' }}
          filter="url(#chGlowMint)"
          opacity="0.85"
        />
        <path
          d="M 440 90 C 420 120, 410 140, 440 170"
          stroke="var(--sk-color-illustration-sky)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="8 6"
          style={{ animation: 'sk-cable-flow 3.5s linear infinite' }}
          filter="url(#chGlowCyan)"
          opacity="0.75"
        />

        {/* ================= 2. SMART WEIGHT SCALE (LEFT) ================= */}
        <g transform="translate(30, 56)" filter="url(#chHwShadow)">
          <rect x="0" y="0" width="168" height="175" rx="20" fill="url(#chScaleGlass)" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.8" />
          <rect x="5" y="5" width="158" height="165" rx="16" fill="var(--sk-color-illustration-ink)" fillOpacity="0.85" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.25" strokeWidth="1" />

          {/* 4 Corner Precision Electrodes */}
          <circle cx="24" cy="24" r="9" fill="var(--sk-color-illustration-mint)" fillOpacity="0.15" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" />
          <circle cx="144" cy="24" r="9" fill="var(--sk-color-illustration-mint)" fillOpacity="0.15" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" />
          <circle cx="24" cy="151" r="9" fill="var(--sk-color-illustration-mint)" fillOpacity="0.15" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" />
          <circle cx="144" cy="151" r="9" fill="var(--sk-color-illustration-mint)" fillOpacity="0.15" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" />

          {/* Scale Top LCD Bezel */}
          <rect x="34" y="24" width="100" height="42" rx="10" fill="var(--sk-color-illustration-ink)" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.2" />
          <text x="76" y="52" fill="var(--sk-color-illustration-mint)" fontSize="19" fontWeight="800" textAnchor="middle" fontFamily="monospace" filter="url(#chGlowMint)">
            64.20
          </text>
          <text x="115" y="52" fill="var(--sk-color-illustration-mint)" fontSize="8" fontWeight="800" fontFamily="monospace">
            KG
          </text>

          {/* Bluetooth Sync Ring */}
          <g transform="translate(84, 100)">
            <circle cx="0" cy="0" r="14" fill="var(--sk-color-illustration-mint)" fillOpacity="0.1" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx="0" cy="0" r="6" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" fill="none" style={{ animation: 'sk-ppg-glow 2.4s ease-out infinite' }} />
            <path d="M -3 -5 L 3 0 L -1 3 L 3 6 L -3 11 V -5 Z" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.2" strokeLinejoin="round" fill="none" transform="translate(-1, -3) scale(0.8)" />
          </g>

          <text x="84" y="132" fill="var(--sk-color-on-hero-label)" fontSize="9" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
            BIO-IMPEDANCE
          </text>
          <text x="84" y="146" fill="var(--sk-color-illustration-mint)" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="monospace">
            BMI · BODY FAT · BMR
          </text>
        </g>

        {/* ================= 3. DIGITAL BP MONITOR CONSOLE (CENTER-RIGHT) ================= */}
        <g transform="translate(225, 60)" filter="url(#chHwShadow)">
          <rect x="0" y="0" width="205" height="175" rx="20" fill="url(#chBpConsoleGrad)" stroke="var(--sk-color-illustration-sky)" strokeWidth="1.8" />

          <rect x="14" y="14" width="177" height="96" rx="12" fill="url(#chScreenBezel)" stroke="var(--sk-color-illustration-sky)" strokeOpacity="0.35" strokeWidth="1" />

          <text x="24" y="30" fill="var(--sk-color-on-hero-label)" fontSize="8" fontWeight="700" fontFamily="monospace">
            SYS / DIA  mmHg
          </text>
          <text x="175" y="30" fill="var(--sk-color-illustration-mint)" fontSize="8" fontWeight="800" textAnchor="end" fontFamily="monospace">
            ● SYNCED
          </text>

          <text x="102" y="68" fill="var(--sk-color-illustration-sky)" fontSize="30" fontWeight="800" textAnchor="middle" fontFamily="monospace" filter="url(#chGlowCyan)">
            118 / 76
          </text>

          <g transform="translate(24, 82)">
            <path d="M 0 10 L 4 10 L 7 2 L 11 16 L 14 6 L 17 10 L 22 10" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.2" fill="none" />
            <text x="26" y="12" fill="var(--sk-color-illustration-mint)" fontSize="10" fontWeight="800" fontFamily="monospace">
              72
            </text>
            <text x="44" y="12" fill="var(--sk-color-on-hero-label)" fontSize="8" fontWeight="600">
              BPM
            </text>

            <text x="100" y="12" fill="var(--sk-color-on-hero-2)" fontSize="9" fontWeight="700" fontFamily="monospace">
              MAP: 90
            </text>
            <text x="150" y="12" fill="var(--sk-color-illustration-sky)" fontSize="8" fontWeight="700" textAnchor="end">
              NORMAL
            </text>
          </g>

          <g transform="translate(24, 122)">
            <rect x="0" y="0" width="72" height="34" rx="8" fill="var(--sk-color-illustration-sky)" fillOpacity="0.16" stroke="var(--sk-color-illustration-sky)" strokeWidth="1.4" />
            <text x="36" y="21" fill="var(--sk-color-illustration-sky)" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
              START
            </text>

            <rect x="85" y="0" width="72" height="34" rx="8" fill="var(--sk-color-illustration-mint)" fillOpacity="0.14" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.4" />
            <text x="121" y="21" fill="var(--sk-color-illustration-mint)" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
              MEMORY
            </text>
          </g>

          <circle cx="0" cy="85" r="5" fill="var(--sk-color-illustration-ink)" stroke="var(--sk-color-illustration-sky)" strokeWidth="1.5" />
          <circle cx="0" cy="85" r="2.5" fill="var(--sk-color-illustration-mint)" />
        </g>

        {/* ================= 4. CLINICAL INFRARED THERMOMETER (TOP RIGHT) ================= */}
        <g transform="translate(456, 56)" filter="url(#chHwShadow)">
          <rect x="0" y="0" width="94" height="175" rx="16" fill="url(#chBpConsoleGrad)" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.4" strokeWidth="1.5" />

          <path d="M 32 0 L 32 -10 Q 47 -14 62 -10 L 62 0 Z" fill="var(--sk-color-illustration-mint)" fillOpacity="0.2" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.2" />
          <circle cx="47" cy="-6" r="3" fill="var(--sk-color-illustration-rose-deep)" filter="url(#chGlowMint)" />

          <rect x="12" y="22" width="70" height="46" rx="8" fill="var(--sk-color-illustration-ink)" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" />
          <text x="47" y="47" fill="var(--sk-color-illustration-mint)" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="monospace" filter="url(#chGlowMint)">
            98.4°F
          </text>
          <text x="47" y="60" fill="var(--sk-color-on-hero-2)" fontSize="7" fontWeight="700" textAnchor="middle">
            BODY TEMP
          </text>

          <circle cx="47" cy="86" r="8" fill="var(--sk-color-illustration-sky)" fillOpacity="0.15" stroke="var(--sk-color-illustration-sky)" strokeWidth="1" />
          <path d="M 44 86 H 50 M 47 83 V 89" stroke="var(--sk-color-illustration-sky)" strokeWidth="1" />

          <line x1="24" y1="116" x2="70" y2="116" stroke="var(--sk-color-on-hero)" strokeOpacity="0.1" strokeWidth="1.5" />
          <line x1="24" y1="126" x2="70" y2="126" stroke="var(--sk-color-on-hero)" strokeOpacity="0.1" strokeWidth="1.5" />
          <line x1="24" y1="136" x2="70" y2="136" stroke="var(--sk-color-on-hero)" strokeOpacity="0.1" strokeWidth="1.5" />

          <text x="47" y="158" fill="var(--sk-color-on-hero-label)" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="monospace">
            1-SEC SCAN
          </text>
        </g>

        {/* ================= 5. SMART STUDENT HEALTH PASS NFC CARD (BOTTOM LEFT) ================= */}
        <g transform="translate(30, 248)" filter="url(#chHwShadow)">
          <rect x="0" y="0" width="220" height="74" rx="14" fill="url(#chCardBgGrad)" stroke="var(--sk-color-on-hero-label)" strokeOpacity="0.4" strokeWidth="1.2" />

          <rect x="14" y="14" width="26" height="20" rx="4" fill="url(#chGoldChip)" stroke="var(--sk-color-illustration-gold-deep)" strokeWidth="0.8" />
          <line x1="14" y1="24" x2="40" y2="24" stroke="var(--sk-color-illustration-ink)" strokeOpacity="0.25" strokeWidth="0.8" />
          <line x1="27" y1="14" x2="27" y2="34" stroke="var(--sk-color-illustration-ink)" strokeOpacity="0.25" strokeWidth="0.8" />

          <text x="48" y="24" fill="var(--sk-color-on-hero)" fontSize="11" fontWeight="800" letterSpacing="0.5">
            SA CARE PASS
          </text>
          <text x="48" y="35" fill="var(--sk-color-on-hero-label)" fontSize="8" fontWeight="600" fontFamily="monospace">
            NFC / RFID SECURE
          </text>

          <g transform="translate(14, 46)">
            <rect x="0" y="0" width="90" height="18" rx="5" fill="var(--sk-color-illustration-sky)" fillOpacity="0.12" stroke="var(--sk-color-illustration-sky)" strokeOpacity="0.25" strokeWidth="0.8" />
            <text x="45" y="12" fill="var(--sk-color-illustration-sky)" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              VAULT LINKED
            </text>

            <rect x="96" y="0" width="94" height="18" rx="5" fill="var(--sk-color-illustration-mint)" fillOpacity="0.12" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.3" strokeWidth="0.8" />
            <circle cx="104" cy="9" r="2.5" fill="var(--sk-color-illustration-mint)" />
            <text x="148" y="12" fill="var(--sk-color-illustration-mint)" fontSize="8" fontWeight="800" textAnchor="middle">
              108 ACTIVE
            </text>
          </g>
        </g>

        {/* Bottom Right Telemetry Auto-Pairing Indicator */}
        <g transform="translate(270, 260)">
          <rect x="0" y="0" width="280" height="52" rx="12" fill="var(--sk-color-illustration-ink)" fillOpacity="0.8" stroke="var(--sk-color-illustration-mint)" strokeOpacity="0.25" strokeWidth="1" />

          <g transform="translate(14, 14)">
            <circle cx="12" cy="12" r="10" fill="var(--sk-color-illustration-mint)" fillOpacity="0.15" stroke="var(--sk-color-illustration-mint)" strokeWidth="1" />
            <path d="M 8 12 L 11 15 L 17 9" stroke="var(--sk-color-illustration-mint)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>

          <text x="48" y="24" fill="var(--sk-color-on-hero)" fontSize="11" fontWeight="800">
            Auto-Calibration & Campus Sync
          </text>
          <text x="48" y="38" fill="var(--sk-color-on-hero-label)" fontSize="9" fontWeight="600">
            Zero-config BLE gateway · Direct encrypted FHIR push
          </text>
        </g>
      </svg>
    </div>
  );
};
