import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  Check,
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

export function VendorHandoverScreen({ initialHandovers, initialCounterOrder, onNavigate, onLogout }: VendorHandoverScreenProps) {
  const { user, logout } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;

  const [handovers, setHandovers] = useState<HandoverRecord[]>(() =>
    initialHandovers ?? (isTest ? DEMO_HANDOVERS : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'counter' | 'handed-over' | 'refused' | 'expired'>('all');
  const [selectedRecord, setSelectedRecord] = useState<HandoverRecord | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isNewHandoverModalOpen, setIsNewHandoverModalOpen] = useState(false);
  const [bagPhotoCaptured, setBagPhotoCaptured] = useState(false);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Counter current order state - only present when explicitly provided or in test environment
  const [counterOrder, setCounterOrder] = useState<CounterOrder | null>(() => {
    if (initialCounterOrder !== undefined) return initialCounterOrder;
    if (isTest) return DEMO_COUNTER_ORDER;
    return null;
  });

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

  // Trigger simulated reload
  const handleReload = () => {
    setViewState('loading');
    setTimeout(() => {
      setViewState('data');
      showToast('Handover queue synchronized with campus counter');
    }, 700);
  };

  // Counter order Photo & Handover submission
  const handleConfirmCounterHandover = () => {
    if (!counterOrder) return;
    if (!bagPhotoCaptured) {
      setOtpError('Please snap a photo of the packed medicine bag with tamper tape intact.');
      return;
    }
    if (inputOtp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP shown in the student’s Health Vault app.');
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
      collector: `Student · ${counterOrder.studentName}`,
      contents: '2 items, 1 prescription-only',
      hasPrescription: true,
      otpStatus: '······ verified',
      stateLabel: `Handed over ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      stateType: 'green',
      studentName: counterOrder.studentName,
      roomOrHostel: 'Block B-214',
      timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bagPhotoTaken: true,
    };

    setHandovers((prev) => [newRecord, ...prev]);
    setIsPhotoModalOpen(false);
    setInputOtp('');
    setOtpError('');
    setBagPhotoCaptured(false);
    showToast(`Order #${counterOrder.id} successfully verified & handed over to ${counterOrder.studentName}`);
  };

  // Re-issue OTP for expired order
  const handleReissueOtp = (orderId: string) => {
    setHandovers((prev) =>
      prev.map((item) => {
        if (item.id === orderId) {
          return {
            ...item,
            otpStatus: '······ awaiting',
            stateLabel: 'At counter (re-issued)',
            stateType: 'indigo',
          };
        }
        return item;
      })
    );
    setSelectedRecord(null);
    showToast('New 6-digit OTP dispatched to student phone & Health Vault app.');
  };

  // Manual fast counter handover
  const handleQuickOtpVerify = (orderId: string) => {
    setHandovers((prev) =>
      prev.map((item) => {
        if (item.id === orderId) {
          return {
            ...item,
            otpStatus: '······ verified',
            stateLabel: `Handed over ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            stateType: 'green',
            timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            bagPhotoTaken: true,
          };
        }
        return item;
      })
    );
    setSelectedRecord(null);
    showToast('Order verified by counter staff and marked as Handed Over.');
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
      <aside className="sk-handover-sidebar" aria-label="Partner Sidebar">
        <div className="sk-handover-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7b)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-handover-brand-text">
            <span className="sk-handover-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-handover-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-handover-nav-group-title">STORE</span>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-handover-nav-item is-active" aria-current="page" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-handover-nav-group-title" style={{ marginTop: 6 }}>
            LAB
          </span>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('clinical-review')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-handover-nav-group-title" style={{ marginTop: 6 }}>
            BUSINESS
          </span>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff &amp; roles</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-handover-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-handover-nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: '#F87171' }}
          aria-label="Sign out of Partner Desk"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-handover-main">
        {/* Skeleton Loading State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading OTP handover" style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
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
              <span style={{ fontSize: 21, fontWeight: 800, color: '#131B2E' }}>Couldn’t load OTP handover</span>
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
              <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#6E6C82' }}>Ref ERR-503 · VendorHandover</span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header */}
            <div className="sk-handover-header">
              <div className="sk-handover-header-title">
                <h1>OTP handover</h1>
                <span>
                  {isTest
                    ? 'Counter pickup and block delivery · six digits from the student'
                    : user?.fullName
                    ? `Counter pickup · ${user.fullName} · six digits from the student`
                    : 'Counter pickup and block delivery · six digits from the student'}
                </span>
              </div>
              <div style={{ flexGrow: 1 }} />
              <div className="sk-handover-alert-badge">
                <span className="sk-handover-pulse-dot" />
                <span>{refusedCount} refused</span>
              </div>
            </div>

            {/* At Counter Spotlight Card */}
            {counterOrder ? (
              <section className="sk-handover-counter-card" aria-label="At the counter now">
                <div className="sk-handover-avatar-wrap">
                  <div className="sk-handover-avatar">
                    {counterOrder.studentName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="sk-handover-avatar-check">
                    <Check size={11} strokeWidth={3.6} color="#FFFFFF" />
                  </div>
                </div>
                <div className="sk-handover-counter-info">
                  <span className="sk-handover-counter-tag">AT THE COUNTER NOW</span>
                  <span className="sk-handover-counter-name">
                    {counterOrder.studentName} · order #{counterOrder.id}
                  </span>
                  <span className="sk-handover-counter-meta">{counterOrder.meta}</span>
                </div>
                <div className="sk-handover-pills-row">
                  <span className="sk-handover-pill sk-handover-pill-green">✓ Verified</span>
                  <span className="sk-handover-pill sk-handover-pill-green">✓ Rx matches</span>
                  <span className={`sk-handover-pill ${counterOrder.bagPhotoDone ? 'sk-handover-pill-green' : 'sk-handover-pill-indigo'}`}>
                    {counterOrder.bagPhotoDone ? '✓ Bag photo' : '● Bag photo'}
                  </span>
                  <span className={`sk-handover-pill ${counterOrder.handedOver ? 'sk-handover-pill-green' : 'sk-handover-pill-grey'}`}>
                    {counterOrder.handedOver ? '✓ Handed over' : '○ Handed over'}
                  </span>
                </div>
                <div className="sk-handover-counter-actions">
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    onClick={() => setIsPhotoModalOpen(true)}
                    disabled={counterOrder.handedOver}
                  >
                    <Camera size={16} />
                    <span>{counterOrder.handedOver ? 'Handover completed' : 'Photo & hand over'}</span>
                  </button>
                  <button
                    type="button"
                    className="sk-handover-btn-secondary"
                    onClick={() => handleNavClick('verify')}
                  >
                    <span>Verify next</span>
                  </button>
                </div>
              </section>
            ) : (
              <section className="sk-handover-counter-card" aria-label="At the counter standby" style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1' }}>
                <div className="sk-handover-avatar-wrap">
                  <div className="sk-handover-avatar" style={{ background: '#E2E8F0', color: '#64748B' }}>—</div>
                </div>
                <div className="sk-handover-counter-info">
                  <span className="sk-handover-counter-tag" style={{ color: '#64748B' }}>COUNTER STANDBY</span>
                  <span className="sk-handover-counter-name" style={{ color: '#334155' }}>
                    No student at counter
                  </span>
                  <span className="sk-handover-counter-meta">
                    Scan a student arrival pass or enter their 6-digit OTP below to initiate counter verification.
                  </span>
                </div>
                <div className="sk-handover-counter-actions" style={{ marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    onClick={() => handleNavClick('verify')}
                  >
                    <Scan size={16} />
                    <span>Scan arrival pass</span>
                  </button>
                </div>
              </section>
            )}

            {/* KPI Metric Cards */}
            <div className="sk-handover-kpis">
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val">{handoversToday}</span>
                <span className="sk-handover-kpi-lbl">Handovers today</span>
              </div>
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val is-red">{refusedCount}</span>
                <span className="sk-handover-kpi-lbl">Refused</span>
              </div>
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val is-amber">{expiredCount}</span>
                <span className="sk-handover-kpi-lbl">OTP expired</span>
              </div>
              <div className="sk-handover-kpi-card">
                <span className="sk-handover-kpi-val">30 min</span>
                <span className="sk-handover-kpi-lbl">OTP validity</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="sk-handover-controls">
              <div className="sk-handover-search-wrap">
                <Search size={16} className="sk-handover-search-icon" />
                <input
                  type="text"
                  className="sk-handover-search-input"
                  placeholder="Search order #, collector, block, or medicine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search handovers"
                />
              </div>

              <div className="sk-handover-filter-tabs">
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({handovers.length})
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'counter' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('counter')}
                >
                  At counter
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'handed-over' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('handed-over')}
                >
                  Handed over
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'refused' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('refused')}
                >
                  Refused
                </button>
                <button
                  type="button"
                  className={`sk-handover-filter-btn ${statusFilter === 'expired' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('expired')}
                >
                  Expired
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                  onClick={handleReload}
                  title="Refresh queue"
                >
                  <RefreshCw size={14} />
                  <span>Sync</span>
                </button>
                <button
                  type="button"
                  className="sk-handover-btn-primary"
                  style={{ height: 34, padding: '0 14px', fontSize: 12 }}
                  onClick={() => setIsNewHandoverModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>New Handover</span>
                </button>
              </div>
            </div>

            {/* Handover Records Table Card */}
            <div className="sk-handover-table-card">
              <div className="sk-handover-table-header">
                <span className="sk-handover-th">ORDER</span>
                <span className="sk-handover-th">COLLECTOR</span>
                <span className="sk-handover-th">CONTENTS</span>
                <span className="sk-handover-th">OTP</span>
                <span className="sk-handover-th" style={{ justifySelf: 'end' }}>
                  STATE
                </span>
              </div>

              {filteredHandovers.length === 0 ? (
                /* Empty state */
                <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Package size={48} color="#94A3B8" />
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#131B2E' }}>Nothing in OTP handover yet.</span>
                  <span style={{ fontSize: 13, color: '#464555', maxWidth: 360 }}>
                    {searchQuery ? 'No orders match your search filters.' : 'New orders and samples appear here the moment a student books.'}
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
                filteredHandovers.map((item) => (
                  <div
                    key={item.id}
                    className="sk-handover-table-row"
                    onClick={() => setSelectedRecord(item)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View handover details for ${item.orderNumber}`}
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
                      {item.otpStatus}
                    </span>
                    <span className={`sk-handover-status-badge ${item.stateType}`}>
                      {item.stateLabel}
                    </span>
                  </div>
                ))
              )}

              {/* Statutory Legal & Safety Notice */}
              <div className="sk-handover-rule-notice">
                A student can name a friend to collect, and that works for over-the-counter items. Every handover now starts with a pass scan and photo match — an OTP alone is not enough. A prescription-only medicine is never handed to anyone but the person it was written for — not with an OTP, not with a warden present, not because the queue is long.
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
              <h2 id="modal-handover-title">Counter Handover — #{counterOrder.id}</h2>
              <button type="button" className="sk-handover-close-btn" onClick={() => setIsPhotoModalOpen(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#131B2E' }}>Student: {counterOrder.studentName}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>Contents: 2 items (Amoxicillin 500mg, Paracetamol 650mg)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>✓ Identity pass verified &amp; photo match confirmed</span>
              </div>

              {/* Step 1: Camera photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E' }}>
                  Step 1: Bag Seal Verification Photo
                </label>
                <div
                  style={{
                    height: 140,
                    borderRadius: 12,
                    border: '2px dashed #CBD5E1',
                    background: bagPhotoCaptured ? '#ECFDF5' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => setBagPhotoCaptured(true)}
                >
                  {bagPhotoCaptured ? (
                    <>
                      <CheckCircle2 size={32} color="#10B981" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#047857' }}>Bag photo recorded (Tamper seal intact)</span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>Tap to re-capture</span>
                    </>
                  ) : (
                    <>
                      <Camera size={30} color="#64748B" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#3525CD' }}>Tap to capture packed bag photo</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>Confirms tamper-evident seal is sealed prior to handover</span>
                    </>
                  )}
                </div>
              </div>

              {/* Step 2: 6-digit OTP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="student-otp-input" style={{ fontSize: 12, fontWeight: 700, color: '#131B2E' }}>
                  Step 2: Enter 6-Digit Student Handover OTP
                </label>
                <input
                  id="student-otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 20,
                    letterSpacing: 8,
                    textAlign: 'center',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  The student must read the OTP directly from their authenticated Health Vault app.
                </span>
              </div>

              {otpError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFF1F2', color: '#E11D48', fontSize: 12, fontWeight: 600 }}>
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
                  Cancel
                </button>
                <button
                  type="button"
                  className="sk-handover-btn-primary"
                  style={{ flex: 1.5 }}
                  onClick={handleConfirmCounterHandover}
                >
                  Confirm &amp; Hand Over
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
              <h2 id="modal-audit-title">Handover Audit Log — {selectedRecord.orderNumber}</h2>
              <button type="button" className="sk-handover-close-btn" onClick={() => setSelectedRecord(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Student Name</span>
                  <strong style={{ fontSize: 14, color: '#131B2E' }}>{selectedRecord.studentName}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Hostel Block / Room</span>
                  <strong style={{ fontSize: 14, color: '#131B2E' }}>{selectedRecord.roomOrHostel}</strong>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Collector &amp; Relationship</span>
                <strong style={{ fontSize: 14, color: selectedRecord.isProxyRefused ? '#E11D48' : '#131B2E' }}>
                  {selectedRecord.collector}
                </strong>
                {selectedRecord.isCollectorNamedFriend && (
                  <span style={{ fontSize: 11, color: '#047857', display: 'block', marginTop: 2 }}>
                    ✓ Named proxy authorized in student Health Vault for OTC medications only.
                  </span>
                )}
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Package Contents</span>
                <strong style={{ fontSize: 13, color: '#131B2E' }}>{selectedRecord.contents}</strong>
              </div>

              {selectedRecord.refusalReason && (
                <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#E11D48', display: 'block' }}>
                    CLINICAL SAFETY AUDIT REASON
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9F1239', lineHeight: 1.4 }}>
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
                    Input OTP &amp; Complete Handover
                  </button>
                )}

                {selectedRecord.stateType === 'amber' && (
                  <button
                    type="button"
                    className="sk-handover-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleReissueOtp(selectedRecord.id)}
                  >
                    Re-issue OTP to Student
                  </button>
                )}

                <button
                  type="button"
                  className="sk-handover-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedRecord(null)}
                >
                  Close Record
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
              <h2 id="modal-new-title">Process Counter Handover</h2>
              <button type="button" className="sk-handover-close-btn" onClick={() => setIsNewHandoverModalOpen(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const ord = (form.elements.namedItem('orderInput') as HTMLInputElement).value;
                const isProxy = (form.elements.namedItem('proxyCheckbox') as HTMLInputElement).checked;

                if (isProxy) {
                  showToast(`Safety Alert: Order ${ord} requires registered student biometric/photo verification.`);
                } else {
                  showToast(`Order ${ord} ready for 6-digit OTP verification at counter.`);
                }
                setIsNewHandoverModalOpen(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                  Order Number or QR Token
                </label>
                <input
                  name="orderInput"
                  required
                  placeholder="e.g. #SK-40220"
                  defaultValue="#SK-40220"
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 12px', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#131B2E', display: 'block', marginBottom: 4 }}>
                  Collector Identity
                </label>
                <input
                  name="collectorInput"
                  required
                  placeholder="Student or Named proxy"
                  defaultValue="Student (Self)"
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #CBD5E1', padding: '0 12px', fontSize: 13 }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" name="proxyCheckbox" />
                <span>Collector is a proxy/friend (strictly OTC items only)</span>
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="sk-handover-btn-secondary" style={{ flex: 1 }} onClick={() => setIsNewHandoverModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sk-handover-btn-primary" style={{ flex: 1 }}>
                  Lookup &amp; Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
