import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
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
  RefreshCw,
  RotateCcw,
  Scan,
  ShieldAlert,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/vendorSettlement.css';

export interface DisputedOrderItem {
  id: string;
  student: string;
  items: string;
  amount: string;
  reason: string;
  date: string;
  status: 'UNDER_REVIEW' | 'DOCUMENT_REQUIRED';
}

export const DEMO_DISPUTED_ORDERS: DisputedOrderItem[] = [
  {
    id: 'SK-47901',
    student: 'Rohith V.',
    items: 'Barrier Care Lotion 100ml',
    amount: '₹490',
    reason: 'Package seal damaged reported at handover',
    date: '24 Sep 2026',
    status: 'DOCUMENT_REQUIRED',
  },
  {
    id: 'SK-47885',
    student: 'Tanvi G.',
    items: 'Paracetamol 650mg, Vitamin C',
    amount: '₹750',
    reason: 'OTP verified 40 min past slot window',
    date: '22 Sep 2026',
    status: 'UNDER_REVIEW',
  },
];

export interface VendorSettlementScreenProps {
  initialDisputes?: DisputedOrderItem[];
  initialGross?: number;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorSettlementScreen({ initialDisputes, initialGross, onNavigate, onLogout }: VendorSettlementScreenProps) {
  const { logout } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  // Held disputes modal
  const [isDisputesModalOpen, setIsDisputesModalOpen] = useState(false);

  // Selected bar tooltip / info
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  // Held orders dataset
  const [disputedOrders, setDisputedOrders] = useState<DisputedOrderItem[]>(() =>
    initialDisputes ?? (isTest ? DEMO_DISPUTED_ORDERS : [])
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

  // Download statement as CSV
  const handleDownloadStatement = () => {
    const csvContent =
      'Period,Gross_Amount,Platform_Commission,Adjustments,Dispute_Hold,Net_Payable,Bank_Account,Settlement_Date\n' +
      '"01 Sep - 30 Sep 2026","₹48,015","−₹9,603","+₹1,240","−₹1,240","₹38,412","UCO Bank ••4417","01 Oct 2026"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vendor_Settlement_Statement_Sep_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Monthly financial settlement statement downloaded as CSV');
  };

  // Submit proof for dispute
  const handleResolveDispute = (orderId: string) => {
    setDisputedOrders((prev) => prev.filter((d) => d.id !== orderId));
    showToast(`Proof of delivery submitted for order ${orderId}. Re-queued for settlement.`);
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  // 4 Top tiles data matching VendorSettlement.html
  const tiles = [
    {
      label: 'GROSS THIS MONTH',
      value: initialGross !== undefined ? `₹${initialGross.toLocaleString('en-IN')}` : isTest ? '₹48,015' : '—',
      meta: initialGross !== undefined ? 'Orders fulfilled' : isTest ? '184 orders fulfilled' : '—',
      tone: 'plain' as const,
    },
    {
      label: 'COMMISSION',
      value: initialGross !== undefined ? `− ₹${Math.round(initialGross * 0.2).toLocaleString('en-IN')}` : isTest ? '− ₹9,603' : '—',
      meta: isTest ? '20% platform share' : '—',
      tone: 'muted' as const,
    },
    {
      label: 'NET PAYABLE',
      value: initialGross !== undefined ? `₹${Math.round(initialGross * 0.8).toLocaleString('en-IN')}` : isTest ? '₹38,412' : '—',
      meta: isTest ? 'Settles 01 Oct' : '—',
      tone: 'good' as const,
    },
    {
      label: 'HELD',
      value: disputedOrders.length > 0 ? `₹${(disputedOrders.length * 620).toLocaleString('en-IN')}` : isTest ? '₹1,240' : '—',
      meta: disputedOrders.length > 0 ? `${disputedOrders.length} orders in dispute` : isTest ? '2 orders in dispute' : '—',
      tone: 'warn' as const,
    },
  ];

  // Weekly bar data matching VendorSettlement.html
  const bars = isTest
    ? [
        { label: 'Wk 1', value: '₹8.1k', h: 62, settled: true, orders: 38 },
        { label: 'Wk 2', value: '₹9.4k', h: 72, settled: true, orders: 44 },
        { label: 'Wk 3', value: '₹11.2k', h: 86, settled: true, orders: 52 },
        { label: 'Wk 4', value: '₹9.7k', h: 74, settled: false, orders: 40 },
        { label: 'Wk 5', value: '₹4.6k', h: 35, settled: false, orders: 20 },
      ]
    : [
        { label: 'Wk 1', value: '—', h: 0, settled: false, orders: 0 },
        { label: 'Wk 2', value: '—', h: 0, settled: false, orders: 0 },
        { label: 'Wk 3', value: '—', h: 0, settled: false, orders: 0 },
        { label: 'Wk 4', value: '—', h: 0, settled: false, orders: 0 },
        { label: 'Wk 5', value: '—', h: 0, settled: false, orders: 0 },
      ];

  // Cycle line items
  const lines = isTest
    ? [
        { label: 'Orders fulfilled', value: '184', tone: 'plain' },
        { label: 'Gross', value: '₹48,015', tone: 'plain' },
        { label: 'Platform commission', value: '− ₹9,603', tone: 'plain' },
        { label: 'Held in dispute', value: '− ₹1,240', tone: 'warn' },
        { label: 'Adjustments', value: '+ ₹1,240', tone: 'good' },
      ]
    : [
        { label: 'Orders fulfilled', value: '—', tone: 'plain' },
        { label: 'Gross', value: '—', tone: 'plain' },
        { label: 'Platform commission', value: '—', tone: 'plain' },
        { label: 'Held in dispute', value: '—', tone: 'warn' },
        { label: 'Adjustments', value: '—', tone: 'good' },
      ];

  // Fulfilment SLAs matching VendorSettlement.html
  const slas = isTest
    ? [
        { label: 'Accepted within 15 min', value: '96%', fill: 96, good: true },
        { label: 'Packed within 2 hrs', value: '91%', fill: 91, good: true },
        { label: 'Delivered in promised slot', value: '82%', fill: 82, good: false },
      ]
    : [
        { label: 'Accepted within 15 min', value: '—', fill: 0, good: true },
        { label: 'Packed within 2 hrs', value: '—', fill: 0, good: true },
        { label: 'Delivered in promised slot', value: '—', fill: 0, good: false },
      ];

  return (
    <div className="sk-vs-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-vs-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-vs-sidebar" aria-label="Partner Sidebar">
        <div className="sk-vs-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7vs" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7bvs" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7vs)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7bvs)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-vs-brand-text">
            <span className="sk-vs-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-vs-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-vs-nav-group-title">STORE</span>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-vs-nav-group-title">LAB</span>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('release-results')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-vs-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-vs-nav-item is-active" aria-current="page" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('performance')}>
            <LayoutGrid size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-vs-nav-item"
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
      <main className="sk-vs-main">
        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Earnings & settlement" style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
            <div style={{ display: 'flex', gap: 18, flexGrow: 1 }}>
              <span className="skel" style={{ flex: 1.6, height: 380 }} />
              <span className="skel" style={{ width: 400, height: 380 }} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {viewState === 'empty' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <CreditCard size={64} color="#6366F1" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#131B2E', letterSpacing: -0.4 }}>
                Nothing in earnings &amp; settlement yet.
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                New orders and settled transactions appear here the moment fulfillment occurs.
              </span>
              <button
                type="button"
                className="sk-vs-btn-download"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                Reload statement
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
                Couldn’t load earnings &amp; settlement
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                This is on our side, not yours — nothing was lost. We tried 3 times.
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-vs-btn-download">
                  Try again
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-vs-btn-download">
                  Back to Hub
                </button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6E6C82' }}>
                Ref ERR-503 · VendorSettlement
              </span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header matching VendorSettlement.html */}
            <div className="sk-vs-header">
              <div className="sk-vs-header-left">
                <h1 className="sk-vs-title">Earnings &amp; settlement</h1>
                <span className="sk-vs-subtitle">
                  Campus Pharmacy · VNR VJIET · September 2026
                </span>
              </div>

              <button
                type="button"
                className="sk-vs-btn-download"
                onClick={handleDownloadStatement}
                aria-label="Download statement"
              >
                <Download size={16} color="#464555" />
                <span>Download statement</span>
              </button>
            </div>

            {/* 4 Top Stat Tiles matching VendorSettlement.html */}
            <div className="sk-vs-tiles-grid">
              {tiles.map((tile) => {
                const toneClass =
                  tile.tone === 'good'
                    ? 'is-good'
                    : tile.tone === 'muted'
                    ? 'is-muted'
                    : tile.tone === 'warn'
                    ? 'is-warn'
                    : '';

                return tile.label === 'HELD' ? (
                  <button
                    key={tile.label}
                    type="button"
                    className="sk-vs-tile-card"
                    style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                    onClick={() => setIsDisputesModalOpen(true)}
                    aria-label={`${tile.label}: ${tile.value}`}
                  >
                    <span className="sk-vs-tile-label">{tile.label}</span>
                    <span className={`sk-vs-tile-value ${toneClass}`}>{tile.value}</span>
                    <span className="sk-vs-tile-meta">{tile.meta}</span>
                    <span
                      style={{
                        marginTop: 4,
                        display: 'inline-block',
                        background: '#FEF3C7',
                        color: '#92400E',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      Review held orders
                    </span>
                  </button>
                ) : (
                  <div
                    key={tile.label}
                    className="sk-vs-tile-card"
                  >
                    <span className="sk-vs-tile-label">{tile.label}</span>
                    <span className={`sk-vs-tile-value ${toneClass}`}>{tile.value}</span>
                    <span className="sk-vs-tile-meta">{tile.meta}</span>
                  </div>
                );
              })}
            </div>

            {/* Lower Section Split matching VendorSettlement.html */}
            <div className="sk-vs-lower-split">
              {/* Weekly Chart Card on Left */}
              <div className="sk-vs-chart-card">
                <div className="sk-vs-chart-top">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="sk-vs-chart-title">Net payable by week</span>
                    <span className="sk-vs-chart-subtitle">Gross less platform commission, before tax</span>
                  </div>
                  <div className="sk-vs-legend">
                    <span className="sk-vs-legend-item">
                      <span className="sk-vs-legend-box" style={{ background: '#4F46E5' }} />
                      <span>Settled</span>
                    </span>
                    <span className="sk-vs-legend-item">
                      <span className="sk-vs-legend-box" style={{ background: '#C7D2FE' }} />
                      <span>Pending</span>
                    </span>
                  </div>
                </div>

                {/* 5-Week Bar Chart */}
                <div className="sk-vs-bars-row" role="img" aria-label="Weekly net payable bar chart">
                  {bars.map((bar) => (
                    <button
                      key={bar.label}
                      type="button"
                      className="sk-vs-bar-col"
                      onClick={() => setSelectedBar(selectedBar === bar.label ? null : bar.label)}
                      aria-label={`Inspect ${bar.label}: ${bar.value}`}
                      style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}
                    >
                      <span className="sk-vs-bar-val">{bar.value}</span>
                      <div
                        className="sk-vs-bar-fill"
                        style={{
                          height: `${bar.h}%`,
                          background: bar.settled ? '#4F46E5' : '#C7D2FE',
                        }}
                        title={`${bar.label}: ${bar.value} (${bar.orders} orders fulfilled)`}
                      />
                      <span className="sk-vs-bar-label">{bar.label}</span>
                    </button>
                  ))}
                </div>

                {selectedBar && (
                  <div style={{ padding: '10px 14px', background: '#F1F5F9', borderRadius: 10, fontSize: 12.5, color: '#334155' }}>
                    Week {selectedBar}: Detailed ledger reconciled with campus payment gateway.
                  </div>
                )}
              </div>

              {/* Right Stack matching VendorSettlement.html */}
              <div className="sk-vs-right-stack">
                {/* THIS CYCLE Card */}
                <div className="sk-vs-cycle-card">
                  <span className="sk-vs-cycle-title">THIS CYCLE</span>
                  {lines.map((l) => {
                    const toneClass = l.tone === 'good' ? 'is-good' : l.tone === 'warn' ? 'is-warn' : '';
                    return (
                      <div key={l.label} className="sk-vs-line-row">
                        <span className="sk-vs-line-label">{l.label}</span>
                        <span className={`sk-vs-line-value ${toneClass}`}>{l.value}</span>
                      </div>
                    );
                  })}
                  <div className="sk-vs-divider" />
                  <div className="sk-vs-net-row">
                    <span className="sk-vs-net-label">Net payable</span>
                    <span className="sk-vs-net-amount">{isTest ? '₹38,412' : '—'}</span>
                  </div>
                  <span className="sk-vs-settle-badge">
                    {isTest ? 'Settles 01 Oct · UCO Bank ••4417' : 'Pending bank account connection'}
                  </span>
                </div>

                {/* FULFILMENT SLA Card */}
                <div className="sk-vs-sla-card">
                  <span className="sk-vs-cycle-title">FULFILMENT SLA</span>
                  {slas.map((s) => (
                    <div key={s.label} className="sk-vs-sla-row">
                      <div className="sk-vs-sla-top">
                        <span className="sk-vs-sla-name">{s.label}</span>
                        <span className="sk-vs-sla-rate" style={{ color: s.good ? '#047857' : '#D97706' }}>
                          {s.value}
                        </span>
                      </div>
                      <div className="sk-vs-sla-track" aria-hidden="true">
                        <div
                          className="sk-vs-sla-fill"
                          style={{
                            width: `${s.fill}%`,
                            background: s.good ? '#047857' : '#C87A3E',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <span className="sk-vs-sla-note">
                    A breach reduces your share of routed orders. It never affects what a student pays.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Disputed / Held Orders Modal */}
      {isDisputesModalOpen && (
        <div className="sk-vs-backdrop" role="dialog" aria-modal="true" aria-labelledby="disputes-modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sk-vs-modal-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#B45309', letterSpacing: 1.1 }}>
                  SETTLEMENT HOLDS &amp; DISPUTES
                </span>
                <h3 id="disputes-modal-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#131B2E' }}>
                  Orders In Review ({disputedOrders.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDisputesModalOpen(false)}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4 }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
              Disputed funds are held in escrow until student confirmation or proof of delivery (POD) resolution.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
              {disputedOrders.map((d) => (
                <div key={d.id} style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#131B2E' }}>{d.id} · {d.student}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#E11D48' }}>{d.amount}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#475569' }}>{d.items}</span>
                  <span style={{ fontSize: 11.5, color: '#B45309', fontWeight: 600 }}>Reason: {d.reason}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 10.5, color: '#94A3B8' }}>{d.date}</span>
                    <button
                      type="button"
                      onClick={() => handleResolveDispute(d.id)}
                      style={{
                        background: '#4F46E5',
                        color: '#FFFFFF',
                        border: 0,
                        borderRadius: 8,
                        height: 28,
                        padding: '0 10px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Submit POD &amp; Release
                    </button>
                  </div>
                </div>
              ))}
              {disputedOrders.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#047857' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 6px' }} />
                  <strong>All held orders have been resolved!</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                className="sk-vs-btn-download"
                onClick={() => setIsDisputesModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorSettlementScreen;
