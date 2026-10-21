import React, { useMemo, useState } from 'react';
import { pressable } from '@/lib/a11y/pressable';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Package,
  Plus,
  RefreshCw,
  Scan,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/vendorHandover.css';

export interface HandoverRecord {
  id: string;
  orderNumber: string;
  collector: string;
  isCollectorNamedFriend?: boolean;
  isProxyRefused?: boolean;
  contents: string;
  hasPrescription: boolean;
  otpStatus: '······ verified' | '······ awaiting' | 'Refused' | 'Expired after 30 min';
  stateLabel: string;
  stateType: 'green' | 'indigo' | 'red' | 'amber';
  studentName: string;
  roomOrHostel: string;
  timeString?: string;
  bagPhotoTaken?: boolean;
  refusalReason?: string;
}

const INITIAL_HANDOVERS: HandoverRecord[] = [
  {
    id: 'h-1',
    orderNumber: '#SK-40218',
    collector: 'Student · B-214',
    contents: '2 items, 1 prescription-only',
    hasPrescription: true,
    otpStatus: '······ verified',
    stateLabel: 'Handed over 16:04',
    stateType: 'green',
    studentName: 'Krishna C.',
    roomOrHostel: 'Block B-214',
    timeString: '16:04',
    bagPhotoTaken: true,
  },
  {
    id: 'h-2',
    orderNumber: '#SK-40217',
    collector: 'Student · C-108',
    contents: '1 item, OTC',
    hasPrescription: false,
    otpStatus: '······ awaiting',
    stateLabel: 'At counter',
    stateType: 'indigo',
    studentName: 'Aarav S.',
    roomOrHostel: 'Block C-108',
    timeString: '16:15',
  },
  {
    id: 'h-3',
    orderNumber: '#SK-40219',
    collector: 'Friend · named by student',
    isCollectorNamedFriend: true,
    contents: '1 item, OTC',
    hasPrescription: false,
    otpStatus: '······ verified',
    stateLabel: 'Handed over 15:40',
    stateType: 'green',
    studentName: 'Diya R.',
    roomOrHostel: 'Block D-042',
    timeString: '15:40',
    bagPhotoTaken: true,
  },
  {
    id: 'h-4',
    orderNumber: '#SK-40216',
    collector: 'Friend · not named',
    isProxyRefused: true,
    contents: '3 items, 1 prescription-only',
    hasPrescription: true,
    otpStatus: 'Refused',
    stateLabel: 'Prescription cannot be proxied',
    stateType: 'red',
    studentName: 'Rahul M.',
    roomOrHostel: 'Block A-331',
    refusalReason: 'Schedule H prescription medicine. Law and platform safety strictly prohibit proxy collection without named verification.',
  },
  {
    id: 'h-5',
    orderNumber: '#SK-40212',
    collector: 'Student · A-331',
    contents: '1 item',
    hasPrescription: false,
    otpStatus: 'Expired after 30 min',
    stateLabel: 'Re-issue requested',
    stateType: 'amber',
    studentName: 'Ananya P.',
    roomOrHostel: 'Block A-331',
    refusalReason: 'OTP expired after 30 minutes standing at queue. Student must tap Re-generate OTP in Health Vault.',
  },
];

export const DEMO_HANDOVERS: HandoverRecord[] = INITIAL_HANDOVERS;

const OTP_STATUS_KEY: Record<HandoverRecord['otpStatus'], MessageKey> = {
  '······ verified': 'partner.vcon.handover.otp.verified',
  '······ awaiting': 'partner.vcon.handover.otp.awaiting',
  Refused: 'partner.vcon.handover.otp.refused',
  'Expired after 30 min': 'partner.vcon.handover.otp.expired',
};

export interface CounterOrder {
  id: string;
  studentName: string;
  meta: string;
  verified: boolean;
  rxMatches: boolean;
  bagPhotoDone: boolean;
  handedOver: boolean;
}

export const DEMO_COUNTER_ORDER: CounterOrder = {
  id: 'SK-48120',
  studentName: 'Krishna C.',
  meta: 'Verified 4:12 pm · photo matched · 2 items, 1 prescription-only',
  verified: true,
  rxMatches: true,
  bagPhotoDone: false,
  handedOver: false,
};

export interface VendorHandoverScreenProps {
  initialHandovers?: HandoverRecord[];
  initialCounterOrder?: CounterOrder | null;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorHandoverScreen({ initialHandovers, initialCounterOrder, onNavigate }: VendorHandoverScreenProps) {
  const { user } = useAuth();
  const t = useT();

  // No handover API is wired to this screen: it starts empty unless a caller passes records.
  const [handovers, setHandovers] = useState<HandoverRecord[]>(() => initialHandovers ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'counter' | 'handed-over' | 'refused' | 'expired'>('all');
  const [selectedRecord, setSelectedRecord] = useState<HandoverRecord | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isNewHandoverModalOpen, setIsNewHandoverModalOpen] = useState(false);
  const [bagPhotoCaptured, setBagPhotoCaptured] = useState(false);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Counter order is only present when a caller provides one.
  const [counterOrder, setCounterOrder] = useState<CounterOrder | null>(() => initialCounterOrder ?? null);

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

  // KPIs calculation
  const handoversToday = useMemo(() => {
    return handovers.filter((h) => h.stateType === 'green').length + (counterOrder?.handedOver ? 1 : 0);
  }, [handovers, counterOrder?.handedOver]);

  const refusedCount = useMemo(() => {
    return handovers.filter((h) => h.stateType === 'red').length;
  }, [handovers]);

  const expiredCount = useMemo(() => {
    return handovers.filter((h) => h.stateType === 'amber').length;
  }, [handovers]);

  // Filtered list
  const filteredHandovers = useMemo(() => {
    return handovers.filter((item) => {
      const matchesSearch =
        item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.collector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.roomOrHostel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contents.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'counter') return item.stateType === 'indigo';
      if (statusFilter === 'handed-over') return item.stateType === 'green';
      if (statusFilter === 'refused') return item.stateType === 'red';
      if (statusFilter === 'expired') return item.stateType === 'amber';
      return true;
    });
  }, [handovers, searchQuery, statusFilter]);

  // There is no server to sync with yet; say so instead of pretending.
  const handleReload = () => {
    setViewState('data');
    showToast(t('partner.vcon.handover.toastNoSync'));
  };

  // Counter order Photo & Handover submission
  const handleConfirmCounterHandover = () => {
    if (!counterOrder) return;
    if (!bagPhotoCaptured) {
      setOtpError(t('partner.vcon.handover.errSeal'));
      return;
    }
    if (inputOtp.length !== 6) {
      setOtpError(t('partner.vcon.handover.errOtp'));
      return;
    }

    setCounterOrder((prev) => (prev ? {
      ...prev,
      bagPhotoDone: true,
      handedOver: true,
    } : null));

    // Add to completed records
    const newRecord: HandoverRecord = {
      id: `h-${Date.now()}`,
      orderNumber: `#${counterOrder.id}`,
      collector: t('partner.vcon.handover.collectorStudent', { name: counterOrder.studentName }),
      contents: '—',
      hasPrescription: true,
      otpStatus: '······ verified',
      stateLabel: t('partner.vcon.handover.handedOverAt', { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
      stateType: 'green',
      studentName: counterOrder.studentName,
      roomOrHostel: '—',
      timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bagPhotoTaken: true,
    };

    setHandovers((prev) => [newRecord, ...prev]);
    setIsPhotoModalOpen(false);
    setInputOtp('');
    setOtpError('');
    setBagPhotoCaptured(false);
    showToast(t('partner.vcon.handover.toastHandedLocal', { id: counterOrder.id }));
  };

  // Re-issue OTP for expired order
  const handleReissueOtp = (orderId: string) => {
    setHandovers((prev) =>
      prev.map((item) => {
        if (item.id === orderId) {
          return {
            ...item,
            otpStatus: '······ awaiting',
            stateLabel: t('partner.vcon.handover.stateReissued'),
            stateType: 'indigo',
          };
        }
        return item;
      })
    );
    setSelectedRecord(null);
    showToast(t('partner.vcon.handover.toastReissueLocal'));
  };

  // Manual fast counter handover
  const handleQuickOtpVerify = (orderId: string) => {
    setHandovers((prev) =>
      prev.map((item) => {
        if (item.id === orderId) {
          return {
            ...item,
            otpStatus: '······ verified',
            stateLabel: t('partner.vcon.handover.handedOverAt', { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
            stateType: 'green',
            timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            bagPhotoTaken: true,
          };
        }
        return item;
      })
    );
    setSelectedRecord(null);
    showToast(t('partner.vcon.handover.toastQuickLocal'));
  };

  return (
    <div className="sk-handover-layout">
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
            background: 'var(--sk-color-text)',
            color: 'var(--sk-color-surface)',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: 'var(--sk-shadow-float)',
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

      {/* Main Content Area */}
      <main className="sk-handover-main">
        {/* Skeleton Loading State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vcon.handover.loadingAria')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
              <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vcon.handover.errorTitle')}</span>
              <span style={{ fontSize: 14, lineHeight: '1.55', fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vcon.console.errorBody')}
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
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-handover-header">
              <div className="sk-handover-header-title">
                <h1>{t('partner.vcon.handover.title')}</h1>
                <span>
                  {user?.fullName
                    ? t('partner.vcon.handover.subNamed', { name: user.fullName })
                    : t('partner.vcon.handover.sub')}
                </span>
              </div>
              <div style={{ flexGrow: 1 }} />
              <div className="sk-handover-alert-badge">
                <span className="sk-handover-pulse-dot" />
                <span>{t('partner.vcon.handover.refusedBadge', { count: refusedCount })}</span>
              </div>
            </div>

            {/* At Counter Spotlight Card */}
            {counterOrder ? (
              <section className="sk-handover-counter-card" aria-label={t('partner.vcon.handover.counterTag')}>
                <div className="sk-handover-avatar-wrap">
                  <div className="sk-handover-avatar">
                    {counterOrder.studentName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="sk-handover-avatar-check">
                    <Check size={11} strokeWidth={3.6} color="var(--sk-color-on-action)" aria-hidden="true" />
                  </div>
                </div>
                <div className="sk-handover-counter-info">
                  <span className="sk-handover-counter-tag">{t('partner.vcon.handover.counterTag')}</span>
                  <span className="sk-handover-counter-name">
                    {t('partner.vcon.handover.counterName', { name: counterOrder.studentName, id: counterOrder.id })}
                  </span>
                  <span className="sk-handover-counter-meta">{counterOrder.meta}</span>
                </div>
                <div className="sk-handover-pills-row">
                  {/* Pills reflect the order's own flags — never a hard-coded tick. */}
                  <span className={`sk-handover-pill ${counterOrder.verified ? 'sk-handover-pill-green' : 'sk-handover-pill-grey'}`}>
                    {counterOrder.verified ? '✓ ' : '○ '}{t('partner.vcon.handover.pillVerified')}
                  </span>
                  <span className={`sk-handover-pill ${counterOrder.rxMatches ? 'sk-handover-pill-green' : 'sk-handover-pill-grey'}`}>
                    {counterOrder.rxMatches ? '✓ ' : '○ '}{t('partner.vcon.handover.pillRx')}
                  </span>
                  <span className={`sk-handover-pill ${counterOrder.bagPhotoDone ? 'sk-handover-pill-green' : 'sk-handover-pill-indigo'}`}>
                    {counterOrder.bagPhotoDone ? '✓ ' : '● '}{t('partner.vcon.handover.pillSeal')}
                  </span>
                  <span className={`sk-handover-pill ${counterOrder.handedOver ? 'sk-handover-pill-green' : 'sk-handover-pill-grey'}`}>
                    {counterOrder.handedOver ? '✓ ' : '○ '}{t('partner.vcon.handover.pillHanded')}
                  </span>
                </div>
                <div className="sk-handover-counter-actions">
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    onClick={() => setIsPhotoModalOpen(true)}
                    disabled={counterOrder.handedOver}
                  >
                    <Camera size={16} aria-hidden="true" />
                    <span>{counterOrder.handedOver ? t('partner.vcon.handover.completed') : t('partner.vcon.handover.handOver')}</span>
                  </button>
                  <button
                    type="button"
                    className="sk-handover-btn-secondary"
                    onClick={() => handleNavClick('scan-verify')}
                  >
                    <span>{t('partner.vcon.handover.verifyNext')}</span>
                  </button>
                </div>
              </section>
            ) : (
              <section className="sk-handover-counter-card" aria-label={t('partner.vcon.handover.standbyTag')} style={{ background: 'var(--sk-color-surface-2)', border: '1.5px dashed var(--sk-color-rule-strong)' }}>
                <div className="sk-handover-avatar-wrap">
                  <div className="sk-handover-avatar" style={{ background: 'var(--sk-color-rule)', color: 'var(--sk-color-text-3)' }}>—</div>
                </div>
                <div className="sk-handover-counter-info">
                  <span className="sk-handover-counter-tag" style={{ color: 'var(--sk-color-text-3)' }}>{t('partner.vcon.handover.standbyTag')}</span>
                  <span className="sk-handover-counter-name" style={{ color: 'var(--sk-color-text-2)' }}>
                    {t('partner.vcon.handover.standbyTitle')}
                  </span>
                  <span className="sk-handover-counter-meta">
                    {t('partner.vcon.handover.standbyBody')}
                  </span>
                </div>
                <div className="sk-handover-counter-actions" style={{ marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    onClick={() => handleNavClick('scan-verify')}
                  >
                    <Scan size={16} aria-hidden="true" />
                    <span>{t('partner.vcon.handover.scanPass')}</span>
                  </button>
                </div>
              </section>
            )}

            {/* KPI Metric Cards */}
            <div className="sk-handover-kpis">
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val">{handoversToday}</span>
                <span className="sk-handover-kpi-lbl">{t('partner.vcon.handover.kpiToday')}</span>
              </div>
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val is-red">{refusedCount}</span>
                <span className="sk-handover-kpi-lbl">{t('partner.vcon.handover.filterRefused')}</span>
              </div>
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val is-amber">{expiredCount}</span>
                <span className="sk-handover-kpi-lbl">{t('partner.vcon.handover.kpiExpired')}</span>
              </div>
              <div className="sk-handover-kpi-card">
                {/* No handover OTP service exists to read a validity window from. */}
                <span className="sk-handover-kpi-val">—</span>
                <span className="sk-handover-kpi-lbl">{t('partner.vcon.handover.kpiValidity')}</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="sk-handover-controls">
              <div className="sk-handover-search-wrap">
                <Search size={16} className="sk-handover-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="sk-handover-search-input"
                  placeholder={t('partner.vcon.handover.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('partner.vcon.handover.searchAria')}
                />
              </div>

              <div className="sk-handover-filter-tabs">
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  {t('partner.vcon.handover.filterAll', { count: handovers.length })}
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'counter' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('counter')}
                >
                  {t('partner.vcon.handover.filterCounter')}
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'handed-over' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('handed-over')}
                >
                  {t('partner.vcon.handover.filterHanded')}
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'refused' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('refused')}
                >
                  {t('partner.vcon.handover.filterRefused')}
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'expired' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('expired')}
                >
                  {t('partner.vcon.handover.filterExpired')}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                  onClick={handleReload}
                  title={t('partner.vcon.handover.sync')}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  <span>{t('partner.vcon.handover.sync')}</span>
                </button>
                <button
                  type="button"
                  className="sk-handover-btn-primary"
                  style={{ height: 34, padding: '0 14px', fontSize: 12 }}
                  onClick={() => setIsNewHandoverModalOpen(true)}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{t('partner.vcon.handover.newHandover')}</span>
                </button>
              </div>
            </div>

            {/* Handover Records Table Card */}
            <div className="sk-handover-table-card">
              <div className="sk-handover-table-header">
                <span className="sk-handover-th">{t('partner.vcon.handover.th.order')}</span>
                <span className="sk-handover-th">{t('partner.vcon.handover.th.collector')}</span>
                <span className="sk-handover-th">{t('partner.vcon.handover.th.contents')}</span>
                <span className="sk-handover-th">{t('partner.vcon.handover.th.otp')}</span>
                <span className="sk-handover-th" style={{ justifySelf: 'end' }}>
                  {t('partner.vcon.handover.th.state')}
                </span>
              </div>

              {filteredHandovers.length === 0 ? (
                /* Empty state */
                <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Package size={48} color="var(--sk-color-text-3)" aria-hidden="true" />
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vcon.handover.emptyTitle')}</span>
                  <span style={{ fontSize: 13, color: 'var(--sk-color-text-2)', maxWidth: 360 }}>
                    {searchQuery ? t('partner.vcon.handover.emptySearch') : t('partner.vcon.handover.notConnected')}
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
                      {t('partner.vcon.clearSearch')}
                    </button>
                  )}
                </div>
              ) : (
                filteredHandovers.map((item) => (
                  <div
                    key={item.id}
                    className="sk-handover-table-row"
                    onClick={() => setSelectedRecord(item)}
                    role="button"
                    tabIndex={0}
                    aria-label={t('partner.vcon.handover.rowAria', { order: item.orderNumber })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRecord(item);
                      }
                    }}
                  >
                    <span className="sk-handover-col-order">{item.orderNumber}</span>
                    <span className={`sk-handover-col-collector ${item.isProxyRefused ? 'is-danger' : ''}`}>
                      {item.collector}
                    </span>
                    <span className="sk-handover-col-contents">{item.contents}</span>
                    <span className={`sk-handover-col-otp ${item.isProxyRefused ? 'is-danger' : ''}`}>
                      {t(OTP_STATUS_KEY[item.otpStatus])}
                    </span>
                    <span className={`sk-handover-status-badge ${item.stateType}`}>
                      {item.stateLabel}
                    </span>
                  </div>
                ))
              )}

              {/* Statutory Legal & Safety Notice */}
              <div className="sk-handover-rule-notice">
                {t('partner.vcon.handover.rule')}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Photo & Handover Confirmation */}
      {isPhotoModalOpen && counterOrder && (
        <div className="sk-handover-modal-backdrop" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="sk-handover-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-handover-title">
            <div className="sk-handover-modal-title">
              <h2 id="modal-handover-title">{t('partner.vcon.handover.modalTitle', { id: counterOrder.id })}</h2>
              <button type="button" className="sk-handover-close-btn" onClick={() => setIsPhotoModalOpen(false)} aria-label={t('partner.vcon.closeDialog')}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--sk-color-surface-2)', padding: 14, borderRadius: 12, border: '1px solid var(--sk-color-rule)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('partner.vcon.handover.modalStudent', { name: counterOrder.studentName })}</span>
                <span style={{ fontSize: 12, color: 'var(--sk-color-text-3)' }}>{counterOrder.meta}</span>
                {counterOrder.verified ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sk-color-positive)' }}>✓ {t('partner.vcon.handover.modalIdOk')}</span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sk-color-danger)' }}>{t('partner.vcon.handover.modalIdMissing')}</span>
                )}
              </div>

              {/* Step 1: Camera photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                  {t('partner.vcon.handover.step1')}
                </label>
                <div
                  style={{
                    height: 140,
                    borderRadius: 12,
                    border: '2px dashed var(--sk-color-rule-strong)',
                    background: bagPhotoCaptured ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-surface-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                  {...pressable(() => setBagPhotoCaptured(true), t('partner.vcon.handover.sealTap'))}
                >
                  {bagPhotoCaptured ? (
                    <>
                      <CheckCircle2 size={32} color="var(--sk-color-positive)" aria-hidden="true" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-positive)' }}>{t('partner.vcon.handover.sealDone')}</span>
                      <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)' }}>{t('partner.vcon.handover.sealNoPhoto')}</span>
                    </>
                  ) : (
                    <>
                      <Camera size={30} color="var(--sk-color-text-3)" aria-hidden="true" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-action)' }}>{t('partner.vcon.handover.sealTap')}</span>
                      <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)' }}>{t('partner.vcon.handover.sealNoPhoto')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Step 2: 6-digit OTP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="student-otp-input" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                  {t('partner.vcon.handover.step2')}
                </label>
                <input
                  id="student-otp-input"
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="123456"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    border: '1.5px solid var(--sk-color-rule-strong)',
                    fontSize: 20,
                    letterSpacing: 8,
                    textAlign: 'center',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)' }}>
                  {t('partner.vcon.handover.otpNotChecked')}
                </span>
              </div>

              {otpError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)', fontSize: 12, fontWeight: 600 }}>
                  {otpError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsPhotoModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="sk-handover-btn-primary"
                  style={{ flex: 1.5 }}
                  onClick={handleConfirmCounterHandover}
                >
                  {t('partner.vcon.handover.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Row Record Inspection */}
      {selectedRecord && (
        <div className="sk-handover-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="sk-handover-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-audit-title">
            <div className="sk-handover-modal-title">
              <h2 id="modal-audit-title">{t('partner.vcon.handover.detailTitle', { order: selectedRecord.orderNumber })}</h2>
              <button type="button" className="sk-handover-close-btn" onClick={() => setSelectedRecord(null)} aria-label={t('partner.vcon.closeDialog')}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.handover.dStudent')}</span>
                  <strong style={{ fontSize: 14, color: 'var(--sk-color-text)' }}>{selectedRecord.studentName}</strong>
                </div>
                <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.handover.dRoom')}</span>
                  <strong style={{ fontSize: 14, color: 'var(--sk-color-text)' }}>{selectedRecord.roomOrHostel}</strong>
                </div>
              </div>

              <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.handover.dCollector')}</span>
                <strong style={{ fontSize: 14, color: selectedRecord.isProxyRefused ? 'var(--sk-color-danger)' : 'var(--sk-color-text)' }}>
                  {selectedRecord.collector}
                </strong>
                {selectedRecord.isCollectorNamedFriend && (
                  <span style={{ fontSize: 11, color: 'var(--sk-color-positive)', display: 'block', marginTop: 2 }}>
                    ✓ {t('partner.vcon.handover.dNamedFriend')}
                  </span>
                )}
              </div>

              <div style={{ background: 'var(--sk-color-surface-2)', padding: 12, borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block' }}>{t('partner.vcon.handover.dContents')}</span>
                <strong style={{ fontSize: 13, color: 'var(--sk-color-text)' }}>{selectedRecord.contents}</strong>
              </div>

              {selectedRecord.refusalReason && (
                <div style={{ background: 'var(--sk-color-danger-bg)', border: '1px solid var(--sk-color-danger)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-danger)', display: 'block' }}>
                    {t('partner.vcon.handover.dReason')}
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--sk-color-danger)', lineHeight: 1.4 }}>
                    {selectedRecord.refusalReason}
                  </p>
                </div>
              )}

              {/* Action buttons based on record status */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {selectedRecord.stateType === 'indigo' && (
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleQuickOtpVerify(selectedRecord.id)}
                  >
                    {t('partner.vcon.handover.markHanded')}
                  </button>
                )}

                {selectedRecord.stateType === 'amber' && (
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleReissueOtp(selectedRecord.id)}
                  >
                    {t('partner.vcon.handover.reissue')}
                  </button>
                )}

                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedRecord(null)}
                >
                  {t('partner.vcon.closeDialog')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Process New Handover */}
      {isNewHandoverModalOpen && (
        <div className="sk-handover-modal-backdrop" onClick={() => setIsNewHandoverModalOpen(false)}>
          <div className="sk-handover-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-new-title">
            <div className="sk-handover-modal-title">
              <h2 id="modal-new-title">{t('partner.vcon.handover.newTitle')}</h2>
              <button type="button" className="sk-handover-close-btn" onClick={() => setIsNewHandoverModalOpen(false)} aria-label={t('partner.vcon.closeDialog')}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const ord = (form.elements.namedItem('orderInput') as HTMLInputElement).value;
                const isProxy = (form.elements.namedItem('proxyCheckbox') as HTMLInputElement).checked;

                // No order lookup exists yet: say nothing was checked rather than imply it was.
                showToast(
                  isProxy
                    ? t('partner.vcon.handover.toastLookupProxy', { order: ord })
                    : t('partner.vcon.handover.toastLookup', { order: ord }),
                );
                setIsNewHandoverModalOpen(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label htmlFor="handover-order-input" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text)', display: 'block', marginBottom: 4 }}>
                  {t('partner.vcon.handover.fOrder')}
                </label>
                <input
                  id="handover-order-input"
                  name="orderInput"
                  required
                  placeholder="#SK-00000"
                  style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid var(--sk-color-rule-strong)', padding: '0 12px', fontSize: 13 }}
                />
              </div>

              <div>
                <label htmlFor="handover-collector-input" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text)', display: 'block', marginBottom: 4 }}>
                  {t('partner.vcon.handover.fCollector')}
                </label>
                <input
                  id="handover-collector-input"
                  name="collectorInput"
                  required
                  placeholder={t('partner.vcon.handover.fCollectorPh')}
                  style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid var(--sk-color-rule-strong)', padding: '0 12px', fontSize: 13 }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--sk-color-text-2)', cursor: 'pointer', minHeight: 44 }}>
                <input type="checkbox" name="proxyCheckbox" style={{ width: 20, height: 20 }} />
                <span>{t('partner.vcon.handover.fProxy')}</span>
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="sk-handover-btn-secondary" style={{ flex: 1 }} onClick={() => setIsNewHandoverModalOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="sk-handover-btn-primary" style={{ flex: 1 }}>
                  {t('partner.vcon.handover.lookup')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
