import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Circle,
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
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

const STATE_KEYS: Record<DispenseEntry['state'], MessageKey> = {
  PENDING: 'partner.vreg.dispense.state.PENDING',
  'H1 LOGGED': 'partner.vreg.dispense.state.H1LOGGED',
  DISPENSED: 'partner.vreg.dispense.state.DISPENSED',
  REFUSED: 'partner.vreg.dispense.state.REFUSED',
  SUBSTITUTED: 'partner.vreg.dispense.state.SUBSTITUTED',
};

/** ID-check values are stored (and exported) in English; only the label is translated. */
const ID_CHECK_KEYS: Record<string, MessageKey> = {
  'Edu ID checked': 'partner.vreg.dispense.idEdu',
  'Photo ID checked': 'partner.vreg.dispense.idPhoto',
  'Biometric verified': 'partner.vreg.dispense.idBio',
  'Not required': 'partner.vreg.dispense.idNone',
};

export interface DispenseRegisterScreenProps {
  initialEntries?: DispenseEntry[];
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function DispenseRegisterScreen({ initialEntries, onNavigate, onLogout }: DispenseRegisterScreenProps) {
  const t = useT();
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
  // No prefilled prescriber, registration, ID check or batch: each must be entered for this dispense.
  const [newDoc, setNewDoc] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newPatient, setNewPatient] = useState('');
  const [newIdCheck, setNewIdCheck] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('');
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
            sub: t('partner.vreg.dispense.signedSub'),
          };
        }
        return r;
      })
    );

    setIsSignOffDrawerOpen(false);
    setSignOffTarget(null);
    showToast(t('partner.vreg.dispense.signedToast', { entry: signOffTarget.entry }));
  };

  // Add new statutory entry submit
  const handleAddEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrug.trim() || !newPatient.trim() || !newDoc.trim() || !newReg.trim() || !newIdCheck || !newBatchNo.trim()) return;

    const newEntryId = `REG-${Math.floor(4413 + Math.random() * 800)}`;
    const newEntry: DispenseEntry = {
      entry: newEntryId,
      when: t('partner.vreg.dispense.justNow'),
      drug: newDrug.trim(),
      sub: newIsH1 ? t('partner.vreg.dispense.subH1') : t('partner.vreg.dispense.subAsPrescribed'),
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
    setNewDoc('');
    setNewReg('');
    setNewIdCheck('');
    setNewBatchNo('');
    showToast(t('partner.vreg.dispense.addedToast', { entry: newEntryId }));
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
    showToast(t('partner.vreg.dispense.exported'));
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
          <CheckCircle2 size={18} color="var(--sk-color-positive)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-dr-sidebar" aria-label={t('partner.vreg.nav.label')}>
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
            <span className="sk-dr-brand-badge">{t('partner.vreg.nav.badge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vreg.nav.label')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-dr-nav-group-title">{t('partner.vreg.nav.store')}</span>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.home')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.verify')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.orders')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.otp')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.returns')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item is-active" aria-current="page" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.reorder')}</span>
          </button>

          <span className="sk-dr-nav-group-title">{t('partner.vreg.nav.lab')}</span>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.nav.labReports')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.camp')}</span>
          </button>

          <span className="sk-dr-nav-group-title">{t('partner.vreg.nav.business')}</span>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.staff')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-dr-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vreg.nav.settlement')}</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-dr-nav-item"
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)' }}
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vreg.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-dr-main">
        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vreg.dispense.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
              <ClipboardList size={64} color="var(--sk-color-action)" aria-hidden="true" />
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                {t('partner.vreg.dispense.emptyTitle')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vreg.dispense.emptyBody')}
              </span>
              <button
                type="button"
                className="sk-dr-btn-primary"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                {t('partner.vreg.dispense.emptyReload')}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} color="var(--sk-color-danger)" aria-hidden="true" />
              </span>
              <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                {t('partner.vreg.dispense.errorTitle')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vreg.dispense.errorBody')}
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-dr-btn-primary">
                  {t('common.tryAgain')}
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-dr-btn-secondary">
                  {t('partner.vreg.dispense.backHome')}
                </button>
              </div>
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
                  {t('partner.vreg.dispense.eyebrow')}
                </span>
                <h1 className="sk-dr-title">{t('partner.vreg.dispense.title')}</h1>
              </div>

              <div className="sk-dr-tabs" role="tablist" aria-label={t('partner.vreg.dispense.tabsLabel')}>
                {[t('partner.vreg.dispense.tabH1'), t('partner.vreg.dispense.tabAll'), t('partner.vreg.dispense.tabSubs')].map((tabLabel, idx) => (
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

            <p role="note" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 13, lineHeight: 1.5 }}>
              {t('partner.vreg.dispense.notConnected')}
            </p>

            {/* Stats Row matching DispenseRegister.html */}
            <div className="sk-dr-stats">
              <button
                type="button"
                className="sk-dr-stat-item"
                style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  const pending = entries.find((r) => r.state === 'PENDING');
                  if (pending) handleOpenSignOff(pending);
                  else showToast(t('partner.vreg.dispense.noPending'));
                }}
                aria-label={t('partner.vreg.dispense.statAwaitingAria')}
              >
                <span className="sk-dr-stat-label">{t('partner.vreg.dispense.statAwaiting')}</span>
                <span className={`sk-dr-stat-val ${awaitingSignOffCount > 0 ? 'is-warn' : ''}`}>
                  {awaitingSignOffCount}
                </span>
                <span className="sk-dr-stat-meta">{t('partner.vreg.dispense.statAwaitingMeta')}</span>
              </button>

              <div className="sk-dr-stat-item">
                <span className="sk-dr-stat-label">{t('partner.vreg.dispense.statH1')}</span>
                <span className="sk-dr-stat-val">{h1EntriesThisMonth}</span>
                <span className="sk-dr-stat-meta">{t('partner.vreg.dispense.statH1Meta')}</span>
              </div>

              <div className="sk-dr-stat-item">
                <span className="sk-dr-stat-label">{t('partner.vreg.dispense.statRefused')}</span>
                <span className="sk-dr-stat-val">{refusedCount}</span>
                <span className="sk-dr-stat-meta">{t('partner.vreg.dispense.statRefusedMeta')}</span>
              </div>

              <div className="sk-dr-stat-item">
                <span className="sk-dr-stat-label">{t('partner.vreg.dispense.statGaps')}</span>
                <span className="sk-dr-stat-val">—</span>
                <span className="sk-dr-stat-meta">{t('partner.vreg.dispense.statGapsMeta')}</span>
              </div>
            </div>

            {/* Toolbar: Search, Add Entry, Export CSV */}
            <div className="sk-dr-toolbar">
              <div className="sk-dr-search-wrap">
                <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
                <input
                  type="search"
                  className="sk-dr-search-input"
                  placeholder={t('partner.vreg.dispense.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('partner.vreg.dispense.searchLabel')}
                />
              </div>

              <div className="sk-dr-toolbar-actions">
                <button
                  type="button"
                  className="sk-dr-btn-secondary"
                  onClick={handleExportCsv}
                  title={t('partner.vreg.dispense.exportTitle')}
                >
                  <Download size={15} aria-hidden="true" />
                  <span>{t('partner.vreg.dispense.export')}</span>
                </button>

                <button
                  type="button"
                  className="sk-dr-btn-primary"
                  onClick={() => setIsAddModalOpen(true)}
                  title={t('partner.vreg.dispense.logTitle')}
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>{t('partner.vreg.dispense.log')}</span>
                </button>
              </div>
            </div>

            {/* 12-Column Table matching DispenseRegister.html */}
            <div className="sk-dr-table-container">
              <div className="sk-dr-table-header">
                <span className="sk-dr-th" style={{ gridColumn: 'span 2' }}>
                  {t('partner.vreg.dispense.thEntry')}
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 3' }}>
                  {t('partner.vreg.dispense.thDrug')}
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 3' }}>
                  {t('partner.vreg.dispense.thPrescriber')}
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 2' }}>
                  {t('partner.vreg.dispense.thPatient')}
                </span>
                <span className="sk-dr-th" style={{ gridColumn: 'span 2', textAlign: 'right' }}>
                  {t('partner.vreg.dispense.thState')}
                </span>
              </div>

              <div className="sk-dr-table-body" role="feed" aria-label={t('partner.vreg.dispense.rowsLabel')}>
                {filteredEntries.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--sk-color-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <ClipboardList size={36} color="var(--sk-color-text-3)" aria-hidden="true" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('partner.vreg.dispense.noRowsTitle')}</span>
                    <span style={{ fontSize: 13, color: 'var(--sk-color-text-3)', maxWidth: 360 }}>
                      {searchQuery ? t('partner.vreg.dispense.noMatch') : t('partner.vreg.dispense.noRowsBody')}
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
                    r.tone === 'bad' ? 'var(--sk-color-danger)' : r.tone === 'warn' ? 'var(--sk-color-attention)' : 'var(--sk-color-text-3)';

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
                      aria-label={t('partner.vreg.dispense.rowAria', { entry: r.entry, drug: r.drug })}
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
                        <span className="sk-dr-patient-idcheck">{r.idcheck in ID_CHECK_KEYS ? t(ID_CHECK_KEYS[r.idcheck]) : r.idcheck}</span>
                      </div>

                      <div className="sk-dr-cell-state">
                        <span className={`sk-dr-state-tag ${tagClass}`}>{t(STATE_KEYS[r.state])}</span>
                      </div>
                    </div>
                  );
                }))}
              </div>

              {/* Append-only footer notice */}
              <div className="sk-dr-footer-note">
                {t('partner.vreg.dispense.footer')}
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
              aria-label={t('partner.vreg.dispense.closePanel')}
            >
              <X size={16} aria-hidden="true" />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-attention)', letterSpacing: 1.2 }}>
                {t('partner.vreg.dispense.drawerEyebrow')}
              </span>
              <h2 id="signoff-drawer-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                {signOffTarget?.drug}
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vreg.dispense.drawerBody')}
              </p>
            </div>

            {/* Checks the pharmacist makes. Nothing here is checked by the app, so nothing is shown as passed. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                {t('partner.vreg.dispense.checksTitle')}
              </span>
              {[
                t('partner.vreg.dispense.checkMolecule'),
                t('partner.vreg.dispense.checkPermitted'),
                t('partner.vreg.dispense.checkAllergy'),
              ].map((c) => (
                <div key={c} className="sk-dr-check-row">
                  <Circle size={16} color="var(--sk-color-text-3)" style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ flexGrow: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text)' }}>
                    {c}
                  </span>
                </div>
              ))}
            </div>

            {/* Pharmacist Sign-Off Box */}
            <div className="sk-dr-signoff-box">
              <ShieldCheck size={24} color="var(--sk-color-action)" style={{ flexShrink: 0 }} aria-hidden="true" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vreg.dispense.signoffTitle')}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vreg.dispense.signoffWho')}
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
              {t('partner.vreg.dispense.sign')}
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
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: 1.1 }}>
                  {t('partner.vreg.dispense.modalEyebrow')}
                </span>
                <h3 id="add-entry-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vreg.dispense.modalTitle')}
                </h3>
              </div>
              <button
                type="button"
                className="sk-dr-drawer-close"
                style={{ position: 'static' }}
                onClick={() => setIsAddModalOpen(false)}
                aria-label={t('partner.vreg.close')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="dr-new-drug" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 }}>
                  {t('partner.vreg.dispense.labelDrug')}
                </label>
                <input
                  id="dr-new-drug"
                  type="text"
                  required
                  placeholder={t('partner.vreg.dispense.phDrug')}
                  value={newDrug}
                  onChange={(e) => setNewDrug(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label htmlFor="dr-new-doc" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 }}>
                    {t('partner.vreg.dispense.labelDoc')}
                  </label>
                  <input
                  id="dr-new-doc"
                    type="text"
                    required
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label htmlFor="dr-new-reg" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 }}>
                    {t('partner.vreg.dispense.labelReg')}
                  </label>
                  <input
                  id="dr-new-reg"
                    type="text"
                    required
                    value={newReg}
                    onChange={(e) => setNewReg(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label htmlFor="dr-new-patient" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 }}>
                    {t('partner.vreg.dispense.labelPatient')}
                  </label>
                  <input
                  id="dr-new-patient"
                    type="text"
                    required
                    placeholder={t('partner.vreg.dispense.phPatient')}
                    value={newPatient}
                    onChange={(e) => setNewPatient(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label htmlFor="dr-new-idcheck" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 }}>
                    {t('partner.vreg.dispense.labelIdCheck')}
                  </label>
                  <select
                  id="dr-new-idcheck"
                    required
                    value={newIdCheck}
                    onChange={(e) => setNewIdCheck(e.target.value)}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' }}
                  >
                    <option value="" disabled>{t('partner.vreg.dispense.idChoose')}</option>
                    <option value="Edu ID checked">{t('partner.vreg.dispense.idEdu')}</option>
                    <option value="Photo ID checked">{t('partner.vreg.dispense.idPhoto')}</option>
                    <option value="Biometric verified">{t('partner.vreg.dispense.idBio')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="dr-new-batch" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 }}>
                  {t('partner.vreg.dispense.labelBatch')}
                </label>
                <input
                  id="dr-new-batch"
                  type="text"
                  required
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text-2)', cursor: 'pointer', minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={newIsH1}
                  onChange={(e) => setNewIsH1(e.target.checked)}
                />
                {t('partner.vreg.dispense.h1Check')}
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="sk-dr-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="sk-dr-btn-primary"
                >
                  {t('partner.vreg.dispense.submit')}
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
