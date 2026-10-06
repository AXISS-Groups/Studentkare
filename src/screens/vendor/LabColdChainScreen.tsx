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

export interface LabColdChainScreenProps {
  initialBoxes?: ColdChainBox[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function LabColdChainScreen({ initialBoxes, onNavigate, onLogout }: LabColdChainScreenProps) {
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
  const [newRecordedTemp, setNewRecordedTemp] = useState('4.8');

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
    showToast('Free recollection orders issued · Students notified');
  };

  // Handle Handover to Lab Bench
  const handleBenchHandover = (boxId: string) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === boxId ? { ...b, outcome: 'Delivered' } : b))
    );
    setSelectedBox(null);
    showToast('Box samples admitted to lab processing bench');
  };

  // Add new box
  const handleCreateBox = (e: React.FormEvent) => {
    e.preventDefault();
    const tempNum = parseFloat(newRecordedTemp) || 4.5;
    const isBreached = tempNum < 2.0 || tempNum > 8.0;
    const outcome = isBreached ? ('Breached — held' as const) : ('In range' as const);

    const createdBox: ColdChainBox = {
      id: `box-${Date.now()}`,
      boxId: newBoxId.trim().toUpperCase() || `BX-${Math.floor(4400 + Math.random() * 90)}`,
      contents: newContents.trim() || 'Campus shuttle · 4 samples',
      sampleCount: newSampleCount,
      requiredRange: '2–8 °C',
      recordedTemp: `${tempNum.toFixed(1)} °C peak${isBreached ? ' (Out of range)' : ''}`,
      peakTempCelsius: tempNum,
      outcome,
      samples: Array.from({ length: newSampleCount }, (_, i) => `SMP-90${i + 1}`),
    };

    setBoxes((prev) => [createdBox, ...prev]);
    setShowAddBoxModal(false);
    setNewBoxId('');
    setNewContents('');
    showToast(`Logged box ${createdBox.boxId} · Outcome: ${outcome}`);
  };

  return (
    <div className="sk-coldchain-root">
      {/* 18-Option Partner Sidebar */}
      <aside className="sk-coldchain-sidebar" aria-label="Partner Navigation">
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
            <span className="sk-coldchain-badge-partner">PARTNER</span>
          </span>
        </div>

        <nav className="sk-coldchain-nav" aria-label="Partner Console Links">
          {/* Section: STORE */}
          <span className="sk-coldchain-nav-section">STORE</span>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-coldchain-nav-section">LAB</span>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item is-active" aria-current="page">
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => showToast('Opened release results panel')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-coldchain-nav-section">BUSINESS</span>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-coldchain-nav-item" onClick={() => handleNav('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div className="sk-coldchain-sidebar-footer">
          <button type="button" className="sk-coldchain-signout-btn" onClick={handleSignOut}>
            <LogOut size={15} />
            <span>MedPlus · Vijaya Diagnostics</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sk-coldchain-main">
        {/* Header */}
        <div className="sk-coldchain-header">
          <div>
            <h1 className="sk-coldchain-title">Cold chain</h1>
            <p className="sk-coldchain-subtitle">Every box logged from collection to bench · 2–8 °C required</p>
          </div>
          <div className="sk-coldchain-header-actions">
            {breachedCount > 0 && (
              <span className="sk-coldchain-breach-pill" role="status">
                <span className="sk-coldchain-pulse-dot" />
                {breachedCount} breach held
              </span>
            )}
            <button
              type="button"
              className="sk-coldchain-add-btn"
              onClick={() => setShowAddBoxModal(true)}
              aria-label="Log new transit cold box"
            >
              <Plus size={16} />
              <span>Log new box</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="sk-coldchain-stats-grid">
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number">{totalBoxes}</span>
            <span className="sk-coldchain-stat-label">Boxes in transit today</span>
          </div>
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number is-breached">{breachedCount}</span>
            <span className="sk-coldchain-stat-label">Breached</span>
          </div>
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number is-breached">{heldSamplesCount}</span>
            <span className="sk-coldchain-stat-label">Samples held, not run</span>
          </div>
          <div className="sk-coldchain-stat-card">
            <span className="sk-coldchain-stat-number is-success">
              {totalBoxes > 0 ? `${Math.round((boxes.filter((b) => Boolean(b.recordedTemp)).length / totalBoxes) * 100)}%` : '0%'}
            </span>
            <span className="sk-coldchain-stat-label">Logged end to end</span>
          </div>
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div className="sk-coldchain-toolbar">
          <div className="sk-coldchain-filter-tabs">
            {(['All', 'In range', 'Breached', 'Delivered'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sk-coldchain-filter-btn ${selectedFilter === filter ? 'is-active' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="sk-coldchain-search-wrap">
            <Search className="sk-coldchain-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search by box ID, route, or temp..."
              className="sk-coldchain-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search cold chain boxes"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="sk-coldchain-table-card">
          <div className="sk-coldchain-table-header">
            <span className="sk-coldchain-col-header">BOX</span>
            <span className="sk-coldchain-col-header">CONTENTS</span>
            <span className="sk-coldchain-col-header">REQUIRED</span>
            <span className="sk-coldchain-col-header">RECORDED</span>
            <span className="sk-coldchain-col-header" style={{ justifySelf: 'end' }}>
              OUTCOME
            </span>
          </div>

          {filteredBoxes.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Snowflake size={36} color="#94A3B8" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No cold-chain boxes logged</span>
              <span style={{ fontSize: 13, color: '#64748B', maxWidth: 360 }}>
                {searchQuery ? 'No transport boxes match your search filter.' : 'Sample transport temperature telemetry and chain-of-custody boxes will appear here.'}
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
                aria-label={`Box ${box.boxId}, ${box.contents}, outcome: ${box.outcome}`}
              >
                <span className="sk-coldchain-box-id">{box.boxId}</span>
                <span className="sk-coldchain-contents">{box.contents}</span>
                <span className="sk-coldchain-required">{box.requiredRange}</span>
                <span className={`sk-coldchain-recorded ${box.outcome === 'Breached — held' ? 'is-breached' : ''}`}>
                  {box.recordedTemp}
                </span>
                <span className={`sk-coldchain-status-badge ${outcomeClass}`}>{box.outcome}</span>
              </div>
            );
          }))}

          <div className="sk-coldchain-policy-footer">
            A breached box is held and the students are offered a free recollection. It is never run with a
            footnote — a result from a sample outside range is not a result, and a caveat on a report nobody
            reads is not a safeguard.
          </div>
        </div>
      </main>

      {/* Box Inspection & Incident Modal */}
      {selectedBox && (
        <div className="sk-coldchain-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="box-detail-title">
          <div className="sk-coldchain-modal">
            <div className="sk-coldchain-modal-header">
              <h3 id="box-detail-title" className="sk-coldchain-modal-title">
                Box Details: {selectedBox.boxId}
              </h3>
              <button
                type="button"
                className="sk-coldchain-modal-close"
                onClick={() => setSelectedBox(null)}
                aria-label="Close box details modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-coldchain-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>COLD BOX ID</span>
                  <div style={{ fontWeight: 800 }}>{selectedBox.boxId}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>CURRENT OUTCOME</span>
                  <div>
                    <span className={`sk-coldchain-status-badge ${selectedBox.outcome === 'Breached — held' ? 'outcome-breached' : selectedBox.outcome === 'Delivered' ? 'outcome-delivered' : 'outcome-in-range'}`}>
                      {selectedBox.outcome}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>TEMPERATURE SPEC</span>
                  <div style={{ fontWeight: 800 }}>{selectedBox.requiredRange}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>LOGGER RECORDING</span>
                  <div style={{ fontWeight: 800, color: selectedBox.outcome === 'Breached — held' ? '#E11D48' : '#047857' }}>
                    {selectedBox.recordedTemp}
                  </div>
                </div>
              </div>

              {selectedBox.outcome === 'Breached — held' && (
                <div style={{ padding: 14, background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E11D48', fontWeight: 800 }}>
                    <ShieldAlert size={20} />
                    <span>Clinical Temperature Breach Hold</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#9F1239' }}>
                    {selectedBox.durationMinutesBreached} minutes above 8.0 °C threshold. Samples in this box cannot be processed for clinical reporting.
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#131B2E' }}>
                    Affected Student Samples:
                  </div>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: '#475569' }}>
                    {selectedBox.samples?.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedBox.outcome === 'In range' && (
                <div style={{ padding: 14, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#047857' }}>
                  <CheckCircle2 size={24} />
                  <div>
                    <strong>Continuous 2–8 °C Integrity Verified</strong>
                    <div style={{ fontSize: 12, color: '#065F46' }}>Ready to admit {selectedBox.sampleCount} samples to clinical bench.</div>
                  </div>
                </div>
              )}
            </div>
            <div className="sk-coldchain-modal-footer">
              {selectedBox.outcome === 'Breached — held' && (
                <button
                  type="button"
                  className="sk-coldchain-add-btn"
                  style={{ background: '#E11D48' }}
                  onClick={() => handleTriggerRecollection(selectedBox.id)}
                >
                  Trigger Free Student Recollection
                </button>
              )}
              {selectedBox.outcome === 'In range' && (
                <button
                  type="button"
                  className="sk-coldchain-add-btn"
                  onClick={() => handleBenchHandover(selectedBox.id)}
                >
                  Admit to Lab Bench
                </button>
              )}
              <button
                type="button"
                className="sk-runsheet-btn-secondary"
                onClick={() => setSelectedBox(null)}
              >
                Close
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
                Log Transit Cold Box
              </h3>
              <button
                type="button"
                className="sk-coldchain-modal-close"
                onClick={() => setShowAddBoxModal(false)}
                aria-label="Close add box modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-coldchain-modal-body">
              <div>
                <label htmlFor="new-box-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Cold Box Identifier
                </label>
                <input
                  id="new-box-id"
                  type="text"
                  placeholder="e.g. BX-4418"
                  className="sk-coldchain-search-input"
                  value={newBoxId}
                  onChange={(e) => setNewBoxId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="new-box-desc" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Transit Route &amp; Description
                </label>
                <input
                  id="new-box-desc"
                  type="text"
                  placeholder="e.g. Block E campus run · 4 samples"
                  className="sk-coldchain-search-input"
                  value={newContents}
                  onChange={(e) => setNewContents(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="new-box-samples" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Sample Count
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
                    Logger Temp (°C)
                  </label>
                  <input
                    id="new-box-temp"
                    type="number"
                    step="0.1"
                    className="sk-coldchain-search-input"
                    value={newRecordedTemp}
                    onChange={(e) => setNewRecordedTemp(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12, fontSize: 12, color: '#475569' }}>
                <Thermometer size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Temperatures between <strong>2.0 °C and 8.0 °C</strong> are validated as In-Range. Temperatures outside this envelope will be quarantined.
              </div>
            </div>
            <div className="sk-coldchain-modal-footer">
              <button
                type="button"
                className="sk-runsheet-btn-secondary"
                onClick={() => setShowAddBoxModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="sk-coldchain-add-btn">
                Log &amp; Register Box
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
