import React, { useMemo, useState } from 'react';
import {
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
  ShoppingCart,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/vendorReorder.css';

export interface ReorderRule {
  id: string;
  item: string;
  onHand: number;
  triggerAt: number;
  ruleDesc: string;
  orderQty: number;
  isEssential?: boolean;
  isSeasonal?: boolean;
  isColdChain?: boolean;
  daysOutOfStock?: number;
  expiryDays?: number;
  poRaised?: boolean;
}

const INITIAL_RULES: ReorderRule[] = [
  {
    id: 'rr-1',
    item: 'Salbutamol inhaler',
    onHand: 6,
    triggerAt: 20,
    orderQty: 40,
    ruleDesc: 'Order 40 · essential',
    isEssential: true,
    poRaised: true,
  },
  {
    id: 'rr-2',
    item: 'ORS sachets',
    onHand: 18,
    triggerAt: 60,
    orderQty: 200,
    ruleDesc: 'Order 200 · seasonal ×3',
    isSeasonal: true,
    poRaised: true,
  },
  {
    id: 'rr-3',
    item: 'Paracetamol 500',
    onHand: 340,
    triggerAt: 150,
    orderQty: 300,
    ruleDesc: 'Order 300',
    isEssential: true,
  },
  {
    id: 'rr-4',
    item: 'Daily Multivitamin',
    onHand: 8,
    triggerAt: 25,
    orderQty: 60,
    ruleDesc: 'Order 60',
    poRaised: true,
  },
  {
    id: 'rr-5',
    item: 'Insulin, rapid-acting',
    onHand: 12,
    triggerAt: 10,
    orderQty: 20,
    ruleDesc: 'Order 20 · cold chain',
    isColdChain: true,
    expiryDays: 41,
  },
  {
    id: 'rr-6',
    item: 'Sunscreen SPF 50',
    onHand: 0,
    triggerAt: 15,
    orderQty: 40,
    ruleDesc: 'Order 40',
    daysOutOfStock: 3,
    poRaised: true,
  },
];

/** Sample rules for tests only — the screen never shows these by default. */
export const DEMO_REORDER_RULES: ReorderRule[] = INITIAL_RULES;

export interface VendorReorderScreenProps {
  initialRules?: ReorderRule[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorReorderScreen({ initialRules, onNavigate, onLogout }: VendorReorderScreenProps) {
  const { logout } = useAuth();
  const t = useT();
  // Rules come only from the caller; there is no reorder-rules API yet, so
  // everything on this screen is local and is said to be local.
  const [rules, setRules] = useState<ReorderRule[]>(() => initialRules ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'below' | 'healthy' | 'expiring' | 'outofstock'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isBatchPoModalOpen, setIsBatchPoModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ReorderRule | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('50');

  // New rule form state
  const [newItemName, setNewItemName] = useState('');
  const [newOnHand, setNewOnHand] = useState('');
  const [newTriggerAt, setNewTriggerAt] = useState('');
  const [newOrderQty, setNewOrderQty] = useState('');
  const [newIsEssential, setNewIsEssential] = useState(false);
  const [newIsColdChain, setNewIsColdChain] = useState(false);
  const [newIsSeasonal, setNewIsSeasonal] = useState(false);

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
  const belowTriggerCount = useMemo(() => {
    return rules.filter((r) => r.onHand <= r.triggerAt).length;
  }, [rules]);

  const outOfStockCount = useMemo(() => {
    return rules.filter((r) => r.onHand === 0).length;
  }, [rules]);

  const expiringCount = useMemo(() => {
    return rules.filter((r) => r.expiryDays && r.expiryDays <= 60).length;
  }, [rules]);

  const essentialCount = useMemo(() => {
    return rules.filter((r) => r.isEssential).length;
  }, [rules]);

  // Filtered rows
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        rule.item.toLowerCase().includes(q) ||
        rule.ruleDesc.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'below') return rule.onHand <= rule.triggerAt;
      if (filterTab === 'healthy') return rule.onHand > rule.triggerAt && (!rule.expiryDays || rule.expiryDays > 60);
      if (filterTab === 'expiring') return Boolean(rule.expiryDays && rule.expiryDays <= 60);
      if (filterTab === 'outofstock') return rule.onHand === 0;

      return true;
    });
  }, [rules, searchQuery, filterTab]);

  // Handle raise single PO
  const handleRaisePo = (rule: ReorderRule) => {
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, poRaised: true } : r))
    );
    // Nothing is sent to a supplier: no PO number is invented.
    showToast(t('partner.vhome.reorder.toast.markOne', { item: rule.item, qty: rule.orderQty }));
  };

  // Handle raise batch PO
  const handleRaiseBatchPo = () => {
    const below = rules.filter((r) => r.onHand <= r.triggerAt);
    if (below.length === 0) {
      showToast(t('partner.vhome.reorder.toast.markNone'));
      return;
    }
    setRules((prev) =>
      prev.map((r) => (r.onHand <= r.triggerAt ? { ...r, poRaised: true } : r))
    );
    showToast(t('partner.vhome.reorder.toast.markAll', { count: below.length }));
    setIsBatchPoModalOpen(true);
  };

  // Handle stock adjustment
  const handleSaveStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    const added = parseInt(adjustAmount, 10);
    if (isNaN(added) || added <= 0) return;

    setRules((prev) =>
      prev.map((r) =>
        r.id === selectedRule.id ? { ...r, onHand: r.onHand + added, daysOutOfStock: undefined } : r
      )
    );
    setIsAdjustModalOpen(false);
    setSelectedRule(null);
    showToast(t('partner.vhome.reorder.toast.restocked', { added, item: selectedRule.item, total: selectedRule.onHand + added }));
  };

  // Handle Add Rule
  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const onHandNum = parseInt(newOnHand, 10) || 0;
    const triggerNum = parseInt(newTriggerAt, 10) || 10;
    const orderQtyNum = parseInt(newOrderQty, 10) || 50;

    let desc = t('partner.vhome.reorder.desc.order', { qty: orderQtyNum });
    if (newIsEssential) desc += ` · ${t('partner.vhome.reorder.desc.essential')}`;
    if (newIsColdChain) desc += ` · ${t('partner.vhome.reorder.desc.coldChain')}`;
    if (newIsSeasonal) desc += ` · ${t('partner.vhome.reorder.desc.seasonal')}`;

    const newRule: ReorderRule = {
      id: `rr-${Date.now()}`,
      item: newItemName.trim(),
      onHand: onHandNum,
      triggerAt: triggerNum,
      orderQty: orderQtyNum,
      ruleDesc: desc,
      isEssential: newIsEssential,
      isColdChain: newIsColdChain,
      isSeasonal: newIsSeasonal,
      poRaised: false,
    };

    setRules((prev) => [newRule, ...prev]);
    setIsAddModalOpen(false);
    setNewItemName('');
    setNewOnHand('');
    setNewTriggerAt('');
    setNewOrderQty('');
    setNewIsEssential(false);
    setNewIsColdChain(false);
    setNewIsSeasonal(false);
    showToast(t('partner.vhome.reorder.toast.ruleAdded', { item: newRule.item }));
  };

  // No server load exists to retry; return to the local rules.
  const handleRetry = () => {
    setViewState('data');
  };

  const navButton = (target: string, icon: React.ReactNode, label: MessageKey, current = false) => (
    <button
      type="button"
      className={`sk-reorder-nav-item${current ? ' is-active' : ''}`}
      aria-current={current ? 'page' : undefined}
      onClick={() => handleNavClick(target)}
    >
      {icon}
      <span>{t(label)}</span>
    </button>
  );

  return (
    <div className="sk-reorder-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-reorder-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="var(--sk-color-positive)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-reorder-sidebar" aria-label={t('partner.vhome.nav.sidebar')}>
        <div className="sk-reorder-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7reorder" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7breorder" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7reorder)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7breorder)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-reorder-brand-text">
            <span className="sk-reorder-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-reorder-brand-badge">{t('partner.vhome.nav.partnerBadge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vhome.nav.links')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-reorder-nav-group-title">{t('partner.vhome.nav.store')}</span>
          {navButton('vendor', <Home size={15} />, 'partner.vhome.nav.home')}
          {navButton('scan-verify', <Scan size={15} />, 'partner.vhome.nav.verify')}
          {navButton('orders', <Package size={15} />, 'partner.vhome.nav.orders')}
          {navButton('rx-review', <FileText size={15} />, 'partner.vhome.nav.rxReview')}
          {navButton('substitutions', <ArrowLeftRight size={15} />, 'partner.vhome.nav.substitutions')}
          {navButton('handover', <KeyRound size={15} />, 'partner.vhome.nav.handover')}
          {navButton('returns', <RotateCcw size={15} />, 'partner.vhome.nav.returns')}
          {navButton('dispensing', <ClipboardList size={15} />, 'partner.vhome.nav.dispense')}
          {navButton('reorder', <RefreshCw size={15} />, 'partner.vhome.nav.reorder', true)}

          <span className="sk-reorder-nav-group-title">{t('partner.vhome.nav.lab')}</span>
          {navButton('lab-queue', <FlaskConical size={15} />, 'partner.vhome.nav.sampleQueue')}
          {navButton('run-sheet', <Truck size={15} />, 'partner.vhome.nav.runSheet')}
          {navButton('cold-chain', <Snowflake size={15} />, 'partner.vhome.nav.coldChain')}
          {navButton('lab-queue', <CheckCircle2 size={15} />, 'partner.nav.labReports')}
          {navButton('camp-intake', <Tent size={15} />, 'partner.vhome.nav.campIntake')}

          <span className="sk-reorder-nav-group-title">{t('partner.vhome.nav.business')}</span>
          {navButton('partner-staff', <Users size={15} />, 'partner.vhome.nav.staff')}
          {navButton('catalogue', <LayoutGrid size={15} />, 'partner.vhome.nav.catalogue')}
          {navButton('settlement', <CreditCard size={15} />, 'partner.vhome.nav.settlement')}
          {navButton('performance', <FileText size={15} />, 'partner.vhome.nav.performance')}
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-reorder-nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: 'var(--sk-color-sidebar-ink)' }}
        >
          <LogOut size={15} />
          <span>{t('partner.vhome.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-reorder-main">
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-reorder-header-row">
              <div className="sk-reorder-title-group">
                <h1>{t('partner.vhome.reorder.title')}</h1>
                <p>{t('partner.vhome.reorder.sub')}</p>
                <p role="note" style={{ color: 'var(--sk-color-attention)', fontWeight: 600 }}>{t('partner.vhome.reorder.localOnly')}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sk-reorder-alert-pill" role="status">
                  <span className="sk-reorder-pulse-dot" aria-hidden="true" />
                  {t('partner.vhome.reorder.belowPill', { count: belowTriggerCount })}
                </span>

                <button
                  type="button"
                  className="sk-reorder-btn-primary"
                  onClick={handleRaiseBatchPo}
                >
                  <ShoppingCart size={15} />
                  {t('partner.vhome.reorder.markAll')}
                </button>

                <button
                  type="button"
                  className="sk-reorder-btn-primary"
                  style={{ background: 'var(--sk-color-action)' }}
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus size={15} />
                  {t('partner.vhome.reorder.addRule')}
                </button>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="sk-reorder-kpi-grid">
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: 'var(--sk-color-danger)' }}>
                  {belowTriggerCount}
                </span>
                <span className="sk-reorder-kpi-label">{t('partner.vhome.reorder.kpi.below')}</span>
              </div>
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: 'var(--sk-color-danger)' }}>
                  {outOfStockCount}
                </span>
                <span className="sk-reorder-kpi-label">{t('partner.vhome.reorder.kpi.out')}</span>
              </div>
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: 'var(--sk-color-attention)' }}>
                  {expiringCount}
                </span>
                <span className="sk-reorder-kpi-label">{t('partner.vhome.reorder.kpi.expiring')}</span>
              </div>
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: 'var(--sk-color-positive)' }}>
                  {essentialCount}
                </span>
                <span className="sk-reorder-kpi-label">{t('partner.vhome.reorder.kpi.essential')}</span>
              </div>
            </div>

            {/* Controls Bar: Search & Filter Tabs */}
            <div className="sk-reorder-controls-bar">
              <div className="sk-reorder-search-wrap">
                <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
                <input
                  type="text"
                  className="sk-reorder-search-input"
                  placeholder={t('partner.vhome.reorder.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('partner.vhome.reorder.searchAria')}
                />
              </div>

              <div className="sk-reorder-filter-tabs" role="tablist" aria-label={t('partner.vhome.reorder.filtersAria')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'all'}
                  className={`sk-reorder-filter-btn ${filterTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('all')}
                >
                  {t('partner.vhome.reorder.tab.all', { count: rules.length })}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'below'}
                  className={`sk-reorder-filter-btn ${filterTab === 'below' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('below')}
                >
                  {t('partner.vhome.reorder.tab.below', { count: belowTriggerCount })}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'healthy'}
                  className={`sk-reorder-filter-btn ${filterTab === 'healthy' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('healthy')}
                >
                  {t('partner.vhome.reorder.tab.healthy')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'expiring'}
                  className={`sk-reorder-filter-btn ${filterTab === 'expiring' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('expiring')}
                >
                  {t('partner.vhome.reorder.tab.expiring', { count: expiringCount })}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'outofstock'}
                  className={`sk-reorder-filter-btn ${filterTab === 'outofstock' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('outofstock')}
                >
                  {t('partner.vhome.reorder.tab.out', { count: outOfStockCount })}
                </button>
              </div>
            </div>

            {/* Rules Table Desk */}
            <div className="sk-reorder-card">
              <div className="sk-reorder-table-header" role="row">
                <span>{t('partner.vhome.reorder.th.item')}</span>
                <span>{t('partner.vhome.reorder.th.onHand')}</span>
                <span>{t('partner.vhome.reorder.th.trigger')}</span>
                <span>{t('partner.vhome.reorder.th.rule')}</span>
                <span style={{ justifySelf: 'end' }}>{t('partner.vhome.reorder.th.state')}</span>
                <span style={{ justifySelf: 'end' }}>{t('partner.vhome.reorder.th.action')}</span>
              </div>

              {filteredRules.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 13.5 }}>
                  {searchQuery ? t('partner.vhome.reorder.noMatch', { query: searchQuery }) : t('partner.vhome.reorder.none')}
                </div>
              ) : (
                filteredRules.map((r) => {
                  const isBelow = r.onHand <= r.triggerAt;
                  const isOutOfStock = r.onHand === 0;

                  return (
                    <div key={r.id} className="sk-reorder-table-row" role="row">
                      <span className="sk-reorder-item-name">{r.item}</span>
                      <span className={isBelow ? 'sk-reorder-num-alert' : 'sk-reorder-num-ok'}>
                        {r.onHand}
                      </span>
                      <span className="sk-reorder-num-muted">{r.triggerAt}</span>
                      <span className="sk-reorder-rule-desc">{r.ruleDesc}</span>

                      {/* State Badge */}
                      <span style={{ justifySelf: 'end' }}>
                        {isOutOfStock ? (
                          <span className="sk-reorder-badge sk-reorder-badge-red">
                            {r.daysOutOfStock
                              ? t('partner.vhome.reorder.badge.outDays', { days: r.daysOutOfStock })
                              : t('partner.vhome.reorder.badge.out')}
                          </span>
                        ) : isBelow ? (
                          <span className="sk-reorder-badge sk-reorder-badge-red">
                            {r.poRaised ? t('partner.vhome.reorder.badge.belowMarked') : t('partner.vhome.reorder.badge.below')}
                          </span>
                        ) : r.expiryDays && r.expiryDays <= 60 ? (
                          <span className="sk-reorder-badge sk-reorder-badge-amber">
                            {t('partner.vhome.reorder.badge.expiry', { days: r.expiryDays })}
                          </span>
                        ) : (
                          <span className="sk-reorder-badge sk-reorder-badge-green">
                            {t('partner.vhome.reorder.badge.healthy')}
                          </span>
                        )}
                      </span>

                      {/* Action Button */}
                      <span style={{ justifySelf: 'end', display: 'flex', gap: 6 }}>
                        {isBelow && !r.poRaised ? (
                          <button
                            type="button"
                            className="sk-reorder-action-btn"
                            onClick={() => handleRaisePo(r)}
                            style={{ minHeight: 44 }}
                          >
                            {t('partner.vhome.reorder.action.mark')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="sk-reorder-action-btn"
                            onClick={() => {
                              setSelectedRule(r);
                              setAdjustAmount('50');
                              setIsAdjustModalOpen(true);
                            }}
                            aria-label={t('partner.vhome.reorder.action.restockAria', { item: r.item })}
                            style={{ minHeight: 44 }}
                          >
                            {t('partner.vhome.reorder.action.restock')}
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })
              )}

              <span className="sk-reorder-footer-note">
                {t('partner.vhome.reorder.footer')}
              </span>
            </div>
          </>
        )}

        {/* Loading View State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vhome.reorder.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="skel" style={{ width: 280, height: 26, display: 'block' }} />
                <span className="skel" style={{ width: 420, height: 14, display: 'block' }} />
              </div>
              <span className="skel" style={{ width: 140, height: 40, display: 'block' }} />
            </div>
            <div className="sk-reorder-kpi-grid">
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
              <Package size={64} color="var(--sk-color-action)" />
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('partner.vhome.reorder.emptyTitle')}</h2>
              <p style={{ fontSize: 14, color: 'var(--sk-color-text-2)', margin: 0 }}>
                {t('partner.vhome.reorder.emptyDesc')}
              </p>
              <button
                type="button"
                className="sk-reorder-btn-primary"
                onClick={() => setViewState('data')}
              >
                {t('partner.vhome.reorder.emptyBack')}
              </button>
            </div>
          </div>
        )}

        {/* Error View State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={48} color="var(--sk-color-danger)" />
              <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>{t('partner.vhome.reorder.errorTitle')}</h2>
              <p style={{ fontSize: 14, color: 'var(--sk-color-text-2)', margin: 0 }}>
                {t('partner.vhome.reorder.errorDesc')}
              </p>
              <button type="button" className="sk-reorder-btn-primary" onClick={handleRetry}>
                {t('common.tryAgain')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Reorder Rule Modal */}
      {isAddModalOpen && (
        <div className="sk-reorder-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-rule-title">
          <div className="sk-reorder-modal-card">
            <div className="sk-reorder-modal-header">
              <h3 id="add-rule-title">{t('partner.vhome.reorder.add.title')}</h3>
              <button
                type="button"
                className="sk-reorder-close-btn"
                onClick={() => setIsAddModalOpen(false)}
                aria-label={t('partner.vhome.reorder.close')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-reorder-field-group">
                <label className="sk-reorder-field-label" htmlFor="rule-item">{t('partner.vhome.reorder.add.item')}</label>
                <input
                  id="rule-item"
                  type="text"
                  className="sk-reorder-field-input"
                  placeholder={t('partner.vhome.reorder.add.itemPlaceholder')}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="sk-reorder-field-group">
                  <label className="sk-reorder-field-label" htmlFor="rule-onhand">{t('partner.vhome.reorder.add.onHand')}</label>
                  <input
                    id="rule-onhand"
                    type="number"
                    min="0"
                    className="sk-reorder-field-input"
                    placeholder="25"
                    value={newOnHand}
                    onChange={(e) => setNewOnHand(e.target.value)}
                    required
                  />
                </div>
                <div className="sk-reorder-field-group">
                  <label className="sk-reorder-field-label" htmlFor="rule-trigger">{t('partner.vhome.reorder.add.trigger')}</label>
                  <input
                    id="rule-trigger"
                    type="number"
                    min="1"
                    className="sk-reorder-field-input"
                    placeholder="20"
                    value={newTriggerAt}
                    onChange={(e) => setNewTriggerAt(e.target.value)}
                    required
                  />
                </div>
                <div className="sk-reorder-field-group">
                  <label className="sk-reorder-field-label" htmlFor="rule-orderqty">{t('partner.vhome.reorder.add.orderQty')}</label>
                  <input
                    id="rule-orderqty"
                    type="number"
                    min="1"
                    className="sk-reorder-field-input"
                    placeholder="50"
                    value={newOrderQty}
                    onChange={(e) => setNewOrderQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                <label className="sk-reorder-checkbox-group">
                  <input
                    type="checkbox"
                    checked={newIsEssential}
                    onChange={(e) => setNewIsEssential(e.target.checked)}
                  />
                  <span>{t('partner.vhome.reorder.add.essential')}</span>
                </label>
                <label className="sk-reorder-checkbox-group">
                  <input
                    type="checkbox"
                    checked={newIsColdChain}
                    onChange={(e) => setNewIsColdChain(e.target.checked)}
                  />
                  <span>{t('partner.vhome.reorder.add.coldChain')}</span>
                </label>
                <label className="sk-reorder-checkbox-group">
                  <input
                    type="checkbox"
                    checked={newIsSeasonal}
                    onChange={(e) => setNewIsSeasonal(e.target.checked)}
                  />
                  <span>{t('partner.vhome.reorder.add.seasonal')}</span>
                </label>
              </div>

              <div className="sk-reorder-modal-actions">
                <button
                  type="button"
                  className="sk-reorder-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="sk-reorder-btn-primary"
                >
                  {t('partner.vhome.reorder.add.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock / Adjust Stock Modal */}
      {isAdjustModalOpen && selectedRule && (
        <div className="sk-reorder-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="adjust-stock-title">
          <div className="sk-reorder-modal-card">
            <div className="sk-reorder-modal-header">
              <h3 id="adjust-stock-title">{t('partner.vhome.reorder.restock.title', { item: selectedRule.item })}</h3>
              <button
                type="button"
                className="sk-reorder-close-btn"
                onClick={() => {
                  setIsAdjustModalOpen(false);
                  setSelectedRule(null);
                }}
                aria-label={t('partner.vhome.reorder.close')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: 0 }}>
                {t('partner.vhome.reorder.restock.current', { onHand: selectedRule.onHand, trigger: selectedRule.triggerAt })}
              </p>

              <div className="sk-reorder-field-group">
                <label className="sk-reorder-field-label" htmlFor="adjust-qty">{t('partner.vhome.reorder.restock.qty')}</label>
                <input
                  id="adjust-qty"
                  type="number"
                  min="1"
                  className="sk-reorder-field-input"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="sk-reorder-modal-actions">
                <button
                  type="button"
                  className="sk-reorder-btn-secondary"
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setSelectedRule(null);
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="sk-reorder-btn-primary"
                >
                  {t('partner.vhome.reorder.restock.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch PO Review & Receipt Modal */}
      {isBatchPoModalOpen && (
        <div className="sk-reorder-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="batch-po-title">
          <div className="sk-reorder-modal-card" style={{ maxWidth: 560 }}>
            <div className="sk-reorder-modal-header">
              <div>
                <h3 id="batch-po-title" style={{ margin: 0, fontSize: 18 }}>{t('partner.vhome.reorder.batch.title')}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--sk-color-text-3)' }}>
                  {t('partner.vhome.reorder.batch.sub')}
                </p>
              </div>
              <button
                type="button"
                className="sk-reorder-close-btn"
                onClick={() => setIsBatchPoModalOpen(false)}
                aria-label={t('partner.vhome.reorder.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--sk-color-rule)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--sk-color-surface-2)', textAlign: 'left', borderBottom: '1px solid var(--sk-color-rule)' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--sk-color-text-2)' }}>{t('partner.vhome.reorder.batch.item')}</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--sk-color-text-2)', textAlign: 'right' }}>{t('partner.vhome.reorder.batch.onHandFloor')}</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--sk-color-text-2)', textAlign: 'right' }}>{t('partner.vhome.reorder.batch.qty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.filter(r => r.poRaised).map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--sk-color-rule-soft)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--sk-color-text)' }}>{r.item}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--sk-color-text-3)' }}>
                          <span style={{ color: 'var(--sk-color-danger)', fontWeight: 700 }}>{r.onHand}</span> / {r.triggerAt}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--sk-color-action)' }}>
                          {t('partner.vhome.reorder.batch.units', { qty: r.orderQty })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sk-reorder-modal-actions">
                <button
                  type="button"
                  className="sk-reorder-btn-primary"
                  onClick={() => setIsBatchPoModalOpen(false)}
                >
                  {t('common.done')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default VendorReorderScreen;
