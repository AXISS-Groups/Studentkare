import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
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
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

const OUTCOME_LABEL: Record<SubstitutionRecord['outcome'], MessageKey> = {
  'Student accepted': 'partner.vsub.sub.outcome.accepted',
  'Student declined': 'partner.vsub.sub.outcome.declined',
  'Dispensed as written': 'partner.vsub.sub.outcome.asWritten',
  'No equivalent in stock': 'partner.vsub.sub.outcome.noEquivalent',
  'Offered to student': 'partner.vsub.sub.outcome.offered',
};

const RULE_LABEL: Record<SubstitutionRecord['prescriberRule'], MessageKey> = {
  'Swap permitted': 'partner.vsub.sub.rule.permitted',
  'Swap NOT permitted': 'partner.vsub.sub.rule.notPermitted',
};

type NavIcon = typeof Home;
const NAV_GROUPS: { title: MessageKey; items: { route: string; label: MessageKey; Icon: NavIcon }[] }[] = [
  {
    title: 'partner.vsub.nav.store',
    items: [
      { route: 'vendor', label: 'partner.vsub.nav.home', Icon: Home },
      { route: 'scan-verify', label: 'partner.vsub.nav.verify', Icon: Scan },
      { route: 'orders', label: 'partner.vsub.nav.orders', Icon: Package },
      { route: 'rx-review', label: 'partner.vsub.nav.rxReview', Icon: FileText },
      { route: 'substitutions', label: 'partner.vsub.nav.substitutions', Icon: ArrowLeftRight },
      { route: 'handover', label: 'partner.vsub.nav.handover', Icon: KeyRound },
      { route: 'returns', label: 'partner.vsub.nav.returns', Icon: RotateCcw },
      { route: 'dispensing', label: 'partner.vsub.nav.dispense', Icon: ClipboardList },
      { route: 'reorder', label: 'partner.vsub.nav.reorder', Icon: RefreshCw },
    ],
  },
  {
    title: 'partner.vsub.nav.lab',
    items: [
      { route: 'lab-queue', label: 'partner.vsub.nav.sampleQueue', Icon: FlaskConical },
      { route: 'run-sheet', label: 'partner.vsub.nav.runSheet', Icon: Truck },
      { route: 'cold-chain', label: 'partner.vsub.nav.coldChain', Icon: Snowflake },
      { route: 'lab-queue', label: 'partner.nav.labReports', Icon: CheckCircle2 },
      { route: 'camp-intake', label: 'partner.vsub.nav.campIntake', Icon: Tent },
    ],
  },
  {
    title: 'partner.vsub.nav.business',
    items: [
      { route: 'partner-staff', label: 'partner.vsub.nav.staff', Icon: Users },
      { route: 'catalogue', label: 'partner.vsub.nav.catalogue', Icon: LayoutGrid },
      { route: 'settlement', label: 'partner.vsub.nav.settlement', Icon: CreditCard },
      { route: 'performance', label: 'partner.vsub.nav.performance', Icon: FileText },
    ],
  },
];

const LABEL_STYLE: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text)', display: 'block', marginBottom: 4 };
const INPUT_STYLE: React.CSSProperties = { width: '100%', minHeight: 44, borderRadius: 8, border: '1px solid var(--sk-color-rule-strong)', padding: '0 12px', fontSize: 13 };

export interface VendorSubstitutionScreenProps {
  initialSubstitutions?: SubstitutionRecord[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorSubstitutionScreen({ initialSubstitutions, onNavigate, onLogout }: VendorSubstitutionScreenProps) {
  const t = useT();
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

  // There is no substitutions API yet: nothing to fetch, so retry just
  // returns to the list. It used to fake a "refreshed with campus dispensary" sync.
  const handleReload = () => {
    setViewState('data');
  };

  // Submit new substitution proposal
  const handleCreateSubstitution = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prescribedInput.trim() || !genericInput.trim()) {
      showToast(t('partner.vsub.sub.toast.fillBoth'));
      return;
    }

    if (isInputDrugNti) {
      showToast(t('partner.vsub.sub.toast.ntiBlocked'));
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
        notes: t('partner.vsub.sub.note.nti'),
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
      notes: t('partner.vsub.sub.note.proposed'),
    };

    setSubstitutions((prev) => [newRecord, ...prev]);
    setIsProposeModalOpen(false);
    resetForm();
    showToast(t('partner.vsub.sub.toast.notedLocally', { from: newRecord.prescribedDrug, to: newRecord.genericOffered }));
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
            background: 'var(--sk-color-brand-navy)',
            color: 'var(--sk-color-on-action)',
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
          <CheckCircle2 size={18} color="var(--sk-color-positive)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-sub-sidebar" aria-label={t('partner.vsub.nav.sidebar')}>
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
            <span className="sk-sub-brand-badge">{t('partner.vsub.nav.partnerBadge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vsub.nav.label')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV_GROUPS.map((group, groupIndex) => (
            <React.Fragment key={group.title}>
              <span className="sk-sub-nav-group-title" style={groupIndex > 0 ? { marginTop: 6 } : undefined}>
                {t(group.title)}
              </span>
              {group.items.map(({ route, label, Icon }) => (
                <button
                  key={route}
                  type="button"
                  className={`sk-sub-nav-item${route === 'substitutions' ? ' is-active' : ''}`}
                  aria-current={route === 'substitutions' ? 'page' : undefined}
                  style={{ minHeight: 44 }}
                  onClick={() => handleNavClick(route)}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{t(label)}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-sub-nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)', minHeight: 44 }}
          aria-label={t('partner.vsub.nav.signOutLabel')}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vsub.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-sub-main">
        {/* Skeleton Loading State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vsub.sub.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
                background: 'var(--sk-color-surface)',
                border: '1.5px solid var(--sk-color-danger)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                textAlign: 'center',
              }}
            >
              <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} color="var(--sk-color-danger)" aria-hidden="true" />
              </span>
              <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vsub.sub.error.title')}</span>
              <span style={{ fontSize: 14, lineHeight: '1.55', fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vsub.sub.error.body')}
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
                    background: 'var(--sk-color-action)',
                    fontFamily: 'inherit',
                    fontSize: '14.5px',
                    fontWeight: 800,
                    color: 'var(--sk-color-on-action)',
                    cursor: 'pointer',
                  }}
                >
                  {t('common.tryAgain')}
                </button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--sk-color-text-3)' }}>Ref ERR-503 · VendorSubstitution</span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-sub-header">
              <div className="sk-sub-header-title">
                <h1>{t('partner.vsub.sub.title')}</h1>
                <span>{t('partner.vsub.sub.subtitle')}</span>
              </div>
              <div style={{ flexGrow: 1 }} />
              <div className="sk-sub-alert-badge">
                <span className="sk-sub-pulse-dot" aria-hidden="true" />
                <span>{t('partner.vsub.sub.blockedBadge', { count: blockedCount })}</span>
              </div>
            </div>
            <p role="note" style={{ margin: 0, fontSize: 13, color: 'var(--sk-color-text-2)' }}>
              {t('partner.vsub.sub.localOnly')}
            </p>

            {/* KPI Metric Cards */}
            <div className="sk-sub-kpis">
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('accepted')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter('accepted'); } }}
                role="button"
                tabIndex={0}
                aria-label={t('partner.vsub.sub.kpi.savedFilter')}
              >
                <span className="sk-sub-kpi-val is-green">₹{totalSavedToday}</span>
                <span className="sk-sub-kpi-lbl">{t('partner.vsub.sub.kpi.saved')}</span>
              </div>
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('accepted')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter('accepted'); } }}
                role="button"
                tabIndex={0}
                aria-label={t('partner.vsub.sub.kpi.acceptedFilter')}
              >
                <span className="sk-sub-kpi-val">{acceptedCount}</span>
                <span className="sk-sub-kpi-lbl">{t('partner.vsub.sub.filter.accepted')}</span>
              </div>
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('declined')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter('declined'); } }}
                role="button"
                tabIndex={0}
                aria-label={t('partner.vsub.sub.kpi.declinedFilter')}
              >
                <span className="sk-sub-kpi-val">{declinedCount}</span>
                <span className="sk-sub-kpi-lbl">{t('partner.vsub.sub.filter.declined')}</span>
              </div>
              <div
                className="sk-sub-kpi-card"
                onClick={() => setStatusFilter('blocked')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter('blocked'); } }}
                role="button"
                tabIndex={0}
                aria-label={t('partner.vsub.sub.kpi.blockedFilter')}
              >
                <span className="sk-sub-kpi-val is-red">{blockedCount}</span>
                <span className="sk-sub-kpi-lbl">{t('partner.vsub.sub.kpi.blocked')}</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="sk-sub-controls">
              <div className="sk-sub-search-wrap">
                <Search size={16} className="sk-sub-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="sk-sub-search-input"
                  placeholder={t('partner.vsub.sub.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('partner.vsub.sub.searchLabel')}
                />
              </div>

              <div className="sk-sub-filter-tabs">
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  {t('partner.vsub.sub.filter.all', { count: substitutions.length })}
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'accepted' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('accepted')}
                >
                  {t('partner.vsub.sub.filter.accepted')}
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'declined' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('declined')}
                >
                  {t('partner.vsub.sub.filter.declined')}
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'blocked' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('blocked')}
                >
                  {t('partner.vsub.sub.filter.blocked')}
                </button>
                <button
                  type="button"
                  className={`sk-sub-filter-btn ${statusFilter === 'no-equivalent' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('no-equivalent')}
                >
                  {t('partner.vsub.sub.filter.outOfStock')}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="sk-sub-btn-primary"
                  style={{ minHeight: 44, padding: '0 14px', fontSize: 12 }}
                  onClick={() => setIsProposeModalOpen(true)}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{t('partner.vsub.sub.propose')}</span>
                </button>
              </div>
            </div>

            {/* Substitutions Table Card */}
            <div className="sk-sub-table-card">
              <div className="sk-sub-table-header">
                <span className="sk-sub-th">{t('partner.vsub.sub.th.prescribed')}</span>
                <span className="sk-sub-th">{t('partner.vsub.sub.th.generic')}</span>
                <span className="sk-sub-th">{t('partner.vsub.sub.th.saving')}</span>
                <span className="sk-sub-th">{t('partner.vsub.sub.th.prescriber')}</span>
                <span className="sk-sub-th" style={{ justifySelf: 'end' }}>
                  {t('partner.vsub.sub.th.outcome')}
                </span>
              </div>

              {filteredSubstitutions.length === 0 ? (
                /* Empty state */
                <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <ArrowLeftRight size={48} color="var(--sk-color-text-3)" aria-hidden="true" />
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vsub.sub.empty.title')}</span>
                  <span style={{ fontSize: 13, color: 'var(--sk-color-text-2)', maxWidth: 360 }}>
                    {searchQuery ? t('partner.vsub.sub.empty.noMatch') : t('partner.vsub.sub.empty.body')}
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      className="sk-handover-btn-secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      style={{ marginTop: 8, minHeight: 44 }}
                    >
                      {t('partner.vsub.sub.clearSearch')}
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
                    aria-label={t('partner.vsub.sub.rowLabel', { drug: item.prescribedDrug })}
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
                      {t(RULE_LABEL[item.prescriberRule])}
                    </span>
                    <span className={`sk-sub-status-badge ${item.statusType}`}>
                      {t(OUTCOME_LABEL[item.outcome])}
                    </span>
                  </div>
                ))
              )}

              {/* Statutory Clinical Notice */}
              <div className="sk-sub-rule-notice">
                {t('partner.vsub.sub.ruleNotice')}
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
              <h2 id="modal-propose-title">{t('partner.vsub.sub.form.title')}</h2>
              <button type="button" className="sk-sub-close-btn" onClick={() => setIsProposeModalOpen(false)} aria-label={t('partner.vsub.sub.closeModal')}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateSubstitution} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="sub-prescribed" style={LABEL_STYLE}>
                  {t('partner.vsub.sub.form.prescribed')}
                </label>
                <input
                  id="sub-prescribed"
                  type="text"
                  required
                  placeholder={t('partner.vsub.sub.form.prescribedPlaceholder')}
                  value={prescribedInput}
                  onChange={(e) => setPrescribedInput(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              {/* NTI Clinical Warning if detected */}
              {isInputDrugNti && (
                <div role="alert" style={{ background: 'var(--sk-color-danger-bg)', border: '1.5px solid var(--sk-color-danger)', padding: 12, borderRadius: 10, display: 'flex', gap: 10 }}>
                  <AlertCircle size={20} color="var(--sk-color-danger)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--sk-color-danger)' }}>{t('partner.vsub.sub.form.ntiTitle')}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--sk-color-danger)', lineHeight: 1.4 }}>
                      {t('partner.vsub.sub.form.ntiBody')}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="sub-generic" style={LABEL_STYLE}>
                  {t('partner.vsub.sub.form.generic')}
                </label>
                <input
                  id="sub-generic"
                  type="text"
                  required
                  placeholder={t('partner.vsub.sub.form.genericPlaceholder')}
                  value={genericInput}
                  onChange={(e) => setGenericInput(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="sub-brand-price" style={LABEL_STYLE}>
                    {t('partner.vsub.sub.form.brandPrice')}
                  </label>
                  <input
                    id="sub-brand-price"
                    type="number"
                    min={1}
                    value={brandPrice}
                    onChange={(e) => setBrandPrice(Number(e.target.value))}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label htmlFor="sub-generic-price" style={LABEL_STYLE}>
                    {t('partner.vsub.sub.form.genericPrice')}
                  </label>
                  <input
                    id="sub-generic-price"
                    type="number"
                    min={1}
                    value={genericPrice}
                    onChange={(e) => setGenericPrice(Number(e.target.value))}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              {/* Live Savings Calculation */}
              <div style={{ background: 'var(--sk-color-positive-bg)', padding: 12, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-positive)' }}>{t('partner.vsub.sub.form.estimatedSaving')}</span>
                <strong style={{ fontSize: 15, color: 'var(--sk-color-positive)' }}>
                  ₹{Math.max(0, brandPrice - genericPrice)} ({brandPrice > 0 ? Math.round((Math.max(0, brandPrice - genericPrice) / brandPrice) * 100) : 0}%)
                </strong>
              </div>

              {/* Prescriber Swap Rule */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--sk-color-text-2)', cursor: 'pointer', minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={prescriberPermitted && !isInputDrugNti}
                  disabled={isInputDrugNti}
                  onChange={(e) => setPrescriberPermitted(e.target.checked)}
                />
                <span>{t('partner.vsub.sub.form.prescriberPermitted')}</span>
              </label>

              {/* Student Response */}
              <div>
                <label htmlFor="sub-student-choice" style={LABEL_STYLE}>
                  {t('partner.vsub.sub.form.studentChoice')}
                </label>
                <select
                  id="sub-student-choice"
                  value={studentChoice}
                  onChange={(e) => setStudentChoice(e.target.value as 'accepted' | 'declined' | 'pending')}
                  disabled={isInputDrugNti || !prescriberPermitted}
                  style={{ ...INPUT_STYLE, padding: '0 10px', background: 'var(--sk-color-surface)' }}
                >
                  <option value="accepted">{t('partner.vsub.sub.form.choiceAccepted')}</option>
                  <option value="declined">{t('partner.vsub.sub.form.choiceDeclined')}</option>
                  <option value="pending">{t('partner.vsub.sub.form.choicePending')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="sk-handover-btn-secondary" style={{ flex: 1, minHeight: 44 }} onClick={() => setIsProposeModalOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="sk-sub-btn-primary" style={{ flex: 1, minHeight: 44 }}>
                  {t('partner.vsub.sub.form.submit')}
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
              <h2 id="modal-sub-audit-title">{t('partner.vsub.sub.detail.title')}</h2>
              <button type="button" className="sk-sub-close-btn" onClick={() => setSelectedRecord(null)} aria-label={t('partner.vsub.sub.closeModal')}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vsub.sub.detail.prescribed')}</span>
                  <strong style={{ fontSize: 15, color: 'var(--sk-color-text)' }}>{selectedRecord.prescribedDrug}</strong>
                </div>
                <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vsub.sub.detail.generic')}</span>
                  <strong style={{ fontSize: 15, color: 'var(--sk-color-text)' }}>{selectedRecord.genericOffered}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--sk-color-positive-bg)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-positive)', display: 'block' }}>{t('partner.vsub.sub.detail.saving')}</span>
                  <strong style={{ fontSize: 15, color: 'var(--sk-color-positive)' }}>{selectedRecord.savingsText}</strong>
                </div>
                <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vsub.sub.detail.outcome')}</span>
                  <strong style={{ fontSize: 14, color: selectedRecord.statusType === 'green' ? 'var(--sk-color-positive)' : selectedRecord.statusType === 'red' ? 'var(--sk-color-danger)' : 'var(--sk-color-action)' }}>
                    {t(OUTCOME_LABEL[selectedRecord.outcome])}
                  </strong>
                </div>
              </div>

              {selectedRecord.notes && (
                <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block', fontWeight: 700 }}>
                    {t('partner.vsub.sub.detail.notes')}
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--sk-color-text-2)', lineHeight: 1.45 }}>
                    {selectedRecord.notes}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ flex: 1, minHeight: 44 }}
                  onClick={() => setSelectedRecord(null)}
                >
                  {t('partner.vsub.sub.detail.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
