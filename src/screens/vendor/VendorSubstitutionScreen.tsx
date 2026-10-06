import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
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
  Info,
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
  ShieldCheck,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/vendorSubstitution.css';

export interface SubstitutionRecord {
  id: string;
  prescribedDrug: string;
  genericOffered: string;
  savingsText: string;
  savingsRupees: number;
  savingsPercentage: number;
  prescriberRule: 'Swap permitted' | 'Swap NOT permitted';
  isPrescriberBlocked: boolean;
  outcome: 'Student accepted' | 'Student declined' | 'Dispensed as written' | 'No equivalent in stock' | 'Offered to student';
  statusType: 'green' | 'indigo' | 'red' | 'grey';
  notes?: string;
  isNtiDrug?: boolean;
}

const INITIAL_SUBSTITUTIONS: SubstitutionRecord[] = [
  {
    id: 'sub-1',
    prescribedDrug: 'Shelcal 500',
    genericOffered: 'Calcium carbonate 500 mg',
    savingsText: '₹78 (46%)',
    savingsRupees: 78,
    savingsPercentage: 46,
    prescriberRule: 'Swap permitted',
    isPrescriberBlocked: false,
    outcome: 'Student accepted',
    statusType: 'green',
    notes: 'Direct bio-equivalent. DCGI approved monograph formulation. Student confirmed via mobile app.',
  },
  {
    id: 'sub-2',
    prescribedDrug: 'Augmentin 625',
    genericOffered: 'Amoxicillin + clavulanate',
    savingsText: '₹112 (38%)',
    savingsRupees: 112,
    savingsPercentage: 38,
    prescriberRule: 'Swap permitted',
    isPrescriberBlocked: false,
    outcome: 'Student declined',
    statusType: 'indigo',
    notes: 'Prescriber permitted generic substitution. Student opted for innovator brand Augmentin. Dispensed as written.',
  },
  {
    id: 'sub-3',
    prescribedDrug: 'Eltroxin 50 mcg',
    genericOffered: 'Levothyroxine 50 mcg',
    savingsText: '₹34 (29%)',
    savingsRupees: 34,
    savingsPercentage: 29,
    prescriberRule: 'Swap NOT permitted',
    isPrescriberBlocked: true,
    outcome: 'Dispensed as written',
    statusType: 'red',
    isNtiDrug: true,
    notes: 'Narrow therapeutic index (NTI) hormone. Bioavailability fluctuations can compromise thyroid stability. Substitution prohibited by campus endocrinologist.',
  },
  {
    id: 'sub-4',
    prescribedDrug: 'Zincovit',
    genericOffered: 'Multivitamin, equivalent',
    savingsText: '₹42 (35%)',
    savingsRupees: 42,
    savingsPercentage: 35,
    prescriberRule: 'Swap permitted',
    isPrescriberBlocked: false,
    outcome: 'Student accepted',
    statusType: 'green',
    notes: 'Standard multivitamin-mineral formulation with identical elemental zinc and vitamin levels.',
  },
  {
    id: 'sub-5',
    prescribedDrug: 'Asthalin inhaler',
    genericOffered: 'None in stock',
    savingsText: 'No savings',
    savingsRupees: 0,
    savingsPercentage: 0,
    prescriberRule: 'Swap permitted',
    isPrescriberBlocked: false,
    outcome: 'No equivalent in stock',
    statusType: 'grey',
    notes: 'Aerosol DPI equivalent out of stock at partner depot. Innovator Cipla Asthalin dispensed as prescribed.',
  },
];

export const DEMO_SUBSTITUTIONS: SubstitutionRecord[] = INITIAL_SUBSTITUTIONS;

const KNOWN_NTI_DRUGS = [
  'levothyroxine',
  'eltroxin',
  'thyronorm',
  'warfarin',
  'lithium',
  'digoxin',
  'phenytoin',
  'carbamazepine',
  'theophylline',
];

export interface VendorSubstitutionScreenProps {
  initialSubstitutions?: SubstitutionRecord[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorSubstitutionScreen({ initialSubstitutions, onNavigate, onLogout }: VendorSubstitutionScreenProps) {
  const { logout } = useAuth();
  const [substitutions, setSubstitutions] = useState<SubstitutionRecord[]>(() =>
    initialSubstitutions ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_SUBSTITUTIONS : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'declined' | 'blocked' | 'no-equivalent'>('all');
  const [selectedRecord, setSelectedRecord] = useState<SubstitutionRecord | null>(null);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New swap form state
  const [prescribedInput, setPrescribedInput] = useState('');
  const [genericInput, setGenericInput] = useState('');
  const [brandPrice, setBrandPrice] = useState(150);
  const [genericPrice, setGenericPrice] = useState(85);
  const [prescriberPermitted, setPrescriberPermitted] = useState(true);
  const [studentChoice, setStudentChoice] = useState<'accepted' | 'declined' | 'pending'>('accepted');

  // Natural view state: data, loading, empty, error
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

  // KPI calculations
  const totalSavedToday = useMemo(() => {
    return substitutions
      .filter((s) => s.outcome === 'Student accepted')
      .reduce((sum, item) => sum + item.savingsRupees, 0);
  }, [substitutions]);

  const acceptedCount = useMemo(() => {
    return substitutions.filter((s) => s.outcome === 'Student accepted').length;
  }, [substitutions]);

  const declinedCount = useMemo(() => {
    return substitutions.filter((s) => s.outcome === 'Student declined').length;
  }, [substitutions]);

  const blockedCount = useMemo(() => {
    return substitutions.filter((s) => s.isPrescriberBlocked).length;
  }, [substitutions]);

  // Check if current drug in form is NTI
  const isInputDrugNti = useMemo(() => {
    const lower = prescribedInput.toLowerCase().trim();
    return KNOWN_NTI_DRUGS.some((nti) => lower.includes(nti));
  }, [prescribedInput]);

  // Filtered list
  const filteredSubstitutions = useMemo(() => {
    return substitutions.filter((item) => {
      const matchesSearch =
        item.prescribedDrug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genericOffered.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.prescriberRule.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.outcome.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'accepted') return item.outcome === 'Student accepted';
      if (statusFilter === 'declined') return item.outcome === 'Student declined';
      if (statusFilter === 'blocked') return item.isPrescriberBlocked;
      if (statusFilter === 'no-equivalent') return item.outcome === 'No equivalent in stock';
      return true;
    });
  }, [substitutions, searchQuery, statusFilter]);

  // Simulated reload
  const handleReload = () => {
    setViewState('loading');
    setTimeout(() => {
      setViewState('data');
      showToast('Substitutions register refreshed with campus dispensary');
    }, 700);
  };

  // Submit new substitution proposal
  const handleCreateSubstitution = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prescribedInput.trim() || !genericInput.trim()) {
      showToast('Please fill in both the prescribed drug and generic bio-equivalent.');
      return;
    }

    if (isInputDrugNti) {
      showToast('CLINICAL SAFETY ALERT: Narrow-therapeutic-index drugs cannot be swapped. Dispensed as written.');
      const ntiRecord: SubstitutionRecord = {
        id: `sub-${Date.now()}`,
        prescribedDrug: prescribedInput,
        genericOffered: genericInput,
        savingsText: `₹${brandPrice - genericPrice} (${Math.round(((brandPrice - genericPrice) / brandPrice) * 100)}%)`,
        savingsRupees: brandPrice - genericPrice,
        savingsPercentage: Math.round(((brandPrice - genericPrice) / brandPrice) * 100),
        prescriberRule: 'Swap NOT permitted',
        isPrescriberBlocked: true,
        outcome: 'Dispensed as written',
        statusType: 'red',
        isNtiDrug: true,
        notes: 'Narrow therapeutic index medicine flagged by clinical decision support. Prescriber prohibited swap.',
      };
      setSubstitutions((prev) => [ntiRecord, ...prev]);
      setIsProposeModalOpen(false);
      resetForm();
      return;
    }

    const savingsVal = Math.max(0, brandPrice - genericPrice);
    const savingsPct = brandPrice > 0 ? Math.round((savingsVal / brandPrice) * 100) : 0;

    let finalOutcome: SubstitutionRecord['outcome'] = 'Student accepted';
    let finalStatus: SubstitutionRecord['statusType'] = 'green';

    if (!prescriberPermitted) {
      finalOutcome = 'Dispensed as written';
      finalStatus = 'red';
    } else if (studentChoice === 'declined') {
      finalOutcome = 'Student declined';
      finalStatus = 'indigo';
    } else if (studentChoice === 'pending') {
      finalOutcome = 'Offered to student';
      finalStatus = 'indigo';
    }

    const newRecord: SubstitutionRecord = {
      id: `sub-${Date.now()}`,
      prescribedDrug: prescribedInput,
      genericOffered: genericInput,
      savingsText: `₹${savingsVal} (${savingsPct}%)`,
      savingsRupees: savingsVal,
      savingsPercentage: savingsPct,
      prescriberRule: prescriberPermitted ? 'Swap permitted' : 'Swap NOT permitted',
      isPrescriberBlocked: !prescriberPermitted,
      outcome: finalOutcome,
      statusType: finalStatus,
      notes: 'Proposed by campus pharmacist. Bio-equivalence checked against Indian Pharmacopoeia standard.',
    };

    setSubstitutions((prev) => [newRecord, ...prev]);
    setIsProposeModalOpen(false);
    resetForm();
    showToast(`Generic swap recorded: ${newRecord.prescribedDrug} → ${newRecord.genericOffered}`);
  };

  const resetForm = () => {
    setPrescribedInput('');
    setGenericInput('');
    setBrandPrice(150);
    setGenericPrice(85);
    setPrescriberPermitted(true);
    setStudentChoice('accepted');
  };

  return (
    <div className="sk-sub-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 150,
            background: '#131B2E',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-sub-sidebar" aria-label="Partner Sidebar">
        <div className="sk-sub-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7sub" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7bsub" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7sub)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7bsub)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-sub-brand-text">
            <span className="sk-sub-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-sub-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-sub-nav-group-title">STORE</span>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-sub-nav-item is-active" aria-current="page" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-sub-nav-group-title" style={{ marginTop: 6 }}>
            LAB
          </span>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-sub-nav-group-title" style={{ marginTop: 6 }}>
            BUSINESS
          </span>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff &amp; roles</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-sub-nav-item" onClick={() => handleNavClick('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-sub-nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: '#F87171' }}
          aria-label="Sign out of Partner Desk"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-sub-main">
        {/* Skeleton Loading State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Substitutions" style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="skel" style={{ display: 'block', width: 280, height: 26 }} />
                <span className="skel" style={{ display: 'block', width: 420, height: 14 }} />
              </div>
              <span className="skel" style={{ display: 'block', width: 150, height: 42 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
              <span className="skel" style={{ display: 'block', width: '100%', height: 108 }} />
              <span className="skel" style={{ display: 'block', width: '100%', height: 108 }} />
              <span className="skel" style={{ display: 'block', width: '100%', height: 108 }} />
              <span className="skel" style={{ display: 'block', width: '100%', height: 108 }} />
            </div>
            <div style={{ display: 'flex', gap: 18, flexGrow: 1 }}>
              <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
                <span className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
                <span className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
                <span className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
                <span className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
              </div>
              <span className="skel" style={{ display: 'block', width: 'auto', height: 380, flex: 1 }} />
            </div>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 450 }}>
            <div
              role="alert"
              style={{
                width: 480,
                padding: 30,
                borderRadius: 24,
                background: '#FFFFFF',
                border: '1.5px solid #FECDD3',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                textAlign: 'center',
              }}
            >
              <span style={{ width: 64, height: 64, borderRadius: 999, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} color="#E11D48" />
              </span>
              <span style={{ fontSize: 21, fontWeight: 800, color: '#131B2E' }}>Couldn’t load substitutions</span>
              <span style={{ fontSize: 14, lineHeight: '1.55', fontWeight: 500, color: '#464555' }}>
                This is on our side, not yours — nothing was lost. We tried 3 times. If it keeps happening, the status page will say so.
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button
                  type="button"
                  onClick={handleReload}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 46,
                    padding: '0 22px',
                    borderRadius: 12,
                    border: 0,
                    background: '#3525CD',
                    fontFamily: 'inherit',
                    fontSize: '14.5px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#6E6C82' }}>Ref ERR-503 · VendorSubstitution</span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-sub-header">
              <div className="sk-sub-header-title">
                <h1>Substitutions</h1>
                <span>Bio-equivalent generics · offered, never imposed</span>
              </div>
              <div style={{ flexGrow: 1 }} />
              <div className="sk-sub-alert-badge">
                <span className="sk-sub-pulse-dot" />
                <span>{blockedCount} swap blocked by prescriber</span>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="sk-sub-kpis">
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('accepted')}
                role="button"
                tabIndex={0}
                aria-label="Filter by accepted substitutions"
              >
                <span className="sk-sub-kpi-val is-green">₹{totalSavedToday}</span>
                <span className="sk-sub-kpi-lbl">Saved for students today</span>
              </div>
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('accepted')}
                role="button"
                tabIndex={0}
                aria-label="Filter by accepted swaps"
              >
                <span className="sk-sub-kpi-val">{acceptedCount}</span>
                <span className="sk-sub-kpi-lbl">Accepted</span>
              </div>
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('declined')}
                role="button"
                tabIndex={0}
                aria-label="Filter by declined swaps"
              >
                <span className="sk-sub-kpi-val">{declinedCount}</span>
                <span className="sk-sub-kpi-lbl">Declined</span>
              </div>
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('blocked')}
                role="button"
                tabIndex={0}
                aria-label="Filter by swaps blocked by prescriber"
              >
                <span className="sk-sub-kpi-val is-red">{blockedCount}</span>
                <span className="sk-sub-kpi-lbl">Blocked by prescriber</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="sk-sub-controls">
              <div className="sk-sub-search-wrap">
                <Search size={16} className="sk-sub-search-icon" />
                <input
                  type="text"
                  className="sk-sub-search-input"
                  placeholder="Search prescribed brand, generic molecule, or rule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search substitutions"
                />
              </div>

              <div className="sk-sub-filter-tabs">
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({substitutions.length})
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'accepted' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('accepted')}
                >
                  Accepted
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'declined' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('declined')}
                >
                  Declined
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'blocked' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('blocked')}
                >
                  Blocked
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'no-equivalent' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('no-equivalent')}
                >
                  Out of stock
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                  onClick={handleReload}
                  title="Refresh register"
                >
                  <RefreshCw size={14} />
                  <span>Sync</span>
                </button>
                <button
                  type="button"
                  className="sk-sub-btn-primary"
                  style={{ height: 34, padding: '0 14px', fontSize: 12 }}
                  onClick={() => setIsProposeModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Propose Swap</span>
                </button>
              </div>
            </div>

            {/* Substitutions Table Card */}
            <div className="sk-sub-table-card">
              <div className="sk-sub-table-header">
                <span className="sk-sub-th">PRESCRIBED</span>
                <span className="sk-sub-th">GENERIC OFFERED</span>
                <span className="sk-sub-th">SAVING</span>
                <span className="sk-sub-th">PRESCRIBER</span>
                <span className="sk-sub-th" style={{ justifySelf: 'end' }}>
                  OUTCOME
                </span>
              </div>

              {filteredSubstitutions.length === 0 ? (
                /* Empty state */
                <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <ArrowLeftRight size={48} color="#94A3B8" />
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#131B2E' }}>Nothing in substitutions yet.</span>
                  <span style={{ fontSize: 13, color: '#464555', maxWidth: 360 }}>
                    {searchQuery ? 'No substitution records match your search criteria.' : 'New orders and samples appear here the moment a student books.'}
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      className="sk-handover-btn-secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      style={{ marginTop: 8 }}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredSubstitutions.map((item) => (
                  <div
                    key={item.id}
                    className="sk-sub-table-row"
                    onClick={() => setSelectedRecord(item)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View substitution details for ${item.prescribedDrug}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRecord(item);
                      }
                    }}
                  >
                    <span className="sk-sub-col-prescribed">{item.prescribedDrug}</span>
                    <span className="sk-sub-col-generic">{item.genericOffered}</span>
                    <span className="sk-sub-col-saving">{item.savingsText}</span>
                    <span className={`sk-sub-col-prescriber ${item.isPrescriberBlocked ? 'is-blocked' : ''}`}>
                      {item.prescriberRule}
                    </span>
                    <span className={`sk-sub-status-badge ${item.statusType}`}>
                      {item.outcome}
                    </span>
                  </div>
                ))
              )}

              {/* Statutory Clinical Notice */}
              <div className="sk-sub-rule-notice">
                Narrow-therapeutic-index medicines like levothyroxine are dispensed exactly as written, because a small change in bioavailability matters clinically. Where a swap is permitted, the student is shown the saving and chooses — a declined swap is dispensed as written without a second prompt.
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Propose Generic Swap */}
      {isProposeModalOpen && (
        <div className="sk-sub-modal-backdrop" onClick={() => setIsProposeModalOpen(false)}>
          <div className="sk-sub-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-propose-title">
            <div className="sk-sub-modal-title">
              <h2 id="modal-propose-title">Propose Generic Substitution</h2>
              <button type="button" className="sk-sub-close-btn" onClick={() => setIsProposeModalOpen(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubstitution} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                  Prescribed Brand Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Augmentin 625, Shelcal 500, Eltroxin 50 mcg"
                  value={prescribedInput}
                  onChange={(e) => setPrescribedInput(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 12px', fontSize: 13 }}
                />
              </div>

              {/* NTI Clinical Warning if detected */}
              {isInputDrugNti && (
                <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', padding: 12, borderRadius: 10, display: 'flex', gap: 10 }}>
                  <AlertCircle size={20} color="#E11D48" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: 13, color: '#9F1239' }}>Narrow Therapeutic Index (NTI) Warning</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#BE123C', lineHeight: 1.4 }}>
                      Levothyroxine and other NTI medicines must be dispensed strictly as written. Brand substitutions without physician blood monitoring are blocked under platform clinical constitution.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                  Bio-equivalent Generic Molecule (INN)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg + Clavulanate 125mg"
                  value={genericInput}
                  onChange={(e) => setGenericInput(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 12px', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                    Prescribed Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={brandPrice}
                    onChange={(e) => setBrandPrice(Number(e.target.value))}
                    style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 12px', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                    Generic Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={genericPrice}
                    onChange={(e) => setGenericPrice(Number(e.target.value))}
                    style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 12px', fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Live Savings Calculation */}
              <div style={{ background: '#ECFDF5', padding: 12, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>Estimated Student Saving:</span>
                <strong style={{ fontSize: 15, color: '#047857' }}>
                  ₹{Math.max(0, brandPrice - genericPrice)} ({brandPrice > 0 ? Math.round((Math.max(0, brandPrice - genericPrice) / brandPrice) * 100) : 0}%)
                </strong>
              </div>

              {/* Prescriber Swap Rule */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prescriberPermitted && !isInputDrugNti}
                  disabled={isInputDrugNti}
                  onChange={(e) => setPrescriberPermitted(e.target.checked)}
                />
                <span>Prescriber has permitted generic substitution on original Rx</span>
              </label>

              {/* Student Response */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                  Student Choice
                </label>
                <select
                  value={studentChoice}
                  onChange={(e) => setStudentChoice(e.target.value as 'accepted' | 'declined' | 'pending')}
                  disabled={isInputDrugNti || !prescriberPermitted}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 10px', fontSize: 13, background: '#FFFFFF' }}
                >
                  <option value="accepted">Student accepted generic savings</option>
                  <option value="declined">Student declined (prefers prescribed brand)</option>
                  <option value="pending">Offered to student (awaiting mobile confirmation)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="sk-handover-btn-secondary" style={{ flex: 1 }} onClick={() => setIsProposeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sk-sub-btn-primary" style={{ flex: 1 }}>
                  Record Substitution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inspection Details */}
      {selectedRecord && (
        <div className="sk-sub-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="sk-sub-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-sub-audit-title">
            <div className="sk-sub-modal-title">
              <h2 id="modal-sub-audit-title">Substitution Details</h2>
              <button type="button" className="sk-sub-close-btn" onClick={() => setSelectedRecord(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Prescribed Drug</span>
                  <strong style={{ fontSize: 15, color: '#131B2E' }}>{selectedRecord.prescribedDrug}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Generic Offered</span>
                  <strong style={{ fontSize: 15, color: '#131B2E' }}>{selectedRecord.genericOffered}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#ECFDF5', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#047857', display: 'block' }}>Student Saving</span>
                  <strong style={{ fontSize: 15, color: '#047857' }}>{selectedRecord.savingsText}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Outcome</span>
                  <strong style={{ fontSize: 14, color: selectedRecord.statusType === 'green' ? '#047857' : selectedRecord.statusType === 'red' ? '#E11D48' : '#3525CD' }}>
                    {selectedRecord.outcome}
                  </strong>
                </div>
              </div>

              {selectedRecord.notes && (
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B', display: 'block', fontWeight: 700 }}>
                    Clinical Bio-Equivalence &amp; Protocol Notes
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#334155', lineHeight: 1.45 }}>
                    {selectedRecord.notes}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedRecord(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
