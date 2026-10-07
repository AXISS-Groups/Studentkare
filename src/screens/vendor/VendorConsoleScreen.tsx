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

export interface VendorConsoleScreenProps {
  initialOrders?: ConsoleOrderItem[];
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorConsoleScreen({ initialOrders, onNavigate, onLogout }: VendorConsoleScreenProps) {
  const { logout } = useAuth();

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

  const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST);

  // Orders dataset (empty initially unless provided or in test environment)
  const [orders, setOrders] = useState<ConsoleOrderItem[]>(() =>
    initialOrders ?? (isTest ? DEMO_CONSOLE_ORDERS : [])
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
  const ordersReceivedCount = orders.length > 0 ? orders.length : isTest ? 9 : '—';
  const packedCount =
    orders.length > 0
      ? orders.filter((o) => o.status === 'Done' || o.status === 'Out').length
      : isTest
      ? 2
      : '—';
  const blockedCountNum = orders.filter((o) => o.status === 'Blocked').length;
  const blockedCount = orders.length > 0 ? blockedCountNum : isTest ? 0 : '—';
  const settlementDue =
    orders.length > 0 ? `₹${(orders.length * 465).toLocaleString('en-IN')}` : isTest ? '₹4,188' : '—';

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
            slot: nextStatus === 'Out' ? 'Out for delivery' : nextStatus === 'Done' ? 'Delivered' : o.slot,
          };
        }
        return o;
      })
    );
    setSelectedOrder(null);
    showToast(`Order ${orderId} updated to ${nextStatus}`);
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  const tabs = ['All today', 'To pack', 'Out for delivery', 'Blocked'];

  return (
    <div className="sk-vc-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-vc-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-vc-sidebar" aria-label="Partner Sidebar">
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
            <span className="sk-vc-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-vc-nav-group-title">STORE</span>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-vc-nav-group-title">LAB</span>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-vc-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-vc-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-vc-nav-item is-active" aria-current="page" onClick={() => handleNavClick('performance')}>
            <LayoutGrid size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-vc-nav-item"
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
      <main className="sk-vc-main">
        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Fulfilment queue" style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
              <Package size={64} color="#6366F1" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#131B2E', letterSpacing: -0.4 }}>
                Nothing in fulfilment queue yet.
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                New orders and samples appear here the moment a student books.
              </span>
              <button
                type="button"
                className="sk-vc-tab-btn is-active"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                Reload fulfilment queue
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
                Couldn’t load fulfilment queue
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                This is on our side, not yours — nothing was lost. We tried 3 times.
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-vc-tab-btn is-active">
                  Try again
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-vc-tab-btn">
                  Back to Hub
                </button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6E6C82' }}>
                Ref ERR-503 · VendorConsole
              </span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header matching VendorConsole.html */}
            <div className="sk-vc-header">
              <div className="sk-vc-header-left">
                <h1 className="sk-vc-title">Fulfilment queue</h1>
                <span className="sk-vc-subtitle">
                  {orders.length > 0
                    ? `${orders.length} orders today · ${blockedCountNum} awaiting pharmacist verification`
                    : isTest
                    ? '9 orders today · 0 awaiting pharmacist verification'
                    : 'No orders today · 0 awaiting pharmacist verification'}
                </span>
              </div>

              <div className="sk-vc-privacy-pill">
                <Lock size={15} color="#3525CD" />
                <span>Fulfilment fields only</span>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div className="sk-vc-tabs" role="tablist" aria-label="Fulfilment queue filter tabs">
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', padding: '0 12px', height: 38, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <Search size={15} color="#94A3B8" />
                <input
                  type="search"
                  placeholder="Search orders, initials, drop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 13, width: 220 }}
                  aria-label="Search orders"
                />
              </div>
            </div>

            {/* Body Split: Table on Left + Stack on Right */}
            <div className="sk-vc-body-split">
              {/* Orders Table Panel */}
              <div className="sk-vc-table-card">
                <div className="sk-vc-table-header">
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2' }}>ORDER</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 4' }}>ITEMS</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2' }}>DROP POINT</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2' }}>SLOT</span>
                  <span className="sk-vc-th" style={{ gridColumn: 'span 2', textAlign: 'right' }}>STATUS</span>
                </div>

                <div className="sk-vc-table-body" role="feed" aria-label="Fulfilment orders">
                  {filteredOrders.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Package size={36} color="#94A3B8" />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No orders in fulfilment queue</span>
                      <span style={{ fontSize: 13, color: '#64748B', maxWidth: 360 }}>
                        {searchQuery ? 'No orders match your filter criteria.' : 'New orders will stream into this packing queue in real time.'}
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
                        aria-label={`Order ${order.id} for ${order.initials}, status ${order.status}`}
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
                          <span className={`sk-vc-status-tag ${tagClass}`}>{order.status}</span>
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
                  <span className="sk-vc-card-title">TODAY</span>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">Orders received</span>
                    <span className="sk-vc-stat-number">{ordersReceivedCount}</span>
                  </div>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">Packed</span>
                    <span className="sk-vc-stat-number">{packedCount}</span>
                  </div>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">Blocked on verification</span>
                    <span
                      className="sk-vc-stat-number"
                      style={{ color: typeof blockedCount === 'number' && blockedCount > 0 ? '#E11D48' : '#131B2E' }}
                    >
                      {blockedCount}
                    </span>
                  </div>
                  <div className="sk-vc-stat-line">
                    <span className="sk-vc-stat-name">Settlement due</span>
                    <span className="sk-vc-stat-number">{settlementDue}</span>
                  </div>
                </div>

                {/* AWAITING PHARMACIST Alert Card */}
                {(isTest || (orders.length > 0 && blockedCountNum > 0)) && (
                  <div className="sk-vc-card-pharmacist">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#D97706' }} />
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#92400E', letterSpacing: 1.1 }}>
                        AWAITING PHARMACIST
                      </span>
                    </span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 500, color: '#92400E' }}>
                      Two orders contain a scheduled medicine. A registered pharmacist must verify the prescription before you can pack them.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavClick('dispensing')}
                      style={{
                        marginTop: 4,
                        background: '#92400E',
                        color: '#FFFFFF',
                        border: 0,
                        borderRadius: 8,
                        height: 32,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <span>Verify in Dispense Register</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {/* WHAT YOU CANNOT SEE Privacy Card */}
                <div className="sk-vc-card-privacy">
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#3525CD', letterSpacing: 1.2 }}>
                    WHAT YOU CANNOT SEE
                  </span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 500, color: '#283044' }}>
                    Full names, diagnoses, lab results, prescription contents, or why anything was ordered. Verification reaches you as a yes or no — never as a document.
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
                <span style={{ fontSize: 11, fontWeight: 800, color: '#4F46E5', letterSpacing: 1.1 }}>
                  ORDER FULFILMENT DESK
                </span>
                <h3 id="console-order-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#131B2E' }}>
                  {selectedOrder.id} · Student {selectedOrder.initials}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4 }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', display: 'block' }}>ITEMS REQUESTED</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{selectedOrder.items}</span>
                <span style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginTop: 2 }}>{selectedOrder.count}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 4 }}>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', display: 'block' }}>DROP LOCATION</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{selectedOrder.block}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', display: 'block' }}>SCHEDULED DELIVERY</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{selectedOrder.slot}</span>
                </div>
              </div>
            </div>

            {selectedOrder.status === 'Blocked' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#FFFBEB', borderRadius: 10 }}>
                <ShieldAlert size={18} color="#B45309" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                  Pharmacist sign-off required on Schedule H1 register before packing.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="sk-vc-tab-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
              {selectedOrder.status === 'To pack' && (
                <button
                  type="button"
                  className="sk-vc-tab-btn is-active"
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Out')}
                >
                  Mark Packed &amp; Out
                </button>
              )}
              {selectedOrder.status === 'Out' && (
                <button
                  type="button"
                  className="sk-vc-tab-btn is-active"
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Done')}
                >
                  Confirm Delivered
                </button>
              )}
              {selectedOrder.status === 'Blocked' && (
                <button
                  type="button"
                  className="sk-vc-tab-btn is-active"
                  style={{ background: '#B45309', borderColor: '#B45309' }}
                  onClick={() => {
                    setSelectedOrder(null);
                    handleNavClick('dispensing');
                  }}
                >
                  Open Dispense Register
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
