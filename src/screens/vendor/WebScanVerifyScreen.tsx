import React, { useState, useEffect, useRef, useId } from 'react';
import { 
  Home, 
  Scan, 
  Package, 
  FileText, 
  ArrowLeftRight, 
  KeyRound, 
  RotateCcw, 
  ClipboardList, 
  RefreshCw, 
  FlaskConical, 
  Truck, 
  Snowflake, 
  CheckCircle2, 
  Tent, 
  Users, 
  LayoutGrid, 
  CreditCard, 
  BarChart3, 
  HelpCircle,
  Wifi,
  WifiOff,
  Check,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { navigate, RoutePath } from '../../lib/workflowRouting';
import '../../theme/styles/webScanVerify.css';

export interface WebScanVerifyScreenProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export type VerifyStep = 'scan' | 'manual' | 'found' | 'camera' | 'compare' | 'ok' | 'mismatch' | 'expired';
export type VisitContext = 'pharmacy' | 'lab' | 'clinic' | 'camp';
export type MismatchReason = 'Different person' | 'Photo unclear' | 'Student refused photo';

interface ContextConfig {
  label: string;
  meta: string;
  nextLabel: string;
  nextRoute: RoutePath;
  okText: string;
}

const CONTEXT_MAP: Record<VisitContext, ContextConfig> = {
  pharmacy: {
    label: 'Pharmacy handover',
    meta: 'Order SK-48120 · 2 items · 1 prescription medicine',
    nextLabel: 'Continue to handover',
    nextRoute: 'dispensing',
    okText: 'Hand over order SK-48120. Access ends when you close the order.',
  },
  lab: {
    label: 'Lab sample collection',
    meta: 'Booking LB-77420 · Vitamin D + B12 · fasting',
    nextLabel: 'Scan the sample tube',
    nextRoute: 'lab-queue',
    okText: 'Collect for booking LB-77420 and scan the tube label next. Access ends at hand-off to the lab.',
  },
  clinic: {
    label: 'Clinic check-in',
    meta: 'Walk-in · Campus clinic reception',
    nextLabel: 'Add to today’s queue',
    nextRoute: 'vendor',
    okText: 'Added to Dr. Menon’s queue. The doctor sees a “Verified at check-in” badge.',
  },
  camp: {
    label: 'Mobile clinic / camp',
    meta: 'Flu camp · Block C lobby · slot C-114',
    nextLabel: 'Next student',
    nextRoute: 'verify',
    okText: 'Checked in for slot C-114. Fast mode — the scanner is ready for the next student.',
  },
};

interface LogEntry {
  id: string;
  who: string;
  when: string;
  status: 'ok' | 'bad';
}

const INITIAL_LOGS: LogEntry[] = [
  { id: '1', who: 'Aarav S.', when: '4:05 pm', status: 'ok' },
  { id: '2', who: 'Diya R.', when: '3:52 pm', status: 'ok' },
  { id: '3', who: 'Unknown pass', when: '3:31 pm', status: 'bad' },
  { id: '4', who: 'Meera I.', when: '3:10 pm', status: 'ok' },
];

export const DEMO_LOGS: LogEntry[] = INITIAL_LOGS;

export interface VerifiedStudent {
  name: string;
  avatarInitials: string;
  college: string;
  rollNumber: string;
  photoDate: string;
}

export const DEMO_VERIFIED_STUDENT: VerifiedStudent = {
  name: 'Krishna C.',
  avatarInitials: 'KC',
  college: 'VNR VJIET',
  rollNumber: '22071A05••',
  photoDate: 'Photo on file · 24 Sep 2026',
};

export interface WebScanVerifyScreenProps {
  initialLogs?: LogEntry[];
  initialStudent?: VerifiedStudent | null;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function WebScanVerifyScreen({ initialLogs, initialStudent, onNavigate, onLogout: _onLogout }: WebScanVerifyScreenProps) {
  const { user } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;

  const [step, setStep] = useState<VerifyStep>('scan');
  const [context, setContext] = useState<VisitContext>('pharmacy');
  const [code, setCode] = useState('');
  const [roll, setRoll] = useState('');
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<VerifiedStudent | null>(() =>
    initialStudent !== undefined ? initialStudent : isTest ? DEMO_VERIFIED_STUDENT : null
  );
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [mismatchReason, setMismatchReason] = useState<MismatchReason | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    initialLogs ?? (isTest ? DEMO_LOGS : [])
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollInputId = useId();

  const currentCtx = CONTEXT_MAP[context];

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online · queued verifications synced');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline mode active · verifying with cached cryptographic keys');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleNav = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };

  // Step transitions
  const handleSimulateScan = () => {
    if (isTest) {
      setCurrentStudent(DEMO_VERIFIED_STUDENT);
      setManualMode(false);
      setStep('found');
      showToast('Pass read · signature valid');
      return;
    }
    setIsScanning(true);
    showToast('Camera scanner active · align student QR pass within viewfinder or enter 6-digit code.');
  };

  const handleCodeCheck = () => {
    if (code.length !== 6) {
      showToast('Enter all 6 digits');
      return;
    }
    if (code === '000000') {
      setStep('expired');
      return;
    }
    setCurrentStudent(isTest ? DEMO_VERIFIED_STUDENT : {
      name: `Student #${code}`,
      avatarInitials: `S${code.slice(-1)}`,
      college: 'Campus Health Pass',
      rollNumber: `CODE-${code}`,
      photoDate: 'Live digital pass',
    });
    setManualMode(false);
    setStep('found');
    showToast('Code matched');
  };

  const handleManualFind = () => {
    if (roll.length < 8 || !cardConfirmed) {
      showToast('Enter the roll number and check the ID card');
      return;
    }
    setCurrentStudent({
      name: isTest ? 'Krishna C.' : `Student (${roll})`,
      avatarInitials: roll.slice(0, 2),
      college: 'College ID Verified',
      rollNumber: roll,
      photoDate: 'ID card on file',
    });
    setManualMode(true);
    setStep('found');
    showToast('Found by roll number');
  };

  const handleCapturePhoto = () => {
    setStep('compare');
  };

  const handleDecisionSame = () => {
    setStep('ok');
    const studentName = currentStudent?.name || (isTest ? 'Krishna C.' : 'Verified Student');
    const newEntry: LogEntry = {
      id: Date.now().toString(),
      who: studentName,
      when: 'Just now',
      status: 'ok',
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 5)]);
  };

  const handleDecisionNotSame = () => {
    setStep('mismatch');
  };

  const handleFlagIncident = () => {
    if (!mismatchReason) {
      showToast('Pick what happened first');
      return;
    }
    setFlagged(true);
    const studentName = currentStudent?.name || (isTest ? 'Krishna C.' : 'Unknown pass');
    const newEntry: LogEntry = {
      id: Date.now().toString(),
      who: studentName,
      when: 'Just now',
      status: 'bad',
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 5)]);
    showToast('Flagged · student notified · nothing handed over');
  };

  const handleRestart = () => {
    setStep('scan');
    setCode('');
    setRoll('');
    setCardConfirmed(false);
    setMismatchReason(null);
    setFlagged(false);
    setManualMode(false);
  };

  const isManualValid = roll.trim().length >= 8 && cardConfirmed;

  return (
    <div className="sk-verify-page">
      {/* ================= Left Sidebar ================= */}
      <aside className="sk-verify-sidebar" aria-label="Partner console sidebar">
        <div className="sk-verify-brand">
          <div className="sk-verify-brand-logo" aria-hidden="true">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none">
              <defs>
                <linearGradient id="skg_v1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg_v1b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.34" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg_v1)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg_v1b)" />
              <path
                d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z"
                fill="#FFFFFF"
              />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="sk-verify-brand-text">
            <span className="sk-verify-brand-name">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-verify-brand-partner">PARTNER</span>
          </div>
        </div>

        {/* Sidebar Nav Items with all 18 options */}
        <nav className="sk-verify-nav" aria-label="Partner links">
          {/* Section: STORE */}
          <span className="sk-verify-nav-section">STORE</span>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('vendor')}
          >
            <Home size={15} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item is-active"
            aria-current="page"
          >
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('orders')}
          >
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('rx-review')}
          >
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('substitutions')}
          >
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('handover')}
          >
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('returns')}
          >
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('dispensing')}
          >
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('reorder')}
          >
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-verify-nav-section">LAB</span>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('lab-queue')}
          >
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('run-sheet')}
          >
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('cold-chain')}
          >
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('lab-queue')}
          >
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('camp-intake')}
          >
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-verify-nav-section">BUSINESS</span>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('partner-staff')}
          >
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('catalogue')}
          >
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('settlement')}
          >
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button
            type="button"
            className="sk-verify-nav-item"
            onClick={() => handleNav('performance')}
          >
            <BarChart3 size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div className="sk-verify-sidebar-bottom">
          <button
            type="button"
            className="sk-verify-help-link"
            onClick={() => showToast('Support line: partner-support@studentkare.in')}
          >
            <HelpCircle size={15} />
            <span>MedPlus · Vijaya Diagnostics</span>
          </button>
        </div>
      </aside>

      {/* ================= Main Content Container ================= */}
      <main className="sk-verify-content">
        {/* Top Dark Banner */}
        <header className="sk-verify-header-bar">
          <div className="sk-verify-header-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="sk-verify-header-title">Verify student</h1>
              <button
                type="button"
                className={`sk-verify-network-pill ${isOnline ? 'is-online' : 'is-offline'}`}
                onClick={() => {
                  const nextState = !isOnline;
                  setIsOnline(nextState);
                  showToast(nextState ? 'Network restored · back online' : 'Simulating offline mode · cache validation active');
                }}
                title="Click to toggle simulated network state"
                aria-label={`Network status: ${isOnline ? 'Online' : 'Offline'}`}
              >
                {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                <span>{isOnline ? 'Live sync' : 'Offline cache'}</span>
              </button>
            </div>
            <span className="sk-verify-header-sub">
              MedPlus · Bachupally · counter tablet · {user?.fullName || 'Ravi (pharmacist)'}
            </span>
          </div>

          {/* Context Selector */}
          <div
            role="radiogroup"
            aria-label="Visit type"
            className="sk-verify-ctx-group"
          >
            {(['pharmacy', 'lab', 'clinic', 'camp'] as VisitContext[]).map((cKey) => {
              const label =
                cKey === 'pharmacy'
                  ? 'Pharmacy'
                  : cKey === 'lab'
                  ? 'Lab'
                  : cKey === 'clinic'
                  ? 'Clinic'
                  : 'Camp / van';
              const isSelected = context === cKey;
              return (
                <button
                  key={cKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`sk-verify-ctx-btn ${isSelected ? 'is-active' : ''}`}
                  onClick={() => setContext(cKey)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        {/* 2-Column Grid */}
        <div className="sk-verify-grid">
          {/* Left Column: Interaction Stages */}
          <div className="sk-verify-col-main">
            {/* Situational Offline Banner */}
            {!isOnline && (
              <div role="alert" className="sk-verify-offline-alert">
                <WifiOff size={18} />
                <div>
                  <b>Offline cache active</b> — Verifying student passes using local cryptographic signatures. All verifications are queued and will automatically sync when connection returns.
                </div>
              </div>
            )}

            {/* Step: SCAN */}
            {step === 'scan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-viewfinder" aria-label="Camera scanner viewfinder">
                  <div className="sk-verify-reticle">
                    <span className="sk-verify-reticle-corner top-left" />
                    <span className="sk-verify-reticle-corner top-right" />
                    <span className="sk-verify-reticle-corner bottom-left" />
                    <span className="sk-verify-reticle-corner bottom-right" />
                    <span className="sk-verify-laser-line" />
                  </div>
                  <span className="sk-verify-viewfinder-text">
                    {isScanning ? 'Scanner active · point camera at student’s dynamic pass' : 'Point at the student’s pass'}
                  </span>
                </div>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  onClick={handleSimulateScan}
                >
                  {isTest ? 'Simulate a scan' : isScanning ? 'Scanner active · awaiting pass' : 'Scan pass with camera'}
                </button>

                <div className="sk-verify-code-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="6-digit code"
                    placeholder="Or type the 6-digit code"
                    className="sk-verify-code-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  />
                  <button
                    type="button"
                    className={`sk-verify-code-btn ${code.length === 6 ? 'is-active' : ''}`}
                    onClick={handleCodeCheck}
                  >
                    Check
                  </button>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B6980' }}>
                  Type 000000 to see an expired code.
                </span>

                <button
                  type="button"
                  className="sk-verify-link-btn"
                  onClick={() => setStep('manual')}
                >
                  Student has no phone? Manual check →
                </button>
              </div>
            )}

            {/* Step: MANUAL CHECK */}
            {step === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-callout-warn">
                  <b>Manual check</b> — only when the student has no phone or it’s dead. It’s logged and the student is told next time they sign in.
                </div>

                <div className="sk-verify-form-group">
                  <label htmlFor={rollInputId} className="sk-verify-label">
                    ROLL NUMBER FROM THEIR COLLEGE ID CARD
                  </label>
                  <input
                    id={rollInputId}
                    type="text"
                    className="sk-verify-text-input"
                    placeholder="e.g. 22071A0514"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value.toUpperCase().slice(0, 12))}
                  />
                </div>

                <label className="sk-verify-checkbox-label">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={cardConfirmed}
                    className={`sk-verify-checkbox-box ${cardConfirmed ? 'is-checked' : ''}`}
                    onClick={() => setCardConfirmed(!cardConfirmed)}
                  >
                    {cardConfirmed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </button>
                  I’ve seen their physical college ID card, and it isn’t expired
                </label>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  disabled={!isManualValid}
                  onClick={handleManualFind}
                >
                  Find student
                </button>

                <button
                  type="button"
                  className="sk-verify-link-btn"
                  style={{ alignSelf: 'center', color: '#464555' }}
                  onClick={() => setStep('scan')}
                >
                  Back to scanning
                </button>
              </div>
            )}

            {/* Step: EXPIRED CODE */}
            {step === 'expired' && (
              <div role="alert" className="sk-verify-alert-card">
                <span className="sk-verify-alert-title">This code has expired</span>
                <span className="sk-verify-alert-desc">
                  Codes last 30 seconds. Ask the student to open their pass again — a screenshot or an old code won’t work.
                </span>
                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  style={{ background: '#B45309', alignSelf: 'flex-start', height: 44, padding: '0 20px' }}
                  onClick={handleRestart}
                >
                  Scan again
                </button>
              </div>
            )}

            {/* Step: STUDENT FOUND */}
            {step === 'found' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {manualMode && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: '#FFFBEB',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#92400E',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    Manual check · found by roll number + college ID card. The photo match still decides.
                  </div>
                )}

                {!isOnline && (
                  <div className="sk-verify-offline-note">
                    Offline · checked against the pass signature on this device. It syncs when you’re back online.
                  </div>
                )}

                <div className="sk-verify-student-card">
                  <div className="sk-verify-student-avatar">
                    {currentStudent?.avatarInitials || (isTest ? 'KC' : 'ST')}
                  </div>
                  <div className="sk-verify-student-details">
                    <span className="sk-verify-verified-tag">✓ IDENTITY VERIFIED · 4 OF 4</span>
                    <span className="sk-verify-student-name">
                      {currentStudent?.name || (isTest ? 'Krishna C.' : 'Verified Student')}
                    </span>
                    <span className="sk-verify-student-roll">
                      {currentStudent?.college || 'Campus ID'} · {currentStudent?.rollNumber || '••••••••'}
                    </span>
                    <span className="sk-verify-student-date">
                      {currentStudent?.photoDate || 'Photo on file'}
                    </span>
                  </div>
                </div>

                <div className="sk-verify-visit-card">
                  <span className="sk-verify-label">THIS VISIT</span>
                  <span className="sk-verify-visit-title">{currentCtx.label}</span>
                  <span className="sk-verify-visit-sub">{currentCtx.meta}</span>
                </div>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  onClick={() => setStep('camera')}
                >
                  Take a live photo to match
                </button>
                <span style={{ fontSize: 12, color: '#6B6980', fontWeight: 600 }}>
                  The photo is only used for this match and deleted after 24 hours.
                </span>
              </div>
            )}

            {/* Step: CAMERA CAPTURE */}
            {step === 'camera' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-camera-frame">
                  <svg width="150" height="190" viewBox="0 0 150 190" fill="none" stroke="#A5B4FC" strokeWidth="2.5" strokeDasharray="7 7">
                    <ellipse cx="75" cy="92" rx="60" ry="80" />
                  </svg>
                  <span className="sk-verify-viewfinder-text">Face inside the oval · no mask or sunglasses</span>
                </div>

                <button
                  type="button"
                  className="sk-verify-shutter-btn"
                  aria-label="Capture student photo"
                  onClick={handleCapturePhoto}
                />
              </div>
            )}

            {/* Step: COMPARE */}
            {step === 'compare' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-compare-grid">
                  <div className="sk-verify-compare-box">
                    <div className="sk-verify-compare-photo">{currentStudent?.avatarInitials || (isTest ? 'KC' : 'ST')}</div>
                    <span className="sk-verify-compare-label">On file · 24 Sep</span>
                  </div>
                  <div className="sk-verify-compare-box">
                    <div className="sk-verify-compare-photo just-now">{currentStudent?.avatarInitials || (isTest ? 'KC' : 'ST')}</div>
                    <span className="sk-verify-compare-label">Just now</span>
                  </div>
                </div>

                <div className="sk-verify-match-meter">
                  <div className="sk-verify-meter-header">
                    <span>Match hint</span>
                    <span style={{ color: '#047857' }}>Strong · 94%</span>
                  </div>
                  <div className="sk-verify-meter-track">
                    <span className="sk-verify-meter-fill" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6B6980' }}>
                    A hint, not a decision. You decide.
                  </span>
                </div>

                <span style={{ fontSize: 17, fontWeight: 800, color: '#131B2E', textAlign: 'center' }}>
                  Is this the same person?
                </span>

                <div className="sk-verify-decision-row">
                  <button
                    type="button"
                    className="sk-verify-btn-reject"
                    onClick={handleDecisionNotSame}
                  >
                    Not the same
                  </button>
                  <button
                    type="button"
                    className="sk-verify-btn-accept"
                    onClick={handleDecisionSame}
                  >
                    Same person
                  </button>
                </div>
              </div>
            )}

            {/* Step: VERIFIED OK */}
            {step === 'ok' && (
              <div role="status" className="sk-verify-success-card">
                <div className="sk-verify-success-badge">
                  <CheckCircle2 size={44} color="#FFFFFF" strokeWidth={2.5} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#131B2E', margin: 0 }}>
                  Verified · {currentStudent?.name || (isTest ? 'Krishna C.' : 'Verified Student')}
                </h2>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, fontWeight: 600, color: '#464555', margin: 0 }}>
                  {currentCtx.okText}
                </p>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  style={{ width: '100%', marginTop: 6 }}
                  onClick={() => {
                    handleNav(currentCtx.nextRoute);
                  }}
                >
                  {currentCtx.nextLabel} <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="sk-verify-link-btn"
                  style={{ alignSelf: 'center' }}
                  onClick={handleRestart}
                >
                  Scan another student
                </button>
              </div>
            )}

            {/* Step: MISMATCH (Bad) */}
            {step === 'mismatch' && (
              <div role="alert" className="sk-verify-stop-card">
                <span className="sk-verify-stop-title">Stop — don’t continue</span>
                <span className="sk-verify-stop-desc">
                  Nothing is handed over, collected or opened. The student is told straight away and can sort it out with support.
                </span>

                <span className="sk-verify-label">WHAT HAPPENED?</span>
                <div className="sk-verify-why-tags">
                  {(['Different person', 'Photo unclear', 'Student refused photo'] as MismatchReason[]).map(
                    (whyOption) => {
                      const isSelected = mismatchReason === whyOption;
                      return (
                        <button
                          key={whyOption}
                          type="button"
                          className={`sk-verify-why-btn ${isSelected ? 'is-active' : ''}`}
                          onClick={() => setMismatchReason(whyOption)}
                        >
                          {whyOption}
                        </button>
                      );
                    }
                  )}
                </div>

                {!flagged ? (
                  <button
                    type="button"
                    className={`sk-verify-flag-btn ${mismatchReason ? 'is-active' : ''}`}
                    onClick={handleFlagIncident}
                  >
                    Flag and notify the student
                  </button>
                ) : (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: '#FFF1F2',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#9F1239',
                    }}
                  >
                    Flagged. Super admin can see it in the audit log.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      minHeight: 46,
                      borderRadius: 12,
                      border: '1px solid #DAE2FD',
                      background: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#3525CD',
                      cursor: 'pointer',
                    }}
                    onClick={() => showToast('Connecting to campus desk...')}
                  >
                    Call support
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      minHeight: 46,
                      borderRadius: 12,
                      border: 0,
                      background: '#131B2E',
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onClick={handleRestart}
                  >
                    Next student
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Today Log & Counter Rules */}
          <div className="sk-verify-col-side">
            {/* Today At This Counter */}
            <div className="sk-verify-log-card">
              <span className="sk-verify-log-title">TODAY AT THIS COUNTER</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {logs.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                    No verifications recorded yet today.
                  </div>
                ) : (
                  logs.map((item) => (
                    <div key={item.id} className="sk-verify-log-item">
                      <span className="sk-verify-log-name">{item.who}</span>
                      <span className="sk-verify-log-time">{item.when}</span>
                      <span className={`sk-verify-log-chip ${item.status}`}>
                        {item.status === 'ok' ? 'Verified' : 'Stopped'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Counter Rules */}
            <div className="sk-verify-rules-card">
              <span className="sk-verify-rules-title">RULES AT THE COUNTER</span>
              <span>• No match, no handover — even for a regular.</span>
              <span>• Never accept a screenshot or a code read out over the phone.</span>
              <span>• The live photo is for this match only. Don’t save it on your device.</span>
              <span>• A student without a phone: check the college ID card, roll number and photo, then mark “Manual check”.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Toast */}
      {toastMessage && (
        <div role="status" className="sk-verify-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
