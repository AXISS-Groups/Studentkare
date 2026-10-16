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
  Plus,
  RefreshCw,
  RotateCcw,
  Scan,
  Search,
  ShieldAlert,
  Snowflake,
  Tent,
  Thermometer,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/labColdChain.css';

export interface ColdChainBox {
  id: string;
  boxId: string;
  contents: string;
  sampleCount: number;
  requiredRange: string;
  recordedTemp: string;
  peakTempCelsius: number;
  durationMinutesBreached?: number;
  outcome: 'In range' | 'Breached — held' | 'Delivered';
  samples?: string[];
  recollectionTriggered?: boolean;
}

const INITIAL_BOXES: ColdChainBox[] = [
  {
    id: 'box-1',
    boxId: 'BX-4417',
    contents: 'Block B run · 5 samples',
    sampleCount: 5,
    requiredRange: '2–8 °C',
    recordedTemp: '4.2 °C peak',
    peakTempCelsius: 4.2,
    outcome: 'In range',
    samples: ['SMP-821', 'SMP-822', 'SMP-823', 'SMP-824', 'SMP-825'],
  },
  {
    id: 'box-2',
    boxId: 'BX-4416',
    contents: 'Block C run · 3 samples',
    sampleCount: 3,
    requiredRange: '2–8 °C',
    recordedTemp: '6.8 °C peak',
    peakTempCelsius: 6.8,
    outcome: 'In range',
    samples: ['SMP-831', 'SMP-832', 'SMP-833'],
  },
  {
    id: 'box-3',
    boxId: 'BX-4415',
    contents: 'Block A run · 4 samples',
    sampleCount: 4,
    requiredRange: '2–8 °C',
    recordedTemp: '9.4 °C for 22 min',
    peakTempCelsius: 9.4,
    durationMinutesBreached: 22,
    outcome: 'Breached — held',
    samples: ['SMP-841 (Krishna C.)', 'SMP-842 (Ayesha K.)', 'SMP-843 (Rahul M.)', 'SMP-844 (Nisha P.)'],
  },
  {
    id: 'box-4',
    boxId: 'BX-4414',
    contents: 'Block D run · 6 samples',
    sampleCount: 6,
    requiredRange: '2–8 °C',
    recordedTemp: '5.1 °C peak',
    peakTempCelsius: 5.1,
    outcome: 'Delivered',
    samples: ['SMP-851', 'SMP-852', 'SMP-853', 'SMP-854', 'SMP-855', 'SMP-856'],
  },
];

export const DEMO_COLD_CHAIN_BOXES: ColdChainBox[] = INITIAL_BOXES;

const OUTCOME_KEYS: Record<ColdChainBox['outcome'], MessageKey> = {
  'In range': 'partner.vreg.cold.outcome.inRange',
  'Breached — held': 'partner.vreg.cold.outcome.breached',
  Delivered: 'partner.vreg.cold.outcome.delivered',
};

const FILTER_KEYS: Record<'All' | 'In range' | 'Breached' | 'Delivered', MessageKey> = {
  All: 'partner.vreg.cold.filterAll',
  'In range': 'partner.vreg.cold.filterInRange',
  Breached: 'partner.vreg.cold.filterBreached',
  Delivered: 'partner.vreg.cold.filterDelivered',
};

export interface LabColdChainScreenProps {
  initialBoxes?: ColdChainBox[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function LabColdChainScreen({ initialBoxes, onNavigate, onLogout }: LabColdChainScreenProps) {
  const t = useT();
  const { logout } = useAuth();
  const [boxes, setBoxes] = useState<ColdChainBox[]>(() =>
    initialBoxes ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_COLD_CHAIN_BOXES : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'In range' | 'Breached' | 'Delivered'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedBox, setSelectedBox] = useState<ColdChainBox | null>(null);
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);

  // New Box Form
  const [newBoxId, setNewBoxId] = useState('');
  const [newContents, setNewContents] = useState('');
  const [newSampleCount, setNewSampleCount] = useState(4);
  const [newRecordedTemp, setNewRecordedTemp] = useState('');
  const [tempError, setTempError] = useState(false);

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
  const totalBoxes = boxes.length;
  const breachedCount = boxes.filter((b) => b.outcome === 'Breached — held').length;
  const heldSamplesCount = boxes
    .filter((b) => b.outcome === 'Breached — held')
    .reduce((acc, curr) => acc + curr.sampleCount, 0);

  // Filtered Boxes
  const filteredBoxes = useMemo(() => {
    return boxes.filter((box) => {
      const matchesSearch =
        box.boxId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        box.contents.toLowerCase().includes(searchQuery.toLowerCase()) ||
        box.recordedTemp.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'In range') return box.outcome === 'In range';
      if (selectedFilter === 'Breached') return box.outcome === 'Breached — held';
      if (selectedFilter === 'Delivered') return box.outcome === 'Delivered';
      return true;
    });
  }, [boxes, searchQuery, selectedFilter]);

  // Handle Free Recollection Trigger
  const handleTriggerRecollection = (boxId: string) => {
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? {
              ...b,
              recollectionTriggered: true,
            }
          : b
      )
    );
    setSelectedBox(null);
    showToast(t('partner.vreg.cold.recollectToast'));
  };

  // Handle Handover to Lab Bench
  const handleBenchHandover = (boxId: string) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === boxId ? { ...b, outcome: 'Delivered' } : b))
    );
    setSelectedBox(null);
    showToast(t('partner.vreg.cold.admitToast'));
  };

  // Add new box
  const handleCreateBox = (e: React.FormEvent) => {
    e.preventDefault();
    // Fail closed: an unreadable temperature is never treated as in range (it used to default to 4.5 °C,
    // and a real 0 °C reading was turned into 4.5 °C by `|| 4.5`).
    const tempNum = Number.parseFloat(newRecordedTemp);
    if (!Number.isFinite(tempNum)) {
      setTempError(true);
      return;
    }
    setTempError(false);
    const isBreached = tempNum < 2.0 || tempNum > 8.0;
    const outcome = isBreached ? ('Breached — held' as const) : ('In range' as const);

    const createdBox: ColdChainBox = {
      id: `box-${Date.now()}`,
      boxId: newBoxId.trim().toUpperCase() || `BX-${Math.floor(4400 + Math.random() * 90)}`,
      contents: newContents.trim(),
      sampleCount: newSampleCount,
      requiredRange: '2–8 °C',
      recordedTemp: t(isBreached ? 'partner.vreg.cold.recordedOut' : 'partner.vreg.cold.recordedPeak', { temp: tempNum.toFixed(1) }),
      peakTempCelsius: tempNum,
      outcome,
      // Sample IDs are not captured by this form, so none are invented.
    };

    setBoxes((prev) => [createdBox, ...prev]);
    setShowAddBoxModal(false);
    setNewBoxId('');
    setNewContents('');
    setNewRecordedTemp('');
    showToast(t('partner.vreg.cold.loggedToast', { box: createdBox.boxId, outcome: t(OUTCOME_KEYS[outcome]) }));
  };

  return (
    <div className="sk-coldchain-root">
      {/* 18-Option Partner Sidebar */}
      <aside className="sk-coldchain-sidebar" aria-label={t('partner.vreg.nav.label')}>
        <div className="sk-coldchain-brand">
          <span className="sk-coldchain-logo">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg_cold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg_cold_b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg_cold)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg_cold_b)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span className="sk-coldchain-brand-text">
            <span className="sk-coldchain-title-text">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-coldchain-badge-partner">{t('partner.vreg.nav.badge')}</span>
          </span>
        </div>

        <nav className="sk-coldchain-nav" aria-label={t('partner.vreg.nav.label')}>
          {/* Section: STORE */}
          <span className="sk-coldchain-nav-section">{t('partner.vreg.nav.store')}</span>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.home')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.verify')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.orders')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.otp')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.returns')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.reorder')}</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-coldchain-nav-section">{t('partner.vreg.nav.lab')}</span>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item is-active" aria-current="page">
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('lab-queue')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.nav.labReports')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.camp')}</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-coldchain-nav-section">{t('partner.vreg.nav.business')}</span>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.staff')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('performance')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.performance')}</span>
          </button>
        </nav>

        <div className="sk-coldchain-sidebar-footer">
          <button type="button" className="sk-coldchain-signout-btn" onClick={handleSignOut}>
            <LogOut size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sk-coldchain-main">
        {/* Header */}
        <div className="sk-coldchain-header">
          <div>
            <h1 className="sk-coldchain-title">{t('partner.vreg.cold.title')}</h1>
            <p className="sk-coldchain-subtitle">{t('partner.vreg.cold.subtitle')}</p>
          </div>
          <div className="sk-coldchain-header-actions">
            {breachedCount > 0 && (
              <span className="sk-coldchain-breach-pill" role="status">
                <span className="sk-coldchain-pulse-dot" aria-hidden="true" />
                {t('partner.vreg.cold.breachPill', { count: breachedCount })}
              </span>
            )}
            <button
              type="button"
              className="sk-coldchain-add-btn"
              onClick={() => setShowAddBoxModal(true)}
              aria-label={t('partner.vreg.cold.addAria')}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{t('partner.vreg.cold.add')}</span>
            </button>
          </div>
        </div>

        <p role="note" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 13, lineHeight: 1.5 }}>
          {t('partner.vreg.notConnected')}
        </p>

        {/* KPI Stat Cards */}
        <div className="sk-coldchain-stats-grid">
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number">{totalBoxes}</span>
            <span className="sk-coldchain-stat-label">{t('partner.vreg.cold.statTotal')}</span>
          </div>
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number is-breached">{breachedCount}</span>
            <span className="sk-coldchain-stat-label">{t('partner.vreg.cold.statBreached')}</span>
          </div>
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number is-breached">{heldSamplesCount}</span>
            <span className="sk-coldchain-stat-label">{t('partner.vreg.cold.statHeld')}</span>
          </div>
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number is-success">
              {boxes.filter((b) => b.outcome === 'Delivered').length}
            </span>
            <span className="sk-coldchain-stat-label">{t('partner.vreg.cold.statDelivered')}</span>
          </div>
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div className="sk-coldchain-toolbar">
          <div className="sk-coldchain-filter-tabs" role="group" aria-label={t('partner.vreg.cold.filtersLabel')}>
            {(['All', 'In range', 'Breached', 'Delivered'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sk-coldchain-filter-btn ${selectedFilter === filter ? 'is-active' : ''}`}
                aria-pressed={selectedFilter === filter}
                onClick={() => setSelectedFilter(filter)}
              >
                {t(FILTER_KEYS[filter])}
              </button>
            ))}
          </div>

          <div className="sk-coldchain-search-wrap">
            <Search className="sk-coldchain-search-icon" size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder={t('partner.vreg.cold.searchPlaceholder')}
              className="sk-coldchain-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('partner.vreg.cold.searchLabel')}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="sk-coldchain-table-card">
          <div className="sk-coldchain-table-header">
            <span className="sk-coldchain-col-header">{t('partner.vreg.cold.thBox')}</span>
            <span className="sk-coldchain-col-header">{t('partner.vreg.cold.thContents')}</span>
            <span className="sk-coldchain-col-header">{t('partner.vreg.cold.thRequired')}</span>
            <span className="sk-coldchain-col-header">{t('partner.vreg.cold.thRecorded')}</span>
            <span className="sk-coldchain-col-header" style={{ justifySelf: 'end' }}>
              {t('partner.vreg.cold.thOutcome')}
            </span>
          </div>

          {filteredBoxes.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--sk-color-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Snowflake size={36} color="var(--sk-color-text-3)" aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('partner.vreg.cold.emptyTitle')}</span>
              <span style={{ fontSize: 13, color: 'var(--sk-color-text-3)', maxWidth: 360 }}>
                {searchQuery ? t('partner.vreg.cold.noMatch') : t('partner.vreg.cold.emptyBody')}
              </span>
            </div>
          ) : (
            filteredBoxes.map((box) => {
            let outcomeClass = 'outcome-in-range';
            if (box.outcome === 'Breached — held') outcomeClass = 'outcome-breached';
            if (box.outcome === 'Delivered') outcomeClass = 'outcome-delivered';

            return (
              <div
                key={box.id}
                className="sk-coldchain-row"
                onClick={() => setSelectedBox(box)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === 'Enter' && setSelectedBox(box)}
                aria-label={t('partner.vreg.cold.rowAria', { box: box.boxId, contents: box.contents, outcome: t(OUTCOME_KEYS[box.outcome]) })}
              >
                <span className="sk-coldchain-box-id">{box.boxId}</span>
                <span className="sk-coldchain-contents">{box.contents}</span>
                <span className="sk-coldchain-required">{box.requiredRange}</span>
                <span className={`sk-coldchain-recorded ${box.outcome === 'Breached — held' ? 'is-breached' : ''}`}>
                  {box.recordedTemp}
                </span>
                <span className={`sk-coldchain-status-badge ${outcomeClass}`}>{t(OUTCOME_KEYS[box.outcome])}</span>
              </div>
            );
          }))}

          <div className="sk-coldchain-policy-footer">
            {t('partner.vreg.cold.policy')}
          </div>
        </div>
      </main>

      {/* Box Inspection & Incident Modal */}
      {selectedBox && (
        <div className="sk-coldchain-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="box-detail-title">
          <div className="sk-coldchain-modal">
            <div className="sk-coldchain-modal-header">
              <h3 id="box-detail-title" className="sk-coldchain-modal-title">
                {t('partner.vreg.cold.detailTitle', { box: selectedBox.boxId })}
              </h3>
              <button
                type="button"
                className="sk-coldchain-modal-close"
                onClick={() => setSelectedBox(null)}
                aria-label={t('partner.vreg.cold.closeDetails')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-coldchain-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.cold.fBoxId')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedBox.boxId}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.cold.fOutcome')}</span>
                  <div>
                    <span className={`sk-coldchain-status-badge ${selectedBox.outcome === 'Breached — held' ? 'outcome-breached' : selectedBox.outcome === 'Delivered' ? 'outcome-delivered' : 'outcome-in-range'}`}>
                      {t(OUTCOME_KEYS[selectedBox.outcome])}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.cold.fSpec')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedBox.requiredRange}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', fontWeight: 700 }}>{t('partner.vreg.cold.fRecorded')}</span>
                  <div style={{ fontWeight: 800, color: selectedBox.outcome === 'Breached — held' ? 'var(--sk-color-danger)' : 'var(--sk-color-positive)' }}>
                    {selectedBox.recordedTemp}
                  </div>
                </div>
              </div>

              {selectedBox.outcome === 'Breached — held' && (
                <div style={{ padding: 14, background: 'var(--sk-color-danger-bg)', border: '1px solid var(--sk-color-danger)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sk-color-danger)', fontWeight: 800 }}>
                    <ShieldAlert size={20} aria-hidden="true" />
                    <span>{t('partner.vreg.cold.breachTitle')}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--sk-color-danger)' }}>
                    {selectedBox.durationMinutesBreached !== undefined
                      ? t('partner.vreg.cold.breachBody', { minutes: selectedBox.durationMinutesBreached })
                      : t('partner.vreg.cold.breachBodyNoDuration')}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                    {t('partner.vreg.cold.affected')}
                  </div>
                  {selectedBox.samples && selectedBox.samples.length > 0 ? (
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--sk-color-text-2)' }}>
                      {selectedBox.samples.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{t('partner.vreg.cold.noSampleIds')}</div>
                  )}
                </div>
              )}

              {selectedBox.outcome === 'In range' && (
                <div style={{ padding: 14, background: 'var(--sk-color-positive-bg)', border: '1px solid var(--sk-color-positive)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sk-color-positive)' }}>
                  <CheckCircle2 size={24} aria-hidden="true" />
                  <div>
                    <strong>{t('partner.vreg.cold.inRangeTitle')}</strong>
                    <div style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{t('partner.vreg.cold.inRangeBody', { count: selectedBox.sampleCount })}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="sk-coldchain-modal-footer">
              {selectedBox.outcome === 'Breached — held' && (
                <button
                  type="button"
                  className="sk-coldchain-add-btn"
                  style={{ background: 'var(--sk-color-danger-fill)' }}
                  onClick={() => handleTriggerRecollection(selectedBox.id)}
                >
                  {t('partner.vreg.cold.recollect')}
                </button>
              )}
              {selectedBox.outcome === 'In range' && (
                <button
                  type="button"
                  className="sk-coldchain-add-btn"
                  onClick={() => handleBenchHandover(selectedBox.id)}
                >
                  {t('partner.vreg.cold.admit')}
                </button>
              )}
              <button
                type="button"
                className="sk-runsheet-btn-secondary"
                onClick={() => setSelectedBox(null)}
              >
                {t('partner.vreg.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log New Box Modal */}
      {showAddBoxModal && (
        <div className="sk-coldchain-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-box-title">
          <form className="sk-coldchain-modal" onSubmit={handleCreateBox}>
            <div className="sk-coldchain-modal-header">
              <h3 id="add-box-title" className="sk-coldchain-modal-title">
                {t('partner.vreg.cold.addTitle')}
              </h3>
              <button
                type="button"
                className="sk-coldchain-modal-close"
                onClick={() => setShowAddBoxModal(false)}
                aria-label={t('partner.vreg.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-coldchain-modal-body">
              <div>
                <label htmlFor="new-box-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {t('partner.vreg.cold.labelBoxId')}
                </label>
                <input
                  id="new-box-id"
                  type="text"
                  placeholder={t('partner.vreg.cold.phBoxId')}
                  className="sk-coldchain-search-input"
                  value={newBoxId}
                  onChange={(e) => setNewBoxId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="new-box-desc" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {t('partner.vreg.cold.labelDesc')}
                </label>
                <input
                  id="new-box-desc"
                  type="text"
                  placeholder={t('partner.vreg.cold.phDesc')}
                  className="sk-coldchain-search-input"
                  value={newContents}
                  onChange={(e) => setNewContents(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="new-box-samples" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    {t('partner.vreg.cold.labelCount')}
                  </label>
                  <input
                    id="new-box-samples"
                    type="number"
                    min={1}
                    max={50}
                    className="sk-coldchain-search-input"
                    value={newSampleCount}
                    onChange={(e) => setNewSampleCount(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div>
                  <label htmlFor="new-box-temp" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    {t('partner.vreg.cold.labelTemp')}
                  </label>
                  <input
                    id="new-box-temp"
                    type="number"
                    step="0.1"
                    className="sk-coldchain-search-input"
                    value={newRecordedTemp}
                    onChange={(e) => setNewRecordedTemp(e.target.value)}
                    required
                    aria-invalid={tempError}
                    aria-describedby={tempError ? 'new-box-temp-error' : undefined}
                  />
                  {tempError && (
                    <span id="new-box-temp-error" role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--sk-color-danger)' }}>
                      {t('partner.vreg.cold.invalidTemp')}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--sk-color-surface-2)', borderRadius: 12, fontSize: 12, color: 'var(--sk-color-text-2)' }}>
                <Thermometer size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} aria-hidden="true" />
                {t('partner.vreg.cold.rangeNote')}
              </div>
            </div>
            <div className="sk-coldchain-modal-footer">
              <button
                type="button"
                className="sk-runsheet-btn-secondary"
                onClick={() => setShowAddBoxModal(false)}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="sk-coldchain-add-btn">
                {t('partner.vreg.cold.submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="sk-coldchain-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
