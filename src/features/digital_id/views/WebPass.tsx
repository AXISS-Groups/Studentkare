import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import './web-pass.css';

export interface RecentCheckinItem {
  id: string;
  initials: string;
  provider: string;
  details: string;
  status: string;
  isReported: boolean;
}

const INITIAL_CHECKINS: RecentCheckinItem[] = [
  {
    id: 'chk-1',
    initials: 'MP',
    provider: 'MedPlus · Bachupally',
    details: 'Pharmacy handover · Today 4:12 pm',
    status: 'Photo matched · order SK-48120',
    isReported: false,
  },
  {
    id: 'chk-2',
    initials: 'VD',
    provider: 'Vijaya Diagnostics',
    details: 'Sample collection at Block B · Tue 7:10 am',
    status: 'Photo matched · tube LB-77420',
    isReported: false,
  },
  {
    id: 'chk-3',
    initials: 'CC',
    provider: 'Campus clinic · Dr. S. Menon',
    details: 'In-person consult · Mon 11:02 am',
    status: 'Photo matched · reception',
    isReported: false,
  },
];

export function generateQrCells(seed: number, size = 25): boolean[] {
  let x = (seed * 2654435761) >>> 0;
  const rnd = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };

  const finder = (r: number, c: number): number => {
    const f = [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ];
    for (let i = 0; i < 3; i++) {
      const dr = r - f[i][0];
      const dc = c - f[i][1];
      if (dr >= 0 && dr < 7 && dc >= 0 && dc < 7) {
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        return isBorder || isCore ? 1 : 0;
      }
      if (dr >= -1 && dr < 8 && dc >= -1 && dc < 8) {
        return 0;
      }
    }
    return -1;
  };

  const cells: boolean[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const f = finder(r, c);
      const isDark = f === -1 ? rnd() > 0.52 : f === 1;
      cells.push(isDark);
    }
  }
  return cells;
}

export function generateBackupCode(seed: number): string {
  const num = 100000 + Math.floor((seed * 7919) % 900000);
  return String(num).replace(/(\d{3})(\d{3})/, '$1 $2');
}

export interface WebPassProps {
  initialSeed?: number;
  initialCheckins?: RecentCheckinItem[];
  onDisputeReported?: (itemId: string) => void;
}

export function WebPass({
  initialSeed = 7,
  initialCheckins = INITIAL_CHECKINS,
  onDisputeReported,
}: WebPassProps): React.ReactElement {
  const { user } = useAuth();

  const [seed, setSeed] = useState<number>(initialSeed);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [history, setHistory] = useState<RecentCheckinItem[]>(initialCheckins);
  const [activeDisputeItem, setActiveDisputeItem] = useState<RecentCheckinItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // 30-Second Automatic Rotation Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setSeed((s) => s + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const qrCells = generateQrCells(seed);
  const backupCode = generateBackupCode(seed);

  const studentName = user?.fullName || 'Krishna C.';
  const initials = studentName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const studentMeta = user?.university ? `${user.university} · Roll ${user.rollNumber || '22071A05••'}` : 'VNR VJIET · Roll 22071A05••';

  // Progress ring offset (Circumference of r=18 is ~113.097)
  const ringCircumference = 113.1;
  const progressRatio = (30 - secondsLeft) / 30;
  const strokeOffset = ringCircumference * progressRatio;

  const handleOpenDispute = (item: RecentCheckinItem) => {
    if (!item.isReported) {
      setActiveDisputeItem(item);
    }
  };

  const handleCloseDispute = () => {
    setActiveDisputeItem(null);
  };

  const handleConfirmDispute = () => {
    if (!activeDisputeItem) return;

    // Mark as reported
    const updated = history.map((h) =>
      h.id === activeDisputeItem.id
        ? { ...h, isReported: true, status: 'Reported — support will call you' }
        : h
    );
    setHistory(updated);

    // Immediately rotate pass and reset 30s timer
    setSeed((s) => s + 101);
    setSecondsLeft(30);

    const disputedId = activeDisputeItem.id;
    setActiveDisputeItem(null);
    showToast('Reported · new pass issued · support will call within 2 h');
    onDisputeReported?.(disputedId);
  };

  return (
    <div className="web-pass-container" role="region" aria-label="My check-in pass">
      {toastMessage && (
        <div className="web-pass-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="web-pass-layout">
        {/* Left Column: Rotating Pass Card */}
        <section className="web-pass-card" aria-label="Dynamic check-in QR pass">
          {/* User Header */}
          <div className="web-pass-user-row">
            <div className="web-pass-avatar" aria-hidden="true">
              <div className="web-pass-avatar-inner">{initials}</div>
              <div className="web-pass-verified-badge">
                <Check size={12} color="#FFFFFF" strokeWidth={3.5} />
              </div>
            </div>

            <div className="web-pass-user-info">
              <span className="web-pass-user-name">{studentName}</span>
              <span className="web-pass-user-sub">{studentMeta}</span>
              <span className="web-pass-user-verified">✓ Identity verified · 4 of 4</span>
            </div>
          </div>

          {/* Scannable 25x25 QR Matrix */}
          <div
            className="web-pass-qr-box"
            role="img"
            aria-label="Your check-in QR code. It changes every 30 seconds."
          >
            <div className="web-pass-qr-grid" data-seed={seed}>
              {qrCells.map((isDark, idx) => (
                <div
                  key={idx}
                  className={`web-pass-qr-cell ${isDark ? 'is-dark' : ''}`}
                />
              ))}
            </div>

            <div className="web-pass-qr-center-badge" aria-hidden="true">
              <div className="web-pass-qr-center-inner">SK</div>
            </div>
          </div>

          {/* 30-Second Rotation Progress & Code Bar */}
          <div className="web-pass-timer-bar">
            <div className="web-pass-timer-left">
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="18" fill="none" stroke="#DAE2FD" strokeWidth="3" />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="#3525CD"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                  style={{
                    strokeDasharray: ringCircumference,
                    strokeDashoffset: strokeOffset,
                    transition: 'stroke-dashoffset 0.9s linear',
                  }}
                />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#6B6980' }}>
                  REFRESHES IN
                </span>
                <span
                  style={{
                    fontFamily: 'var(--sk-font-mono, monospace)',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#131B2E',
                  }}
                >
                  {secondsLeft}s
                </span>
              </div>
            </div>

            <div className="web-pass-timer-code">
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#6B6980' }}>
                OR SAY THIS CODE
              </span>
              <span className="web-pass-code-val" aria-label={`Check-in verbal code: ${backupCode}`}>
                {backupCode}
              </span>
            </div>
          </div>

          <p className="web-pass-instructions">
            Showing it from a laptop works at reception desks. At a pharmacy counter or hostel visit, use the pass on your phone.
          </p>
        </section>

        {/* Right Column: Information & Recent Check-ins */}
        <div className="web-pass-details-col">
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#131B2E', letterSpacing: -0.7 }}>
              My check-in pass
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
              Pharmacies, labs, the campus clinic and the mobile clinic scan this, then take a quick photo to match your face. It changes every 30 seconds, so a screenshot is useless to anyone else.
            </p>
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.1, color: '#464555', textTransform: 'uppercase' }}>
              RECENT CHECK-INS
            </span>
          </div>

          <div className="web-pass-history-list" role="feed" aria-label="Recent check-in events">
            {history.map((item) => (
              <article
                key={item.id}
                className={`web-pass-history-item ${item.isReported ? 'is-reported' : ''}`}
                aria-label={`Check-in at ${item.provider}`}
              >
                <div className="web-pass-history-icon" aria-hidden="true">
                  {item.initials}
                </div>

                <div className="web-pass-history-info">
                  <span className="web-pass-history-provider">{item.provider}</span>
                  <span className="web-pass-history-meta">{item.details}</span>
                  <span
                    className="web-pass-history-status"
                    style={{ color: item.isReported ? '#BE123C' : '#047857' }}
                  >
                    {item.status}
                  </span>
                </div>

                <button
                  type="button"
                  className="web-pass-report-btn"
                  disabled={item.isReported}
                  onClick={() => handleOpenDispute(item)}
                  aria-label={item.isReported ? `Reported check-in for ${item.provider}` : `Report unauthorized check-in for ${item.provider}`}
                >
                  {item.isReported ? 'Reported' : 'This wasn’t me'}
                </button>
              </article>
            ))}
          </div>

          {/* Security Principles 3-Cards */}
          <div className="web-pass-security-grid">
            <div className="web-pass-security-tile">
              <strong>Scanned</strong>
              Pass signature and time checked. Works offline.
            </div>
            <div className="web-pass-security-tile">
              <strong>Photo matched</strong>
              Staff compare a live photo with yours. Deleted after 24 h.
            </div>
            <div className="web-pass-security-tile">
              <strong>Visit only</strong>
              They see what this visit needs, and only until it ends.
            </div>
          </div>
        </div>
      </div>

      {/* "This wasn't me" Dispute Confirmation Alert Dialog */}
      {activeDisputeItem && (
        <div className="web-pass-dialog-scrim" onClick={handleCloseDispute}>
          <div
            className="web-pass-dialog-box"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dispute-dialog-title"
            aria-describedby="dispute-dialog-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                background: '#FFF1F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
              }}
              aria-hidden="true"
            >
              <AlertTriangle size={28} color="#E11D48" />
            </div>

            <h2
              id="dispute-dialog-title"
              style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#131B2E', textAlign: 'center' }}
            >
              Report “{activeDisputeItem.provider}”?
            </h2>

            <p
              id="dispute-dialog-desc"
              style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, fontWeight: 500, color: '#464555', textAlign: 'center' }}
            >
              We’ll pause check-ins with your pass, tell the provider, and a support person will call you within 2 hours. Anything collected in that visit is held until it’s sorted.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="health-button"
                onClick={handleCloseDispute}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  border: '1.5px solid #3525CD',
                  background: '#FFFFFF',
                  color: '#3525CD',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
                aria-label="Cancel dispute report"
              >
                Cancel
              </button>

              <button
                type="button"
                className="health-button"
                onClick={handleConfirmDispute}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
                aria-label="Confirm this check-in was not me"
              >
                This wasn’t me
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
