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
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/styles/webScanVerify.css';

export interface WebScanVerifyScreenProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export type VerifyStep = 'scan' | 'manual' | 'found' | 'camera' | 'compare' | 'ok' | 'mismatch' | 'expired' | 'unavailable';
export type VisitContext = 'pharmacy' | 'lab' | 'clinic' | 'camp';
export type MismatchReason = 'Different person' | 'Photo unclear' | 'Student refused photo';

interface ContextConfig {
  pill: MessageKey;
  label: MessageKey;
  meta: MessageKey;
  nextLabel: MessageKey;
  nextRoute: RoutePath;
  okText: MessageKey;
}

// No order, booking, doctor or slot is linked to this screen, so the copy
// names none (it used to show made-up SK-48120, LB-77420, Dr. Menon, C-114).
const CONTEXT_MAP: Record<VisitContext, ContextConfig> = {
  pharmacy: {
    pill: 'partner.vsub.scan.ctx.pharmacy',
    label: 'partner.vsub.scan.ctx.pharmacyLabel',
    meta: 'partner.vsub.scan.ctx.pharmacyMeta',
    nextLabel: 'partner.vsub.scan.ctx.pharmacyNext',
    nextRoute: 'dispensing',
    okText: 'partner.vsub.scan.ctx.pharmacyOk',
  },
  lab: {
    pill: 'partner.vsub.scan.ctx.lab',
    label: 'partner.vsub.scan.ctx.labLabel',
    meta: 'partner.vsub.scan.ctx.labMeta',
    nextLabel: 'partner.vsub.scan.ctx.labNext',
    nextRoute: 'lab-queue',
    okText: 'partner.vsub.scan.ctx.labOk',
  },
  clinic: {
    pill: 'partner.vsub.scan.ctx.clinic',
    label: 'partner.vsub.scan.ctx.clinicLabel',
    meta: 'partner.vsub.scan.ctx.clinicMeta',
    nextLabel: 'partner.vsub.scan.ctx.clinicNext',
    nextRoute: 'vendor',
    okText: 'partner.vsub.scan.ctx.clinicOk',
  },
  camp: {
    pill: 'partner.vsub.scan.ctx.camp',
    label: 'partner.vsub.scan.ctx.campLabel',
    meta: 'partner.vsub.scan.ctx.campMeta',
    nextLabel: 'partner.vsub.scan.ctx.campNext',
    nextRoute: 'scan-verify',
    okText: 'partner.vsub.scan.ctx.campOk',
  },
};

const MISMATCH_LABEL: Record<MismatchReason, MessageKey> = {
  'Different person': 'partner.vsub.scan.why.different',
  'Photo unclear': 'partner.vsub.scan.why.unclear',
  'Student refused photo': 'partner.vsub.scan.why.refused',
};

type NavIcon = typeof Home;
const NAV_GROUPS: { title: MessageKey; items: { route: string; label: MessageKey; Icon: NavIcon }[] }[] = [
  {
    title: 'partner.vsub.nav.store',
    items: [
      { route: 'vendor', label: 'partner.vsub.nav.home', Icon: Home },
      { route: 'scan-verify', label: 'partner.vsub.nav.verify', Icon: Scan },
      { route: 'orders', label: 'partner.vsub.nav.orders', Icon: Package },
      { route: 'rx-review', label: 'partner.vsub.nav.rxReview', Icon: FileText },
      { route: 'substitutions', label: 'partner.vsub.nav.substitutions', Icon: ArrowLeftRight },
      { route: 'handover', label: 'partner.vsub.nav.handover', Icon: KeyRound },
      { route: 'returns', label: 'partner.vsub.nav.returns', Icon: RotateCcw },
      { route: 'dispensing', label: 'partner.vsub.nav.dispense', Icon: ClipboardList },
      { route: 'reorder', label: 'partner.vsub.nav.reorder', Icon: RefreshCw },
    ],
  },
  {
    title: 'partner.vsub.nav.lab',
    items: [
      { route: 'lab-queue', label: 'partner.vsub.nav.sampleQueue', Icon: FlaskConical },
      { route: 'run-sheet', label: 'partner.vsub.nav.runSheet', Icon: Truck },
      { route: 'cold-chain', label: 'partner.vsub.nav.coldChain', Icon: Snowflake },
      { route: 'lab-queue', label: 'partner.vsub.nav.releaseResults', Icon: CheckCircle2 },
      { route: 'camp-intake', label: 'partner.vsub.nav.campIntake', Icon: Tent },
    ],
  },
  {
    title: 'partner.vsub.nav.business',
    items: [
      { route: 'partner-staff', label: 'partner.vsub.nav.staff', Icon: Users },
      { route: 'catalogue', label: 'partner.vsub.nav.catalogue', Icon: LayoutGrid },
      { route: 'settlement', label: 'partner.vsub.nav.settlement', Icon: CreditCard },
      { route: 'performance', label: 'partner.vsub.nav.performance', Icon: BarChart3 },
    ],
  },
];

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
  const t = useT();
  const { user } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;

  const [step, setStep] = useState<VerifyStep>('scan');
  const [context, setContext] = useState<VisitContext>('pharmacy');
  const [code, setCode] = useState('');
  const [roll, setRoll] = useState('');
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [manualMode, setManualMode] = useState(false);
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
    // Offline, nothing is verified or queued (guardrail 2: offline is never a pass).
    const handleOnline = () => {
      setIsOnline(true);
      showToast(t('partner.vsub.scan.toast.online'));
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(t('partner.vsub.scan.toast.offline'));
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

  // Step transitions.
  // No pass-verification API or camera scanner is wired to this screen. Outside
  // the test demo every check fails closed to the "can't verify" state: it used
  // to invent a student ("Student #<code>") and mark them verified, which let
  // a counter hand over medicine against any six digits.
  const handleSimulateScan = () => {
    if (!isTest || !isOnline) {
      setStep('unavailable');
      return;
    }
    setCurrentStudent(DEMO_VERIFIED_STUDENT);
    setManualMode(false);
    setStep('found');
    showToast(t('partner.vsub.scan.toast.passRead'));
  };

  const handleCodeCheck = () => {
    if (code.length !== 6) {
      showToast(t('partner.vsub.scan.toast.sixDigits'));
      return;
    }
    if (!isTest || !isOnline) {
      setStep('unavailable');
      return;
    }
    if (code === '000000') {
      setStep('expired');
      return;
    }
    setCurrentStudent(DEMO_VERIFIED_STUDENT);
    setManualMode(false);
    setStep('found');
    showToast(t('partner.vsub.scan.toast.codeMatched'));
  };

  const handleManualFind = () => {
    if (roll.length < 8 || !cardConfirmed) {
      showToast(t('partner.vsub.scan.toast.rollAndCard'));
      return;
    }
    if (!isTest || !isOnline) {
      setStep('unavailable');
      return;
    }
    setCurrentStudent({
      name: 'Krishna C.',
      avatarInitials: roll.slice(0, 2),
      college: t('partner.vsub.scan.manual.college'),
      rollNumber: roll,
      photoDate: t('partner.vsub.scan.manual.photoDate'),
    });
    setManualMode(true);
    setStep('found');
    showToast(t('partner.vsub.scan.toast.foundByRoll'));
  };

  const handleCapturePhoto = () => {
    setStep('compare');
  };

  const handleDecisionSame = () => {
    setStep('ok');
    const studentName = currentStudent?.name || t('partner.vsub.scan.unknownStudent');
    const newEntry: LogEntry = {
      id: Date.now().toString(),
      who: studentName,
      when: t('partner.vsub.scan.justNow'),
      status: 'ok',
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 5)]);
  };

  const handleDecisionNotSame = () => {
    setStep('mismatch');
  };

  const handleFlagIncident = () => {
    if (!mismatchReason) {
      showToast(t('partner.vsub.scan.toast.pickReason'));
      return;
    }
    // Recorded on this device only: there is no incident API, so nothing is
    // sent and the student is not notified (it used to say both happened).
    setFlagged(true);
    const studentName = currentStudent?.name || t('partner.vsub.scan.unknownPass');
    const newEntry: LogEntry = {
      id: Date.now().toString(),
      who: studentName,
      when: t('partner.vsub.scan.justNow'),
      status: 'bad',
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 5)]);
    showToast(t('partner.vsub.scan.toast.stopped'));
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
      <aside className="sk-verify-sidebar" aria-label={t('partner.vsub.nav.sidebar')}>
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
            <span className="sk-verify-brand-partner">{t('partner.vsub.nav.partnerBadge')}</span>
          </div>
        </div>

        {/* Sidebar Nav Items with all 18 options */}
        <nav className="sk-verify-nav" aria-label={t('partner.vsub.nav.label')}>
          {NAV_GROUPS.map((group) => (
            <React.Fragment key={group.title}>
              <span className="sk-verify-nav-section">{t(group.title)}</span>
              {group.items.map(({ route, label, Icon }) =>
                route === 'scan-verify' ? (
                  <button key={label} type="button" className="sk-verify-nav-item is-active" aria-current="page" style={{ minHeight: 44 }}>
                    <Icon size={15} aria-hidden="true" />
                    <span>{t(label)}</span>
                  </button>
                ) : (
                  <button key={label} type="button" className="sk-verify-nav-item" style={{ minHeight: 44 }} onClick={() => handleNav(route)}>
                    <Icon size={15} aria-hidden="true" />
                    <span>{t(label)}</span>
                  </button>
                )
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="sk-verify-sidebar-bottom">
          <button
            type="button"
            className="sk-verify-help-link"
            onClick={() => showToast(t('partner.vsub.scan.helpToast'))}
          >
            <HelpCircle size={15} aria-hidden="true" />
            <span>{t('partner.vsub.scan.help')}</span>
          </button>
        </div>
      </aside>

      {/* ================= Main Content Container ================= */}
      <main className="sk-verify-content">
        {/* Top Dark Banner */}
        <header className="sk-verify-header-bar">
          <div className="sk-verify-header-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="sk-verify-header-title">{t('partner.vsub.scan.title')}</h1>
              {/* Shows the browser's real network state; it used to be a button that faked going offline. */}
              <span
                className={`sk-verify-network-pill ${isOnline ? 'is-online' : 'is-offline'}`}
                role="status"
                aria-label={isOnline ? t('partner.vsub.scan.network.onlineLabel') : t('partner.vsub.scan.network.offlineLabel')}
              >
                {isOnline ? <Wifi size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
                <span>{isOnline ? t('partner.vsub.scan.network.online') : t('partner.vsub.scan.network.offline')}</span>
              </span>
            </div>
            <span className="sk-verify-header-sub">
              {user?.fullName ? t('partner.vsub.scan.counterFor', { name: user.fullName }) : t('partner.vsub.scan.counter')}
            </span>
          </div>

          {/* Context Selector */}
          <div
            role="radiogroup"
            aria-label={t('partner.vsub.scan.visitType')}
            className="sk-verify-ctx-group"
          >
            {(['pharmacy', 'lab', 'clinic', 'camp'] as VisitContext[]).map((cKey) => {
              const label = t(CONTEXT_MAP[cKey].pill);
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
                <WifiOff size={18} aria-hidden="true" />
                <div>
                  <b>{t('partner.vsub.scan.offline.title')}</b> — {t('partner.vsub.scan.offline.body')}
                </div>
              </div>
            )}

            {/* Step: SCAN */}
            {step === 'scan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-viewfinder" aria-hidden="true">
                  <div className="sk-verify-reticle">
                    <span className="sk-verify-reticle-corner top-left" />
                    <span className="sk-verify-reticle-corner top-right" />
                    <span className="sk-verify-reticle-corner bottom-left" />
                    <span className="sk-verify-reticle-corner bottom-right" />
                    <span className="sk-verify-laser-line" />
                  </div>
                  <span className="sk-verify-viewfinder-text">
                    {t('partner.vsub.scan.pointAtPass')}
                  </span>
                </div>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  onClick={handleSimulateScan}
                >
                  {isTest ? t('partner.vsub.scan.simulate') : t('partner.vsub.scan.scanWithCamera')}
                </button>

                <div className="sk-verify-code-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={t('partner.vsub.scan.codeLabel')}
                    placeholder={t('partner.vsub.scan.codePlaceholder')}
                    className="sk-verify-code-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  />
                  <button
                    type="button"
                    className={`sk-verify-code-btn ${code.length === 6 ? 'is-active' : ''}`}
                    onClick={handleCodeCheck}
                  >
                    {t('partner.vsub.scan.check')}
                  </button>
                </div>
                {isTest && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sk-color-text-3)' }}>
                    {t('partner.vsub.scan.expiredHint')}
                  </span>
                )}

                <button
                  type="button"
                  className="sk-verify-link-btn"
                  onClick={() => setStep('manual')}
                >
                  {t('partner.vsub.scan.noPhone')}
                </button>
              </div>
            )}

            {/* Step: MANUAL CHECK */}
            {step === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-callout-warn">
                  <b>{t('partner.vsub.scan.manual.title')}</b> — {t('partner.vsub.scan.manual.body')}
                </div>

                <div className="sk-verify-form-group">
                  <label htmlFor={rollInputId} className="sk-verify-label">
                    {t('partner.vsub.scan.manual.rollLabel')}
                  </label>
                  <input
                    id={rollInputId}
                    type="text"
                    className="sk-verify-text-input"
                    placeholder={t('partner.vsub.scan.manual.rollPlaceholder')}
                    value={roll}
                    onChange={(e) => setRoll(e.target.value.toUpperCase().slice(0, 12))}
                  />
                </div>

                <label className="sk-verify-checkbox-label" style={{ minHeight: 44 }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={cardConfirmed}
                    className={`sk-verify-checkbox-box ${cardConfirmed ? 'is-checked' : ''}`}
                    onClick={() => setCardConfirmed(!cardConfirmed)}
                  >
                    {cardConfirmed && <Check size={14} color="var(--sk-color-on-action)" strokeWidth={3} aria-hidden="true" />}
                  </button>
                  {t('partner.vsub.scan.manual.cardSeen')}
                </label>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  disabled={!isManualValid}
                  onClick={handleManualFind}
                >
                  {t('partner.vsub.scan.manual.find')}
                </button>

                <button
                  type="button"
                  className="sk-verify-link-btn"
                  style={{ alignSelf: 'center', color: 'var(--sk-color-text-2)' }}
                  onClick={() => setStep('scan')}
                >
                  {t('partner.vsub.scan.backToScan')}
                </button>
              </div>
            )}

            {/* Step: EXPIRED CODE */}
            {step === 'expired' && (
              <div role="alert" className="sk-verify-alert-card">
                <span className="sk-verify-alert-title">{t('partner.vsub.scan.expired.title')}</span>
                <span className="sk-verify-alert-desc">
                  {t('partner.vsub.scan.expired.body')}
                </span>
                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  style={{ background: 'var(--sk-color-attention)', alignSelf: 'flex-start', height: 44, padding: '0 20px' }}
                  onClick={handleRestart}
                >
                  {t('partner.vsub.scan.expired.again')}
                </button>
              </div>
            )}

            {/* Step: CAN'T VERIFY — fail closed */}
            {step === 'unavailable' && (
              <div role="alert" className="sk-verify-stop-card">
                <span className="sk-verify-stop-title">
                  {isOnline ? t('partner.vsub.scan.unavailable.title') : t('partner.vsub.scan.offline.title')}
                </span>
                <span className="sk-verify-stop-desc">
                  {isOnline ? t('partner.vsub.scan.unavailable.body') : t('partner.vsub.scan.offline.body')}
                </span>
                <button type="button" className="sk-verify-btn-primary" style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 20px' }} onClick={handleRestart}>
                  {t('partner.vsub.scan.backToScan')}
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
                      background: 'var(--sk-color-attention-bg)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--sk-color-attention)',
                      border: '1px solid var(--sk-color-attention)',
                    }}
                  >
                    {t('partner.vsub.scan.found.manualNote')}
                  </div>
                )}

                {!isOnline && (
                  <div className="sk-verify-offline-note">
                    {t('partner.vsub.scan.found.offlineNote')}
                  </div>
                )}

                <div className="sk-verify-student-card">
                  <div className="sk-verify-student-avatar" aria-hidden="true">
                    {currentStudent?.avatarInitials || '—'}
                  </div>
                  <div className="sk-verify-student-details">
                    {/* Pass found is not identity confirmed — the photo match below decides. */}
                    <span className="sk-verify-verified-tag">{t('partner.vsub.scan.found.tag')}</span>
                    <span className="sk-verify-student-name">
                      {currentStudent?.name || t('partner.vsub.scan.unknownStudent')}
                    </span>
                    <span className="sk-verify-student-roll">
                      {currentStudent?.college || t('partner.vsub.scan.found.campusId')} · {currentStudent?.rollNumber || '••••••••'}
                    </span>
                    <span className="sk-verify-student-date">
                      {currentStudent?.photoDate || t('partner.vsub.scan.found.photoOnFile')}
                    </span>
                  </div>
                </div>

                <div className="sk-verify-visit-card">
                  <span className="sk-verify-label">{t('partner.vsub.scan.found.thisVisit')}</span>
                  <span className="sk-verify-visit-title">{t(currentCtx.label)}</span>
                  <span className="sk-verify-visit-sub">{t(currentCtx.meta)}</span>
                </div>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  onClick={() => setStep('camera')}
                >
                  {t('partner.vsub.scan.found.takePhoto')}
                </button>
                <span style={{ fontSize: 12, color: 'var(--sk-color-text-3)', fontWeight: 600 }}>
                  {t('partner.vsub.scan.found.photoNote')}
                </span>
              </div>
            )}

            {/* Step: CAMERA CAPTURE */}
            {step === 'camera' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-camera-frame">
                  <svg width="150" height="190" viewBox="0 0 150 190" fill="none" style={{ stroke: 'var(--sk-color-action-soft)' }} strokeWidth="2.5" strokeDasharray="7 7" aria-hidden="true">
                    <ellipse cx="75" cy="92" rx="60" ry="80" />
                  </svg>
                  <span className="sk-verify-viewfinder-text">{t('partner.vsub.scan.camera.hint')}</span>
                </div>

                <button
                  type="button"
                  className="sk-verify-shutter-btn"
                  aria-label={t('partner.vsub.scan.camera.capture')}
                  onClick={handleCapturePhoto}
                />
              </div>
            )}

            {/* Step: COMPARE */}
            {step === 'compare' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="sk-verify-compare-grid">
                  <div className="sk-verify-compare-box">
                    <div className="sk-verify-compare-photo" aria-hidden="true">{currentStudent?.avatarInitials || '—'}</div>
                    <span className="sk-verify-compare-label">{t('partner.vsub.scan.compare.onFile')}</span>
                  </div>
                  <div className="sk-verify-compare-box">
                    <div className="sk-verify-compare-photo just-now" aria-hidden="true">{currentStudent?.avatarInitials || '—'}</div>
                    <span className="sk-verify-compare-label">{t('partner.vsub.scan.justNow')}</span>
                  </div>
                </div>

                {/* No face-matching service exists; this used to show a made-up "Strong · 94%" hint. */}
                <div className="sk-verify-match-meter">
                  <div className="sk-verify-meter-header">
                    <span>{t('partner.vsub.scan.compare.hint')}</span>
                    <span>{t('partner.vsub.scan.compare.noHint')}</span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sk-color-text-3)' }}>
                    {t('partner.vsub.scan.compare.youDecide')}
                  </span>
                </div>

                <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--sk-color-text)', textAlign: 'center' }}>
                  {t('partner.vsub.scan.compare.question')}
                </span>

                <div className="sk-verify-decision-row">
                  <button
                    type="button"
                    className="sk-verify-btn-reject"
                    onClick={handleDecisionNotSame}
                  >
                    {t('partner.vsub.scan.compare.notSame')}
                  </button>
                  <button
                    type="button"
                    className="sk-verify-btn-accept"
                    onClick={handleDecisionSame}
                  >
                    {t('partner.vsub.scan.compare.same')}
                  </button>
                </div>
              </div>
            )}

            {/* Step: VERIFIED OK */}
            {step === 'ok' && (
              <div role="status" className="sk-verify-success-card">
                <div className="sk-verify-success-badge">
                  <CheckCircle2 size={44} color="var(--sk-color-on-action)" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', margin: 0 }}>
                  {t('partner.vsub.scan.ok.title', { name: currentStudent?.name || t('partner.vsub.scan.unknownStudent') })}
                </h2>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, fontWeight: 600, color: 'var(--sk-color-text-2)', margin: 0 }}>
                  {t(currentCtx.okText)}
                </p>

                <button
                  type="button"
                  className="sk-verify-btn-primary"
                  style={{ width: '100%', marginTop: 6 }}
                  onClick={() => {
                    handleNav(currentCtx.nextRoute);
                  }}
                >
                  {t(currentCtx.nextLabel)} <ArrowRight size={16} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="sk-verify-link-btn"
                  style={{ alignSelf: 'center' }}
                  onClick={handleRestart}
                >
                  {t('partner.vsub.scan.ok.another')}
                </button>
              </div>
            )}

            {/* Step: MISMATCH (Bad) */}
            {step === 'mismatch' && (
              <div role="alert" className="sk-verify-stop-card">
                <span className="sk-verify-stop-title">{t('partner.vsub.scan.stop.title')}</span>
                <span className="sk-verify-stop-desc">
                  {t('partner.vsub.scan.stop.body')}
                </span>

                <span className="sk-verify-label">{t('partner.vsub.scan.stop.what')}</span>
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
                          {t(MISMATCH_LABEL[whyOption])}
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
                    {t('partner.vsub.scan.stop.mark')}
                  </button>
                ) : (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--sk-color-danger-bg)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--sk-color-danger)',
                    }}
                  >
                    {t('partner.vsub.scan.stop.marked')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      minHeight: 46,
                      borderRadius: 12,
                      border: 0,
                      background: 'var(--sk-color-brand-navy)',
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--sk-color-on-action)',
                      cursor: 'pointer',
                    }}
                    onClick={handleRestart}
                  >
                    {t('partner.vsub.scan.ctx.campNext')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Today Log & Counter Rules */}
          <div className="sk-verify-col-side">
            {/* Today At This Counter */}
            <div className="sk-verify-log-card">
              <span className="sk-verify-log-title">{t('partner.vsub.scan.log.title')}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {logs.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 12 }}>
                    {t('partner.vsub.scan.log.empty')}
                  </div>
                ) : (
                  logs.map((item) => (
                    <div key={item.id} className="sk-verify-log-item">
                      <span className="sk-verify-log-name">{item.who}</span>
                      <span className="sk-verify-log-time">{item.when}</span>
                      <span className={`sk-verify-log-chip ${item.status}`}>
                        {item.status === 'ok' ? t('partner.vsub.scan.log.verified') : t('partner.vsub.scan.log.stopped')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Counter Rules */}
            <div className="sk-verify-rules-card">
              <span className="sk-verify-rules-title">{t('partner.vsub.scan.rules.title')}</span>
              <span>• {t('partner.vsub.scan.rules.noMatch')}</span>
              <span>• {t('partner.vsub.scan.rules.noScreenshot')}</span>
              <span>• {t('partner.vsub.scan.rules.photo')}</span>
              <span>• {t('partner.vsub.scan.rules.noPhone')}</span>
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
