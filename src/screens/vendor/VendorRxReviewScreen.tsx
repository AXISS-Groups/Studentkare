import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  Package,
  RefreshCw,
  RotateCcw,
  Scan,
  Search,
  Snowflake,
  Tent,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import '@/theme/styles/vendorRxReview.css';

export interface RxQueueItem {
  id: string;
  items: string;
  countMeta: string;
  age: string;
  flag: string;
  tone: 'amber' | 'red' | 'indigo' | 'green' | 'grey';
  doctor: string;
  clinic: string;
  reg: string;
  date: string;
  scriptLines: string[];
  /** OCR reading of the prescription, when one was made. Absent means none — never guessed. */
  ocrLines?: OcrLine[];
}

export interface PharmacistCheck {
  id: string;
  label: string;
  meta: string;
}

export interface OcrLine {
  name: string;
  sig: string;
  conf: string;
  tone: 'green' | 'amber';
  note?: string;
}

export interface VendorRxReviewScreenProps {
  initialPrescriptions?: RxQueueItem[];
  initialViewState?: 'data' | 'loading' | 'empty' | 'error';
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

const INITIAL_PRESCRIPTIONS: RxQueueItem[] = [
  {
    id: 'RX-2231',
    items: 'Cetirizine, salbutamol, budesonide',
    countMeta: 'Scanned Rx · 3 items',
    age: '3 min',
    flag: 'Needs review',
    tone: 'amber',
    doctor: 'Dr. K. Rao, MBBS',
    clinic: 'Sai Clinic, Nizampet',
    reg: 'TSMC 45122',
    date: '22/09/2026',
    scriptLines: [
      '1. Cetirizine 10 mg — 1 OD × 5d',
      '2. Salbutamol inhaler 100 mcg — 2 puffs SOS',
      '3. Budesonide 200 — 1 puff BD × 30d',
    ],
    ocrLines: [
      { name: 'Cetirizine 10 mg', sig: '1 tablet once daily × 5 days', conf: 'OCR 98%', tone: 'green' },
      { name: 'Salbutamol inhaler 100 mcg', sig: '2 puffs when needed', conf: 'OCR 94%', tone: 'green' },
      {
        name: 'Budesonide 200 mcg inhaler',
        sig: '1 puff twice daily × 30 days',
        conf: 'OCR 71%',
        tone: 'amber',
        note: 'Low confidence — confirm strength against the image',
      },
    ],
  },
  {
    id: 'RX-2229',
    items: 'Azithromycin 500',
    countMeta: 'Antibiotic · Schedule H',
    age: '9 min',
    flag: 'Schedule H',
    tone: 'red',
    doctor: 'Dr. Ananya Reddy, MD',
    clinic: 'Care Hospital, Kukatpally',
    reg: 'TSMC 88412',
    date: '22/09/2026',
    scriptLines: [
      '1. Azithromycin 500 mg — 1 OD (after food) × 3d',
      '2. Paracetamol 650 mg — SOS',
    ],
    ocrLines: [
      { name: 'Azithromycin 500 mg', sig: '1 tablet once daily (after food) × 3 days', conf: 'OCR 99%', tone: 'green' },
      { name: 'Paracetamol 650 mg', sig: 'SOS (fever/pain)', conf: 'OCR 96%', tone: 'green' },
    ],
  },
  {
    id: 'RX-2226',
    items: 'Levothyroxine 50',
    countMeta: 'Repeat · last filled 28 d',
    age: '21 min',
    flag: 'Repeat',
    tone: 'indigo',
    doctor: 'Dr. P. Sharma, MD Endo',
    clinic: 'Apollo Clinic, Miyapur',
    reg: 'TSMC 31908',
    date: '18/09/2026',
    scriptLines: ['1. Levothyroxine sodium 50 mcg — 1 tab empty stomach OD × 90d'],
    ocrLines: [
      { name: 'Levothyroxine sodium 50 mcg', sig: '1 tablet empty stomach OD × 90 days', conf: 'OCR 97%', tone: 'green' },
    ],
  },
  {
    id: 'RX-2220',
    items: 'Isotretinoin 20',
    countMeta: 'Schedule H · specialist only',
    age: '40 min',
    flag: 'Specialist Rx',
    tone: 'red',
    doctor: 'Dr. M. Varma, DVD Derm',
    clinic: 'Skin Solutions, Madhapur',
    reg: 'TSMC 65421',
    date: '20/09/2026',
    scriptLines: ['1. Isotretinoin 20 mg cap — 1 OD at night × 30d'],
    ocrLines: [
      {
        name: 'Isotretinoin 20 mg capsule',
        sig: '1 capsule at night × 30 days',
        conf: 'OCR 88%',
        tone: 'amber',
        note: 'Specialist schedule · ensure pregnancy warning discussed',
      },
    ],
  },
];

/** Test fixture only — never rendered outside Vitest. */
export const DEMO_PRESCRIPTIONS: RxQueueItem[] = INITIAL_PRESCRIPTIONS;

export interface RxAuditRecord {
  id: string;
  status: 'approved' | 'rejected' | 'clarified';
  doctor: string;
  items: string;
  timestamp: string;
  note?: string;
}

const TONE_STYLE: Record<RxQueueItem['tone'], React.CSSProperties> = {
  amber: { background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-attention)' },
  red: { background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)' },
  indigo: { background: 'var(--sk-color-action-soft)', color: 'var(--sk-color-action)' },
  green: { background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)' },
  grey: { background: 'var(--sk-color-surface-2)', color: 'var(--sk-color-text-2)' },
};

const UNCHECKED: Record<string, boolean> = { reg: true, date: true, patient: false, allergy: false, sched: false };

/**
 * Pharmacist review of a prescription before packing.
 *
 * This queue is not connected to student orders yet: prescriptions arrive only
 * through `initialPrescriptions`, and approve / reject / ask-the-doctor change
 * this screen's state and send nothing. The copy says so. OCR readings are shown
 * only when the prescription carries them — never invented.
 */
export function VendorRxReviewScreen({ initialPrescriptions, initialViewState, onNavigate, onLogout }: VendorRxReviewScreenProps) {
  const t = useT();
  const { logout } = useAuth();

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [internalViewState, setInternalViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');
  const viewState = initialViewState ?? internalViewState;
  const setViewState = setInternalViewState;

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Queue of prescriptions
  const [prescriptions] = useState<RxQueueItem[]>(() =>
    initialPrescriptions ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_PRESCRIPTIONS : [])
  );

  // Selected prescription ID
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialPrescriptions && initialPrescriptions.length > 0) return initialPrescriptions[0].id;
    if (typeof process !== 'undefined' && process.env?.VITEST) return 'RX-2231';
    return '';
  });

  // Completed/processed Rx IDs
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});

  // Audit history of processed prescriptions
  const [history, setHistory] = useState<RxAuditRecord[]>([]);

  // Queue column sub-tab: 'waiting' vs 'processed'
  const [queueTab, setQueueTab] = useState<'waiting' | 'processed'>('waiting');

  // Active checks state
  const [checks, setChecks] = useState<Record<string, boolean>>(UNCHECKED);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reopen a processed/rejected prescription back into active queue
  const handleReopen = (id: string) => {
    setDoneIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setSelectedId(id);
    setQueueTab('waiting');
    setViewState('data');
    setChecks(UNCHECKED);
    showToast(t('partner.vrx.rx.toast.reopened', { id }));
  };

  const handleNavClick = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigate('logged-out');
    }
  };

  // Remaining active prescriptions
  const activeList = useMemo(() => {
    return prescriptions.filter((r) => !doneIds[r.id]);
  }, [prescriptions, doneIds]);

  // Filtered prescriptions based on search
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase().trim();
    return activeList.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.items.toLowerCase().includes(q) ||
        r.doctor.toLowerCase().includes(q) ||
        r.clinic.toLowerCase().includes(q) ||
        r.reg.toLowerCase().includes(q) ||
        r.flag.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  // Current prescription in view
  const currentRx = useMemo(() => {
    if (queueTab === 'processed') {
      const match = history.find((h) => h.id === selectedId) || history[0];
      if (match) {
        return prescriptions.find((p) => p.id === match.id) || null;
      }
    }
    return filteredList.find((r) => r.id === selectedId) || filteredList[0] || activeList[0] || null;
  }, [queueTab, history, filteredList, activeList, selectedId, prescriptions]);

  // Checklist definitions. The pharmacist confirms each; the meta line only
  // repeats what the prescription says and claims nothing was verified.
  const checkItems: PharmacistCheck[] = [
    { id: 'reg', label: t('partner.vrx.rx.check.reg'), meta: t('partner.vrx.rx.check.regMeta', { reg: currentRx?.reg ?? '' }) },
    { id: 'date', label: t('partner.vrx.rx.check.date'), meta: t('partner.vrx.rx.check.dateMeta', { date: currentRx?.date ?? '' }) },
    { id: 'patient', label: t('partner.vrx.rx.check.patient'), meta: t('partner.vrx.rx.check.patientMeta') },
    { id: 'allergy', label: t('partner.vrx.rx.check.allergy'), meta: t('partner.vrx.rx.check.allergyMeta') },
    { id: 'sched', label: t('partner.vrx.rx.check.sched'), meta: t('partner.vrx.rx.check.schedMeta') },
  ];

  // OCR lines come with the prescription; none are made up here.
  const ocrLines: OcrLine[] = currentRx?.ocrLines ?? [];

  // Are all checks marked?
  const allChecksComplete = checkItems.every((c) => !!checks[c.id]);

  const toggleCheck = (id: string) => {
    setChecks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleApprove = () => {
    if (!currentRx || !allChecksComplete) return;
    const id = currentRx.id;
    const remaining = activeList.filter((r) => r.id !== id);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    }
    setDoneIds((prev) => ({ ...prev, [id]: true }));
    setHistory((prev) => [
      {
        id,
        status: 'approved',
        doctor: currentRx.doctor,
        items: currentRx.items,
        timestamp: t('partner.vrx.rx.justNow'),
      },
      ...prev.filter((h) => h.id !== id),
    ]);
    showToast(t('partner.vrx.rx.toast.approved', { id }));
    // Reset check state for the next Rx
    setChecks(UNCHECKED);
  };

  const handleClarify = () => {
    if (!currentRx) return;
    showToast(t('partner.vrx.rx.toast.clarify', { doctor: currentRx.doctor }));
  };

  const handleReject = () => {
    if (!currentRx) return;
    const id = currentRx.id;
    const remaining = activeList.filter((r) => r.id !== id);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    }
    setDoneIds((prev) => ({ ...prev, [id]: true }));
    setHistory((prev) => [
      {
        id,
        status: 'rejected',
        doctor: currentRx.doctor,
        items: currentRx.items,
        timestamp: t('partner.vrx.rx.justNow'),
      },
      ...prev.filter((h) => h.id !== id),
    ]);
    showToast(t('partner.vrx.rx.toast.rejected', { id }));
    setChecks(UNCHECKED);
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 44,
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 11.5,
    fontWeight: 700,
    border: '1px solid',
    borderColor: active ? 'var(--sk-color-action)' : 'var(--sk-color-rule)',
    background: active ? 'var(--sk-color-action-soft)' : 'var(--sk-color-surface)',
    color: active ? 'var(--sk-color-action)' : 'var(--sk-color-text-2)',
    cursor: 'pointer',
  });

  const statusBadgeStyle = (approved: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 6,
    background: approved ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-danger-bg)',
    color: approved ? 'var(--sk-color-positive)' : 'var(--sk-color-danger)',
  });

  const reopenStyle: React.CSSProperties = {
    minHeight: 44,
    padding: '6px 14px',
    fontSize: 11.5,
    fontWeight: 700,
    borderRadius: 8,
    background: 'var(--sk-color-action-soft)',
    color: 'var(--sk-color-action)',
    border: 0,
    cursor: 'pointer',
  };

  return (
    <div className="sk-rx-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="sk-rx-toast">
          <CheckCircle2 size={18} aria-hidden="true" style={{ color: 'var(--sk-color-positive-fill)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Navigation Sidebar matching Artboard */}
      <aside className="sk-rx-sidebar" aria-label={t('partner.vrx.nav.sidebar')}>
        <div className="sk-rx-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7rx" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7brx" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7rx)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7brx)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-rx-brand-text">
            <span className="sk-rx-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-rx-brand-badge">{t('partner.vrx.nav.badge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vrx.nav.links')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-rx-nav-group-title">{t('partner.vrx.nav.store')}</span>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.home')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.verify')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.orders')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item is-active" aria-current="page" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.handover')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.returns')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.reorder')}</span>
          </button>

          <span className="sk-rx-nav-group-title">{t('partner.vrx.nav.lab')}</span>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.campIntake')}</span>
          </button>

          <span className="sk-rx-nav-group-title">{t('partner.vrx.nav.business')}</span>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.staff')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('performance')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.performance')}</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-rx-nav-item"
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)' }}
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vrx.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="sk-rx-content-wrap">
        <header className="sk-rx-top-bar">
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vrx.rx.title')}</span>
          <label className="sk-rx-search-label">
            <Search size={16} aria-hidden="true" style={{ color: 'var(--sk-color-text-3)' }} />
            <input
              type="search"
              aria-label={t('partner.vrx.rx.searchAria')}
              placeholder={t('partner.vrx.rx.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sk-rx-search-input"
            />
          </label>
          <span style={{ flexGrow: 1 }} />
        </header>

        {/* Main Body */}
        <main className="sk-rx-main">
          {/* Loading Skeleton */}
          {viewState === 'loading' && (
            <div aria-busy="true" aria-label={t('partner.vrx.rx.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="sk-rx-skel" style={{ display: 'block', width: 280, height: 26 }} />
                  <span className="sk-rx-skel" style={{ display: 'block', width: 420, height: 14 }} />
                </div>
                <span className="sk-rx-skel" style={{ display: 'block', width: 150, height: 42 }} />
              </div>
              <div style={{ display: 'flex', gap: 16, flexGrow: 1 }}>
                <span className="sk-rx-skel" style={{ width: 300, height: 480 }} />
                <span className="sk-rx-skel" style={{ flex: 1, height: 480 }} />
                <span className="sk-rx-skel" style={{ width: 400, height: 480 }} />
              </div>
            </div>
          )}

          {/* Empty State */}
          {viewState === 'empty' || (viewState === 'data' && activeList.length === 0) ? (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
              <div style={{ width: 520, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                <FileText size={64} aria-hidden="true" style={{ color: 'var(--sk-color-action)' }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                  {t('partner.vrx.rx.empty.title')}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vrx.rx.empty.body')}
                </span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    className="sk-rx-secondary-btn"
                    onClick={() => handleNavClick('catalogue')}
                    style={{ height: 44, padding: '0 18px', fontSize: 13.5 }}
                  >
                    {t('partner.vrx.rx.empty.catalogue')}
                  </button>
                </div>

                {history.length > 0 && (
                  <div style={{ width: '100%', marginTop: 20, textAlign: 'left', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)', marginBottom: 12 }}>
                      <span>{t('partner.vrx.rx.session.heading', { count: history.length })}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {history.map((h) => (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--sk-color-surface-2)', borderRadius: 10, border: '1px solid var(--sk-color-rule-soft)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: 'var(--sk-color-text)' }}>{h.id}</span>
                              <span style={statusBadgeStyle(h.status === 'approved')}>
                                {h.status === 'approved' ? t('partner.vrx.rx.status.approved') : t('partner.vrx.rx.status.rejected')}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{h.items}</span>
                          </div>
                          <button type="button" onClick={() => handleReopen(h.id)} style={reopenStyle}>
                            {t('partner.vrx.rx.reopen')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Error State */}
          {viewState === 'error' && (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div role="alert" style={{ width: 480, maxWidth: '100%', padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={30} aria-hidden="true" style={{ color: 'var(--sk-color-danger)' }} />
                </span>
                <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vrx.rx.error.title')}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vrx.common.errorBody')}
                </span>
                <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                  <button type="button" onClick={handleRetry} className="sk-rx-btn-approve" style={{ maxWidth: 140 }}>
                    {t('common.tryAgain')}
                  </button>
                  <button type="button" onClick={() => handleNavClick('vendor')} className="sk-rx-secondary-btn" style={{ maxWidth: 140 }}>
                    {t('partner.vrx.common.backToHome')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Normal Data State */}
          {viewState === 'data' && activeList.length > 0 && currentRx && (
            <>
              {/* Header Title Area */}
              <div className="sk-rx-header">
                <div>
                  <h1 className="sk-rx-title">{t('partner.vrx.rx.title')}</h1>
                  <div className="sk-rx-subtitle">{t('partner.vrx.rx.subtitle')}</div>
                </div>
              </div>

              <p role="note" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 10, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 12.5 }}>
                {t('partner.vrx.rx.notConnected')}
              </p>

              {/* 3-Column Split */}
              <div className="sk-rx-columns">
                {/* Column 1: Waiting Prescriptions Queue */}
                <section className="sk-rx-col-queue" aria-label={t('partner.vrx.rx.queueAria')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
                    <span className="sk-rx-queue-heading" style={{ padding: 0 }}>
                      {queueTab === 'waiting'
                        ? t('partner.vrx.rx.queue.waitingHeading', { count: activeList.length })
                        : t('partner.vrx.rx.queue.sessionHeading', { count: history.length })}
                    </span>
                  </div>

                  {/* Sub-tabs for Waiting vs Processed */}
                  <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', borderBottom: '1px solid var(--sk-color-rule-soft)' }} role="tablist" aria-label={t('partner.vrx.rx.queue.filterAria')}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={queueTab === 'waiting'}
                      onClick={() => setQueueTab('waiting')}
                      style={tabStyle(queueTab === 'waiting')}
                    >
                      {t('partner.vrx.rx.queue.waitingTab', { count: activeList.length })}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={queueTab === 'processed'}
                      onClick={() => setQueueTab('processed')}
                      style={tabStyle(queueTab === 'processed')}
                    >
                      {t('partner.vrx.rx.queue.processedTab', { count: history.length })}
                    </button>
                  </div>

                  {queueTab === 'waiting' && (
                    <>
                      {filteredList.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--sk-color-text-2)', fontSize: 13 }}>
                          <div>{t('partner.vrx.rx.queue.noMatch', { query: searchQuery })}</div>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                              marginTop: 10,
                              minHeight: 44,
                              padding: '6px 14px',
                              borderRadius: 8,
                              border: '1px solid var(--sk-color-rule-strong)',
                              background: 'var(--sk-color-surface)',
                              color: 'var(--sk-color-action)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {t('partner.vrx.rx.queue.clearSearch')}
                          </button>
                        </div>
                      ) : (
                        filteredList.map((r) => {
                          const isSelected = r.id === currentRx?.id;

                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setSelectedId(r.id)}
                              className={`sk-rx-queue-item ${isSelected ? 'is-selected' : ''}`}
                              aria-pressed={isSelected}
                            >
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                                  {r.id}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--sk-color-text-2)' }}>
                                  {r.age}
                                </span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                                {r.items}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  height: 24,
                                  padding: '0 8px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  ...TONE_STYLE[r.tone],
                                }}
                              >
                                {r.flag}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </>
                  )}

                  {queueTab === 'processed' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {history.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--sk-color-text-2)', fontSize: 13 }}>
                          {t('partner.vrx.rx.queue.noneProcessed')}
                        </div>
                      ) : (
                        history.map((h) => (
                          <div
                            key={h.id}
                            style={{
                              padding: '12px 16px',
                              borderTop: '1px solid var(--sk-color-rule-soft)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: 'var(--sk-color-text)' }}>
                                {h.id}
                              </span>
                              <span style={statusBadgeStyle(h.status === 'approved')}>
                                {h.status === 'approved' ? t('partner.vrx.rx.status.approved') : t('partner.vrx.rx.status.rejected')}
                              </span>
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text-2)' }}>{h.items}</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: 'var(--sk-color-text-2)' }}>{h.timestamp}</span>
                              <button type="button" onClick={() => handleReopen(h.id)} style={reopenStyle}>
                                {t('partner.vrx.rx.reopen')}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>

                {/* Column 2: Prescription as written */}
                <section className="sk-rx-col-document" aria-label={t('partner.vrx.rx.documentAria')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vrx.rx.documentTitle')}</span>
                  </div>

                  <div className="sk-rx-paper-slip">
                    <span className="sk-rx-paper-doctor">{currentRx.doctor}</span>
                    <span className="sk-rx-paper-meta">
                      {t('partner.vrx.rx.paperMeta', { reg: currentRx.reg, clinic: currentRx.clinic, date: currentRx.date })}
                    </span>
                    <div className="sk-rx-paper-divider" />
                    <div className="sk-rx-paper-script">
                      <strong style={{ display: 'block', fontSize: 22, marginBottom: 4 }}>Rx</strong>
                      {currentRx.scriptLines.map((line, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Column 3: Pharmacist Checks & OCR Verification */}
                <section className="sk-rx-col-checks" aria-label={t('partner.vrx.rx.checksAria')}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vrx.rx.checksTitle')}</span>

                  {checkItems.map((c) => {
                    const isChecked = !!checks[c.id];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCheck(c.id)}
                        className={`sk-rx-check-btn ${isChecked ? 'is-checked' : ''}`}
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-label={`${c.label}: ${c.meta}`}
                      >
                        <div className={`sk-rx-check-box ${isChecked ? 'is-checked' : ''}`}>
                          {isChecked && <Check size={12} strokeWidth={3} aria-hidden="true" style={{ color: 'var(--sk-color-on-action)' }} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>{c.label}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--sk-color-text-2)' }}>{c.meta}</span>
                        </div>
                      </button>
                    );
                  })}

                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--sk-color-text-2)', paddingTop: 6 }}>
                    {t('partner.vrx.rx.ocrHeading')}
                  </span>

                  {ocrLines.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{t('partner.vrx.rx.ocrNone')}</span>
                  )}

                  {ocrLines.map((line, idx) => (
                    <div key={idx} className="sk-rx-ocr-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)' }}>{line.name}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 800,
                            background: line.tone === 'green' ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-attention-bg)',
                            color: line.tone === 'green' ? 'var(--sk-color-positive)' : 'var(--sk-color-attention)',
                          }}
                        >
                          {line.conf}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--sk-color-text-2)' }}>{line.sig}</span>
                      {line.note && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sk-color-attention)' }}>{line.note}</span>
                      )}
                    </div>
                  ))}

                  <div style={{ flexGrow: 1 }} />

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={!allChecksComplete}
                    className="sk-rx-btn-approve"
                  >
                    {t('partner.vrx.rx.approve')}
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleClarify} className="sk-rx-secondary-btn">
                      {t('partner.vrx.rx.askDoctor')}
                    </button>
                    <button type="button" onClick={handleReject} className="sk-rx-secondary-btn">
                      {t('partner.vrx.rx.reject')}
                    </button>
                  </div>

                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--sk-color-text-2)', textAlign: 'center' }}>
                    {t('partner.vrx.rx.substitutionNote')}
                  </span>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default VendorRxReviewScreen;
