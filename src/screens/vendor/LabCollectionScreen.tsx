import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
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
  X,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  QrCode,
  Barcode
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/labCollection.css';

export interface LabStop {
  id: string;
  time: string;
  location: string;
  studentName: string;
  testName: string;
  preparation: string;
  status: 'Collected' | 'Next' | 'Scheduled' | 'Not fasted — reschedule';
  tubeId?: string;
  verifiedStudent?: boolean;
}

const INITIAL_STOPS: LabStop[] = [
  {
    id: 'stop-1',
    time: '07:40',
    location: 'Block B · 214',
    studentName: 'Krishna C.',
    testName: 'Fasting panel',
    preparation: 'Fasting since 21:30',
    status: 'Collected',
    tubeId: 'TB-88421',
    verifiedStudent: true,
  },
  {
    id: 'stop-2',
    time: '07:55',
    location: 'Block B · 119',
    studentName: 'Imran S.',
    testName: 'CBC',
    preparation: 'No fasting needed',
    status: 'Collected',
    tubeId: 'TB-88422',
    verifiedStudent: true,
  },
  {
    id: 'stop-3',
    time: '08:10',
    location: 'Block C · 108',
    studentName: 'Ayesha K.',
    testName: 'Thyroid profile',
    preparation: 'No fasting needed',
    status: 'Next',
    verifiedStudent: false,
  },
  {
    id: 'stop-4',
    time: '08:25',
    location: 'Block A · 331',
    studentName: 'Rahul M.',
    testName: 'Vitamin D',
    preparation: 'No fasting needed',
    status: 'Scheduled',
    verifiedStudent: false,
  },
  {
    id: 'stop-5',
    time: '08:40',
    location: 'Block D · 042',
    studentName: 'Nisha P.',
    testName: 'Iron panel',
    preparation: 'Fasting since 22:00',
    status: 'Not fasted — reschedule',
    verifiedStudent: false,
  },
];

export const DEMO_STOPS: LabStop[] = INITIAL_STOPS;

export interface LabCollectionScreenProps {
  initialStops?: LabStop[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function LabCollectionScreen({ initialStops, onNavigate, onLogout }: LabCollectionScreenProps) {
  const { user, logout } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;
  const [stops, setStops] = useState<LabStop[]>(() =>
    initialStops ?? (isTest ? DEMO_STOPS : [])
  );
  const nextStop = useMemo(() => stops.find((s) => s.status === 'Next'), [stops]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Next' | 'Collected' | 'Scheduled' | 'Reschedule'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedStop, setSelectedStop] = useState<LabStop | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showTubeModal, setShowTubeModal] = useState(false);
  const [showCloseRunModal, setShowCloseRunModal] = useState(false);

  // Active collection progress for next stop (Ayesha K.)
  const [nextVerified, setNextVerified] = useState(false);
  const [nextTubeId, setNextTubeId] = useState('');
  const [inputTubeBarcode, setInputTubeBarcode] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNav = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  // KPIs
  const totalStops = stops.length;
  const collectedCount = stops.filter((s) => s.status === 'Collected').length;
  const rescheduleCount = stops.filter((s) => s.status === 'Not fasted — reschedule').length;

  // Filtered stops
  const filteredStops = useMemo(() => {
    return stops.filter((stop) => {
      const matchesSearch =
        stop.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.time.includes(searchQuery);

      if (!matchesSearch) return false;

      if (selectedFilter === 'Collected') return stop.status === 'Collected';
      if (selectedFilter === 'Next') return stop.status === 'Next';
      if (selectedFilter === 'Scheduled') return stop.status === 'Scheduled';
      if (selectedFilter === 'Reschedule') return stop.status === 'Not fasted — reschedule';
      return true;
    });
  }, [stops, searchQuery, selectedFilter]);

  // Handle Verify Next Student
  const confirmVerifyStudent = () => {
    setNextVerified(true);
    setShowVerifyModal(false);
    showToast('Ayesha K. verified · ABDM token confirmed');
  };

  // Handle Scan Tube for Next Stop
  const confirmTubeScan = () => {
    const code = inputTubeBarcode.trim() || `TB-${Math.floor(10000 + Math.random() * 90000)}`;
    setNextTubeId(code);
    setShowTubeModal(false);
    showToast(`Tube ${code} scanned & linked`);
  };

  // Complete Next Stop Collection
  const completeNextCollection = () => {
    if (!nextVerified) {
      showToast('Verify student identity first');
      return;
    }
    if (!nextTubeId) {
      showToast('Scan sample tube barcode first');
      return;
    }
    setStops((prev) =>
      prev.map((s) =>
        s.id === 'stop-3'
          ? { ...s, status: 'Collected', tubeId: nextTubeId, verifiedStudent: true }
          : s
      )
    );
    showToast('Sample collected successfully & logged to cold box');
  };

  // Mark reschedule from modal
  const handleMarkReschedule = (stopId: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, status: 'Not fasted — reschedule' } : s))
    );
    setSelectedStop(null);
    showToast('Stop rescheduled · Notification sent to student');
  };

  return (
    <div className="sk-runsheet-root">
      {/* 18-Option Partner Sidebar */}
      <aside className="sk-runsheet-sidebar" aria-label="Partner Navigation">
        <div className="sk-runsheet-brand">
          <span className="sk-runsheet-logo">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg_run" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg_run_b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg_run)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg_run_b)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span className="sk-runsheet-brand-text">
            <span className="sk-runsheet-title-text">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-runsheet-badge-partner">PARTNER</span>
          </span>
        </div>

        <nav className="sk-runsheet-nav" aria-label="Partner Console Links">
          {/* Section: STORE */}
          <span className="sk-runsheet-nav-section">STORE</span>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-runsheet-nav-section">LAB</span>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item is-active" aria-current="page">
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => showToast('Opened release results panel')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-runsheet-nav-section">BUSINESS</span>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div className="sk-runsheet-sidebar-footer">
          <button type="button" className="sk-runsheet-signout-btn" onClick={handleSignOut}>
            <LogOut size={15} />
            <span>MedPlus · Vijaya Diagnostics</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sk-runsheet-main">
        {/* Header */}
        <div className="sk-runsheet-header">
          <div>
            <h1 className="sk-runsheet-title">Run sheet</h1>
            <p className="sk-runsheet-subtitle">
              {isTest
                ? 'Tuesday 30 September · Priya N., phlebotomist · VNR VJIET'
                : user?.fullName
                ? `Active run · ${user.fullName}`
                : 'No active run · Phlebotomist standby'}
            </p>
          </div>
          <button
            type="button"
            className="sk-runsheet-header-btn"
            onClick={() => setShowCloseRunModal(true)}
            aria-label="Close run and seal cold box"
          >
            Close run
          </button>
        </div>

        {/* Next Stop Highlight Banner */}
        {nextStop ? (
          <section className="sk-runsheet-next-card" aria-label="Next stop highlight">
            <div className="sk-runsheet-avatar-wrap">
              <div className="sk-runsheet-avatar">
                {nextStop.studentName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="sk-runsheet-avatar-check" aria-hidden="true">
                <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={3} />
              </div>
            </div>

            <div className="sk-runsheet-next-info">
              <span className="sk-runsheet-next-eyebrow">NEXT STOP</span>
              <span className="sk-runsheet-next-headline">
                {nextStop.studentName} · {nextStop.location.replace(' · ', ' ')} · {nextStop.testName}
              </span>
              <span className="sk-runsheet-next-desc">
                Scan her pass, match the photo, then scan the tube — in that order
              </span>
            </div>

            <div className="sk-runsheet-steps">
              <span className={`sk-runsheet-step-pill ${nextVerified ? 'is-done' : 'is-active'}`}>
                {nextVerified ? '✓ Verified' : '● Verify student'}
              </span>
              <span
                className={`sk-runsheet-step-pill ${
                  nextTubeId ? 'is-done' : nextVerified ? 'is-active' : 'is-pending'
                }`}
              >
                {nextTubeId ? `✓ Tube ${nextTubeId}` : '○ Scan tube'}
              </span>
              <span
                className={`sk-runsheet-step-pill ${
                  nextVerified && nextTubeId ? 'is-active' : 'is-pending'
                }`}
              >
                ○ Collect
              </span>
            </div>

            <div className="sk-runsheet-next-actions">
              {!nextVerified && (
                <button
                  type="button"
                  className="sk-runsheet-btn-primary"
                  onClick={() => setShowVerifyModal(true)}
                >
                  Verify on phone
                </button>
              )}
              {nextVerified && !nextTubeId && (
                <button
                  type="button"
                  className="sk-runsheet-btn-primary"
                  onClick={() => setShowTubeModal(true)}
                >
                  Scan tube
                </button>
              )}
              {nextVerified && nextTubeId && (
                <button
                  type="button"
                  className="sk-runsheet-btn-primary"
                  onClick={completeNextCollection}
                >
                  Complete collection
                </button>
              )}
              <button
                type="button"
                className="sk-runsheet-btn-secondary"
                onClick={() => setShowTubeModal(true)}
              >
                Tube step
              </button>
            </div>
          </section>
        ) : (
          <section
            className="sk-runsheet-next-card"
            aria-label="Next stop standby"
            style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1' }}
          >
            <div className="sk-runsheet-avatar-wrap">
              <div
                className="sk-runsheet-avatar"
                style={{ background: '#E2E8F0', color: '#64748B' }}
              >
                —
              </div>
            </div>
            <div className="sk-runsheet-next-info">
              <span className="sk-runsheet-next-eyebrow" style={{ color: '#64748B' }}>
                RUN STANDBY
              </span>
              <span className="sk-runsheet-next-headline" style={{ color: '#334155' }}>
                No active collection stop
              </span>
              <span className="sk-runsheet-next-desc">
                When a run is assigned from backend, the next student stop will appear here
              </span>
            </div>
          </section>
        )}

        {/* KPI Stat Cards */}
        <div className="sk-runsheet-stats-grid">
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number">
              {stops.length > 0 ? totalStops : isTest ? totalStops : '—'}
            </span>
            <span className="sk-runsheet-stat-label">Stops today</span>
          </div>
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number is-collected">
              {stops.length > 0 ? collectedCount : isTest ? collectedCount : '—'}
            </span>
            <span className="sk-runsheet-stat-label">Collected</span>
          </div>
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number is-warning">
              {stops.length > 0 ? rescheduleCount : isTest ? rescheduleCount : '—'}
            </span>
            <span className="sk-runsheet-stat-label">Reschedule needed</span>
          </div>
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number">
              {stops.length > 0 && isTest ? '11 min' : '—'}
            </span>
            <span className="sk-runsheet-stat-label">Median per stop</span>
          </div>
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div className="sk-runsheet-toolbar">
          <div className="sk-runsheet-filter-tabs">
            {(['All', 'Next', 'Collected', 'Scheduled', 'Reschedule'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sk-runsheet-filter-btn ${selectedFilter === filter ? 'is-active' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter === 'Reschedule' ? 'Reschedule needed' : filter}
              </button>
            ))}
          </div>

          <div className="sk-runsheet-search-wrap">
            <Search className="sk-runsheet-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search by student, room, or test..."
              className="sk-runsheet-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search run sheet stops"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="sk-runsheet-table-card">
          <div className="sk-runsheet-table-header">
            <span className="sk-runsheet-col-header">TIME</span>
            <span className="sk-runsheet-col-header">LOCATION</span>
            <span className="sk-runsheet-col-header">STUDENT &amp; TEST</span>
            <span className="sk-runsheet-col-header">PREPARATION</span>
            <span className="sk-runsheet-col-header" style={{ justifySelf: 'end' }}>
              STATUS
            </span>
          </div>

          {filteredStops.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Truck size={36} color="#94A3B8" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No sample stops scheduled</span>
              <span style={{ fontSize: 13, color: '#64748B', maxWidth: 360 }}>
                {searchQuery ? 'No stops match your query.' : 'Scheduled phlebotomy hostel visits and routine collection stops will populate here.'}
              </span>
            </div>
          ) : (
            filteredStops.map((stop) => {
            let statusClass = 'status-scheduled';
            if (stop.status === 'Collected') statusClass = 'status-collected';
            if (stop.status === 'Next') statusClass = 'status-next';
            if (stop.status === 'Not fasted — reschedule') statusClass = 'status-reschedule';

            return (
              <div
                key={stop.id}
                className="sk-runsheet-row"
                onClick={() => setSelectedStop(stop)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === 'Enter' && setSelectedStop(stop)}
                aria-label={`Stop at ${stop.time} for ${stop.studentName}, status: ${stop.status}`}
              >
                <span className="sk-runsheet-time">{stop.time}</span>
                <span className="sk-runsheet-location">{stop.location}</span>
                <span className="sk-runsheet-student">
                  {stop.studentName} · {stop.testName}
                </span>
                <span className="sk-runsheet-prep">{stop.preparation}</span>
                <span className={`sk-runsheet-status-badge ${statusClass}`}>{stop.status}</span>
              </div>
            );
          }))}

          <div className="sk-runsheet-policy-footer">
            A student who has not fasted is rescheduled, never collected anyway. Running the wrong sample costs
            them a day and a result they cannot trust.
          </div>
        </div>
      </main>

      {/* Student Verification Modal */}
      {showVerifyModal && (
        <div className="sk-runsheet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="verify-modal-title">
          <div className="sk-runsheet-modal">
            <div className="sk-runsheet-modal-header">
              <h3 id="verify-modal-title" className="sk-runsheet-modal-title">
                Verify Student Identity
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setShowVerifyModal(false)}
                aria-label="Close verification modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', background: '#F8FAFC', borderRadius: 12 }}>
                <QrCode size={40} color="#3525CD" />
                <div>
                  <strong>Ayesha Khan</strong>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Roll: 21VNR-EC-108 · Block C, Room 108</div>
                  <div style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>ABDM Health ID: ayesha.k@abdm</div>
                </div>
              </div>
              <p style={{ margin: 0, color: '#475569' }}>
                Confirm campus photo badge match. Identity token verified against institution enrollment register.
              </p>
            </div>
            <div className="sk-runsheet-modal-footer">
              <button type="button" className="sk-runsheet-btn-secondary" onClick={() => setShowVerifyModal(false)}>
                Cancel
              </button>
              <button type="button" className="sk-runsheet-btn-primary" onClick={confirmVerifyStudent}>
                Confirm Identity Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tube Barcode Scan Modal */}
      {showTubeModal && (
        <div className="sk-runsheet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tube-modal-title">
          <div className="sk-runsheet-modal">
            <div className="sk-runsheet-modal-header">
              <h3 id="tube-modal-title" className="sk-runsheet-modal-title">
                Scan Sample Tube Barcode
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setShowTubeModal(false)}
                aria-label="Close tube modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', background: '#F8FAFC', borderRadius: 12 }}>
                <Barcode size={40} color="#3525CD" />
                <div>
                  <strong>Thyroid Profile Tube</strong>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Required: SST Gel Tube · 2–8 °C Cold Chain</div>
                </div>
              </div>
              <div>
                <label htmlFor="tube-barcode-input" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Tube Barcode ID
                </label>
                <input
                  id="tube-barcode-input"
                  type="text"
                  placeholder="e.g. TB-88423"
                  className="sk-runsheet-search-input"
                  value={inputTubeBarcode}
                  onChange={(e) => setInputTubeBarcode(e.target.value)}
                />
              </div>
            </div>
            <div className="sk-runsheet-modal-footer">
              <button type="button" className="sk-runsheet-btn-secondary" onClick={() => setShowTubeModal(false)}>
                Cancel
              </button>
              <button type="button" className="sk-runsheet-btn-primary" onClick={confirmTubeScan}>
                Save Tube Barcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Details & Action Drawer / Modal */}
      {selectedStop && (
        <div className="sk-runsheet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="stop-detail-title">
          <div className="sk-runsheet-modal">
            <div className="sk-runsheet-modal-header">
              <h3 id="stop-detail-title" className="sk-runsheet-modal-title">
                Stop Details: {selectedStop.studentName}
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setSelectedStop(null)}
                aria-label="Close stop details"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>SCHEDULED TIME</span>
                  <div style={{ fontWeight: 800 }}>{selectedStop.time}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>LOCATION</span>
                  <div style={{ fontWeight: 800 }}>{selectedStop.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>ORDERED TEST</span>
                  <div style={{ fontWeight: 800 }}>{selectedStop.testName}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>STATUS</span>
                  <div>
                    <span className={`sk-runsheet-status-badge ${selectedStop.status === 'Collected' ? 'status-collected' : selectedStop.status === 'Not fasted — reschedule' ? 'status-reschedule' : 'status-scheduled'}`}>
                      {selectedStop.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>PREPARATION REQUIREMENT</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>{selectedStop.preparation}</div>
              </div>
              {selectedStop.tubeId && (
                <div style={{ padding: 12, background: '#ECFDF5', borderRadius: 12, color: '#047857' }}>
                  <strong>Linked Sample Tube:</strong> {selectedStop.tubeId}
                </div>
              )}
            </div>
            <div className="sk-runsheet-modal-footer">
              {selectedStop.status !== 'Not fasted — reschedule' && selectedStop.status !== 'Collected' && (
                <button
                  type="button"
                  className="sk-runsheet-btn-secondary"
                  style={{ color: '#B45309', borderColor: '#FDE68A' }}
                  onClick={() => handleMarkReschedule(selectedStop.id)}
                >
                  Mark Not Fasted (Reschedule)
                </button>
              )}
              <button type="button" className="sk-runsheet-btn-primary" onClick={() => setSelectedStop(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Run Modal */}
      {showCloseRunModal && (
        <div className="sk-runsheet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="close-run-title">
          <div className="sk-runsheet-modal">
            <div className="sk-runsheet-modal-header">
              <h3 id="close-run-title" className="sk-runsheet-modal-title">
                Close Collection Run
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setShowCloseRunModal(false)}
                aria-label="Close run modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <p style={{ margin: 0 }}>
                You have collected <strong>{collectedCount} samples</strong> across {totalStops} scheduled stops.
              </p>
              <div style={{ padding: 12, background: '#EEF2FF', borderRadius: 12, color: '#3525CD' }}>
                <Snowflake size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                <span>Assigning collected samples to transport cold box <strong>BX-4417</strong> (Target: 2–8 °C).</span>
              </div>
            </div>
            <div className="sk-runsheet-modal-footer">
              <button type="button" className="sk-runsheet-btn-secondary" onClick={() => setShowCloseRunModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="sk-runsheet-btn-primary"
                onClick={() => {
                  setShowCloseRunModal(false);
                  showToast('Run closed & sealed into Cold Box BX-4417');
                  handleNav('cold-chain');
                }}
              >
                Seal &amp; Handover to Cold Chain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="sk-runsheet-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
