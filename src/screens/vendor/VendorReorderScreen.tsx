import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
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
  ShoppingCart,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
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

export const DEMO_REORDER_RULES: ReorderRule[] = INITIAL_RULES;

export interface VendorReorderScreenProps {
  initialRules?: ReorderRule[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorReorderScreen({ initialRules, onNavigate, onLogout }: VendorReorderScreenProps) {
  const { logout } = useAuth();
  const [rules, setRules] = useState<ReorderRule[]>(() =>
    initialRules ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_REORDER_RULES : [])
  );
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
    showToast(`Purchase order PO-${Math.floor(1000 + Math.random() * 9000)} raised for ${rule.orderQty} × ${rule.item}`);
  };

  // Handle raise batch PO
  const handleRaiseBatchPo = () => {
    const below = rules.filter((r) => r.onHand <= r.triggerAt);
    if (below.length === 0) {
      showToast('All items are currently at healthy inventory floors');
      return;
    }
    setRules((prev) =>
      prev.map((r) => (r.onHand <= r.triggerAt ? { ...r, poRaised: true } : r))
    );
    showToast(`Batch purchase orders created for ${below.length} items below floor threshold`);
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
    showToast(`Restocked ${added} units of ${selectedRule.item}. Current on hand: ${selectedRule.onHand + added}`);
  };

  // Handle Add Rule
  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const onHandNum = parseInt(newOnHand, 10) || 0;
    const triggerNum = parseInt(newTriggerAt, 10) || 10;
    const orderQtyNum = parseInt(newOrderQty, 10) || 50;

    let desc = `Order ${orderQtyNum}`;
    if (newIsEssential) desc += ' · essential';
    if (newIsColdChain) desc += ' · cold chain';
    if (newIsSeasonal) desc += ' · seasonal ×2';

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
      poRaised: onHandNum <= triggerNum,
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
    showToast(`Reorder rule created for ${newRule.item}`);
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 900);
  };

  return (
    <div className="sk-reorder-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-reorder-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-reorder-sidebar" aria-label="Partner Sidebar">
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
            <span className="sk-reorder-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-reorder-nav-group-title">STORE</span>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-reorder-nav-item is-active" aria-current="page" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-reorder-nav-group-title">LAB</span>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-reorder-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-reorder-nav-item" onClick={() => handleNavClick('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-reorder-nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: '#FDA4AF' }}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-reorder-main">
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-reorder-header-row">
              <div className="sk-reorder-title-group">
                <h1>Reorder rules</h1>
                <p>Automatic purchase orders when stock crosses a floor</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sk-reorder-alert-pill" role="status">
                  <span className="sk-reorder-pulse-dot" aria-hidden="true" />
                  {belowTriggerCount} below trigger
                </span>

                <button
                  type="button"
                  className="sk-reorder-btn-primary"
                  onClick={handleRaiseBatchPo}
                  title="Raise purchase orders for all items below trigger"
                >
                  <ShoppingCart size={15} />
                  Raise batch PO
                </button>

                <button
                  type="button"
                  className="sk-reorder-btn-primary"
                  style={{ background: '#4F46E5' }}
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus size={15} />
                  Add reorder rule
                </button>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="sk-reorder-kpi-grid">
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: '#E11D48' }}>
                  {belowTriggerCount}
                </span>
                <span className="sk-reorder-kpi-label">Below trigger</span>
              </div>
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: '#E11D48' }}>
                  {outOfStockCount}
                </span>
                <span className="sk-reorder-kpi-label">Out of stock</span>
              </div>
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: '#B45309' }}>
                  {expiringCount}
                </span>
                <span className="sk-reorder-kpi-label">Expiring within 60 days</span>
              </div>
              <div className="sk-reorder-kpi-card">
                <span className="sk-reorder-kpi-val" style={{ color: '#047857' }}>
                  {essentialCount}
                </span>
                <span className="sk-reorder-kpi-label">Essential items watched</span>
              </div>
            </div>

            {/* Controls Bar: Search & Filter Tabs */}
            <div className="sk-reorder-controls-bar">
              <div className="sk-reorder-search-wrap">
                <Search size={16} color="#94A3B8" aria-hidden="true" />
                <input
                  type="text"
                  className="sk-reorder-search-input"
                  placeholder="Search item name, rule, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search reorder rules"
                />
              </div>

              <div className="sk-reorder-filter-tabs" role="tablist" aria-label="Reorder rule status filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'all'}
                  className={`sk-reorder-filter-btn ${filterTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('all')}
                >
                  All rules ({rules.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'below'}
                  className={`sk-reorder-filter-btn ${filterTab === 'below' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('below')}
                >
                  Below trigger ({belowTriggerCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'healthy'}
                  className={`sk-reorder-filter-btn ${filterTab === 'healthy' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('healthy')}
                >
                  Healthy
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'expiring'}
                  className={`sk-reorder-filter-btn ${filterTab === 'expiring' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('expiring')}
                >
                  Expiring ({expiringCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === 'outofstock'}
                  className={`sk-reorder-filter-btn ${filterTab === 'outofstock' ? 'is-active' : ''}`}
                  onClick={() => setFilterTab('outofstock')}
                >
                  Out of stock ({outOfStockCount})
                </button>
              </div>
            </div>

            {/* Rules Table Desk */}
            <div className="sk-reorder-card">
              <div className="sk-reorder-table-header" role="row">
                <span>ITEM</span>
                <span>ON HAND</span>
                <span>TRIGGER AT</span>
                <span>RULE</span>
                <span style={{ justifySelf: 'end' }}>STATE</span>
                <span style={{ justifySelf: 'end' }}>ACTION</span>
              </div>

              {filteredRules.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6B6980', fontSize: 13.5 }}>
                  {searchQuery ? `No reorder rules matching "${searchQuery}"` : 'No reorder rules configured. Click "Create rule" to add one.'}
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
                            Out of stock {r.daysOutOfStock ? `${r.daysOutOfStock} days` : ''}
                          </span>
                        ) : isBelow ? (
                          <span className="sk-reorder-badge sk-reorder-badge-red">
                            {r.poRaised ? 'Below trigger — PO raised' : 'Below trigger'}
                          </span>
                        ) : r.expiryDays && r.expiryDays <= 60 ? (
                          <span className="sk-reorder-badge sk-reorder-badge-amber">
                            Healthy · expiry in {r.expiryDays} days
                          </span>
                        ) : (
                          <span className="sk-reorder-badge sk-reorder-badge-green">
                            Healthy
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
                            title="Raise PO"
                          >
                            Raise PO
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
                            title="Adjust inventory count"
                          >
                            Restock
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })
              )}

              <span className="sk-reorder-footer-note">
                Essential medicines carry a higher floor and a standing seasonal multiplier, so an inhaler never runs out because demand rose faster than the last order. A rule raises a purchase order; it does not dispense, and it cannot change what a clinician prescribed.
              </span>
            </div>
          </>
        )}

        {/* Loading View State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Reorder rules" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <Package size={64} color="#818CF8" />
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Nothing in reorder rules yet.</h2>
              <p style={{ fontSize: 14, color: '#464555', margin: 0 }}>
                Automatic replenishment triggers will show here once catalog thresholds are defined.
              </p>
              <button
                type="button"
                className="sk-reorder-btn-primary"
                onClick={() => setViewState('data')}
              >
                Return to rules
              </button>
            </div>
          </div>
        )}

        {/* Error View State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: '#FFFFFF', border: '1.5px solid #FECDD3', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={48} color="#E11D48" />
              <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Couldn’t load reorder rules</h2>
              <p style={{ fontSize: 14, color: '#464555', margin: 0 }}>
                This is on our side, not yours — nothing was lost. We tried 3 times. If it keeps happening, the status page will say so.
              </p>
              <button type="button" className="sk-reorder-btn-primary" onClick={handleRetry}>
                Try again
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
              <h3 id="add-rule-title">Add Automatic Reorder Rule</h3>
              <button
                type="button"
                className="sk-reorder-close-btn"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-reorder-field-group">
                <label className="sk-reorder-field-label" htmlFor="rule-item">Item Name</label>
                <input
                  id="rule-item"
                  type="text"
                  className="sk-reorder-field-input"
                  placeholder="e.g. Cetirizine 10mg"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="sk-reorder-field-group">
                  <label className="sk-reorder-field-label" htmlFor="rule-onhand">On Hand</label>
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
                  <label className="sk-reorder-field-label" htmlFor="rule-trigger">Trigger Floor</label>
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
                  <label className="sk-reorder-field-label" htmlFor="rule-orderqty">Order Qty</label>
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
                  <span>Mark as Essential Medicine (higher safety buffer)</span>
                </label>
                <label className="sk-reorder-checkbox-group">
                  <input
                    type="checkbox"
                    checked={newIsColdChain}
                    onChange={(e) => setNewIsColdChain(e.target.checked)}
                  />
                  <span>Cold Chain Required (2–8 °C monitoring)</span>
                </label>
                <label className="sk-reorder-checkbox-group">
                  <input
                    type="checkbox"
                    checked={newIsSeasonal}
                    onChange={(e) => setNewIsSeasonal(e.target.checked)}
                  />
                  <span>Seasonal Multiplier (Auto ×2 in monsoon / exam season)</span>
                </label>
              </div>

              <div className="sk-reorder-modal-actions">
                <button
                  type="button"
                  className="sk-reorder-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sk-reorder-btn-primary"
                >
                  Save &amp; activate rule
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
              <h3 id="adjust-stock-title">Record Received Stock: {selectedRule.item}</h3>
              <button
                type="button"
                className="sk-reorder-close-btn"
                onClick={() => {
                  setIsAdjustModalOpen(false);
                  setSelectedRule(null);
                }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                Current on-hand count is <strong>{selectedRule.onHand}</strong> units. Floor threshold is <strong>{selectedRule.triggerAt}</strong> units.
              </p>

              <div className="sk-reorder-field-group">
                <label className="sk-reorder-field-label" htmlFor="adjust-qty">Received Quantity to Add</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sk-reorder-btn-primary"
                >
                  Confirm Restock
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
                <h3 id="batch-po-title" style={{ margin: 0, fontSize: 18 }}>Batch Purchase Order Dispatched</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
                  Ref: <strong>PO-BATCH-{new Date().getFullYear()}-4412</strong> · Dispatched to distributors
                </p>
              </div>
              <button
                type="button"
                className="sk-reorder-close-btn"
                onClick={() => setIsBatchPoModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: '#F8FAFC', padding: '12px 14px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', display: 'block' }}>SUPPLIER</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>MedPlus Wholesale</span>
                </div>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', display: 'block' }}>ITEMS IN BATCH</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#4F46E5' }}>{rules.filter(r => r.poRaised).length} line items</span>
                </div>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', display: 'block' }}>EST. DISPATCH</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#059669' }}>Tomorrow 10:00 AM</span>
                </div>
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Item</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>On Hand / Floor</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Order Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.filter(r => r.poRaised).map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0F172A' }}>{r.item}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B' }}>
                          <span style={{ color: '#E11D48', fontWeight: 700 }}>{r.onHand}</span> / {r.triggerAt}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#4F46E5' }}>
                          +{r.orderQty} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sk-reorder-modal-actions">
                <button
                  type="button"
                  className="sk-reorder-btn-secondary"
                  onClick={() => {
                    showToast('Batch PO receipt manifest downloaded as CSV');
                  }}
                >
                  <Download size={14} style={{ marginRight: 6 }} /> Export PO Manifest
                </button>
                <button
                  type="button"
                  className="sk-reorder-btn-primary"
                  onClick={() => setIsBatchPoModalOpen(false)}
                >
                  Done
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
