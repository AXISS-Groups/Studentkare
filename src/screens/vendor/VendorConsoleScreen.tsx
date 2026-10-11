import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Package,
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
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/vendorConsole.css';

export interface ConsoleOrderItem {
  id: string;
  initials: string;
  items: string;
  count: string;
  block: string;
  slot: string;
  status: 'To pack' | 'Out' | 'Blocked' | 'Done';
  tone: 'indigo' | 'sage' | 'peach';
}

export const DEMO_CONSOLE_ORDERS: ConsoleOrderItem[] = [
  {
    id: 'SK-48120',
    initials: 'K.C.',
    items: 'Ashwagandha Stress Balance, Barrier Care Lotion',
    count: '2 items · ₹578',
    block: 'North Dorm, B',
    slot: 'Tonight, 9 PM',
    status: 'To pack',
    tone: 'indigo',
  },
  {
    id: 'SK-48119',
    initials: 'P.N.',
    items: 'Daily Multivitamin Essentials',
    count: '1 item · ₹299',
    block: 'North Dorm, A',
    slot: 'Tonight, 9 PM',
    status: 'Out',
    tone: 'sage',
  },
  {
    id: 'SK-48118',
    initials: 'A.M.',
    items: 'Scheduled medicine · verification pending',
    count: '1 item · Statutory hold',
    block: 'South Dorm, C',
    slot: 'Hold',
    status: 'Blocked',
    tone: 'peach',
  },
  {
    id: 'SK-48117',
    initials: 'S.K.',
    items: 'Clarifying Face Wash SPF 15, Daily Defence Sunscreen',
    count: '2 items · ₹758',
    block: 'North Dorm, B',
    slot: 'Tomorrow, 8 AM',
    status: 'To pack',
    tone: 'indigo',
  },
  {
    id: 'SK-48116',
    initials: 'R.V.',
    items: 'Scheduled medicine · verification pending',
    count: '1 item · Statutory hold',
    block: 'East Wing, D',
    slot: 'Hold',
    status: 'Blocked',
    tone: 'peach',
  },
  {
    id: 'SK-48115',
    initials: 'M.T.',
    items: 'Omega 3 Fish Oil',
    count: '1 item · ₹549',
    block: 'South Dorm, C',
    slot: 'Delivered',
    status: 'Done',
    tone: 'sage',
  },
];

const STATUS_KEY: Record<ConsoleOrderItem['status'], MessageKey> = {
  'To pack': 'partner.vcon.console.status.toPack',
  Out: 'partner.vcon.console.status.out',
  Blocked: 'partner.vcon.console.status.blocked',
  Done: 'partner.vcon.console.status.done',
};

export interface VendorConsoleScreenProps {
  initialOrders?: ConsoleOrderItem[];
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorConsoleScreen({ initialOrders, onNavigate, onLogout }: VendorConsoleScreenProps) {
  const { logout } = useAuth();
  const t = useT();

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active filter tab: 0: 'All today', 1: 'To pack', 2: 'Out for delivery', 3: 'Blocked'
  const [activeTab, setActiveTab] = useState<number>(0);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  // Selected order modal
  const [selectedOrder, setSelectedOrder] = useState<ConsoleOrderItem | null>(null);

  // No order feed is wired to this screen: it starts empty unless a caller passes orders.
  const [orders, setOrders] = useState<ConsoleOrderItem[]>(() => initialOrders ?? []);

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
  const ordersReceivedCount = orders.length > 0 ? orders.length : '—';
  const packedCount =
    orders.length > 0 ? orders.filter((o) => o.status === 'Done' || o.status === 'Out').length : '—';
  const blockedCountNum = orders.filter((o) => o.status === 'Blocked').length;
  const blockedCount = orders.length > 0 ? blockedCountNum : '—';
  // No settlement data reaches this screen; never estimate money owed.
  const settlementDue = '—';

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 1 && order.status !== 'To pack') return false;
      if (activeTab === 2 && order.status !== 'Out' && order.status !== 'Done') return false;
      if (activeTab === 3 && order.status !== 'Blocked') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          order.id.toLowerCase().includes(q) ||
          order.initials.toLowerCase().includes(q) ||
          order.items.toLowerCase().includes(q) ||
          order.block.toLowerCase().includes(q) ||
          order.slot.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Order status transition
  const handleUpdateOrderStatus = (orderId: string, nextStatus: ConsoleOrderItem['status']) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const nextTone = nextStatus === 'Done' || nextStatus === 'Out' ? 'sage' : nextStatus === 'Blocked' ? 'peach' : 'indigo';
          return {
            ...o,
            status: nextStatus,
            tone: nextTone,
            slot: nextStatus === 'Out' ? t('partner.vcon.console.slotOut') : nextStatus === 'Done' ? t('partner.vcon.console.slotDelivered') : o.slot,
          };
        }
        return o;
      })
    );
    setSelectedOrder(null);
    showToast(t('partner.vcon.console.toastUpdatedLocal', { id: orderId, status: t(STATUS_KEY[nextStatus]) }));
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  const tabs = [
    t('partner.vcon.console.tabAll'),
    t('partner.vcon.console.status.toPack'),
    t('partner.vcon.console.tabOut'),
    t('partner.vcon.console.status.blocked'),
  ];

  return (
    <div className="sk-vc-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-vc-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="var(--sk-color-positive)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-vc-sidebar" aria-label={t('partner.vcon.nav.sidebarLabel')}>
        <div className="sk-vc-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7vc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7bvc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7vc)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7bvc)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-vc-brand-text">
            <span className="sk-vc-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-vc-brand-badge">{t('partner.vcon.nav.badge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vcon.nav.label')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-vc-nav-group-title">{t('partner.vcon.nav.store')}</span>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.home')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.verify')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.orders')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.handover')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.returns')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.dispensing')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.reorder')}</span>
          </button>

          <span className="sk-vc-nav-group-title">{t('partner.vcon.nav.lab')}</span>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.releaseResults')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.campIntake')}</span>
          </button>

          <span className="sk-vc-nav-group-title">{t('partner.vcon.nav.business')}</span>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.staff')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-vc-nav-item is-active" aria-current="page" onClick={() => handleNavClick('performance')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.performance')}</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-vc-nav-item"
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)' }}
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vcon.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-vc-main">
        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vcon.console.loadingAria')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="skel" style={{ display: 'block', width: 280, height: 26 }} />
                <span className="skel" style={{ display: 'block', width: 420, height: 14 }} />
              </div>
              <span className="skel" style={{ display: 'block', width: 150, height: 42 }} />
            </div>
            <div style={{ display: 'flex', gap: 18, flexGrow: 1 }}>
              <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} className="skel" style={{ display: 'block', width: '100%', height: 54 }} />
                ))}
              </div>
              <span className="skel" style={{ display: 'block', width: 320, height: 380 }} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {viewState === 'empty' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <Package size={64} color="var(--sk-color-action)" aria-hidden="true" />
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                {t('partner.vcon.console.emptyTitle')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vcon.console.notConnected')}
              </span>
              <button
                type="button"
                className="sk-vc-tab-btn is-active"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                {t('partner.vcon.console.reload')}
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
                {t('partner.vcon.console.errorTitle')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vcon.console.errorBody')}
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-vc-tab-btn is-active">
                  {t('common.tryAgain')}
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-vc-tab-btn">
                  {t('partner.vcon.console.backHome')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header matching VendorConsole.html */}
            <div className="sk-vc-header">
              <div className="sk-vc-header-left">
                <h1 className="sk-vc-title">{t('partner.vcon.console.title')}</h1>
                <span className="sk-vc-subtitle">
                  {orders.length > 0
                    ? t('partner.vcon.console.subCount', { count: orders.length, blocked: blockedCountNum })
                    : t('partner.vcon.console.subNone')}
                </span>
              </div>

              <div className="sk-vc-privacy-pill">
                <Lock size={15} color="var(--sk-color-action)" aria-hidden="true" />
                <span>{t('partner.vcon.console.privacyPill')}</span>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div className="sk-vc-tabs" role="tablist" aria-label={t('partner.vcon.console.tabsAria')}>
                {tabs.map((tabLabel, idx) => (
                  <button
                    key={tabLabel}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === idx}
                    className={`sk-vc-tab-btn ${activeTab === idx ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(idx)}
                  >
                    {tabLabel}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sk-color-surface)', padding: '0 12px', height: 38, borderRadius: 10, border: '1px solid var(--sk-color-rule)' }}>
                <Search size={15} color="var(--sk-color-text-3)" aria-hidden="true" />
                <input
                  type="search"
                  placeholder={t('partner.vcon.console.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 13, width: 220 }}
                  aria-label={t('partner.vcon.console.searchAria')}
                />
              </div>
            </div>

            {/* Body Split: Table on Left + Stack on Right */}
            <div className="sk-vc-body-split">
              {/* Orders Table Panel */}
              <div className="sk-vc-table-card">
                <div className="sk-vc-table-header">
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2' }}>{t('partner.vcon.console.th.order')}</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 4' }}>{t('partner.vcon.console.th.items')}</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2' }}>{t('partner.vcon.console.th.drop')}</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2' }}>{t('partner.vcon.console.th.slot')}</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2', textAlign: 'right' }}>{t('partner.vcon.console.th.status')}</span>
                </div>

                <div className="sk-vc-table-body" role="feed" aria-label={t('partner.vcon.console.feedAria')}>
                  {filteredOrders.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--sk-color-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Package size={36} color="var(--sk-color-text-3)" aria-hidden="true" />
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('partner.vcon.console.emptyTitle')}</span>
                      <span style={{ fontSize: 13, color: 'var(--sk-color-text-3)', maxWidth: 360 }}>
                        {searchQuery ? t('partner.vcon.console.emptySearch') : t('partner.vcon.console.notConnected')}
                      </span>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                    const tagClass =
                      order.tone === 'sage'
                        ? 'sk-vc-tag-sage'
                        : order.tone === 'peach'
                        ? 'sk-vc-tag-peach'
                        : 'sk-vc-tag-indigo';

                    return (
                      <div
                        key={order.id}
                        className="sk-vc-row"
                        onClick={() => setSelectedOrder(order)}
                        tabIndex={0}
                        role="button"
                        aria-label={t('partner.vcon.console.rowAria', { id: order.id, initials: order.initials, status: t(STATUS_KEY[order.status]) })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedOrder(order);
                          }
                        }}
                      >
                        <div className="sk-vc-cell-order">
                          <span className="sk-vc-order-id">{order.id}</span>
                          <span className="sk-vc-order-initials">{order.initials}</span>
                        </div>

                        <div className="sk-vc-cell-items">
                          <span className="sk-vc-items-name">{order.items}</span>
                          <span className="sk-vc-items-meta">{order.count}</span>
                        </div>

                        <div className="sk-vc-cell-block">{order.block}</div>
                        <div className="sk-vc-cell-slot">{order.slot}</div>

                        <div className="sk-vc-cell-status">
                          <span className={`sk-vc-status-tag ${tagClass}`}>{t(STATUS_KEY[order.status])}</span>
                        </div>
                      </div>
                    );
                  }))}
                </div>
              </div>

              {/* Right Side Stack matching VendorConsole.html */}
              <div className="sk-vc-right-stack">
                {/* TODAY KPI Card */}
                <div className="sk-vc-card-today">
                  <span className="sk-vc-card-title">{t('partner.vcon.console.today')}</span>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">{t('partner.vcon.console.kpiReceived')}</span>
                    <span className="sk-vc-stat-number">{ordersReceivedCount}</span>
                  </div>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">{t('partner.vcon.console.kpiPacked')}</span>
                    <span className="sk-vc-stat-number">{packedCount}</span>
                  </div>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">{t('partner.vcon.console.kpiBlocked')}</span>
                    <span
                      className="sk-vc-stat-number"
                      style={{ color: typeof blockedCount === 'number' && blockedCount > 0 ? 'var(--sk-color-danger)' : 'var(--sk-color-text)' }}
                    >
                      {blockedCount}
                    </span>
                  </div>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">{t('partner.vcon.console.kpiSettlement')}</span>
                    <span className="sk-vc-stat-number">{settlementDue}</span>
                  </div>
                </div>

                {/* AWAITING PHARMACIST Alert Card */}
                {blockedCountNum > 0 && (
                  <div className="sk-vc-card-pharmacist">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--sk-color-attention)' }} />
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--sk-color-attention)', letterSpacing: 1.1 }}>
                        {t('partner.vcon.console.awaitingTitle')}
                      </span>
                    </span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-attention)' }}>
                      {blockedCountNum === 1
                        ? t('partner.vcon.console.awaitingBodyOne')
                        : t('partner.vcon.console.awaitingBodyOther', { count: blockedCountNum })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavClick('dispensing')}
                      style={{
                        marginTop: 4,
                        background: 'var(--sk-color-attention)',
                        color: 'var(--sk-color-on-action)',
                        border: 0,
                        borderRadius: 8,
                        minHeight: 44,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{t('partner.vcon.console.verifyInRegister')}</span>
                      <ChevronRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* WHAT YOU CANNOT SEE Privacy Card */}
                <div className="sk-vc-card-privacy">
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: 1.2 }}>
                    {t('partner.vcon.console.cannotSeeTitle')}
                  </span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                    {t('partner.vcon.console.cannotSeeBody')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Order Detail & Fulfilment Modal */}
      {selectedOrder && (
        <div className="sk-vc-backdrop" role="dialog" aria-modal="true" aria-labelledby="console-order-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sk-vc-modal-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: 1.1 }}>
                  {t('partner.vcon.console.modalEyebrow')}
                </span>
                <h3 id="console-order-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vcon.console.modalTitle', { id: selectedOrder.id, initials: selectedOrder.initials })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label={t('partner.vcon.closeDialog')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--sk-color-surface-2)', padding: 14, borderRadius: 12, border: '1px solid var(--sk-color-rule)' }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.console.modalItems')}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>{selectedOrder.items}</span>
                <span style={{ fontSize: 11.5, color: 'var(--sk-color-text-3)', display: 'block', marginTop: 2 }}>{selectedOrder.count}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 4 }}>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.console.modalDrop')}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text)' }}>{selectedOrder.block}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.console.modalSlot')}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text)' }}>{selectedOrder.slot}</span>
                </div>
              </div>
            </div>

            {selectedOrder.status === 'Blocked' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--sk-color-attention-bg)', borderRadius: 10 }}>
                <ShieldAlert size={18} color="var(--sk-color-attention)" aria-hidden="true" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sk-color-attention)' }}>
                  {t('partner.vcon.console.h1SignOff')}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="sk-vc-tab-btn"
                onClick={() => setSelectedOrder(null)}
              >
                {t('partner.vcon.closeDialog')}
              </button>
              {selectedOrder.status === 'To pack' && (
                <button
                  type="button"
                  className="sk-vc-tab-btn is-active"
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Out')}
                >
                  {t('partner.vcon.console.markOut')}
                </button>
              )}
              {selectedOrder.status === 'Out' && (
                <button
                  type="button"
                  className="sk-vc-tab-btn is-active"
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Done')}
                >
                  {t('partner.vcon.console.markDelivered')}
                </button>
              )}
              {selectedOrder.status === 'Blocked' && (
                <button
                  type="button"
                  className="sk-vc-tab-btn is-active"
                  style={{ background: 'var(--sk-color-attention)', borderColor: 'var(--sk-color-attention)' }}
                  onClick={() => {
                    setSelectedOrder(null);
                    handleNavClick('dispensing');
                  }}
                >
                  {t('partner.vcon.console.openRegister')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorConsoleScreen;
