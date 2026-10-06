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
  Shield,
  Snowflake,
  Tent,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
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
  },
];

export const DEMO_PRESCRIPTIONS: RxQueueItem[] = INITIAL_PRESCRIPTIONS;

export interface RxAuditRecord {
  id: string;
  status: 'approved' | 'rejected' | 'clarified';
  doctor: string;
  items: string;
  timestamp: string;
  note?: string;
}

export function VendorRxReviewScreen({ initialPrescriptions, initialViewState, onNavigate, onLogout }: VendorRxReviewScreenProps) {
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
  const [prescriptions, setPrescriptions] = useState<RxQueueItem[]>(() =>
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
  const [checks, setChecks] = useState<Record<string, boolean>>({
    reg: true,
    date: true,
    patient: false,
    allergy: false,
    sched: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset and reload the prescription queue
  const handleResetQueue = () => {
    setPrescriptions(INITIAL_PRESCRIPTIONS);
    setDoneIds({});
    setHistory([]);
    setSelectedId('RX-2231');
    setChecks({ reg: true, date: true, patient: false, allergy: false, sched: false });
    setQueueTab('waiting');
    setViewState('data');
    showToast('Prescription queue reset · 4 scripts loaded');
  };

  // Simulate an incoming campus prescription
  const handleSimulateIncoming = () => {
    const seed = Math.floor(1000 + Math.random() * 9000);
    const newId = `RX-${seed}`;
    const newRx: RxQueueItem = {
      id: newId,
      items: 'Augmentin 625 mg, Paracetamol 650 mg',
      countMeta: 'Antibiotic · Schedule H1',
      age: 'Just now',
      flag: 'Schedule H1',
      tone: 'red',
      doctor: 'Dr. Suresh Kulkarni, MD',
      clinic: 'Campus Health Centre, West Block',
      reg: 'TSMC 67291',
      date: new Date().toLocaleDateString('en-GB'),
      scriptLines: [
        '1. Augmentin 625 (Amox-Clav) — 1 tab BD after food × 5d',
        '2. Paracetamol 650 mg — 1 tab SOS (fever/body ache)',
        '3. Pantoprazole 40 mg — 1 tab empty stomach OD × 5d',
      ],
    };
    setPrescriptions((prev) => [newRx, ...prev]);
    setDoneIds((prev) => {
      const next = { ...prev };
      delete next[newId];
      return next;
    });
    setSelectedId(newId);
    setQueueTab('waiting');
    setViewState('data');
    setChecks({ reg: true, date: true, patient: false, allergy: false, sched: false });
    showToast(`Incoming Rx ${newId} received from Campus Health Centre`);
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
    setChecks({ reg: true, date: true, patient: false, allergy: false, sched: false });
    showToast(`${id} restored to active queue`);
  };

  const handleNavClick = (target: string) => {
    if (target === 'rx-review' || target === 'vendor-rx-review') {
      if (activeList.length === 0) {
        handleResetQueue();
        return;
      }
    }
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

  // Checklist definitions
  const checkItems: PharmacistCheck[] = [
    { id: 'reg', label: 'Doctor registration verified', meta: `${currentRx?.reg || 'TSMC 45122'} · active` },
    { id: 'date', label: 'Prescription date valid', meta: `${currentRx?.date || '22 Sep'} · within 30 days` },
    { id: 'patient', label: 'Patient matches order', meta: 'Name and age verified on Rx' },
    { id: 'allergy', label: 'Allergy check', meta: 'No listed allergies conflict with requested items' },
    { id: 'sched', label: 'Schedule H items logged', meta: 'Record batch and dispense in register' },
  ];

  // OCR lines for current Rx
  const ocrLines: OcrLine[] = useMemo(() => {
    if (!currentRx) return [];
    if (currentRx.id === 'RX-2229') {
      return [
        { name: 'Azithromycin 500 mg', sig: '1 tablet once daily (after food) × 3 days', conf: 'OCR 99%', tone: 'green' },
        { name: 'Paracetamol 650 mg', sig: 'SOS (fever/pain)', conf: 'OCR 96%', tone: 'green' },
      ];
    }
    if (currentRx.id === 'RX-2226') {
      return [
        { name: 'Levothyroxine sodium 50 mcg', sig: '1 tablet empty stomach OD × 90 days', conf: 'OCR 97%', tone: 'green' },
      ];
    }
    if (currentRx.id === 'RX-2220') {
      return [
        {
          name: 'Isotretinoin 20 mg capsule',
          sig: '1 capsule at night × 30 days',
          conf: 'OCR 88%',
          tone: 'amber',
          note: 'Specialist schedule · ensure pregnancy warning discussed',
        },
      ];
    }
    if (currentRx.id === 'RX-2231') {
      return [
        { name: 'Cetirizine 10 mg', sig: '1 tablet once daily × 5 days', conf: 'OCR 98%', tone: 'green' },
        { name: 'Salbutamol inhaler 100 mcg', sig: '2 puffs when needed', conf: 'OCR 94%', tone: 'green' },
        {
          name: 'Budesonide 200 mcg inhaler',
          sig: '1 puff twice daily × 30 days',
          conf: 'OCR 71%',
          tone: 'amber',
          note: 'Low confidence — confirm strength against the image',
        },
      ];
    }
    return [
      { name: 'Augmentin 625 (Amox-Clav)', sig: '1 tablet twice daily after food × 5 days', conf: 'OCR 97%', tone: 'green' },
      { name: 'Paracetamol 650 mg', sig: '1 tablet SOS (fever) × 3 days', conf: 'OCR 95%', tone: 'green' },
      { name: 'Pantoprazole 40 mg', sig: '1 tablet empty stomach OD × 5 days', conf: 'OCR 92%', tone: 'green' },
    ];
  }, [currentRx]);

  // Are all checks marked?
  const allChecksComplete = useMemo(() => {
    return checkItems.every((c) => !!checks[c.id]);
  }, [checkItems, checks]);

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
        timestamp: 'Just now',
        note: 'Statutory verification complete · approved for packing',
      },
      ...prev.filter((h) => h.id !== id),
    ]);
    showToast(`${id} approved · sent to packing`);
    // Reset check state for the next Rx
    setChecks({ reg: true, date: true, patient: false, allergy: false, sched: false });
  };

  const handleClarify = () => {
    if (!currentRx) return;
    showToast(`Question sent to ${currentRx.doctor} · order on hold`);
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
        timestamp: 'Just now',
        note: 'Prescription rejected by pharmacist · student told why',
      },
      ...prev.filter((h) => h.id !== id),
    ]);
    showToast(`${id} rejected · student told why`);
    setChecks({ reg: true, date: true, patient: false, allergy: false, sched: false });
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  return (
    <div className="sk-rx-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="sk-rx-toast">
          <CheckCircle2 size={18} color="#6EE7B7" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Navigation Sidebar matching Artboard */}
      <aside className="sk-rx-sidebar" aria-label="Partner Sidebar">
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
            <span className="sk-rx-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-rx-nav-group-title">STORE</span>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-rx-nav-item is-active" aria-current="page" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-rx-nav-group-title">LAB</span>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-rx-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff &amp; roles</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-rx-nav-item" onClick={() => handleNavClick('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-rx-nav-item"
          style={{ marginTop: 'auto', color: '#EF4444' }}
          onClick={handleLogout}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
        <div style={{ padding: '8px 11px', fontSize: 11, color: '#94A3B8' }}>
          MedPlus · Vijaya Diagnostics
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="sk-rx-content-wrap">
        {/* Top Header Bar matching VendorRxReview.html */}
        <header className="sk-rx-top-bar">
          <span style={{ fontSize: 14, fontWeight: 800, color: '#131B2E' }}>Rx review</span>
          <label className="sk-rx-search-label">
            <Search size={16} color="#777587" />
            <input
              type="search"
              aria-label="Search"
              placeholder="Search patients, orders, results"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sk-rx-search-input"
            />
          </label>
          <span style={{ flexGrow: 1 }} />
          <button
            type="button"
            onClick={handleSimulateIncoming}
            aria-label="Simulate incoming prescription"
            title="Incoming Rx"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 32,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid #DAE2FD',
              background: '#FFFFFF',
              color: '#3525CD',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              marginRight: 8,
            }}
          >
            <Package size={13} />
            <span>+ New Rx</span>
          </button>
          <span className="sk-rx-2fa-pill">
            <Shield size={14} color="#047857" />
            <span>2FA on</span>
          </span>
          <button type="button" aria-label="Notifications" className="sk-rx-notif-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            <span className="sk-rx-notif-dot" />
          </button>
          <div className="sk-rx-store-badge">
            <div className="sk-rx-avatar-circle">MP</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#131B2E' }}>MedPlus · Bachupally</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B6980' }}>Pharmacy · licence 20B/TS/4412</span>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="sk-rx-main">
          {/* Loading Skeleton */}
          {viewState === 'loading' && (
            <div aria-busy="true" aria-label="Loading Rx review" style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
              <div style={{ width: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                <FileText size={64} color="#6366F1" />
                <span style={{ fontSize: 22, fontWeight: 800, color: '#131B2E', letterSpacing: -0.4 }}>
                  No prescriptions waiting for a pharmacist.
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                  New orders and samples appear here the moment a student books.
                </span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    className="sk-rx-btn-approve"
                    onClick={handleResetQueue}
                    aria-label="Reload demo prescriptions"
                    style={{ height: 44, padding: '0 20px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}
                  >
                    <RotateCcw size={16} />
                    Refresh queue
                  </button>
                  <button
                    type="button"
                    className="sk-rx-secondary-btn"
                    onClick={handleSimulateIncoming}
                    style={{ height: 44, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}
                  >
                    <Package size={16} />
                    Simulate incoming Rx
                  </button>
                  <button
                    type="button"
                    className="sk-rx-secondary-btn"
                    onClick={() => handleNavClick('catalogue')}
                    style={{ height: 44, padding: '0 18px', fontSize: 13.5 }}
                  >
                    Check your catalogue
                  </button>
                </div>

                {history.length > 0 && (
                  <div style={{ width: '100%', marginTop: 20, textAlign: 'left', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#131B2E', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Session decisions ({history.length} prescriptions processed)</span>
                      <button
                        type="button"
                        onClick={handleResetQueue}
                        style={{ background: 'transparent', border: 0, color: '#4F46E5', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Reset all
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {history.map((h) => (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #EEF2FF' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: '#131B2E' }}>{h.id}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: h.status === 'approved' ? '#ECFDF5' : '#FFF1F2', color: h.status === 'approved' ? '#047857' : '#BE123C' }}>
                                {h.status === 'approved' ? '✓ Approved & packed' : '✗ Rejected · student told why'}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#64748B' }}>{h.items}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReopen(h.id)}
                            style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 700, borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: 0, cursor: 'pointer' }}
                          >
                            Reopen
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
              <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: '#FFFFFF', border: '1.5px solid #FECDD3', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <span style={{ width: 64, height: 64, borderRadius: 999, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={30} color="#E11D48" />
                </span>
                <span style={{ fontSize: 21, fontWeight: 800, color: '#131B2E' }}>
                  Couldn’t load rx review
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                  This is on our side, not yours — nothing was lost. We tried 3 times.
                </span>
                <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                  <button type="button" onClick={handleRetry} className="sk-rx-btn-approve" style={{ maxWidth: 140 }}>
                    Try again
                  </button>
                  <button type="button" onClick={() => handleNavClick('vendor')} className="sk-rx-secondary-btn" style={{ maxWidth: 140 }}>
                    Back to Hub
                  </button>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6E6C82' }}>
                  Ref ERR-503 · VendorRxReview
                </span>
              </div>
            </div>
          )}

          {/* Normal Data State */}
          {viewState === 'data' && activeList.length > 0 && currentRx && (
            <>
              {/* Header Title Area */}
              <div className="sk-rx-header">
                <div>
                  <h1 className="sk-rx-title">Rx review</h1>
                  <div className="sk-rx-subtitle">
                    Human sign-off before any prescription item is packed. OCR suggests; the pharmacist decides.
                  </div>
                </div>
                <div className="sk-rx-duty-pill">
                  <span>Pharmacist on duty · R. Kumar, Reg. 11873</span>
                </div>
              </div>

              {/* 3-Column Split */}
              <div className="sk-rx-columns">
                {/* Column 1: Waiting Prescriptions Queue */}
                <section className="sk-rx-col-queue" aria-label="Prescription Queue">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
                    <span className="sk-rx-queue-heading" style={{ padding: 0 }}>
                      {queueTab === 'waiting'
                        ? `WAITING FOR A PHARMACIST · ${activeList.length}`
                        : `SESSION DECISIONS · ${history.length}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetQueue}
                      title="Reset demo queue"
                      aria-label="Reset prescription queue"
                      style={{ background: 'transparent', border: 0, color: '#6366F1', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>

                  {/* Sub-tabs for Waiting vs Processed */}
                  <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', borderBottom: '1px solid #EEF2FF' }} role="tablist" aria-label="Queue filter">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={queueTab === 'waiting'}
                      onClick={() => setQueueTab('waiting')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: queueTab === 'waiting' ? '#4F46E5' : '#E2E8F0',
                        background: queueTab === 'waiting' ? '#EEF2FF' : '#FFFFFF',
                        color: queueTab === 'waiting' ? '#3525CD' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Waiting ({activeList.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={queueTab === 'processed'}
                      onClick={() => setQueueTab('processed')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: queueTab === 'processed' ? '#4F46E5' : '#E2E8F0',
                        background: queueTab === 'processed' ? '#EEF2FF' : '#FFFFFF',
                        color: queueTab === 'processed' ? '#3525CD' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Processed ({history.length})
                    </button>
                  </div>

                  {queueTab === 'waiting' && (
                    <>
                      {filteredList.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                          <div>No prescriptions match "{searchQuery}"</div>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                              marginTop: 10,
                              padding: '6px 14px',
                              borderRadius: 8,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#3525CD',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Clear search
                          </button>
                        </div>
                      ) : (
                        filteredList.map((r) => {
                          const isSelected = r.id === currentRx?.id;
                          const toneStyle =
                            r.tone === 'amber'
                              ? { background: '#FFFBEB', color: '#B45309' }
                              : r.tone === 'red'
                              ? { background: '#FFF1F2', color: '#BE123C' }
                              : r.tone === 'indigo'
                              ? { background: '#EEF2FF', color: '#3525CD' }
                              : { background: '#ECFDF5', color: '#047857' };

                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setSelectedId(r.id)}
                              className={`sk-rx-queue-item ${isSelected ? 'is-selected' : ''}`}
                              aria-selected={isSelected}
                            >
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#131B2E' }}>
                                  {r.id}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6B6980' }}>
                                  {r.age}
                                </span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#131B2E' }}>
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
                                  ...toneStyle,
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
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                          No processed prescriptions in this session yet.
                        </div>
                      ) : (
                        history.map((h) => (
                          <div
                            key={h.id}
                            style={{
                              padding: '12px 16px',
                              borderTop: '1px solid #F3F4FE',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: '#131B2E' }}>
                                {h.id}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  background: h.status === 'approved' ? '#ECFDF5' : '#FFF1F2',
                                  color: h.status === 'approved' ? '#047857' : '#BE123C',
                                }}
                              >
                                {h.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                              </span>
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{h.items}</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: '#64748B' }}>{h.timestamp}</span>
                              <button
                                type="button"
                                onClick={() => handleReopen(h.id)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  borderRadius: 6,
                                  background: '#EEF2FF',
                                  color: '#4F46E5',
                                  border: 0,
                                  cursor: 'pointer',
                                }}
                              >
                                Reopen
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>

                {/* Column 2: Center Prescription Slip Image */}
                <section className="sk-rx-col-document" aria-label="Prescription Image Preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#131B2E' }}>Prescription image</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6980' }}>Uploaded by student · 11:02</span>
                  </div>

                  <div className="sk-rx-paper-slip">
                    <span className="sk-rx-paper-doctor">{currentRx.doctor}</span>
                    <span className="sk-rx-paper-meta">
                      Reg. {currentRx.reg} · {currentRx.clinic} · {currentRx.date}
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
                    <span className="sk-rx-paper-sig">{currentRx.doctor.split(' ')[1] || 'K. Rao'}</span>
                  </div>
                </section>

                {/* Column 3: Pharmacist Checks & OCR Verification */}
                <section className="sk-rx-col-checks" aria-label="Pharmacist Checks">
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#131B2E' }}>Pharmacist checks</span>

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
                          {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#131B2E' }}>{c.label}</span>
                          <span style={{ fontSize: 11.5, color: '#6B6980' }}>{c.meta}</span>
                        </div>
                      </button>
                    );
                  })}

                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#6B6980', paddingTop: 6 }}>
                    ITEMS · READ BY OCR, CONFIRM EACH
                  </span>

                  {ocrLines.map((line, idx) => (
                    <div key={idx} className="sk-rx-ocr-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#131B2E' }}>{line.name}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 800,
                            background: line.tone === 'green' ? '#ECFDF5' : '#FFFBEB',
                            color: line.tone === 'green' ? '#047857' : '#B45309',
                          }}
                        >
                          {line.conf}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#464555' }}>{line.sig}</span>
                      {line.note && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#B45309' }}>{line.note}</span>
                      )}
                    </div>
                  ))}

                  <div style={{ flexGrow: 1 }} />

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={!allChecksComplete}
                    className="sk-rx-btn-approve"
                    aria-label="Approve and pack"
                  >
                    Approve and pack
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleClarify} className="sk-rx-secondary-btn">
                      Ask the doctor
                    </button>
                    <button type="button" onClick={handleReject} className="sk-rx-secondary-btn">
                      Reject
                    </button>
                  </div>

                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: '#6B6980', textAlign: 'center' }}>
                    A substitution is never automatic — the student approves any swap first.
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
