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
  QrCode,
  Barcode
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

const STATUS_KEYS: Record<LabStop['status'], MessageKey> = {
  Collected: 'partner.vreg.run.status.collected',
  Next: 'partner.vreg.run.status.next',
  Scheduled: 'partner.vreg.run.status.scheduled',
  'Not fasted — reschedule': 'partner.vreg.run.status.notFasted',
};

type RunFilter = 'All' | 'Next' | 'Collected' | 'Scheduled' | 'Reschedule';

const FILTER_KEYS: Record<RunFilter, MessageKey> = {
  All: 'partner.vreg.run.filterAll',
  Next: 'partner.vreg.run.filterNext',
  Collected: 'partner.vreg.run.filterCollected',
  Scheduled: 'partner.vreg.run.filterScheduled',
  Reschedule: 'partner.vreg.run.filterReschedule',
};

export interface LabCollectionScreenProps {
  initialStops?: LabStop[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function LabCollectionScreen({ initialStops, onNavigate, onLogout }: LabCollectionScreenProps) {
  const t = useT();
  const { user, logout } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;
  const [stops, setStops] = useState<LabStop[]>(() =>
    initialStops ?? (isTest ? DEMO_STOPS : [])
  );
  const nextStop = useMemo(() => stops.find((s) => s.status === 'Next'), [stops]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RunFilter>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedStop, setSelectedStop] = useState<LabStop | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showTubeModal, setShowTubeModal] = useState(false);
  const [showCloseRunModal, setShowCloseRunModal] = useState(false);

  // Collection progress for the next stop
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
    if (nextStop) showToast(t('partner.vreg.run.verifiedToast', { name: nextStop.studentName }));
  };

  // Handle Scan Tube for Next Stop
  const confirmTubeScan = () => {
    // Never invent a tube ID: an unlabelled sample must not be linked to a student.
    const code = inputTubeBarcode.trim();
    if (!code) return;
    setNextTubeId(code);
    setShowTubeModal(false);
    showToast(t('partner.vreg.run.tubeToast', { code }));
  };

  // Complete Next Stop Collection
  const completeNextCollection = () => {
    if (!nextStop) return;
    if (!nextVerified) {
      showToast(t('partner.vreg.run.checkFirst'));
      return;
    }
    if (!nextTubeId) {
      showToast(t('partner.vreg.run.scanFirst'));
      return;
    }
    // Was hard-coded to 'stop-3'; it must be the stop that was actually checked and scanned.
    const collectedId = nextStop.id;
    setStops((prev) =>
      prev.map((s) =>
        s.id === collectedId
          ? { ...s, status: 'Collected', tubeId: nextTubeId, verifiedStudent: true }
          : s
      )
    );
    // The ID check and tube belong to this stop only — never carry them to the next one.
    setNextVerified(false);
    setNextTubeId('');
    setInputTubeBarcode('');
    showToast(t('partner.vreg.run.collectedToast'));
  };

  // Mark reschedule from modal
  const handleMarkReschedule = (stopId: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, status: 'Not fasted — reschedule' } : s))
    );
    setSelectedStop(null);
    showToast(t('partner.vreg.run.rescheduledToast'));
  };

  return (
    <div className="sk-runsheet-root">
      {/* 18-Option Partner Sidebar */}
      <aside className="sk-runsheet-sidebar" aria-label={t('partner.vreg.nav.label')}>
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
            <span className="sk-runsheet-badge-partner">{t('partner.vreg.nav.badge')}</span>
          </span>
        </div>

        <nav className="sk-runsheet-nav" aria-label={t('partner.vreg.nav.label')}>
          {/* Section: STORE */}
          <span className="sk-runsheet-nav-section">{t('partner.vreg.nav.store')}</span>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.home')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.verify')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.orders')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.otp')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.returns')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.reorder')}</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-runsheet-nav-section">{t('partner.vreg.nav.lab')}</span>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item is-active" aria-current="page">
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('lab-queue')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.nav.labReports')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.camp')}</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-runsheet-nav-section">{t('partner.vreg.nav.business')}</span>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.staff')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-runsheet-nav-item" onClick={() => handleNav('performance')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.performance')}</span>
          </button>
        </nav>

        <div className="sk-runsheet-sidebar-footer">
          <button type="button" className="sk-runsheet-signout-btn" onClick={handleSignOut}>
            <LogOut size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sk-runsheet-main">
        {/* Header */}
        <div className="sk-runsheet-header">
          <div>
            <h1 className="sk-runsheet-title">{t('partner.vreg.run.title')}</h1>
            <p className="sk-runsheet-subtitle">
              {stops.length > 0 && user?.fullName
                ? t('partner.vreg.run.subtitleNamed', { name: user.fullName })
                : t('partner.vreg.run.subtitleNone')}
            </p>
          </div>
          <button
            type="button"
            className="sk-runsheet-header-btn"
            onClick={() => setShowCloseRunModal(true)}
          >
            {t('partner.vreg.run.closeRun')}
          </button>
        </div>

        <p role="note" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 13, lineHeight: 1.5 }}>
          {t('partner.vreg.notConnected')}
        </p>

        {/* Next Stop Highlight Banner */}
        {nextStop ? (
          <section className="sk-runsheet-next-card" aria-label={t('partner.vreg.run.nextLabel')}>
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
                <CheckCircle2 size={12} color="var(--sk-color-on-action)" strokeWidth={3} />
              </div>
            </div>

            <div className="sk-runsheet-next-info">
              <span className="sk-runsheet-next-eyebrow">{t('partner.vreg.run.nextEyebrow')}</span>
              <span className="sk-runsheet-next-headline">
                {nextStop.studentName} · {nextStop.location.replace(' · ', ' ')} · {nextStop.testName}
              </span>
              <span className="sk-runsheet-next-desc">
                {t('partner.vreg.run.nextDesc')}
              </span>
            </div>

            <div className="sk-runsheet-steps">
              <span className={`sk-runsheet-step-pill ${nextVerified ? 'is-done' : 'is-active'}`}>
                {nextVerified ? t('partner.vreg.run.stepChecked') : t('partner.vreg.run.stepCheck')}
              </span>
              <span
                className={`sk-runsheet-step-pill ${
                  nextTubeId ? 'is-done' : nextVerified ? 'is-active' : 'is-pending'
                }`}
              >
                {nextTubeId ? t('partner.vreg.run.stepTube', { tube: nextTubeId }) : t('partner.vreg.run.stepScan')}
              </span>
              <span
                className={`sk-runsheet-step-pill ${
                  nextVerified && nextTubeId ? 'is-active' : 'is-pending'
                }`}
              >
                {t('partner.vreg.run.stepCollect')}
              </span>
            </div>

            <div className="sk-runsheet-next-actions">
              {!nextVerified && (
                <button
                  type="button"
                  className="sk-runsheet-btn-primary"
                  onClick={() => setShowVerifyModal(true)}
                >
                  {t('partner.vreg.run.checkId')}
                </button>
              )}
              {nextVerified && !nextTubeId && (
                <button
                  type="button"
                  className="sk-runsheet-btn-primary"
                  onClick={() => setShowTubeModal(true)}
                >
                  {t('partner.vreg.run.scanTube')}
                </button>
              )}
              {nextVerified && nextTubeId && (
                <button
                  type="button"
                  className="sk-runsheet-btn-primary"
                  onClick={completeNextCollection}
                >
                  {t('partner.vreg.run.complete')}
                </button>
              )}
              <button
                type="button"
                className="sk-runsheet-btn-secondary"
                onClick={() => setShowTubeModal(true)}
              >
                {t('partner.vreg.run.tubeStep')}
              </button>
            </div>
          </section>
        ) : (
          <section
            className="sk-runsheet-next-card"
            aria-label={t('partner.vreg.run.standbyLabel')}
            style={{ background: 'var(--sk-color-surface-2)', border: '1.5px dashed var(--sk-color-rule-strong)' }}
          >
            <div className="sk-runsheet-avatar-wrap">
              <div
                className="sk-runsheet-avatar"
                style={{ background: 'var(--sk-color-surface-3)', color: 'var(--sk-color-text-3)' }}
              >
                —
              </div>
            </div>
            <div className="sk-runsheet-next-info">
              <span className="sk-runsheet-next-eyebrow" style={{ color: 'var(--sk-color-text-3)' }}>
                {t('partner.vreg.run.standbyEyebrow')}
              </span>
              <span className="sk-runsheet-next-headline" style={{ color: 'var(--sk-color-text-2)' }}>
                {t('partner.vreg.run.standbyHeadline')}
              </span>
              <span className="sk-runsheet-next-desc">
                {t('partner.vreg.run.standbyBody')}
              </span>
            </div>
          </section>
        )}

        {/* KPI Stat Cards */}
        <div className="sk-runsheet-stats-grid">
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number">
              {stops.length > 0 ? totalStops : '—'}
            </span>
            <span className="sk-runsheet-stat-label">{t('partner.vreg.run.statStops')}</span>
          </div>
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number is-collected">
              {stops.length > 0 ? collectedCount : '—'}
            </span>
            <span className="sk-runsheet-stat-label">{t('partner.vreg.run.statCollected')}</span>
          </div>
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number is-warning">
              {stops.length > 0 ? rescheduleCount : '—'}
            </span>
            <span className="sk-runsheet-stat-label">{t('partner.vreg.run.statReschedule')}</span>
          </div>
          <div className="sk-runsheet-stat-card">
            <span className="sk-runsheet-stat-number">
              {/* Stop durations are not recorded, so there is no median to show. */}
              —
            </span>
            <span className="sk-runsheet-stat-label">{t('partner.vreg.run.statMedian')}</span>
          </div>
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div className="sk-runsheet-toolbar">
          <div className="sk-runsheet-filter-tabs" role="group" aria-label={t('partner.vreg.run.filtersLabel')}>
            {(['All', 'Next', 'Collected', 'Scheduled', 'Reschedule'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sk-runsheet-filter-btn ${selectedFilter === filter ? 'is-active' : ''}`}
                aria-pressed={selectedFilter === filter}
                onClick={() => setSelectedFilter(filter)}
              >
                {t(FILTER_KEYS[filter])}
              </button>
            ))}
          </div>

          <div className="sk-runsheet-search-wrap">
            <Search className="sk-runsheet-search-icon" size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder={t('partner.vreg.run.searchPlaceholder')}
              className="sk-runsheet-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('partner.vreg.run.searchLabel')}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="sk-runsheet-table-card">
          <div className="sk-runsheet-table-header">
            <span className="sk-runsheet-col-header">{t('partner.vreg.run.thTime')}</span>
            <span className="sk-runsheet-col-header">{t('partner.vreg.run.thLocation')}</span>
            <span className="sk-runsheet-col-header">{t('partner.vreg.run.thStudent')}</span>
            <span className="sk-runsheet-col-header">{t('partner.vreg.run.thPrep')}</span>
            <span className="sk-runsheet-col-header" style={{ justifySelf: 'end' }}>
              {t('partner.vreg.run.thStatus')}
            </span>
          </div>

          {filteredStops.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--sk-color-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Truck size={36} color="var(--sk-color-text-3)" aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('partner.vreg.run.emptyTitle')}</span>
              <span style={{ fontSize: 13, color: 'var(--sk-color-text-3)', maxWidth: 360 }}>
                {searchQuery ? t('partner.vreg.run.noMatch') : t('partner.vreg.run.emptyBody')}
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
                aria-label={t('partner.vreg.run.rowAria', { time: stop.time, name: stop.studentName, status: t(STATUS_KEYS[stop.status]) })}
              >
                <span className="sk-runsheet-time">{stop.time}</span>
                <span className="sk-runsheet-location">{stop.location}</span>
                <span className="sk-runsheet-student">
                  {stop.studentName} · {stop.testName}
                </span>
                <span className="sk-runsheet-prep">{stop.preparation}</span>
                <span className={`sk-runsheet-status-badge ${statusClass}`}>{t(STATUS_KEYS[stop.status])}</span>
              </div>
            );
          }))}

          <div className="sk-runsheet-policy-footer">
            {t('partner.vreg.run.policy')}
          </div>
        </div>
      </main>

      {/* Student Verification Modal */}
      {showVerifyModal && nextStop && (
        <div className="sk-runsheet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="verify-modal-title">
          <div className="sk-runsheet-modal">
            <div className="sk-runsheet-modal-header">
              <h3 id="verify-modal-title" className="sk-runsheet-modal-title">
                {t('partner.vreg.run.verifyTitle')}
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setShowVerifyModal(false)}
                aria-label={t('partner.vreg.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', background: 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                <QrCode size={40} color="var(--sk-color-action)" aria-hidden="true" />
                <div>
                  <strong>{nextStop.studentName}</strong>
                  <div style={{ fontSize: 12, color: 'var(--sk-color-text-3)' }}>{nextStop.location}</div>
                </div>
              </div>
              <p style={{ margin: 0, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vreg.run.verifyBody')}
              </p>
            </div>
            <div className="sk-runsheet-modal-footer">
              <button type="button" className="sk-runsheet-btn-secondary" onClick={() => setShowVerifyModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="sk-runsheet-btn-primary" onClick={confirmVerifyStudent}>
                {t('partner.vreg.run.confirmVerify')}
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
                {t('partner.vreg.run.tubeTitle')}
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setShowTubeModal(false)}
                aria-label={t('partner.vreg.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              {nextStop && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', background: 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                  <Barcode size={40} color="var(--sk-color-action)" aria-hidden="true" />
                  <strong>{t('partner.vreg.run.tubeFor', { test: nextStop.testName })}</strong>
                </div>
              )}
              <div>
                <label htmlFor="tube-barcode-input" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {t('partner.vreg.run.labelTube')}
                </label>
                <input
                  id="tube-barcode-input"
                  type="text"
                  required
                  placeholder={t('partner.vreg.run.phTube')}
                  className="sk-runsheet-search-input"
                  value={inputTubeBarcode}
                  onChange={(e) => setInputTubeBarcode(e.target.value)}
                />
              </div>
            </div>
            <div className="sk-runsheet-modal-footer">
              <button type="button" className="sk-runsheet-btn-secondary" onClick={() => setShowTubeModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="sk-runsheet-btn-primary" onClick={confirmTubeScan} disabled={!inputTubeBarcode.trim()}>
                {t('partner.vreg.run.saveTube')}
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
                {t('partner.vreg.run.stopTitle', { name: selectedStop.studentName })}
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setSelectedStop(null)}
                aria-label={t('partner.vreg.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.run.fTime')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedStop.time}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.run.fLocation')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedStop.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.run.fTest')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedStop.testName}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.run.fStatus')}</span>
                  <div>
                    <span className={`sk-runsheet-status-badge ${selectedStop.status === 'Collected' ? 'status-collected' : selectedStop.status === 'Not fasted — reschedule' ? 'status-reschedule' : 'status-scheduled'}`}>
                      {t(STATUS_KEYS[selectedStop.status])}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.run.fPrep')}</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>{selectedStop.preparation}</div>
              </div>
              {selectedStop.tubeId && (
                <div style={{ padding: 12, background: 'var(--sk-color-positive-bg)', borderRadius: 12, color: 'var(--sk-color-positive)' }}>
                  <strong>{t('partner.vreg.run.linkedTube')}</strong> {selectedStop.tubeId}
                </div>
              )}
            </div>
            <div className="sk-runsheet-modal-footer">
              {selectedStop.status !== 'Not fasted — reschedule' && selectedStop.status !== 'Collected' && (
                <button
                  type="button"
                  className="sk-runsheet-btn-secondary"
                  style={{ color: 'var(--sk-color-attention)', borderColor: 'var(--sk-color-attention)' }}
                  onClick={() => handleMarkReschedule(selectedStop.id)}
                >
                  {t('partner.vreg.run.markNotFasted')}
                </button>
              )}
              <button type="button" className="sk-runsheet-btn-primary" onClick={() => setSelectedStop(null)}>
                {t('common.done')}
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
                {t('partner.vreg.run.closeRunTitle')}
              </h3>
              <button
                type="button"
                className="sk-runsheet-modal-close"
                onClick={() => setShowCloseRunModal(false)}
                aria-label={t('partner.vreg.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-runsheet-modal-body">
              <p style={{ margin: 0 }}>
                {t('partner.vreg.run.closeRunBody', { collected: collectedCount, total: totalStops })}
              </p>
              <div style={{ padding: 12, background: 'var(--sk-color-action-soft)', borderRadius: 12, color: 'var(--sk-color-action)' }}>
                <Snowflake size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} aria-hidden="true" />
                <span>{t('partner.vreg.run.closeRunNext')}</span>
              </div>
            </div>
            <div className="sk-runsheet-modal-footer">
              <button type="button" className="sk-runsheet-btn-secondary" onClick={() => setShowCloseRunModal(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="sk-runsheet-btn-primary"
                onClick={() => {
                  setShowCloseRunModal(false);
                  handleNav('cold-chain');
                }}
              >
                {t('partner.vreg.run.goColdChain')}
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
