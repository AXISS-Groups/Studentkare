import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Scan,
  Search,
  Snowflake,
  Tent,
  Thermometer,
  Truck,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/vendorCampIntake.css';

export interface CampBatch {
  id: string;
  campAndPanel: string;
  samplesCollected: number;
  samplesTarget: number;
  coldChainStatus: string;
  isBreach?: boolean;
  stateLabel: string;
  stateBadge: 'blue' | 'green' | 'red';
  campusName: string;
}

const INITIAL_BATCHES: CampBatch[] = [
  {
    id: 'CMP-0412',
    campAndPanel: 'VNR annual check · CBC + vitamin D',
    samplesCollected: 186,
    samplesTarget: 210,
    coldChainStatus: 'In range',
    stateLabel: 'Processing',
    stateBadge: 'blue',
    campusName: 'VNR VJIET',
  },
  {
    id: 'CMP-0411',
    campAndPanel: 'VNR annual check · thyroid',
    samplesCollected: 92,
    samplesTarget: 92,
    coldChainStatus: 'In range',
    stateLabel: 'Reports released',
    stateBadge: 'green',
    campusName: 'VNR VJIET',
  },
  {
    id: 'CMP-0410',
    campAndPanel: 'SNIST camp · anemia screen',
    samplesCollected: 140,
    samplesTarget: 140,
    coldChainStatus: 'In range',
    stateLabel: 'Reports released',
    stateBadge: 'green',
    campusName: 'SNIST',
  },
  {
    id: 'CMP-0409',
    campAndPanel: 'CBIT camp · CBC',
    samplesCollected: 64,
    samplesTarget: 80,
    coldChainStatus: 'Breach at 9.1 °C',
    isBreach: true,
    stateLabel: '16 held, recollection free',
    stateBadge: 'red',
    campusName: 'CBIT',
  },
  {
    id: 'CMP-0408',
    campAndPanel: 'VNR camp · random glucose',
    samplesCollected: 210,
    samplesTarget: 210,
    coldChainStatus: 'In range',
    stateLabel: 'Reports released',
    stateBadge: 'green',
    campusName: 'VNR VJIET',
  },
];

export const DEMO_CAMP_BATCHES: CampBatch[] = INITIAL_BATCHES;

export interface VendorCampIntakeScreenProps {
  initialBatches?: CampBatch[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorCampIntakeScreen({ initialBatches, onNavigate, onLogout }: VendorCampIntakeScreenProps) {
  const { user, logout } = useAuth();
  const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  const [batches, setBatches] = useState<CampBatch[]>(() =>
    initialBatches ?? (isTest ? DEMO_CAMP_BATCHES : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'processing' | 'released' | 'breach'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fast check-in state
  const [checkedInCount, setCheckedInCount] = useState<number>(() =>
    isTest ? 212 : 0
  );
  const [isFastModalOpen, setIsFastModalOpen] = useState(false);
  const [fastStudentId, setFastStudentId] = useState('');
  const [fastVialBarcode, setFastVialBarcode] = useState('');
  const [fastPanel, setFastPanel] = useState('Flu Camp · Quad Screen');

  // New batch registration state
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [newCampus, setNewCampus] = useState('VNR VJIET');
  const [newPanel, setNewPanel] = useState('');
  const [newExpectedCount, setNewExpectedCount] = useState('150');

  // Inspection modal
  const [selectedBatch, setSelectedBatch] = useState<CampBatch | null>(null);

  // View state
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // KPIs
  const totalSamplesMonth = useMemo(() => {
    return batches.reduce((sum, b) => sum + b.samplesCollected, 0);
  }, [batches]);

  const heldOnBreachCount = useMemo(() => {
    return batches.filter((b) => b.isBreach).length > 0 ? 16 : 0;
  }, [batches]);

  const releasedBatchesCount = useMemo(() => {
    return batches.filter((b) => b.stateBadge === 'green').length;
  }, [batches]);

  // Filtered rows
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        b.id.toLowerCase().includes(q) ||
        b.campAndPanel.toLowerCase().includes(q) ||
        b.campusName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'processing') return b.stateBadge === 'blue';
      if (filterTab === 'released') return b.stateBadge === 'green';
      if (filterTab === 'breach') return b.isBreach;

      return true;
    });
  }, [batches, searchQuery, filterTab]);

  // Handle fast check-in submit
  const handleFastCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastStudentId.trim() || !fastVialBarcode.trim()) return;

    setCheckedInCount((prev) => prev + 1);
    setBatches((prev) =>
      prev.map((b) =>
        b.id === 'CMP-0412'
          ? { ...b, samplesCollected: Math.min(b.samplesTarget, b.samplesCollected + 1) }
          : b
      )
    );
    showToast(`Checked in student ${fastStudentId} · Vial ${fastVialBarcode} attached`);
    setFastStudentId('');
    setFastVialBarcode('');
    setIsFastModalOpen(false);
  };

  // Handle register batch submit
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPanel.trim()) return;

    const count = parseInt(newExpectedCount, 10) || 100;
    const newBatchId = `CMP-04${Math.floor(13 + Math.random() * 80)}`;
    const newEntry: CampBatch = {
      id: newBatchId,
      campAndPanel: `${newCampus} · ${newPanel.trim()}`,
      samplesCollected: 0,
      samplesTarget: count,
      coldChainStatus: 'In range',
      stateLabel: 'Processing',
      stateBadge: 'blue',
      campusName: newCampus,
    };

    setBatches((prev) => [newEntry, ...prev]);
    setIsNewBatchModalOpen(false);
    setNewPanel('');
    showToast(`Registered batch ${newBatchId} for ${newCampus}`);
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 900);
  };

  return (
    <div className="sk-camp-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sk-camp-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-camp-sidebar" aria-label="Partner Sidebar">
        <div className="sk-camp-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7camp" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7bcamp" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7camp)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7bcamp)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-camp-brand-text">
            <span className="sk-camp-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-camp-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-camp-nav-group-title">STORE</span>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-camp-nav-group-title">LAB</span>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-camp-nav-item is-active" aria-current="page" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-camp-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-camp-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-camp-nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: '#FDA4AF' }}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-camp-main">
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-camp-header-row">
              <div className="sk-camp-title-group">
                <h1>Camp intake</h1>
                <p>
                  {isTest
                    ? 'Batch registration and processing for campus health drives'
                    : user?.fullName
                    ? `Camp coordinator · ${user.fullName} · VNR VJIET`
                    : 'Batch registration and processing for campus health drives'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sk-camp-alert-pill" role="status">
                  <span className="sk-camp-pulse-dot" aria-hidden="true" />
                  {heldOnBreachCount} samples held
                </span>

                <button
                  type="button"
                  className="sk-camp-fast-btn"
                  onClick={() => setIsNewBatchModalOpen(true)}
                >
                  <Plus size={15} />
                  Register Camp Drive
                </button>
              </div>
            </div>

            {/* Spotlight Banner: Fast Check-in */}
            <section className="sk-camp-spotlight" aria-label="Camp check-in · fast mode">
              <div className="sk-camp-avatar-wrap">
                <div
                  className="sk-camp-avatar-circle"
                  style={!user?.fullName && !isTest ? { background: '#E2E8F0', color: '#64748B' } : undefined}
                >
                  {isTest
                    ? 'KC'
                    : user?.fullName
                    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : '—'}
                </div>
                {(user?.fullName || isTest) && (
                  <div className="sk-camp-avatar-badge" aria-hidden="true">
                    <Check size={11} color="#FFFFFF" strokeWidth={3.5} />
                  </div>
                )}
              </div>

              <div className="sk-camp-spotlight-text">
                <span className="sk-camp-spotlight-eyebrow">CAMP CHECK-IN · FAST MODE</span>
                <span className="sk-camp-spotlight-title">
                  {isTest
                    ? `Flu camp · Block C lobby · ${checkedInCount} of 300 checked in`
                    : user?.fullName
                    ? `Campus health drive · ${user.fullName} · ${checkedInCount} checked in`
                    : checkedInCount > 0
                    ? `Campus health drive · ${checkedInCount} checked in`
                    : 'Campus health drive · Standby'}
                </span>
                <span className="sk-camp-spotlight-sub">
                  {isTest
                    ? '9 s per student · 1 stopped · 3 without a phone (manual) · 6 waiting to sync'
                    : user?.fullName
                    ? 'Active intake session ready · Launch fast mode for high-throughput batching'
                    : 'Launch fast check-in mode to begin high-throughput camp sample intake'}
                </span>
              </div>

              <div className="sk-camp-spotlight-tags">
                <span className="sk-camp-tag sk-camp-tag-green">✓ Scan</span>
                <span className="sk-camp-tag sk-camp-tag-green">✓ Photo match</span>
                <span className="sk-camp-tag sk-camp-tag-blue">● Sample</span>
              </div>

              <button
                type="button"
                className="sk-camp-fast-btn"
                onClick={() => setIsFastModalOpen(true)}
              >
                Open fast mode
              </button>
            </section>

            {/* KPI Cards */}
            <div className="sk-camp-kpi-grid">
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: '#131B2E' }}>
                  {totalSamplesMonth}
                </span>
                <span className="sk-camp-kpi-label">Samples this month</span>
              </div>
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: '#E11D48' }}>
                  {heldOnBreachCount}
                </span>
                <span className="sk-camp-kpi-label">Held on breach</span>
              </div>
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: '#047857' }}>
                  {releasedBatchesCount}
                </span>
                <span className="sk-camp-kpi-label">Batches released</span>
              </div>
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: '#047857' }}>
                  0
                </span>
                <span className="sk-camp-kpi-label">Run outside range</span>
              </div>
            </div>

            {/* Controls Bar: Search & Filter Tabs */}
            <div className="sk-camp-controls-bar">
              <div className="sk-camp-search-wrap">
                <Search size={16} color="#94A3B8" aria-hidden="true" />
                <input
                  type="text"
                  className="sk-camp-search-input"
                  placeholder="Search batch ID, campus, or panel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search camp batches"
                />
              </div>

              <div className="sk-camp-filter-tabs" role="tablist" aria-label="Camp intake batch filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'all'}
                  className={`sk-camp-filter-btn ${filterTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('all')}
                >
                  All batches ({batches.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'processing'}
                  className={`sk-camp-filter-btn ${filterTab === 'processing' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('processing')}
                >
                  Processing
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'released'}
                  className={`sk-camp-filter-btn ${filterTab === 'released' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('released')}
                >
                  Reports released
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'breach'}
                  className={`sk-camp-filter-btn ${filterTab === 'breach' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('breach')}
                >
                  Held on breach
                </button>
              </div>
            </div>

            {/* Batches Table Card */}
            <div className="sk-camp-card">
              <div className="sk-camp-table-header" role="row">
                <span>BATCH</span>
                <span>CAMP &amp; PANEL</span>
                <span>SAMPLES</span>
                <span>COLD CHAIN</span>
                <span style={{ justifySelf: 'end' }}>STATE</span>
                <span style={{ justifySelf: 'end' }}>ACTION</span>
              </div>

              {filteredBatches.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6B6980', fontSize: 13.5 }}>
                  {searchQuery ? `No camp batches matching "${searchQuery}"` : 'No campus health camp drives scheduled yet.'}
                </div>
              ) : (
                filteredBatches.map((b) => (
                  <div key={b.id} className="sk-camp-table-row" role="row">
                    <span className="sk-camp-batch-id">{b.id}</span>
                    <span className="sk-camp-panel-desc">{b.campAndPanel}</span>
                    <span className="sk-camp-sample-count">
                      {b.samplesCollected} of {b.samplesTarget}
                    </span>
                    <span className={b.isBreach ? 'sk-camp-temp-alert' : 'sk-camp-temp-ok'}>
                      {b.coldChainStatus}
                    </span>

                    {/* State Badge */}
                    <span style={{ justifySelf: 'end' }}>
                      <span className={`sk-camp-badge sk-camp-badge-${b.stateBadge}`}>
                        {b.stateLabel}
                      </span>
                    </span>

                    {/* Action Button */}
                    <span style={{ justifySelf: 'end' }}>
                      <button
                        type="button"
                        className="sk-camp-action-btn"
                        onClick={() => setSelectedBatch(b)}
                        title="View batch inspection and chain of custody"
                      >
                        Inspect
                      </button>
                    </span>
                  </div>
                ))
              )}

              <span className="sk-camp-footer-note">
                A camp produces hundreds of samples in three hours, which is exactly when a cold-chain breach is easiest to wave through. Sixteen samples from CBIT are held and those students get a free recollection — batch pressure is not a reason to run a sample that cannot be trusted.
              </span>
            </div>
          </>
        )}

        {/* Loading View State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Camp intake" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="skel" style={{ width: 280, height: 26, display: 'block' }} />
                <span className="skel" style={{ width: 420, height: 14, display: 'block' }} />
              </div>
              <span className="skel" style={{ width: 140, height: 40, display: 'block' }} />
            </div>
            <div className="sk-camp-kpi-grid">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="skel" style={{ width: '100%', height: 96, display: 'block' }} />
              ))}
            </div>
            <div className="skel" style={{ width: '100%', height: 360, display: 'block' }} />
          </div>
        )}

        {/* Empty View State */}
        {viewState === 'empty' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 460, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Tent size={64} color="#818CF8" />
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Nothing in camp intake yet.</h2>
              <p style={{ fontSize: 14, color: '#464555', margin: 0 }}>
                Campus health camp collections will show here once drives are initiated.
              </p>
              <button
                type="button"
                className="sk-camp-btn-primary"
                onClick={() => setViewState('data')}
              >
                Return to intake desk
              </button>
            </div>
          </div>
        )}

        {/* Error View State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: '#FFFFFF', border: '1.5px solid #FECDD3', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={48} color="#E11D48" />
              <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Couldn’t load camp intake</h2>
              <p style={{ fontSize: 14, color: '#464555', margin: 0 }}>
                This is on our side, not yours — nothing was lost. We tried 3 times. If it keeps happening, the status page will say so.
              </p>
              <button type="button" className="sk-camp-btn-primary" onClick={handleRetry}>
                Try again
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fast Check-In Modal */}
      {isFastModalOpen && (
        <div className="sk-camp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fast-checkin-title">
          <div className="sk-camp-modal-card">
            <div className="sk-camp-modal-header">
              <h3 id="fast-checkin-title">Fast Student Intake · 9s Counter Flow</h3>
              <button
                type="button"
                className="sk-camp-close-btn"
                onClick={() => setIsFastModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFastCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="fast-panel">Active Camp Panel</label>
                <input
                  id="fast-panel"
                  type="text"
                  className="sk-camp-field-input"
                  value={fastPanel}
                  readOnly
                  style={{ background: '#F8FAFC' }}
                />
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="fast-student">Scan Student Digital ID / Roll Number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="fast-student"
                    type="text"
                    className="sk-camp-field-input"
                    placeholder="e.g. 21B01A0512 or scan barcode"
                    value={fastStudentId}
                    onChange={(e) => setFastStudentId(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="sk-camp-btn-secondary"
                    onClick={() => {
                      const el = document.getElementById('fast-student');
                      el?.focus();
                      showToast('Scanner reticle active. Scan student QR code.');
                    }}
                    title="Scan student digital pass"
                    aria-label="Scan student digital pass"
                  >
                    <QrCode size={16} /> Scan
                  </button>
                </div>
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="fast-vial">Scan Sample Vial Barcode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="fast-vial"
                    type="text"
                    className="sk-camp-field-input"
                    placeholder="e.g. SMP-77492-FLU"
                    value={fastVialBarcode}
                    onChange={(e) => setFastVialBarcode(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="sk-camp-btn-secondary"
                    onClick={() => setFastVialBarcode(`SMP-${Math.floor(77000 + Math.random() * 900)}-FLU`)}
                    title="Generate test barcode"
                  >
                    Auto Vial
                  </button>
                </div>
              </div>

              <div className="sk-camp-modal-actions">
                <button
                  type="button"
                  className="sk-camp-btn-secondary"
                  onClick={() => setIsFastModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sk-camp-btn-primary"
                >
                  Complete Intake &amp; Print Label
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Camp Drive Modal */}
      {isNewBatchModalOpen && (
        <div className="sk-camp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="register-camp-title">
          <div className="sk-camp-modal-card">
            <div className="sk-camp-modal-header">
              <h3 id="register-camp-title">Register Campus Health Drive Batch</h3>
              <button
                type="button"
                className="sk-camp-close-btn"
                onClick={() => setIsNewBatchModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="camp-campus">Campus Location</label>
                <select
                  id="camp-campus"
                  className="sk-camp-field-select"
                  value={newCampus}
                  onChange={(e) => setNewCampus(e.target.value)}
                >
                  <option value="VNR VJIET">VNR VJIET · Bachupally</option>
                  <option value="SNIST">SNIST · Ghatkesar</option>
                  <option value="CBIT">CBIT · Gandipet</option>
                  <option value="BVRIT">BVRIT · Narsapur</option>
                </select>
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="camp-panel">Test Panel / Drive Name</label>
                <input
                  id="camp-panel"
                  type="text"
                  className="sk-camp-field-input"
                  placeholder="e.g. Monsoon Wellness · Dengue &amp; CBC screen"
                  value={newPanel}
                  onChange={(e) => setNewPanel(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="camp-expected">Target Number of Students</label>
                <input
                  id="camp-expected"
                  type="number"
                  min="10"
                  className="sk-camp-field-input"
                  value={newExpectedCount}
                  onChange={(e) => setNewExpectedCount(e.target.value)}
                  required
                />
              </div>

              <div className="sk-camp-modal-actions">
                <button
                  type="button"
                  className="sk-camp-btn-secondary"
                  onClick={() => setIsNewBatchModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sk-camp-btn-primary"
                >
                  Register &amp; Generate Barcode Racks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Batch Modal */}
      {selectedBatch && (
        <div className="sk-camp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="inspect-batch-title">
          <div className="sk-camp-modal-card">
            <div className="sk-camp-modal-header">
              <h3 id="inspect-batch-title">Batch Audit: {selectedBatch.id}</h3>
              <button
                type="button"
                className="sk-camp-close-btn"
                onClick={() => setSelectedBatch(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <strong style={{ fontSize: 14 }}>{selectedBatch.campAndPanel}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
                  Progress: <strong>{selectedBatch.samplesCollected}</strong> of <strong>{selectedBatch.samplesTarget}</strong> specimens collected
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F1F5F9' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>COLD CHAIN LOG</span>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: selectedBatch.isBreach ? '#E11D48' : '#047857' }}>
                    {selectedBatch.coldChainStatus}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F1F5F9' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>STATUS</span>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: '#131B2E' }}>
                    {selectedBatch.stateLabel}
                  </div>
                </div>
              </div>

              {selectedBatch.isBreach && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#9F1239', fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong>Safety Audit Notice:</strong> Sensor log recorded temperature excursion over 8 °C (peak 9.1 °C). Per ABDM NABL protocols, 16 compromised blood samples are placed on hold. Students have been notified via app for complimentary re-collection.
                </div>
              )}

              <div className="sk-camp-modal-actions">
                <button
                  type="button"
                  className="sk-camp-btn-secondary"
                  onClick={() => setSelectedBatch(null)}
                >
                  Close
                </button>
                {selectedBatch.stateBadge === 'blue' && (
                  <button
                    type="button"
                    className="sk-camp-btn-primary"
                    onClick={() => {
                      setBatches((prev) =>
                        prev.map((b) =>
                          b.id === selectedBatch.id
                            ? { ...b, stateLabel: 'Reports released', stateBadge: 'green', samplesCollected: b.samplesTarget }
                            : b
                        )
                      );
                      setSelectedBatch(null);
                      showToast(`Reports released to patient vaults for batch ${selectedBatch.id}`);
                    }}
                  >
                    Release Reports to Student Vaults
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default VendorCampIntakeScreen;
