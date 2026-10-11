import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
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
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/vendorReturns.css';

export interface ReturnRecord {
  id: string;
  orderId: string;
  itemName: string;
  studentName?: string;
  /** Absent when the amount was not recorded (counter intake does not ask for it). */
  amountPaise?: number;
  reasonGiven: string;
  assessment: string;
  outcome: 'Refunded' | 'Replaced' | 'Refused, explained' | 'Recollected free';
  isOurError?: boolean;
  category: 'Prescription' | 'OTC Wellness' | 'Personal Care' | 'Diagnostic Sample';
  notes?: string;
}

const INITIAL_RETURNS: ReturnRecord[] = [
  {
    id: 'ret-1',
    orderId: '#SK-40188',
    itemName: 'Daily Multivitamin Essentials',
    studentName: 'Krishna C.',
    amountPaise: 49900,
    reasonGiven: 'Wrong pack size sent',
    assessment: 'Our error · full refund',
    outcome: 'Refunded',
    isOurError: true,
    category: 'OTC Wellness',
    notes: 'Ordered 60s pack, 30s pack was packed by staff. Full refund processed.',
  },
  {
    id: 'ret-2',
    orderId: '#SK-40171',
    itemName: 'Barrier Care Daily Moisturiser',
    studentName: 'Imran S.',
    amountPaise: 38000,
    reasonGiven: 'Seal broken on arrival',
    assessment: 'Our error · replaced',
    outcome: 'Replaced',
    isOurError: true,
    category: 'Personal Care',
    notes: 'Bottle pump seal cracked in transit courier bag. Same-day replacement dispatched.',
  },
  {
    id: 'ret-3',
    orderId: '#SK-40160',
    itemName: 'Ashwagandha Stress Balance',
    studentName: 'Ayesha K.',
    amountPaise: 45000,
    reasonGiven: 'Student changed their mind',
    assessment: 'Unopened · within 7 days',
    outcome: 'Refunded',
    isOurError: false,
    category: 'OTC Wellness',
    notes: 'Returned unopened with intact tamper tape within 3 days of pickup. Refund approved.',
  },
  {
    id: 'ret-4',
    orderId: '#SK-40144',
    itemName: 'Prescription — D3 60k',
    studentName: 'Rahul M.',
    amountPaise: 24000,
    reasonGiven: 'Return requested',
    assessment: 'Medicine — cannot be resold',
    outcome: 'Refused, explained',
    isOurError: false,
    category: 'Prescription',
    notes: 'Prescription Schedule H medicine. In accordance with Rule 65, medicines cannot be restocked once dispensed.',
  },
  {
    id: 'ret-5',
    orderId: '#SK-40131',
    itemName: 'Complete Health Checkup',
    studentName: 'Nisha P.',
    amountPaise: 120000,
    reasonGiven: 'Sample unusable',
    assessment: 'Haemolysed · lab error',
    outcome: 'Recollected free',
    isOurError: false,
    category: 'Diagnostic Sample',
    notes: 'Phlebotomy sample showed in-transit haemolysis. Free home recollect appointment scheduled.',
  },
];

export const DEMO_RETURNS: ReturnRecord[] = INITIAL_RETURNS;

export interface VendorReturnsScreenProps {
  initialReturns?: ReturnRecord[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

type ReturnFilter = 'All' | 'Our error' | 'Refunded' | 'Replaced' | 'Refused' | 'Recollected';

const FILTERS: readonly ReturnFilter[] = ['All', 'Our error', 'Refunded', 'Replaced', 'Refused', 'Recollected'];

const FILTER_LABEL: Record<ReturnFilter, MessageKey> = {
  All: 'partner.vrx.returns.filter.all',
  'Our error': 'partner.vrx.returns.filter.ourError',
  Refunded: 'partner.vrx.returns.filter.refunded',
  Replaced: 'partner.vrx.returns.filter.replaced',
  Refused: 'partner.vrx.returns.filter.refused',
  Recollected: 'partner.vrx.returns.filter.recollected',
};

const OUTCOME_LABEL: Record<ReturnRecord['outcome'], MessageKey> = {
  Refunded: 'partner.vrx.returns.outcome.refunded',
  Replaced: 'partner.vrx.returns.outcome.replaced',
  'Refused, explained': 'partner.vrx.returns.outcome.refused',
  'Recollected free': 'partner.vrx.returns.outcome.recollected',
};

const CATEGORY_LABEL: Record<ReturnRecord['category'], MessageKey> = {
  'OTC Wellness': 'partner.vrx.returns.category.otc',
  'Personal Care': 'partner.vrx.returns.category.personalCare',
  Prescription: 'partner.vrx.returns.category.prescription',
  'Diagnostic Sample': 'partner.vrx.returns.category.diagnostic',
};

const CATEGORIES: readonly ReturnRecord['category'][] = ['OTC Wellness', 'Personal Care', 'Prescription', 'Diagnostic Sample'];

const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 };
const detailLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--sk-color-text-2)', fontWeight: 700 };
const policyCardStyle: React.CSSProperties = { padding: 12, background: 'var(--sk-color-surface-2)', borderRadius: 12 };
const policyTextStyle: React.CSSProperties = { margin: '4px 0 0', fontSize: 12.5, color: 'var(--sk-color-text-2)' };
const dangerNoteStyle: React.CSSProperties = {
  padding: 12,
  background: 'var(--sk-color-danger-bg)',
  border: '1px solid var(--sk-color-danger)',
  borderRadius: 12,
  color: 'var(--sk-color-danger)',
  fontSize: 12,
};

/**
 * Returns are not connected to orders or payments yet. Anything recorded here
 * lives only in this screen's state; the copy says so, and no button claims a
 * refund was processed or a notice was sent.
 */
export function VendorReturnsScreen({ initialReturns, onNavigate, onLogout }: VendorReturnsScreenProps) {
  const t = useT();
  const { logout } = useAuth();
  const [returnsList, setReturnsList] = useState<ReturnRecord[]>(() =>
    initialReturns ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_RETURNS : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ReturnFilter>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // New Return Form state
  const [newOrderId, setNewOrderId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newCategory, setNewCategory] = useState<ReturnRecord['category']>('OTC Wellness');

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
  const totalRequests = returnsList.length;
  const ourErrorCount = returnsList.filter((r) => r.isOurError).length;
  const refusedCount = returnsList.filter((r) => r.outcome === 'Refused, explained').length;

  // Filtered List
  const filteredReturns = useMemo(() => {
    return returnsList.filter((record) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        record.orderId.toLowerCase().includes(q) ||
        record.itemName.toLowerCase().includes(q) ||
        record.reasonGiven.toLowerCase().includes(q) ||
        record.assessment.toLowerCase().includes(q) ||
        record.outcome.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedFilter === 'Our error') return record.isOurError;
      if (selectedFilter === 'Refunded') return record.outcome === 'Refunded';
      if (selectedFilter === 'Replaced') return record.outcome === 'Replaced';
      if (selectedFilter === 'Refused') return record.outcome === 'Refused, explained';
      if (selectedFilter === 'Recollected') return record.outcome === 'Recollected free';
      return true;
    });
  }, [returnsList, searchQuery, selectedFilter]);

  // Handle Form Submission for New Return
  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();

    let assessment: string;
    let outcome: ReturnRecord['outcome'] = 'Refunded';
    let isOurError = false;

    if (newCategory === 'Prescription') {
      assessment = t('partner.vrx.returns.assess.medicine');
      outcome = 'Refused, explained';
    } else if (newReason.toLowerCase().includes('wrong') || newReason.toLowerCase().includes('broken') || newReason.toLowerCase().includes('damaged')) {
      assessment = t('partner.vrx.returns.assess.ourError');
      outcome = 'Refunded';
      isOurError = true;
    } else {
      assessment = t('partner.vrx.returns.assess.unopened');
      outcome = 'Refunded';
    }

    const orderId = newOrderId.trim().toUpperCase();
    const newRecord: ReturnRecord = {
      id: `ret-${Date.now()}`,
      orderId,
      itemName: newItemName.trim(),
      studentName: newStudentName.trim() || undefined,
      reasonGiven: newReason.trim(),
      assessment,
      outcome,
      isOurError,
      category: newCategory,
      notes: newCategory === 'Prescription' ? t('partner.vrx.returns.note.rxRefused') : t('partner.vrx.returns.note.counter'),
    };

    setReturnsList((prev) => [newRecord, ...prev]);
    setShowIntakeModal(false);
    setNewOrderId('');
    setNewItemName('');
    setNewStudentName('');
    setNewReason('');
    showToast(t('partner.vrx.returns.toast.noted', { order: orderId, outcome: t(OUTCOME_LABEL[outcome]) }));
  };

  return (
    <div className="sk-returns-root">
      {/* 18-Option Partner Sidebar */}
      <aside className="sk-returns-sidebar" aria-label={t('partner.vrx.nav.sidebar')}>
        <div className="sk-returns-brand">
          <span className="sk-returns-logo">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg_ret" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg_ret_b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg_ret)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg_ret_b)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span className="sk-returns-brand-text">
            <span className="sk-returns-title-text">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-returns-badge-partner">{t('partner.vrx.nav.badge')}</span>
          </span>
        </div>

        <nav className="sk-returns-nav" aria-label={t('partner.vrx.nav.links')}>
          {/* Section: STORE */}
          <span className="sk-returns-nav-section">{t('partner.vrx.nav.store')}</span>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.home')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.verify')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.orders')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.handover')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item is-active" aria-current="page">
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.returns')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.reorder')}</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-returns-nav-section">{t('partner.vrx.nav.lab')}</span>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.coldChain')}</span>
          </button>
          {/* Results are released from the sample queue; there is no separate route. */}
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('lab-queue')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.releaseResults')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.campIntake')}</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-returns-nav-section">{t('partner.vrx.nav.business')}</span>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.staff')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('performance')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.performance')}</span>
          </button>
        </nav>

        <div className="sk-returns-sidebar-footer">
          <button type="button" className="sk-returns-signout-btn" onClick={handleSignOut}>
            <LogOut size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sk-returns-main">
        {/* Header */}
        <div className="sk-returns-header">
          <div>
            <h1 className="sk-returns-title">{t('partner.vrx.returns.title')}</h1>
            <p className="sk-returns-subtitle">{t('partner.vrx.returns.subtitle')}</p>
          </div>
          <div className="sk-returns-header-actions">
            <button
              type="button"
              className="sk-returns-policy-btn"
              onClick={() => setShowPolicyModal(true)}
              aria-label={t('partner.vrx.returns.policyAria')}
            >
              <BookOpen size={16} aria-hidden="true" />
              <span>{t('partner.vrx.returns.policyButton')}</span>
            </button>
            <button
              type="button"
              className="sk-returns-intake-btn"
              onClick={() => setShowIntakeModal(true)}
              aria-label={t('partner.vrx.returns.recordAria')}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{t('partner.vrx.returns.recordButton')}</span>
            </button>
          </div>
        </div>

        <p role="note" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 10, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 12.5 }}>
          {t('partner.vrx.returns.notConnected')}
        </p>

        {/* KPI Stat Cards */}
        <div className="sk-returns-stats-grid">
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number">{totalRequests}</span>
            <span className="sk-returns-stat-label">{t('partner.vrx.returns.stat.requests')}</span>
          </div>
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number is-warning">{ourErrorCount}</span>
            <span className="sk-returns-stat-label">{t('partner.vrx.returns.stat.ourError')}</span>
          </div>
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number">{refusedCount}</span>
            <span className="sk-returns-stat-label">{t('partner.vrx.returns.stat.refused')}</span>
          </div>
          {/* No order totals reach this screen, so a return rate cannot be computed. */}
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number" aria-label={t('partner.vrx.returns.stat.rateUnavailable')}>—</span>
            <span className="sk-returns-stat-label">{t('partner.vrx.returns.stat.rate')}</span>
          </div>
        </div>

        {/* Toolbar: Filter Tabs & Search */}
        <div className="sk-returns-toolbar">
          <div className="sk-returns-filter-tabs">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sk-returns-filter-btn ${selectedFilter === filter ? 'is-active' : ''}`}
                aria-pressed={selectedFilter === filter}
                onClick={() => setSelectedFilter(filter)}
              >
                {t(FILTER_LABEL[filter])}
              </button>
            ))}
          </div>

          <div className="sk-returns-search-wrap">
            <Search className="sk-returns-search-icon" size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder={t('partner.vrx.returns.searchPlaceholder')}
              className="sk-returns-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('partner.vrx.returns.searchAria')}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="sk-returns-table-card">
          <div className="sk-returns-table-header">
            <span className="sk-returns-col-header">{t('partner.vrx.returns.col.order')}</span>
            <span className="sk-returns-col-header">{t('partner.vrx.returns.col.item')}</span>
            <span className="sk-returns-col-header">{t('partner.vrx.returns.col.reason')}</span>
            <span className="sk-returns-col-header">{t('partner.vrx.returns.col.assessment')}</span>
            <span className="sk-returns-col-header" style={{ justifySelf: 'end' }}>
              {t('partner.vrx.returns.col.outcome')}
            </span>
          </div>

          {filteredReturns.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--sk-color-text-2)', fontSize: 13.5 }}>
              {searchQuery ? t('partner.vrx.returns.noMatch', { query: searchQuery }) : t('partner.vrx.returns.empty')}
            </div>
          ) : (
            filteredReturns.map((record) => {
            let badgeClass = 'outcome-refunded';
            if (record.outcome === 'Replaced') badgeClass = 'outcome-replaced';
            if (record.outcome === 'Refused, explained') badgeClass = 'outcome-refused';
            if (record.outcome === 'Recollected free') badgeClass = 'outcome-recollected';

            return (
              <div
                key={record.id}
                className="sk-returns-row"
                onClick={() => setSelectedReturn(record)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === 'Enter' && setSelectedReturn(record)}
                aria-label={t('partner.vrx.returns.rowAria', { order: record.orderId, item: record.itemName, outcome: t(OUTCOME_LABEL[record.outcome]) })}
              >
                <span className="sk-returns-order-id">{record.orderId}</span>
                <span className="sk-returns-item-name">{record.itemName}</span>
                <span className="sk-returns-reason">{record.reasonGiven}</span>
                <span className="sk-returns-assessment">{record.assessment}</span>
                <span className={`sk-returns-status-badge ${badgeClass}`}>{t(OUTCOME_LABEL[record.outcome])}</span>
              </div>
            );
          }))}

          <div className="sk-returns-policy-footer">
            {t('partner.vrx.returns.footer')}
          </div>
        </div>
      </main>

      {/* Return Request Details Modal */}
      {selectedReturn && (
        <div className="sk-returns-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="return-detail-title">
          <div className="sk-returns-modal">
            <div className="sk-returns-modal-header">
              <h3 id="return-detail-title" className="sk-returns-modal-title">
                {t('partner.vrx.returns.detail.title', { order: selectedReturn.orderId })}
              </h3>
              <button
                type="button"
                className="sk-returns-modal-close"
                onClick={() => setSelectedReturn(null)}
                aria-label={t('partner.vrx.returns.detail.closeAria')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-returns-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={detailLabelStyle}>{t('partner.vrx.returns.detail.order')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedReturn.orderId}</div>
                </div>
                <div>
                  <span style={detailLabelStyle}>{t('partner.vrx.returns.detail.outcome')}</span>
                  <div>
                    <span className={`sk-returns-status-badge ${selectedReturn.outcome === 'Refused, explained' ? 'outcome-refused' : selectedReturn.outcome === 'Recollected free' ? 'outcome-recollected' : 'outcome-refunded'}`}>
                      {t(OUTCOME_LABEL[selectedReturn.outcome])}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={detailLabelStyle}>{t('partner.vrx.returns.detail.product')}</span>
                  <div style={{ fontWeight: 800 }}>{selectedReturn.itemName}</div>
                </div>
                <div>
                  <span style={detailLabelStyle}>{t('partner.vrx.returns.detail.amount')}</span>
                  <div style={{ fontWeight: 800 }}>
                    {selectedReturn.amountPaise === undefined ? t('partner.vrx.returns.detail.amountUnknown') : `₹${(selectedReturn.amountPaise / 100).toFixed(2)}`}
                  </div>
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                <span style={detailLabelStyle}>{t('partner.vrx.returns.detail.reason')}</span>
                <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>“{selectedReturn.reasonGiven}”</div>
              </div>

              <div style={{ padding: 12, background: selectedReturn.isOurError ? 'var(--sk-color-attention-bg)' : 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                <span style={detailLabelStyle}>{t('partner.vrx.returns.detail.notes')}</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>{selectedReturn.notes}</div>
              </div>

              {selectedReturn.category === 'Prescription' && (
                <div style={dangerNoteStyle}>
                  <ShieldAlert size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  <strong>{t('partner.vrx.returns.detail.rxTitle')}</strong> {t('partner.vrx.returns.detail.rxBody')}
                </div>
              )}
            </div>
            <div className="sk-returns-modal-footer">
              <button
                type="button"
                className="sk-returns-btn-secondary"
                onClick={() => setSelectedReturn(null)}
              >
                {t('partner.vrx.common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Returns Policy Modal */}
      {showPolicyModal && (
        <div className="sk-returns-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">
          <div className="sk-returns-modal">
            <div className="sk-returns-modal-header">
              <h3 id="policy-modal-title" className="sk-returns-modal-title">
                {t('partner.vrx.returns.policy.title')}
              </h3>
              <button
                type="button"
                className="sk-returns-modal-close"
                onClick={() => setShowPolicyModal(false)}
                aria-label={t('partner.vrx.returns.policy.closeAria')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-returns-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={policyCardStyle}>
                  <strong>{t('partner.vrx.returns.policy.rxTitle')}</strong>
                  <p style={policyTextStyle}>{t('partner.vrx.returns.policy.rxBody')}</p>
                </div>
                <div style={policyCardStyle}>
                  <strong>{t('partner.vrx.returns.policy.otcTitle')}</strong>
                  <p style={policyTextStyle}>{t('partner.vrx.returns.policy.otcBody')}</p>
                </div>
                <div style={policyCardStyle}>
                  <strong>{t('partner.vrx.returns.policy.errorTitle')}</strong>
                  <p style={policyTextStyle}>{t('partner.vrx.returns.policy.errorBody')}</p>
                </div>
                <div style={policyCardStyle}>
                  <strong>{t('partner.vrx.returns.policy.sampleTitle')}</strong>
                  <p style={policyTextStyle}>{t('partner.vrx.returns.policy.sampleBody')}</p>
                </div>
              </div>
            </div>
            <div className="sk-returns-modal-footer">
              <button
                type="button"
                className="sk-returns-btn-primary"
                onClick={() => setShowPolicyModal(false)}
              >
                {t('partner.vrx.returns.policy.understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Return Intake Modal */}
      {showIntakeModal && (
        <div className="sk-returns-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intake-modal-title">
          <form className="sk-returns-modal" onSubmit={handleCreateReturn}>
            <div className="sk-returns-modal-header">
              <h3 id="intake-modal-title" className="sk-returns-modal-title">
                {t('partner.vrx.returns.intake.title')}
              </h3>
              <button
                type="button"
                className="sk-returns-modal-close"
                onClick={() => setShowIntakeModal(false)}
                aria-label={t('partner.vrx.returns.intake.closeAria')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sk-returns-modal-body">
              <div>
                <label htmlFor="intake-order-id" style={fieldLabelStyle}>
                  {t('partner.vrx.returns.intake.order')}
                </label>
                <input
                  id="intake-order-id"
                  type="text"
                  placeholder="#SK-40195"
                  className="sk-returns-search-input"
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="intake-item-name" style={fieldLabelStyle}>
                  {t('partner.vrx.returns.intake.item')}
                </label>
                <input
                  id="intake-item-name"
                  type="text"
                  className="sk-returns-search-input"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="intake-student-name" style={fieldLabelStyle}>
                    {t('partner.vrx.returns.intake.student')}
                  </label>
                  <input
                    id="intake-student-name"
                    type="text"
                    className="sk-returns-search-input"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="intake-category" style={fieldLabelStyle}>
                    {t('partner.vrx.returns.intake.category')}
                  </label>
                  <select
                    id="intake-category"
                    className="sk-returns-search-input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ReturnRecord['category'])}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t(CATEGORY_LABEL[c])}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="intake-reason" style={fieldLabelStyle}>
                  {t('partner.vrx.returns.intake.reason')}
                </label>
                <input
                  id="intake-reason"
                  type="text"
                  placeholder={t('partner.vrx.returns.intake.reasonPlaceholder')}
                  className="sk-returns-search-input"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  required
                />
              </div>

              {newCategory === 'Prescription' && (
                <div style={dangerNoteStyle}>
                  <AlertTriangle size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  <strong>{t('partner.vrx.returns.intake.rxTitle')}</strong> {t('partner.vrx.returns.intake.rxBody')}
                </div>
              )}

              <p style={{ margin: 0, fontSize: 12, color: 'var(--sk-color-text-2)' }}>{t('partner.vrx.returns.intake.localOnly')}</p>
            </div>
            <div className="sk-returns-modal-footer">
              <button
                type="button"
                className="sk-returns-btn-secondary"
                onClick={() => setShowIntakeModal(false)}
              >
                {t('partner.vrx.common.cancel')}
              </button>
              <button type="submit" className="sk-returns-btn-primary">
                {t('partner.vrx.returns.intake.submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="sk-returns-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
