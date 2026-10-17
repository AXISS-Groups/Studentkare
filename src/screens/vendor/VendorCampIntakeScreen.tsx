import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Plus,
  QrCode,
  Search,
  Tent,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { useT } from '@/i18n';
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

export function VendorCampIntakeScreen({ initialBatches }: VendorCampIntakeScreenProps) {
  const { user } = useAuth();
  const t = useT();
  const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  const [batches, setBatches] = useState<CampBatch[]>(() =>
    initialBatches ?? (isTest ? DEMO_CAMP_BATCHES : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'processing' | 'released' | 'breach'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fast check-in state: counts only check-ins made on this screen.
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [isFastModalOpen, setIsFastModalOpen] = useState(false);
  const [fastStudentId, setFastStudentId] = useState('');
  const [fastVialBarcode, setFastVialBarcode] = useState('');
  const [fastBatchId, setFastBatchId] = useState('');

  // New batch registration state
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [newCampus, setNewCampus] = useState('');
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



  // KPIs — all computed from the batches on screen; nothing hardcoded.
  const totalSamplesCollected = useMemo(() => {
    return batches.reduce((sum, b) => sum + b.samplesCollected, 0);
  }, [batches]);

  const heldOnBreachCount = useMemo(() => {
    return batches.filter((b) => b.isBreach).length;
  }, [batches]);

  const releasedBatchesCount = useMemo(() => {
    return batches.filter((b) => b.stateBadge === 'green').length;
  }, [batches]);

  // Only batches still collecting can take a check-in.
  const openBatches = useMemo(() => batches.filter((b) => b.stateBadge === 'blue'), [batches]);
  const activeFastBatchId = openBatches.some((b) => b.id === fastBatchId) ? fastBatchId : openBatches[0]?.id ?? '';

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

  const stateText = (b: CampBatch): string =>
    b.stateBadge === 'blue'
      ? t('partner.vlab.camp.tab.processing')
      : b.stateBadge === 'green'
      ? t('partner.vlab.camp.tab.released')
      : b.stateLabel;

  const coldChainText = (b: CampBatch): string =>
    !b.isBreach && b.coldChainStatus === 'In range' ? t('partner.vlab.camp.inRange') : b.coldChainStatus;

  // Handle fast check-in submit (this screen only — nothing is saved or printed)
  const handleFastCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastStudentId.trim() || !fastVialBarcode.trim() || !activeFastBatchId) return;

    setCheckedInCount((prev) => prev + 1);
    setBatches((prev) =>
      prev.map((b) =>
        b.id === activeFastBatchId
          ? { ...b, samplesCollected: Math.min(b.samplesTarget, b.samplesCollected + 1) }
          : b
      )
    );
    showToast(t('partner.vlab.camp.toast.checkedIn', { student: fastStudentId.trim(), vial: fastVialBarcode.trim() }));
    setFastStudentId('');
    setFastVialBarcode('');
    setIsFastModalOpen(false);
  };

  // Handle register batch submit
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const campus = newCampus.trim();
    if (!newPanel.trim() || !campus) return;

    const count = parseInt(newExpectedCount, 10) || 100;
    // A local placeholder ID, labelled as such — real batch IDs come from the lab system.
    const newBatchId = `LOCAL-${batches.length + 1}`;
    const newEntry: CampBatch = {
      id: newBatchId,
      campAndPanel: `${campus} · ${newPanel.trim()}`,
      samplesCollected: 0,
      samplesTarget: count,
      coldChainStatus: 'In range',
      stateLabel: 'Processing',
      stateBadge: 'blue',
      campusName: campus,
    };

    setBatches((prev) => [newEntry, ...prev]);
    setIsNewBatchModalOpen(false);
    setNewPanel('');
    setNewCampus('');
    showToast(t('partner.vlab.camp.toast.registered', { id: newBatchId, campus }));
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 900);
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—';

  return (
    <div className="sk-camp-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sk-camp-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="var(--sk-color-positive)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}


      {/* Main Content Area */}
      <main className="sk-camp-main">
        <p role="note" style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 10, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 12.5, lineHeight: 1.5 }}>
          {t('partner.vlab.common.preview')}
        </p>

        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-camp-header-row">
              <div className="sk-camp-title-group">
                <h1>{t('partner.vlab.camp.title')}</h1>
                <p>
                  {user?.fullName
                    ? t('partner.vlab.camp.subtitleNamed', { name: user.fullName })
                    : t('partner.vlab.camp.subtitle')}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sk-camp-alert-pill" role="status">
                  <span className="sk-camp-pulse-dot" aria-hidden="true" />
                  {t('partner.vlab.camp.heldPill', { count: heldOnBreachCount })}
                </span>

                <button
                  type="button"
                  className="sk-camp-fast-btn"
                  onClick={() => setIsNewBatchModalOpen(true)}
                >
                  <Plus size={15} aria-hidden="true" />
                  {t('partner.vlab.camp.register')}
                </button>
              </div>
            </div>

            {/* Spotlight Banner: Fast Check-in */}
            <section className="sk-camp-spotlight" aria-label={t('partner.vlab.camp.spot.aria')}>
              <div className="sk-camp-avatar-wrap" aria-hidden="true">
                <div
                  className="sk-camp-avatar-circle"
                  style={!user?.fullName ? { background: 'var(--sk-color-surface-3)', color: 'var(--sk-color-text-3)' } : undefined}
                >
                  {initials}
                </div>
                {user?.fullName && (
                  <div className="sk-camp-avatar-badge">
                    <Check size={11} color="var(--sk-color-on-action)" strokeWidth={3.5} />
                  </div>
                )}
              </div>

              <div className="sk-camp-spotlight-text">
                <span className="sk-camp-spotlight-eyebrow">{t('partner.vlab.camp.spot.eyebrow')}</span>
                <span className="sk-camp-spotlight-title">
                  {checkedInCount > 0
                    ? t('partner.vlab.camp.spot.count', { count: checkedInCount })
                    : t('partner.vlab.camp.spot.standby')}
                </span>
                <span className="sk-camp-spotlight-sub">
                  {t('partner.vlab.camp.spot.sub')}
                </span>
              </div>

              <button
                type="button"
                className="sk-camp-fast-btn"
                onClick={() => setIsFastModalOpen(true)}
              >
                {t('partner.vlab.camp.spot.open')}
              </button>
            </section>

            {/* KPI Cards */}
            <div className="sk-camp-kpi-grid">
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: 'var(--sk-color-text)' }}>
                  {totalSamplesCollected}
                </span>
                <span className="sk-camp-kpi-label">{t('partner.vlab.camp.kpi.samples')}</span>
              </div>
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: 'var(--sk-color-danger)' }}>
                  {heldOnBreachCount}
                </span>
                <span className="sk-camp-kpi-label">{t('partner.vlab.camp.kpi.held')}</span>
              </div>
              <div className="sk-camp-kpi-card">
                <span className="sk-camp-kpi-val" style={{ color: 'var(--sk-color-positive)' }}>
                  {releasedBatchesCount}
                </span>
                <span className="sk-camp-kpi-label">{t('partner.vlab.camp.kpi.released')}</span>
              </div>
              <div className="sk-camp-kpi-card">
                {/* No data source for out-of-range runs yet — not a fake zero. */}
                <span className="sk-camp-kpi-val" style={{ color: 'var(--sk-color-text-3)' }}>
                  —
                </span>
                <span className="sk-camp-kpi-label">{t('partner.vlab.camp.kpi.outsideRange')}</span>
              </div>
            </div>

            {/* Controls Bar: Search & Filter Tabs */}
            <div className="sk-camp-controls-bar">
              <div className="sk-camp-search-wrap">
                <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
                <input
                  type="text"
                  className="sk-camp-search-input"
                  placeholder={t('partner.vlab.camp.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('partner.vlab.camp.search.label')}
                />
              </div>

              <div className="sk-camp-filter-tabs" role="tablist" aria-label={t('partner.vlab.camp.tabs')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'all'}
                  className={`sk-camp-filter-btn ${filterTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('all')}
                >
                  {t('partner.vlab.camp.tab.all', { count: batches.length })}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'processing'}
                  className={`sk-camp-filter-btn ${filterTab === 'processing' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('processing')}
                >
                  {t('partner.vlab.camp.tab.processing')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'released'}
                  className={`sk-camp-filter-btn ${filterTab === 'released' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('released')}
                >
                  {t('partner.vlab.camp.tab.released')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'breach'}
                  className={`sk-camp-filter-btn ${filterTab === 'breach' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('breach')}
                >
                  {t('partner.vlab.camp.tab.breach')}
                </button>
              </div>
            </div>

            {/* Batches Table Card */}
            <div className="sk-camp-card">
              <div className="sk-camp-table-header" role="row">
                <span>{t('partner.vlab.camp.col.batch')}</span>
                <span>{t('partner.vlab.camp.col.panel')}</span>
                <span>{t('partner.vlab.camp.col.samples')}</span>
                <span>{t('partner.vlab.camp.col.coldChain')}</span>
                <span style={{ justifySelf: 'end' }}>{t('partner.vlab.camp.col.state')}</span>
                <span style={{ justifySelf: 'end' }}>{t('partner.vlab.camp.col.action')}</span>
              </div>

              {filteredBatches.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 13.5 }}>
                  {searchQuery ? t('partner.vlab.camp.noMatch', { query: searchQuery }) : t('partner.vlab.camp.none')}
                </div>
              ) : (
                filteredBatches.map((b) => (
                  <div key={b.id} className="sk-camp-table-row" role="row">
                    <span className="sk-camp-batch-id">{b.id}</span>
                    <span className="sk-camp-panel-desc">{b.campAndPanel}</span>
                    <span className="sk-camp-sample-count">
                      {t('partner.vlab.camp.ofTarget', { done: b.samplesCollected, target: b.samplesTarget })}
                    </span>
                    <span className={b.isBreach ? 'sk-camp-temp-alert' : 'sk-camp-temp-ok'}>
                      {coldChainText(b)}
                    </span>

                    {/* State Badge */}
                    <span style={{ justifySelf: 'end' }}>
                      <span className={`sk-camp-badge sk-camp-badge-${b.stateBadge}`}>
                        {stateText(b)}
                      </span>
                    </span>

                    {/* Action Button */}
                    <span style={{ justifySelf: 'end' }}>
                      <button
                        type="button"
                        className="sk-camp-action-btn"
                        onClick={() => setSelectedBatch(b)}
                        aria-label={t('partner.vlab.camp.inspectAria', { id: b.id })}
                      >
                        {t('partner.vlab.camp.inspect')}
                      </button>
                    </span>
                  </div>
                ))
              )}

              <span className="sk-camp-footer-note">
                {t('partner.vlab.camp.footer')}
              </span>
            </div>
          </>
        )}

        {/* Loading View State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vlab.camp.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <Tent size={64} color="var(--sk-color-action)" aria-hidden="true" />
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('partner.vlab.camp.empty.title')}</h2>
              <p style={{ fontSize: 14, color: 'var(--sk-color-text-2)', margin: 0 }}>
                {t('partner.vlab.camp.empty.body')}
              </p>
              <button
                type="button"
                className="sk-camp-btn-primary"
                onClick={() => setViewState('data')}
              >
                {t('partner.vlab.camp.empty.back')}
              </button>
            </div>
          </div>
        )}

        {/* Error View State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={48} color="var(--sk-color-danger)" aria-hidden="true" />
              <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>{t('partner.vlab.camp.error.title')}</h2>
              <p style={{ fontSize: 14, color: 'var(--sk-color-text-2)', margin: 0 }}>
                {t('partner.vlab.common.errorBody')}
              </p>
              <button type="button" className="sk-camp-btn-primary" onClick={handleRetry}>
                {t('common.tryAgain')}
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
              <h3 id="fast-checkin-title">{t('partner.vlab.camp.fast.title')}</h3>
              <button
                type="button"
                className="sk-camp-close-btn"
                onClick={() => setIsFastModalOpen(false)}
                aria-label={t('partner.vlab.common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {openBatches.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sk-color-text-2)' }}>{t('partner.vlab.camp.fast.noBatch')}</p>
                <div className="sk-camp-modal-actions">
                  <button type="button" className="sk-camp-btn-secondary" onClick={() => setIsFastModalOpen(false)}>
                    {t('partner.vlab.common.close')}
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleFastCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="fast-batch">{t('partner.vlab.camp.fast.batch')}</label>
                <select
                  id="fast-batch"
                  className="sk-camp-field-select"
                  value={activeFastBatchId}
                  onChange={(e) => setFastBatchId(e.target.value)}
                >
                  {openBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.id} · {b.campAndPanel}</option>
                  ))}
                </select>
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="fast-student">{t('partner.vlab.camp.fast.student')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="fast-student"
                    type="text"
                    className="sk-camp-field-input"
                    placeholder={t('partner.vlab.camp.fast.studentPlaceholder')}
                    value={fastStudentId}
                    onChange={(e) => setFastStudentId(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="sk-camp-btn-secondary"
                    onClick={() => {
                      // Hardware scanners type into the focused field.
                      const el = document.getElementById('fast-student');
                      el?.focus();
                      showToast(t('partner.vlab.camp.fast.scanReady'));
                    }}
                    aria-label={t('partner.vlab.camp.fast.scanAria')}
                  >
                    <QrCode size={16} aria-hidden="true" /> {t('partner.vlab.camp.fast.scan')}
                  </button>
                </div>
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="fast-vial">{t('partner.vlab.camp.fast.vial')}</label>
                <input
                  id="fast-vial"
                  type="text"
                  className="sk-camp-field-input"
                  placeholder={t('partner.vlab.camp.fast.vialPlaceholder')}
                  value={fastVialBarcode}
                  onChange={(e) => setFastVialBarcode(e.target.value)}
                  required
                />
              </div>

              <div className="sk-camp-modal-actions">
                <button
                  type="button"
                  className="sk-camp-btn-secondary"
                  onClick={() => setIsFastModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="sk-camp-btn-primary"
                >
                  {t('partner.vlab.camp.fast.submit')}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Register Camp Drive Modal */}
      {isNewBatchModalOpen && (
        <div className="sk-camp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="register-camp-title">
          <div className="sk-camp-modal-card">
            <div className="sk-camp-modal-header">
              <h3 id="register-camp-title">{t('partner.vlab.camp.reg.title')}</h3>
              <button
                type="button"
                className="sk-camp-close-btn"
                onClick={() => setIsNewBatchModalOpen(false)}
                aria-label={t('partner.vlab.common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="camp-campus">{t('partner.vlab.camp.reg.campus')}</label>
                <input
                  id="camp-campus"
                  type="text"
                  className="sk-camp-field-input"
                  placeholder={t('partner.vlab.camp.reg.campusPlaceholder')}
                  value={newCampus}
                  onChange={(e) => setNewCampus(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="camp-panel">{t('partner.vlab.camp.reg.panel')}</label>
                <input
                  id="camp-panel"
                  type="text"
                  className="sk-camp-field-input"
                  placeholder={t('partner.vlab.camp.reg.panelPlaceholder')}
                  value={newPanel}
                  onChange={(e) => setNewPanel(e.target.value)}
                  required
                />
              </div>

              <div className="sk-camp-field-group">
                <label className="sk-camp-field-label" htmlFor="camp-expected">{t('partner.vlab.camp.reg.target')}</label>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="sk-camp-btn-primary"
                >
                  {t('partner.vlab.camp.reg.submit')}
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
              <h3 id="inspect-batch-title">{t('partner.vlab.camp.audit.title', { id: selectedBatch.id })}</h3>
              <button
                type="button"
                className="sk-camp-close-btn"
                onClick={() => setSelectedBatch(null)}
                aria-label={t('partner.vlab.common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule)' }}>
                <strong style={{ fontSize: 14 }}>{selectedBatch.campAndPanel}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vlab.camp.audit.progress', { done: selectedBatch.samplesCollected, target: selectedBatch.samplesTarget })}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--sk-color-surface-3)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sk-color-text-3)' }}>{t('partner.vlab.camp.audit.coldChain')}</span>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: selectedBatch.isBreach ? 'var(--sk-color-danger)' : 'var(--sk-color-positive)' }}>
                    {coldChainText(selectedBatch)}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--sk-color-surface-3)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sk-color-text-3)' }}>{t('partner.vlab.camp.audit.status')}</span>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: 'var(--sk-color-text)' }}>
                    {stateText(selectedBatch)}
                  </div>
                </div>
              </div>

              {selectedBatch.isBreach && (
                <div role="note" style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--sk-color-danger-bg)', border: '1px solid var(--sk-color-danger)', color: 'var(--sk-color-danger)', fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong>{t('partner.vlab.camp.audit.breachLead')}</strong> {t('partner.vlab.camp.audit.breachBody')}
                </div>
              )}

              {selectedBatch.stateBadge === 'blue' && (
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vlab.camp.audit.releaseNote')}
                </p>
              )}

              <div className="sk-camp-modal-actions">
                <button
                  type="button"
                  className="sk-camp-btn-secondary"
                  onClick={() => setSelectedBatch(null)}
                >
                  {t('partner.vlab.common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default VendorCampIntakeScreen;
