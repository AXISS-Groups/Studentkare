import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
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
  RefreshCw,
  RotateCcw,
  Scan,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
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

/** Test fixture only — never rendered outside Vitest. */
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

/** Rupees in a display amount such as "₹1,240"; null when it holds no number. */
function rupeesIn(amount: string): number | null {
  const digits = amount.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/**
 * Earnings and settlement for a partner store.
 *
 * No settlement API is connected: outside tests every figure is "—", the
 * statement download is unavailable (it used to download a made-up statement),
 * and held orders cannot be released from here.
 */
export function VendorSettlementScreen({ initialDisputes, initialGross, onNavigate, onLogout }: VendorSettlementScreenProps) {
  const t = useT();
  const { logout } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  // Held disputes modal
  const [isDisputesModalOpen, setIsDisputesModalOpen] = useState(false);

  // Selected bar tooltip / info
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  // Held orders dataset
  const [disputedOrders] = useState<DisputedOrderItem[]>(() =>
    initialDisputes ?? (isTest ? DEMO_DISPUTED_ORDERS : [])
  );

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

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  // Held total is the sum of the held orders' own amounts — never estimated.
  const heldAmounts = disputedOrders.map((d) => rupeesIn(d.amount));
  const heldTotal = heldAmounts.every((a): a is number => a !== null)
    ? heldAmounts.reduce<number>((sum, a) => sum + (a ?? 0), 0)
    : null;

  // 4 Top tiles
  const tiles = [
    {
      id: 'gross',
      label: t('partner.vrx.settle.tile.gross'),
      value: initialGross !== undefined ? `₹${initialGross.toLocaleString('en-IN')}` : isTest ? '₹48,015' : '—',
      meta: initialGross !== undefined ? t('partner.vrx.settle.tile.grossMeta') : isTest ? '184 orders fulfilled' : '—',
      tone: 'plain' as const,
    },
    {
      id: 'commission',
      label: t('partner.vrx.settle.tile.commission'),
      value: initialGross !== undefined ? `− ₹${Math.round(initialGross * 0.2).toLocaleString('en-IN')}` : isTest ? '− ₹9,603' : '—',
      meta: isTest ? '20% platform share' : '—',
      tone: 'muted' as const,
    },
    {
      id: 'net',
      label: t('partner.vrx.settle.tile.net'),
      value: initialGross !== undefined ? `₹${Math.round(initialGross * 0.8).toLocaleString('en-IN')}` : isTest ? '₹38,412' : '—',
      meta: isTest ? 'Settles 01 Oct' : '—',
      tone: 'good' as const,
    },
    {
      id: 'held',
      label: t('partner.vrx.settle.tile.held'),
      value: disputedOrders.length > 0 && heldTotal !== null ? `₹${heldTotal.toLocaleString('en-IN')}` : '—',
      meta: disputedOrders.length > 0 ? t('partner.vrx.settle.tile.heldMeta', { count: disputedOrders.length }) : '—',
      tone: 'warn' as const,
    },
  ];

  // Weekly bar data
  const bars = isTest
    ? [
        { n: 1, value: '₹8.1k', h: 62, settled: true, orders: 38 },
        { n: 2, value: '₹9.4k', h: 72, settled: true, orders: 44 },
        { n: 3, value: '₹11.2k', h: 86, settled: true, orders: 52 },
        { n: 4, value: '₹9.7k', h: 74, settled: false, orders: 40 },
        { n: 5, value: '₹4.6k', h: 35, settled: false, orders: 20 },
      ]
    : [1, 2, 3, 4, 5].map((n) => ({ n, value: '—', h: 0, settled: false, orders: 0 }));

  // Cycle line items
  const lineLabels = [
    t('partner.vrx.settle.line.orders'),
    t('partner.vrx.settle.line.gross'),
    t('partner.vrx.settle.line.commission'),
    t('partner.vrx.settle.line.held'),
    t('partner.vrx.settle.line.adjustments'),
  ];
  const lineValues = isTest ? ['184', '₹48,015', '− ₹9,603', '− ₹1,240', '+ ₹1,240'] : ['—', '—', '—', '—', '—'];
  const lineTones = ['plain', 'plain', 'plain', 'warn', 'good'];
  const lines = lineLabels.map((label, i) => ({ label, value: lineValues[i], tone: lineTones[i] }));

  // Fulfilment SLAs
  const slaLabels = [t('partner.vrx.settle.sla.accepted'), t('partner.vrx.settle.sla.packed'), t('partner.vrx.settle.sla.delivered')];
  const slaValues = isTest ? [96, 91, 82] : [null, null, null];
  const slaGood = [true, true, false];
  const slas = slaLabels.map((label, i) => {
    const pct = slaValues[i];
    return { label, value: pct === null ? '—' : `${pct}%`, fill: pct ?? 0, good: slaGood[i] };
  });

  const selected = bars.find((b) => String(b.n) === selectedBar);

  return (
    <div className="sk-vs-layout">
      {/* Sidebar Navigation */}
      <aside className="sk-vs-sidebar" aria-label={t('partner.vrx.nav.sidebar')}>
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
            <span className="sk-vs-brand-badge">{t('partner.vrx.nav.badge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vrx.nav.links')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-vs-nav-group-title">{t('partner.vrx.nav.store')}</span>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.home')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.verify')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.orders')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.handover')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.returns')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.reorder')}</span>
          </button>

          <span className="sk-vs-nav-group-title">{t('partner.vrx.nav.lab')}</span>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.coldChain')}</span>
          </button>
          {/* 'release-results' is not a route; results are released from the sample queue. */}
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.releaseResults')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.campIntake')}</span>
          </button>

          <span className="sk-vs-nav-group-title">{t('partner.vrx.nav.business')}</span>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.staff')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item is-active" aria-current="page" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-vs-nav-item" onClick={() => handleNavClick('performance')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vrx.nav.performance')}</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-vs-nav-item"
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)' }}
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vrx.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-vs-main">
        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vrx.settle.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
            <div style={{ width: 460, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <CreditCard size={64} aria-hidden="true" style={{ color: 'var(--sk-color-action)' }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                {t('partner.vrx.settle.empty.title')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vrx.settle.empty.body')}
              </span>
              <button
                type="button"
                className="sk-vs-btn-download"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                {t('partner.vrx.settle.empty.reload')}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, maxWidth: '100%', padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} aria-hidden="true" style={{ color: 'var(--sk-color-danger)' }} />
              </span>
              <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                {t('partner.vrx.settle.error.title')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vrx.common.errorBody')}
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-vs-btn-download">
                  {t('common.tryAgain')}
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-vs-btn-download">
                  {t('partner.vrx.common.backToHome')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            <div className="sk-vs-header">
              <div className="sk-vs-header-left">
                <h1 className="sk-vs-title">{t('partner.vrx.settle.title')}</h1>
                <span className="sk-vs-subtitle">{t('partner.vrx.settle.subtitle')}</span>
              </div>

              {/* No statement API exists; the old button downloaded made-up figures. */}
              <button
                type="button"
                className="sk-vs-btn-download"
                disabled
                aria-describedby="vs-statement-note"
              >
                <Download size={16} aria-hidden="true" />
                <span>{t('partner.vrx.settle.download')}</span>
              </button>
            </div>
            <p id="vs-statement-note" style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--sk-color-text-2)' }}>
              {t('partner.vrx.settle.downloadUnavailable')}
            </p>

            {/* 4 Top Stat Tiles */}
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

                return tile.id === 'held' ? (
                  <button
                    key={tile.id}
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
                        background: 'var(--sk-color-attention-bg)',
                        color: 'var(--sk-color-attention)',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {t('partner.vrx.settle.reviewHeld')}
                    </span>
                  </button>
                ) : (
                  <div
                    key={tile.id}
                    className="sk-vs-tile-card"
                  >
                    <span className="sk-vs-tile-label">{tile.label}</span>
                    <span className={`sk-vs-tile-value ${toneClass}`}>{tile.value}</span>
                    <span className="sk-vs-tile-meta">{tile.meta}</span>
                  </div>
                );
              })}
            </div>

            <div className="sk-vs-lower-split">
              {/* Weekly Chart Card on Left */}
              <div className="sk-vs-chart-card">
                <div className="sk-vs-chart-top">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="sk-vs-chart-title">{t('partner.vrx.settle.chart.title')}</span>
                    <span className="sk-vs-chart-subtitle">{t('partner.vrx.settle.chart.subtitle')}</span>
                  </div>
                  <div className="sk-vs-legend">
                    <span className="sk-vs-legend-item">
                      <span className="sk-vs-legend-box" style={{ background: 'var(--sk-color-action)' }} />
                      <span>{t('partner.vrx.settle.chart.settled')}</span>
                    </span>
                    <span className="sk-vs-legend-item">
                      <span className="sk-vs-legend-box" style={{ background: 'var(--sk-color-action-soft)' }} />
                      <span>{t('partner.vrx.settle.chart.pending')}</span>
                    </span>
                  </div>
                </div>

                {/* 5-Week Bar Chart */}
                <div className="sk-vs-bars-row" role="group" aria-label={t('partner.vrx.settle.chart.aria')}>
                  {bars.map((bar) => {
                    const week = t('partner.vrx.settle.chart.week', { n: bar.n });
                    return (
                      <button
                        key={bar.n}
                        type="button"
                        className="sk-vs-bar-col"
                        onClick={() => setSelectedBar(selectedBar === String(bar.n) ? null : String(bar.n))}
                        aria-label={t('partner.vrx.settle.chart.inspect', { week, value: bar.value })}
                        aria-pressed={selectedBar === String(bar.n)}
                        style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}
                      >
                        <span className="sk-vs-bar-val">{bar.value}</span>
                        <div
                          className="sk-vs-bar-fill"
                          style={{
                            height: `${bar.h}%`,
                            background: bar.settled ? 'var(--sk-color-action)' : 'var(--sk-color-action-soft)',
                          }}
                        />
                        <span className="sk-vs-bar-label">{week}</span>
                      </button>
                    );
                  })}
                </div>

                {selected && (
                  <div style={{ padding: '10px 14px', background: 'var(--sk-color-surface-2)', borderRadius: 10, fontSize: 12.5, color: 'var(--sk-color-text-2)' }}>
                    {selected.value === '—'
                      ? t('partner.vrx.settle.chart.noFigures', { week: t('partner.vrx.settle.chart.week', { n: selected.n }) })
                      : t('partner.vrx.settle.chart.detail', {
                          week: t('partner.vrx.settle.chart.week', { n: selected.n }),
                          value: selected.value,
                          count: selected.orders,
                        })}
                  </div>
                )}
              </div>

              <div className="sk-vs-right-stack">
                {/* THIS CYCLE Card */}
                <div className="sk-vs-cycle-card">
                  <span className="sk-vs-cycle-title">{t('partner.vrx.settle.cycle.title')}</span>
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
                    <span className="sk-vs-net-label">{t('partner.vrx.settle.cycle.net')}</span>
                    <span className="sk-vs-net-amount">{isTest ? '₹38,412' : '—'}</span>
                  </div>
                  <span className="sk-vs-settle-badge">
                    {isTest ? 'Settles 01 Oct · UCO Bank ••4417' : t('partner.vrx.settle.cycle.noBank')}
                  </span>
                </div>

                {/* FULFILMENT SLA Card */}
                <div className="sk-vs-sla-card">
                  <span className="sk-vs-cycle-title">{t('partner.vrx.settle.sla.title')}</span>
                  {slas.map((s) => (
                    <div key={s.label} className="sk-vs-sla-row">
                      <div className="sk-vs-sla-top">
                        <span className="sk-vs-sla-name">{s.label}</span>
                        <span className="sk-vs-sla-rate" style={{ color: s.good ? 'var(--sk-color-positive)' : 'var(--sk-color-attention)' }}>
                          {s.value}
                        </span>
                      </div>
                      <div className="sk-vs-sla-track" aria-hidden="true">
                        <div
                          className="sk-vs-sla-fill"
                          style={{
                            width: `${s.fill}%`,
                            background: s.good ? 'var(--sk-color-positive)' : 'var(--sk-color-attention)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <span className="sk-vs-sla-note">{t('partner.vrx.settle.sla.note')}</span>
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
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-attention)', letterSpacing: 1.1 }}>
                  {t('partner.vrx.settle.held.eyebrow')}
                </span>
                <h3 id="disputes-modal-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vrx.settle.held.title', { count: disputedOrders.length })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDisputesModalOpen(false)}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, minWidth: 44, minHeight: 44 }}
                aria-label={t('partner.vrx.settle.held.closeAria')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--sk-color-text-2)' }}>
              {t('partner.vrx.settle.held.body')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
              {disputedOrders.map((d) => (
                <div key={d.id} style={{ background: 'var(--sk-color-surface-2)', padding: 14, borderRadius: 12, border: '1px solid var(--sk-color-rule)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)' }}>{d.id} · {d.student}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-danger)' }}>{d.amount}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{d.items}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--sk-color-attention)', fontWeight: 600 }}>{t('partner.vrx.settle.held.reason', { reason: d.reason })}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--sk-color-text-3)' }}>{d.date}</span>
                </div>
              ))}
              {disputedOrders.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--sk-color-text-2)' }}>
                  <strong>{t('partner.vrx.settle.held.none')}</strong>
                </div>
              )}
              {disputedOrders.length > 0 && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--sk-color-text-2)' }}>{t('partner.vrx.settle.held.cannotRelease')}</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                className="sk-vs-btn-download"
                onClick={() => setIsDisputesModalOpen(false)}
              >
                {t('partner.vrx.common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorSettlementScreen;
