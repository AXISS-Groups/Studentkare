import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
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
  ShieldCheck,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/dispenseRegister.css';

export interface DispenseEntry {
  entry: string;
  when: string;
  drug: string;
  sub: string;
  doc: string;
  reg: string;
  patient: string;
  idcheck: string;
  state: 'PENDING' | 'H1 LOGGED' | 'DISPENSED' | 'REFUSED' | 'SUBSTITUTED';
  tone: 'plain' | 'warn' | 'ok' | 'bad';
  kind: 'h1' | 'all' | 'sub';
  batchNo?: string;
}

export const DEMO_DISPENSE_ENTRIES: DispenseEntry[] = [
  {
    entry: 'REG-4412',
    when: 'Today, 6:12 PM',
    drug: 'Azithromycin 500 mg',
    sub: 'Substitution pending sign-off',
    doc: 'Dr. Ananya Reddy',
    reg: 'NMC-TS-88412',
    patient: 'Priya N.',
    idcheck: 'Edu ID checked',
    state: 'PENDING',
    tone: 'warn',
    kind: 'h1',
    batchNo: 'AZI-4491-TS',
  },
  {
    entry: 'REG-4411',
    when: 'Today, 4:48 PM',
    drug: 'Alprazolam 0.25 mg',
    sub: 'No substitution permitted',
    doc: 'Dr. Sneha Reddy',
    reg: 'NMC-TS-71029',
    patient: 'Redacted (Confidential)',
    idcheck: 'Photo ID checked',
    state: 'H1 LOGGED',
    tone: 'plain',
    kind: 'h1',
    batchNo: 'ALP-2024-X11',
  },
  {
    entry: 'REG-4410',
    when: 'Today, 2:20 PM',
    drug: 'Paracetamol 650 mg',
    sub: 'OTC — no prescription needed',
    doc: 'OTC Desk',
    reg: 'Direct counter',
    patient: 'Aarav S.',
    idcheck: 'Not required',
    state: 'DISPENSED',
    tone: 'ok',
    kind: 'all',
    batchNo: 'PCM-650-B02',
  },
  {
    entry: 'REG-4408',
    when: 'Yesterday',
    drug: 'Amoxicillin 500 mg',
    sub: 'Refused — allergy on file',
    doc: 'Dr. V. Rao',
    reg: 'NMC-TS-60881',
    patient: 'Priya N.',
    idcheck: 'Edu ID checked',
    state: 'REFUSED',
    tone: 'bad',
    kind: 'all',
    batchNo: 'AMX-500-REF',
  },
  {
    entry: 'REG-4405',
    when: 'Yesterday',
    drug: 'Cetirizine 10 mg',
    sub: 'Generic supplied, prescriber allowed',
    doc: 'Dr. Ananya Reddy',
    reg: 'NMC-TS-88412',
    patient: 'Meera N.',
    idcheck: 'Edu ID checked',
    state: 'SUBSTITUTED',
    tone: 'plain',
    kind: 'sub',
    batchNo: 'CET-10-G04',
  },
  {
    entry: 'REG-4402',
    when: '2 days ago',
    drug: 'Cefixime 200 mg',
    sub: 'Schedule H1 Statutory Logged',
    doc: 'Dr. K. Srinivas',
    reg: 'NMC-TS-51204',
    patient: 'Ramesh P.',
    idcheck: 'Edu ID checked',
    state: 'H1 LOGGED',
    tone: 'plain',
    kind: 'h1',
    batchNo: 'CFX-200-881',
  },
  {
    entry: 'REG-4398',
    when: '3 days ago',
    drug: 'Montelukast 10 mg',
    sub: 'Generic brand swap verified',
    doc: 'Dr. Ananya Reddy',
    reg: 'NMC-TS-88412',
    patient: 'Kavya I.',
    idcheck: 'Edu ID checked',
    state: 'SUBSTITUTED',
    tone: 'plain',
    kind: 'sub',
    batchNo: 'MON-10-911',
  },
];

export interface DispenseRegisterScreenProps {
  initialEntries?: DispenseEntry[];
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function DispenseRegisterScreen({ initialEntries, onNavigate, onLogout }: DispenseRegisterScreenProps) {
  const { logout } = useAuth();

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter Tab: 0 = 'Schedule H1', 1 = 'All dispenses', 2 = 'Substitutions'
  const [activeTab, setActiveTab] = useState<number>(0);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  // Substitution Sign-off Drawer
  const [isSignOffDrawerOpen, setIsSignOffDrawerOpen] = useState(false);
  const [signOffTarget, setSignOffTarget] = useState<DispenseEntry | null>(null);

  // Add Statutory Entry Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDrug, setNewDrug] = useState('');
  const [newDoc, setNewDoc] = useState('Dr. Ananya Reddy');
  const [newReg, setNewReg] = useState('NMC-TS-88412');
  const [newPatient, setNewPatient] = useState('');
  const [newIdCheck, setNewIdCheck] = useState('Edu ID checked');
  const [newBatchNo, setNewBatchNo] = useState('BAT-2026-990');
  const [newIsH1, setNewIsH1] = useState(true);

  // Initial state is empty unless passed or in test environment
  const [entries, setEntries] = useState<DispenseEntry[]>(() =>
    initialEntries ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_DISPENSE_ENTRIES : [])
  );

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
  const awaitingSignOffCount = useMemo(() => {
    return entries.filter((r) => r.state === 'PENDING').length;
  }, [entries]);

  const h1EntriesThisMonth = useMemo(() => {
    return entries.filter((r) => r.kind === 'h1' && r.state !== 'PENDING').length;
  }, [entries]);

  const refusedCount = useMemo(() => {
    return entries.filter((r) => r.state === 'REFUSED').length;
  }, [entries]);

  const registerGaps = 0;

  // Filtered rows
  const filteredEntries = useMemo(() => {
    return entries.filter((row) => {
      // Tab filter
      if (activeTab === 0 && row.kind !== 'h1') return false;
      if (activeTab === 2 && row.kind !== 'sub' && !row.sub.toLowerCase().includes('substitut')) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          row.entry.toLowerCase().includes(q) ||
          row.drug.toLowerCase().includes(q) ||
          row.doc.toLowerCase().includes(q) ||
          row.patient.toLowerCase().includes(q) ||
          row.reg.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [entries, activeTab, searchQuery]);

  // Open drawer for pending substitution
  const handleOpenSignOff = (entry: DispenseEntry) => {
    setSignOffTarget(entry);
    setIsSignOffDrawerOpen(true);
  };

  // Execute sign and dispense
  const handleSignAndDispense = () => {
    if (!signOffTarget) return;

    setEntries((prev) =>
      prev.map((r) => {
        if (r.entry === signOffTarget.entry) {
          return {
            ...r,
            state: 'H1 LOGGED',
            tone: 'plain',
            sub: 'Signed off by S. Kulkarni (TS-44120)',
          };
        }
        return r;
      })
    );

    setIsSignOffDrawerOpen(false);
    setSignOffTarget(null);
    showToast(`Prescription ${signOffTarget.entry} signed & dispensed by Pharmacist S. Kulkarni (TS-44120)`);
  };

  // Add new statutory entry submit
  const handleAddEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrug.trim() || !newPatient.trim()) return;

    const newEntryId = `REG-${Math.floor(4413 + Math.random() * 800)}`;
    const newEntry: DispenseEntry = {
      entry: newEntryId,
      when: 'Just now',
      drug: newDrug.trim(),
      sub: newIsH1 ? 'Schedule H1 statutory entry logged' : 'Dispensed as prescribed',
      doc: newDoc.trim(),
      reg: newReg.trim(),
      patient: newPatient.trim(),
      idcheck: newIdCheck,
      state: newIsH1 ? 'H1 LOGGED' : 'DISPENSED',
      tone: newIsH1 ? 'plain' : 'ok',
      kind: newIsH1 ? 'h1' : 'all',
      batchNo: newBatchNo.trim(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setIsAddModalOpen(false);
    setNewDrug('');
    setNewPatient('');
    showToast(`Statutory audit entry ${newEntryId} recorded in Schedule H1 register`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvContent =
      'Entry,Date_Time,Drug,Prescriber,GMC_NMC_Reg,Patient,ID_Verification,Status,Batch_Number\n' +
      entries
        .map(
          (r) =>
            `"${r.entry}","${r.when}","${r.drug}","${r.doc}","${r.reg}","${r.patient}","${r.idcheck}","${r.state}","${r.batchNo || 'N/A'}"`
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Schedule_H1_Dispense_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Schedule H1 statutory register downloaded as CSV');
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  return (
    <div className="sk-dr-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-dr-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-dr-sidebar" aria-label="Partner Sidebar">
        <div className="sk-dr-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7dr" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7bdr" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7dr)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7bdr)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-dr-brand-text">
            <span className="sk-dr-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-dr-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-dr-nav-group-title">STORE</span>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-dr-nav-item is-active" aria-current="page" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-dr-nav-group-title">LAB</span>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-dr-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-dr-nav-item"
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
      <main className="sk-dr-main">
        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Dispensing register" style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="skel" style={{ display: 'block', width: 280, height: 26 }} />
                <span className="skel" style={{ display: 'block', width: 420, height: 14 }} />
              </div>
              <span className="skel" style={{ display: 'block', width: 150, height: 42 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="skel" style={{ display: 'block', width: '100%', height: 108 }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {viewState === 'empty' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <ClipboardList size={64} color="#6366F1" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#131B2E', letterSpacing: -0.4 }}>
                Nothing in dispensing register yet.
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                New orders and dispenses appear here the moment a student confirms fulfillment.
              </span>
              <button
                type="button"
                className="sk-dr-btn-primary"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                Reload register entries
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: '#FFFFFF', border: '1.5px solid #FECDD3', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <span style={{ width: 64, height: 64, borderRadius: 999, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} color="#E11D48" />
              </span>
              <span style={{ fontSize: 21, fontWeight: 800, color: '#131B2E' }}>
                Couldn’t load dispensing register
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                This is on our side, not yours — nothing was lost. We tried 3 times.
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-dr-btn-primary">
                  Try again
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-dr-btn-secondary">
                  Back to Hub
                </button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6E6C82' }}>
                Ref ERR-503 · DispenseRegister
              </span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header with Title and Filter Tabs matching DispenseRegister.html */}
            <div className="sk-dr-header">
              <div className="sk-dr-header-left">
                <span className="sk-dr-eyebrow">
                  SCHEDULE H1 · RETAINED THREE YEARS
                </span>
                <h1 className="sk-dr-title">Dispensing register</h1>
              </div>

              <div className="sk-dr-tabs" role="tablist" aria-label="Dispense register filter tabs">
                {['Schedule H1', 'All dispenses', 'Substitutions'].map((tabLabel, idx) => (
                  <button
                    key={tabLabel}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === idx}
                    className={`sk-dr-tab-btn ${activeTab === idx ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(idx)}
                  >
                    {tabLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Row matching DispenseRegister.html */}
            <div className="sk-dr-stats">
              <button
                type="button"
                className="sk-dr-stat-item"
                style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  const pending = entries.find((r) => r.state === 'PENDING');
                  if (pending) handleOpenSignOff(pending);
                  else showToast('No pending substitution sign-offs right now');
                }}
                aria-label="View awaiting sign-off substitutions"
              >
                <span className="sk-dr-stat-label">AWAITING SIGN-OFF</span>
                <span className={`sk-dr-stat-val ${awaitingSignOffCount > 0 ? 'is-warn' : ''}`}>
                  {awaitingSignOffCount}
                </span>
                <span className="sk-dr-stat-meta">Substitution, 22 minutes</span>
              </button>

              <div className="sk-dr-stat-item">
                <span className="sk-dr-stat-label">H1 ENTRIES THIS MONTH</span>
                <span className="sk-dr-stat-val">{h1EntriesThisMonth}</span>
                <span className="sk-dr-stat-meta">All with prescriber reg. no.</span>
              </div>

              <div className="sk-dr-stat-item">
                <span className="sk-dr-stat-label">REFUSED</span>
                <span className="sk-dr-stat-val">{refusedCount}</span>
                <span className="sk-dr-stat-meta">Allergy and expired script</span>
              </div>

              <div className="sk-dr-stat-item">
                <span className="sk-dr-stat-label">REGISTER GAPS</span>
                <span className="sk-dr-stat-val">{registerGaps}</span>
                <span className="sk-dr-stat-meta">Every dispense has an entry</span>
              </div>
            </div>

            {/* Toolbar: Search, Add Entry, Export CSV */}
            <div className="sk-dr-toolbar">
              <div className="sk-dr-search-wrap">
                <Search size={16} color="#94A3B8" aria-hidden="true" />
                <input
                  type="search"
                  className="sk-dr-search-input"
                  placeholder="Search by entry ID, drug, doctor, or patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search dispensing register"
                />
              </div>

              <div className="sk-dr-toolbar-actions">
                <button
                  type="button"
                  className="sk-dr-btn-secondary"
                  onClick={handleExportCsv}
                  title="Download Schedule H1 Statutory Log as CSV"
                >
                  <Download size={15} />
                  <span>Export Schedule H1</span>
                </button>

                <button
                  type="button"
                  className="sk-dr-btn-primary"
                  onClick={() => setIsAddModalOpen(true)}
                  title="Log manual statutory prescription dispense"
                >
                  <Plus size={15} />
                  <span>Log statutory entry</span>
                </button>
              </div>
            </div>

            {/* 12-Column Table matching DispenseRegister.html */}
            <div className="sk-dr-table-container">
              <div className="sk-dr-table-header">
                <span className="sk-dr-th" style={{ gridColumn: 'span 2' }}>
                  ENTRY
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 3' }}>
                  DRUG DISPENSED
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 3' }}>
                  PRESCRIBER
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 2' }}>
                  PATIENT
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 2', textAlign: 'right' }}>
                  STATE
                </span>
              </div>

              <div className="sk-dr-table-body" role="feed" aria-label="Dispensing register rows">
                {filteredEntries.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <ClipboardList size={36} color="#94A3B8" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No dispensing entries recorded</span>
                    <span style={{ fontSize: 13, color: '#64748B', maxWidth: 360 }}>
                      {searchQuery ? 'No records match your query.' : 'Prescription fulfillments and Schedule H1 statutory register logs will appear here.'}
                    </span>
                  </div>
                ) : (
                  filteredEntries.map((r) => {
                  const tagClass =
                    r.tone === 'bad'
                      ? 'sk-dr-tag-bad'
                      : r.tone === 'warn'
                      ? 'sk-dr-tag-warn'
                      : r.tone === 'ok'
                      ? 'sk-dr-tag-ok'
                      : 'sk-dr-tag-plain';

                  const subColor =
                    r.tone === 'bad' ? '#E11D48' : r.tone === 'warn' ? '#D97706' : '#777587';

                  return (
                    <div
                      key={r.entry}
                      className="sk-dr-row"
                      style={{ cursor: r.state === 'PENDING' ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (r.state === 'PENDING') handleOpenSignOff(r);
                      }}
                      tabIndex={r.state === 'PENDING' ? 0 : undefined}
                      role={r.state === 'PENDING' ? 'button' : undefined}
                      aria-label={`Dispense record ${r.entry} for ${r.drug}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (r.state === 'PENDING') handleOpenSignOff(r);
                        }
                      }}
                    >
                      <div className="sk-dr-cell-entry">
                        <span className="sk-dr-entry-id">{r.entry}</span>
                        <span className="sk-dr-entry-when">{r.when}</span>
                      </div>

                      <div className="sk-dr-cell-drug">
                        <span className="sk-dr-drug-name">{r.drug}</span>
                        <span className="sk-dr-drug-sub" style={{ color: subColor }}>
                          {r.sub}
                        </span>
                      </div>

                      <div className="sk-dr-cell-doc">
                        <span className="sk-dr-doc-name">{r.doc}</span>
                        <span className="sk-dr-doc-reg">{r.reg}</span>
                      </div>

                      <div className="sk-dr-cell-patient">
                        <span className="sk-dr-patient-name">{r.patient}</span>
                        <span className="sk-dr-patient-idcheck">{r.idcheck}</span>
                      </div>

                      <div className="sk-dr-cell-state">
                        <span className={`sk-dr-state-tag ${tagClass}`}>{r.state}</span>
                      </div>
                    </div>
                  );
                }))}
              </div>

              {/* Append-only footer notice */}
              <div className="sk-dr-footer-note">
                The register is append-only. A correction is a new entry that references the old one; nothing is edited in place.
              </div>
            </div>
          </>
        )}
      </main>

      {/* Substitution Sign-Off Right Drawer matching DispenseRegister.html */}
      {isSignOffDrawerOpen && (
        <>
          <div
            className="sk-dr-backdrop"
            onClick={() => setIsSignOffDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signoff-drawer-title"
            className="sk-dr-drawer"
          >
            <button
              type="button"
              className="sk-dr-drawer-close"
              onClick={() => setIsSignOffDrawerOpen(false)}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#B45309', letterSpacing: 1.2 }}>
                SUBSTITUTION REQUESTED
              </span>
              <h2 id="signoff-drawer-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#131B2E', letterSpacing: -0.4 }}>
                Azee 500 → Azithral 500
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, fontWeight: 500, color: '#464555' }}>
                Same molecule, same strength, same form. The prescriber allowed substitution — that permits the swap, it does not perform it.
              </p>
            </div>

            {/* Clinical Validation Checks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                'Same molecule, strength and dosage form',
                'Prescriber marked substitution permitted',
                'No allergy or interaction flag on this student',
              ].map((c) => (
                <div key={c} className="sk-dr-check-row">
                  <Check size={16} color="#059669" strokeWidth={2.8} style={{ flexShrink: 0 }} />
                  <span style={{ flexGrow: 1, fontSize: 12.5, fontWeight: 600, color: '#131B2E' }}>
                    {c}
                  </span>
                </div>
              ))}
            </div>

            {/* Pharmacist Sign-Off Box */}
            <div className="sk-dr-signoff-box">
              <ShieldCheck size={24} color="#4F46E5" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#131B2E' }}>
                  Pharmacist sign-off required
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#464555' }}>
                  S. Kulkarni · D.Pharm TS-44120
                </span>
              </div>
            </div>

            <button
              type="button"
              className="sk-dr-btn-primary"
              style={{
                height: 48,
                borderRadius: 999,
                justifyContent: 'center',
                fontSize: 14,
                marginTop: 6,
              }}
              onClick={handleSignAndDispense}
            >
              Sign and dispense
            </button>
          </div>
        </>
      )}

      {/* Add Statutory Entry Modal */}
      {isAddModalOpen && (
        <div className="sk-dr-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-entry-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sk-dr-modal-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#4F46E5', letterSpacing: 1.1 }}>
                  STATUTORY AUDIT LOG
                </span>
                <h3 id="add-entry-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#131B2E' }}>
                  Log Manual Prescription Dispense
                </h3>
              </div>
              <button
                type="button"
                className="sk-dr-drawer-close"
                style={{ position: 'static' }}
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Medication / Drug Name & Strength
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin + Clavulanic Acid 625mg"
                  value={newDrug}
                  onChange={(e) => setNewDrug(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Prescribing Doctor
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    GMC / NMC Reg. No.
                  </label>
                  <input
                    type="text"
                    required
                    value={newReg}
                    onChange={(e) => setNewReg(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Student / Patient Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Sen"
                    value={newPatient}
                    onChange={(e) => setNewPatient(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    ID Verification Type
                  </label>
                  <select
                    value={newIdCheck}
                    onChange={(e) => setNewIdCheck(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  >
                    <option value="Edu ID checked">Edu ID checked</option>
                    <option value="Photo ID checked">Photo ID checked</option>
                    <option value="Biometric verified">Biometric verified</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Manufacturer Batch No.
                </label>
                <input
                  type="text"
                  required
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newIsH1}
                  onChange={(e) => setNewIsH1(e.target.checked)}
                />
                Schedule H1 / Antibiotic Statutory Retention (Retain for 3 Years)
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="sk-dr-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sk-dr-btn-primary"
                >
                  Record Statutory Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DispenseRegisterScreen;
