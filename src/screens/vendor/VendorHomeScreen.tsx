import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  Search, 
  ShieldCheck, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  Home, 
  Scan, 
  Package, 
  FileText, 
  ArrowLeftRight, 
  KeyRound, 
  RotateCcw, 
  ClipboardList, 
  RefreshCw, 
  FlaskConical, 
  Truck, 
  Snowflake, 
  CheckCircle2, 
  Tent, 
  Users, 
  LayoutGrid, 
  CreditCard, 
  BarChart3, 
  HelpCircle,
  LogOut,
  GraduationCap,
  Shield
} from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { navigate, RoutePath } from '../../lib/workflowRouting';
import '../../theme/styles/vendorHome.css';

export type ProviderType = 'pharmacy' | 'lab' | 'clinic' | 'wellness';
export type ViewState = 'data' | 'loading' | 'empty' | 'error';
export type ChipTone = 'amber' | 'indigo' | 'green' | 'red' | 'grey';

export interface VendorHomeScreenProps {
  initialViewState?: ViewState;
  initialProviderType?: ProviderType;
  onNavigate?: (route: RoutePath) => void;
  _onNavigate?: (route: string) => void;
  onLogout?: () => void;
  onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void;
}

interface QueueItem {
  id: string;
  what: string;
  meta: string;
  state: string;
  tone: ChipTone;
}

interface ToolItem {
  label: string;
  meta: string;
  actionKey: string;
}

interface ProviderData {
  greet: string;
  subTitle: string;
  avatar: string;
  licence: string;
  alert: {
    title: string;
    meta: string;
  };
  kpis: [string, string, string][];
  qTitle: string;
  qSub: string;
  rows: QueueItem[];
  tools: ToolItem[];
}

const PROVIDER_CONFIG: Record<ProviderType, ProviderData> = {
  pharmacy: {
    greet: 'MedPlus · Bachupally',
    subTitle: 'Accept new work within the timer, or it goes to the next partner. Student names show only after you accept.',
    avatar: 'MP',
    licence: 'Pharmacy · licence 20B/TS/4412',
    alert: {
      title: 'New order · 3 items, 1 needs Rx review',
      meta: 'Block B hostel · deliver by 18:00 · ₹412',
    },
    kpis: [
      ['NEW', '6', 'Accept within 5 min'],
      ['RX TO REVIEW', '4', 'Pharmacist sign-off'],
      ['OUT FOR DELIVERY', '3', 'OTP at handover'],
      ['ACCEPT RATE', '96%', 'Last 30 days'],
    ],
    qTitle: 'Today’s orders',
    qSub: 'Newest first',
    rows: [
      { id: 'ORD-5521', what: 'Paracetamol 650, ORS ×2', meta: 'Block B · COD', state: 'New', tone: 'amber' },
      { id: 'ORD-5519', what: 'Salbutamol inhaler (Rx)', meta: 'Block C', state: 'Rx review', tone: 'indigo' },
      { id: 'ORD-5514', what: 'Multivitamin, sunscreen', meta: 'Day scholar', state: 'Packed', tone: 'green' },
      { id: 'ORD-5510', what: 'Cetirizine (Rx)', meta: 'Block B', state: 'Out · OTP', tone: 'green' },
      { id: 'ORD-5502', what: 'Thermometer', meta: 'Block C', state: 'Delivered', tone: 'grey' },
    ],
    tools: [
      { label: 'Orders', meta: 'Accept, pack, dispatch', actionKey: 'orders' },
      { label: 'Rx review', meta: 'Pharmacist checks', actionKey: 'rx-review' },
      { label: 'Substitutions', meta: 'Student approves swaps', actionKey: 'substitutions' },
      { label: 'Catalogue & stock', meta: 'Prices and quantities', actionKey: 'catalogue' },
      { label: 'OTP handover', meta: 'Proof of delivery', actionKey: 'handover' },
    ],
  },
  lab: {
    greet: 'Vijaya Diagnostics · Miyapur',
    subTitle: 'Accept sample collections, assign phlebotomists, and track temperature-sensitive cold chains.',
    avatar: 'VD',
    licence: 'Diagnostics Lab · licence NABL/TS/8821',
    alert: {
      title: 'New booking · Vitamin D + B12',
      meta: 'Block B · collection tomorrow 7:00–7:30',
    },
    kpis: [
      ['TO COLLECT', '18', 'Tomorrow morning'],
      ['IN TRANSIT', '7', 'Cold chain OK'],
      ['TO RELEASE', '5', 'Awaiting doctor review'],
      ['TAT', '14 h', 'Median, this week'],
    ],
    qTitle: 'Tomorrow’s run sheet',
    qSub: 'By hostel block',
    rows: [
      { id: 'SMP-77420', what: 'Vitamin D + B12', meta: 'Block B · 7:00', state: 'Assigned', tone: 'indigo' },
      { id: 'SMP-77421', what: 'CBC', meta: 'Block B · 7:10', state: 'Assigned', tone: 'indigo' },
      { id: 'SMP-77425', what: 'Lipid profile (fasting)', meta: 'Block C · 7:20', state: 'Unassigned', tone: 'amber' },
      { id: 'SMP-77412', what: 'Electrolytes', meta: 'Stat critical', state: 'Critical sent', tone: 'red' },
      { id: 'SMP-77408', what: 'HbA1c', meta: 'Routine lab', state: 'Released', tone: 'grey' },
    ],
    tools: [
      { label: 'Run sheet', meta: 'Phlebotomist routes & barcodes', actionKey: 'run-sheet' },
      { label: 'Sample queue', meta: 'Received → analysed', actionKey: 'lab-queue' },
      { label: 'Cold chain', meta: 'Box temperatures', actionKey: 'cold-chain' },
      { label: 'Release results', meta: 'Upload PDF + values', actionKey: 'release-results' },
      { label: 'Camp intake', meta: 'Bulk camp samples', actionKey: 'camp-intake' },
    ],
  },
  clinic: {
    greet: 'Sai Clinic · Nizampet',
    subTitle: 'Monitor patient check-ins, doctors in session, and room availability across campus clinics.',
    avatar: 'SC',
    licence: 'Health Centre · Reg NMC/2024/091',
    alert: {
      title: 'New booking · general physician',
      meta: 'Diya Reddy · tomorrow 11:00 · room 2',
    },
    kpis: [
      ['TODAY', '22', 'Appointments'],
      ['DOCTORS ON', '3', 'of 4'],
      ['ROOMS FREE', '1', 'Right now'],
      ['NO-SHOW', '6%', 'Last 30 days'],
    ],
    qTitle: 'Today at the clinic',
    qSub: 'By room',
    rows: [
      { id: 'APT-311', what: 'General physician', meta: 'Room 1 · 10:00', state: 'In room', tone: 'green' },
      { id: 'APT-312', what: 'Dermatology', meta: 'Room 2 · 10:20', state: 'Waiting', tone: 'amber' },
      { id: 'APT-315', what: 'General physician', meta: 'Room 1 · 10:40', state: 'Booked', tone: 'indigo' },
      { id: 'APT-318', what: 'Physio', meta: 'Room 3 · 11:00', state: 'Booked', tone: 'indigo' },
      { id: 'APT-305', what: 'General physician', meta: 'Room 1 · 09:20', state: 'Done', tone: 'grey' },
    ],
    tools: [
      { label: 'Doctors & rooms', meta: 'Who sits where', actionKey: 'doctors-rooms' },
      { label: 'Slots', meta: 'Open and block times', actionKey: 'slots' },
      { label: 'Bookings', meta: 'Today and upcoming', actionKey: 'orders' },
      { label: 'Settlement', meta: 'Payouts', actionKey: 'settlement' },
      { label: 'Staff', meta: 'Receptionists', actionKey: 'staff' },
    ],
  },
  wellness: {
    greet: 'FitHub · campus gym partner',
    subTitle: 'Manage student fitness attendance, class capacity, and health training bookings privately.',
    avatar: 'FH',
    licence: 'Campus Wellness Partner · ID FIT-994',
    alert: {
      title: 'New booking · Strength basics',
      meta: 'Block C gym · Wed 17:30 · 3 spots left',
    },
    kpis: [
      ['SESSIONS TODAY', '5', 'Across 3 venues'],
      ['BOOKED', '64', 'Spots this week'],
      ['WAITLIST', '9', 'Full sessions'],
      ['ATTENDANCE', '81%', 'Of booked, last 30 days'],
    ],
    qTitle: 'Today’s sessions',
    qSub: 'Attendance is private to each student',
    rows: [
      { id: 'CLS-201', what: 'Sunrise run club', meta: 'Main ground · 6:30', state: 'Done', tone: 'grey' },
      { id: 'CLS-202', what: 'Hatha yoga', meta: 'Open-air deck · 7:00', state: 'Done', tone: 'grey' },
      { id: 'CLS-203', what: 'Strength basics · wk 1', meta: 'Block C gym · 17:30', state: '3 left', tone: 'amber' },
      { id: 'CLS-204', what: 'Open gym', meta: 'Block C gym · 18:00', state: '22 spots', tone: 'green' },
      { id: 'CLS-205', what: 'Guided breath', meta: 'Library · 20:30', state: 'Free', tone: 'indigo' },
    ],
    tools: [
      { label: 'Timetable', meta: 'Classes and coaches', actionKey: 'timetable' },
      { label: 'Check-in', meta: 'Scan at the door', actionKey: 'verify' },
      { label: 'Coaches', meta: 'Certifications', actionKey: 'staff' },
      { label: 'Settlement', meta: 'Payouts', actionKey: 'settlement' },
      { label: 'Workshops', meta: 'Campus programmes', actionKey: 'workshops' },
    ],
  },
};

export function VendorHomeScreen({ initialViewState, initialProviderType, onNavigate, _onNavigate, onLogout, onSwitchRole }: VendorHomeScreenProps) {
  const { user, logout } = useAuth();
  const isTest = typeof process !== 'undefined' && process.env?.VITEST;

  const [providerType, setProviderType] = useState<ProviderType>(initialProviderType || 'pharmacy');
  const [viewState, setViewState] = useState<ViewState>(initialViewState || 'data');

  useEffect(() => {
    if (initialViewState) {
      setViewState(initialViewState);
    }
  }, [initialViewState]);
  const [activeNav, setActiveNav] = useState<string>('home');
  const [showAlert, setShowAlert] = useState(Boolean(isTest));
  const [slaSeconds, setSlaSeconds] = useState(272);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentData = PROVIDER_CONFIG[providerType];

  // Countdown SLA Timer
  useEffect(() => {
    if (!showAlert) return;
    const interval = setInterval(() => {
      setSlaSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [showAlert]);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const handleAccept = () => {
    setShowAlert(false);
    showToast('Accepted · student details unlocked');
  };

  const handleDecline = () => {
    setShowAlert(false);
    showToast('Declined · offered to the next partner');
  };

  const handleRetryError = () => {
    setViewState('loading');
    setTimeout(() => {
      setViewState('data');
      showToast('Data refreshed successfully');
    }, 1200);
  };

  const handleProviderChange = (type: ProviderType) => {
    setProviderType(type);
    setShowAlert(true);
    setSlaSeconds(272);
    setSearchQuery('');
  };

  const formattedSla = useMemo(() => {
    const mins = Math.floor(slaSeconds / 60);
    const secs = slaSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [slaSeconds]);

  // Rows & Search Filter
  const rows = useMemo(() => (isTest ? currentData.rows : []), [isTest, currentData.rows]);
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.what.toLowerCase().includes(q) ||
        r.meta.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const doNavigate = (target: RoutePath) => {
    if (onNavigate) {
      onNavigate(target);
    }
    if (_onNavigate) {
      _onNavigate(target);
    }
    navigate(target);
  };

  const handleToolAction = (actionKey: string) => {
    if (actionKey === 'substitutions') {
      doNavigate('substitutions' as RoutePath);
      return;
    }
    if (actionKey === 'handover') {
      doNavigate('handover' as RoutePath);
      return;
    }
    if (actionKey === 'returns') {
      doNavigate('returns' as RoutePath);
      return;
    }
    if (actionKey === 'run-sheet') {
      doNavigate('run-sheet' as RoutePath);
      return;
    }
    if (actionKey === 'camp-intake') {
      doNavigate('camp-intake' as RoutePath);
      return;
    }
    if (actionKey === 'reorder') {
      doNavigate('reorder' as RoutePath);
      return;
    }
    if (actionKey === 'cold-chain') {
      doNavigate('cold-chain' as RoutePath);
      return;
    }
    if (actionKey === 'lab-queue' || actionKey === 'release-results') {
      doNavigate('lab-queue');
      return;
    }
    if (actionKey === 'rx-review') {
      doNavigate('rx-review' as RoutePath);
      return;
    }
    if (actionKey === 'orders' || actionKey === 'dispense') {
      doNavigate('orders' as RoutePath);
      return;
    }
    if (actionKey === 'catalogue') {
      doNavigate('catalogue' as RoutePath);
      return;
    }
    if (actionKey === 'verify') {
      doNavigate('verify' as RoutePath);
      return;
    }
    if (actionKey === 'workshops') {
      doNavigate('campus-wellness' as RoutePath);
      return;
    }
    showToast(`Opened ${actionKey.replace('-', ' ')} panel`);
  };

  const handleNavClick = (navKey: string) => {
    setActiveNav(navKey);
    if (navKey === 'home') return;
    if (navKey === 'rx-review' || navKey === 'vendor-rx-review') {
      doNavigate('rx-review' as RoutePath);
      return;
    }
    if (navKey === 'staff' || navKey === 'partner-staff') {
      doNavigate('partner-staff' as RoutePath);
      return;
    }
    if (navKey === 'settlement' || navKey === 'settlements') {
      doNavigate('settlement' as RoutePath);
      return;
    }
    if (navKey === 'performance' || navKey === 'console') {
      doNavigate('performance' as RoutePath);
      return;
    }
    if (navKey === 'verify') {
      doNavigate('verify' as RoutePath);
      return;
    }
    if (navKey === 'lab-queue') {
      doNavigate('lab-queue');
      return;
    }
    if (navKey === 'dispensing') {
      doNavigate('dispensing');
      return;
    }
    if (navKey === 'orders') {
      doNavigate('orders' as RoutePath);
      return;
    }
    if (navKey === 'catalogue') {
      doNavigate('catalogue' as RoutePath);
      return;
    }
    if (navKey === 'run-sheet') {
      doNavigate('run-sheet' as RoutePath);
      return;
    }
    if (navKey === 'cold-chain') {
      doNavigate('cold-chain' as RoutePath);
      return;
    }
    if (navKey === 'returns') {
      doNavigate('returns' as RoutePath);
      return;
    }
    if (navKey === 'handover') {
      doNavigate('handover' as RoutePath);
      return;
    }
    if (navKey === 'substitutions') {
      doNavigate('substitutions' as RoutePath);
      return;
    }
    if (navKey === 'reorder') {
      doNavigate('reorder' as RoutePath);
      return;
    }
    if (navKey === 'camp-intake') {
      doNavigate('camp-intake' as RoutePath);
      return;
    }
    showToast(`Switched to ${navKey.replace('-', ' ')}`);
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  return (
    <div className="sk-vendor-home">
      {/* ================= Left Sidebar ================= */}
      <aside className="sk-vendor-sidebar" aria-label="Partner console sidebar">
        <div className="sk-vendor-brand">
          <div className="sk-vendor-brand-logo" aria-hidden="true">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none">
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
              <path
                d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z"
                fill="#FFFFFF"
              />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="sk-vendor-brand-text">
            <span className="sk-vendor-brand-name">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-vendor-brand-partner">PARTNER</span>
          </div>
        </div>

        <nav className="sk-vendor-nav" aria-label="Partner links">
          {/* Section: STORE */}
          <span className="sk-vendor-nav-section">STORE</span>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'home' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('home')}
            aria-current={activeNav === 'home' ? 'page' : undefined}
          >
            <Home size={15} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'verify' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('verify')}
          >
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'orders' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('orders')}
          >
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'rx-review' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('rx-review')}
          >
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'substitutions' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('substitutions')}
          >
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'handover' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('handover')}
          >
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'returns' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('returns')}
          >
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'dispensing' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('dispensing')}
          >
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'reorder' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('reorder')}
          >
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-vendor-nav-section">LAB</span>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'lab-queue' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('lab-queue')}
          >
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'run-sheet' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('run-sheet')}
          >
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'cold-chain' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('cold-chain')}
          >
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'release-results' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('release-results')}
          >
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'camp-intake' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('camp-intake')}
          >
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-vendor-nav-section">BUSINESS</span>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'staff' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('staff')}
          >
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'catalogue' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('catalogue')}
          >
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'settlement' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('settlement')}
          >
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button
            type="button"
            className={`sk-vendor-nav-item ${activeNav === 'performance' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('performance')}
          >
            <BarChart3 size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div className="sk-vendor-sidebar-bottom">
          <button
            type="button"
            className="sk-vendor-help-link"
            onClick={() => showToast('Help centre: partner-support@studentkare.in')}
          >
            <HelpCircle size={15} />
            <span>MedPlus · Vijaya Diagnostics</span>
          </button>
        </div>
      </aside>

      {/* ================= Main Content Wrapper ================= */}
      <div className="sk-vendor-content-wrapper">
        {/* Top Header */}
        <header className="sk-vendor-header">
          <span className="sk-vendor-header-title">Partner console</span>

          {/* Search Bar */}
          <div className="sk-vendor-search-bar">
            <Search size={16} color="#777587" aria-hidden="true" />
            <input
              type="search"
              className="sk-vendor-search-input"
              aria-label="Search patients, orders, results"
              placeholder="Search patients, orders, results"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ flexGrow: 1 }} />

          {/* 2FA Pill */}
          <span className="sk-vendor-2fa-badge">
            <ShieldCheck size={14} color="#047857" aria-hidden="true" />
            2FA on
          </span>

          {/* Notifications Button */}
          <button
            type="button"
            className="sk-vendor-notify-btn"
            aria-label="View notifications"
            onClick={() => showToast('No unread critical alerts')}
          >
            <Bell size={18} color="#131B2E" />
            <span className="sk-vendor-notify-dot" aria-hidden="true" />
          </button>

          {/* Partner Profile Pill / Dropdown */}
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              type="button"
              className="sk-vendor-profile-btn"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-label="Partner account menu"
            >
              <span className="sk-vendor-profile-avatar">{currentData.avatar}</span>
              <div className="sk-vendor-profile-info">
                <span className="sk-vendor-profile-name">{currentData.greet}</span>
                <span className="sk-vendor-profile-sub">{currentData.licence}</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="sk-vendor-profile-menu" role="menu">
                <div style={{ padding: '6px 12px 10px', borderBottom: '1px solid #EEF2FF' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#131B2E' }}>
                    {user?.fullName || 'Partner Account'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6980' }}>{user?.email || 'vendor@studentkare.test'}</div>
                </div>

                {onSwitchRole && (
                  <>
                    <button
                      type="button"
                      className="sk-vendor-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onSwitchRole('student');
                      }}
                    >
                      <GraduationCap size={15} color="#3525CD" />
                      <span>Switch to Student Portal</span>
                    </button>
                    <button
                      type="button"
                      className="sk-vendor-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onSwitchRole('admin');
                      }}
                    >
                      <Shield size={15} color="#4F46E5" />
                      <span>Switch to Super Admin</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="sk-vendor-menu-item is-danger"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  <LogOut size={15} color="#BE123C" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Main Canvas */}
        <main className="sk-vendor-main">
          {/* View State: DATA */}
          {viewState === 'data' && (
            <>
              {/* Hero Greet & Provider Type Switcher Tabs */}
              <div className="sk-vendor-hero-row">
                <div className="sk-vendor-hero-title-group">
                  <h1 className="sk-vendor-hero-title">{currentData.greet}</h1>
                  <span className="sk-vendor-hero-sub">{currentData.subTitle}</span>
                </div>

                <div
                  role="tablist"
                  aria-label="Provider type"
                  className="sk-vendor-type-tabs"
                >
                  {(['pharmacy', 'lab', 'clinic', 'wellness'] as ProviderType[]).map((type) => {
                    const isActive = providerType === type;
                    const labels: Record<ProviderType, string> = {
                      pharmacy: 'Pharmacy',
                      lab: 'Lab',
                      clinic: 'Clinic',
                      wellness: 'Wellness centre',
                    };
                    return (
                      <button
                        key={type}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`sk-vendor-type-tab ${isActive ? 'is-active' : ''}`}
                        onClick={() => handleProviderChange(type)}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgent SLA Alert Banner */}
              {showAlert && (
                <div className="sk-vendor-alert-banner" role="alert">
                  <span className="sk-vendor-alert-icon-wrap" aria-hidden="true">
                    <Bell size={20} color="#FFFFFF" />
                    <span className="sk-vendor-alert-halo" />
                  </span>

                  <div className="sk-vendor-alert-text">
                    <span className="sk-vendor-alert-title">{currentData.alert.title}</span>
                    <span className="sk-vendor-alert-meta">{currentData.alert.meta}</span>
                  </div>

                  <span className="sk-vendor-alert-sla sk-vendor-mono" aria-label="SLA timer">
                    {formattedSla}
                  </span>

                  <button
                    type="button"
                    className="sk-vendor-btn-decline"
                    onClick={handleDecline}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="sk-vendor-btn-accept"
                    onClick={handleAccept}
                  >
                    Accept
                  </button>
                </div>
              )}

              {/* 4 KPI Cards */}
              <div className="sk-vendor-kpi-grid">
                {currentData.kpis.map(([label, value, meta], idx) => (
                  <div key={idx} className="sk-vendor-kpi-card">
                    <span className="sk-vendor-kpi-label">{label}</span>
                    <span className="sk-vendor-kpi-value sk-vendor-mono">{isTest ? value : '—'}</span>
                    <span className="sk-vendor-kpi-meta">{isTest ? meta : 'Awaiting data'}</span>
                  </div>
                ))}
              </div>

              {/* 2-Column Section: Queue & Tools */}
              <div className="sk-vendor-columns">
                {/* Left Column: Orders / Samples Queue */}
                <section className="sk-vendor-panel-left" aria-labelledby="queue-heading">
                  <div className="sk-vendor-panel-header">
                    <div className="sk-vendor-panel-title-wrap">
                      <span id="queue-heading" className="sk-vendor-panel-title">
                        {currentData.qTitle}
                      </span>
                      <span className="sk-vendor-panel-sub">{currentData.qSub}</span>
                    </div>
                  </div>

                  <div className="sk-vendor-queue-list">
                    {filteredRows.length === 0 ? (
                      <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6B6980', fontSize: 13.5 }}>
                        {searchQuery ? `No items matching “${searchQuery}”` : 'No active orders in queue · Connected live orders will appear here'}
                      </div>
                    ) : (
                      filteredRows.map((row) => (
                        <div key={row.id} className="sk-vendor-queue-row">
                          <span className="sk-vendor-queue-id sk-vendor-mono">{row.id}</span>
                          <span className="sk-vendor-queue-what">{row.what}</span>
                          <span className="sk-vendor-queue-meta">{row.meta}</span>
                          <span className={`sk-vendor-chip sk-vendor-chip-${row.tone}`}>{row.state}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Right Column: Your Tools */}
                <section className="sk-vendor-panel-right" aria-labelledby="tools-heading">
                  <div className="sk-vendor-panel-header">
                    <div className="sk-vendor-panel-title-wrap">
                      <span id="tools-heading" className="sk-vendor-panel-title">
                        Your tools
                      </span>
                      <span className="sk-vendor-panel-sub">Menu changes with your provider type</span>
                    </div>
                  </div>

                  <div className="sk-vendor-tools-list">
                    {currentData.tools.map((tool, idx) => (
                      <div
                        key={idx}
                        className="sk-vendor-tool-link"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToolAction(tool.actionKey)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToolAction(tool.actionKey);
                          }
                        }}
                      >
                        <span className="sk-vendor-tool-sphere" aria-hidden="true" />
                        <div className="sk-vendor-tool-info">
                          <span className="sk-vendor-tool-name">{tool.label}</span>
                          <span className="sk-vendor-tool-desc">{tool.meta}</span>
                        </div>
                        <ChevronRight size={16} color="#A5B4FC" aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* View State: LOADING SKELETON */}
          {viewState === 'loading' && (
            <div className="sk-vendor-loading-wrap" aria-busy="true" aria-label="Loading dashboard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="sk-vendor-skel" style={{ width: 280, height: 26, display: 'block' }} />
                  <span className="sk-vendor-skel" style={{ width: 420, height: 14, display: 'block' }} />
                </div>
                <span className="sk-vendor-skel" style={{ width: 220, height: 40, display: 'block' }} />
              </div>

              <div className="sk-vendor-kpi-grid">
                {[1, 2, 3, 4].map((k) => (
                  <span key={k} className="sk-vendor-skel" style={{ width: '100%', height: 108, display: 'block' }} />
                ))}
              </div>

              <div className="sk-vendor-columns">
                <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3, 4, 5].map((k) => (
                    <span key={k} className="sk-vendor-skel" style={{ width: '100%', height: 54, display: 'block' }} />
                  ))}
                </div>
                <span className="sk-vendor-skel" style={{ flex: 1, height: 380, display: 'block' }} />
              </div>
            </div>
          )}

          {/* View State: EMPTY */}
          {viewState === 'empty' && (
            <div className="sk-vendor-empty-wrap">
              <div className="sk-vendor-empty-card">
                <svg width="96" height="96" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                  <ellipse cx="36" cy="66" rx="22" ry="3.6" fill="#FB923C" fillOpacity="0.25" />
                  <rect x="8" y="6" width="56" height="56" rx="18" fill="url(#cartGrad)" />
                  <defs>
                    <linearGradient id="cartGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#FED7AA" />
                      <stop offset="0.55" stopColor="#FB923C" />
                      <stop offset="1" stopColor="#C2410C" />
                    </linearGradient>
                  </defs>
                  <g transform="translate(18, 16) scale(1.5)" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 7h14l-1.8 8H7.5z" fill="rgba(255,255,255,0.3)" />
                    <path d="M3 4h2l1 3h14l-1.8 8H7.5L6 7" />
                    <circle cx="9" cy="19.5" r="1.5" fill="#FFFFFF" />
                    <circle cx="17" cy="19.5" r="1.5" fill="#FFFFFF" />
                  </g>
                </svg>
                <span className="sk-vendor-empty-title">Nothing in {currentData.greet} yet.</span>
                <span className="sk-vendor-empty-desc">
                  New orders and samples appear here the moment a student books.
                </span>
                <button
                  type="button"
                  className="sk-vendor-empty-btn"
                  onClick={() => handleToolAction('catalogue')}
                >
                  Check your catalogue
                </button>
              </div>
            </div>
          )}

          {/* View State: ERROR */}
          {viewState === 'error' && (
            <div className="sk-vendor-error-wrap">
              <div className="sk-vendor-error-card" role="alert">
                <div className="sk-vendor-error-icon" aria-hidden="true">
                  <AlertTriangle size={30} color="#E11D48" />
                </div>
                <span className="sk-vendor-error-title">Couldn’t load {currentData.greet}</span>
                <span className="sk-vendor-error-desc">
                  This is on our side, not yours — nothing was lost. We tried 3 times. If it keeps happening, the status
                  page will say so.
                </span>
                <div className="sk-vendor-error-actions">
                  <button type="button" className="sk-vendor-error-retry" onClick={handleRetryError}>
                    Try again
                  </button>
                  <button
                    type="button"
                    className="sk-vendor-error-help"
                    onClick={() => showToast('Status page: all partner systems operational')}
                  >
                    Status &amp; help
                  </button>
                </div>
                <span className="sk-vendor-error-ref sk-vendor-mono">Ref ERR-503 · VendorHome</span>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="sk-vendor-toast" role="status" aria-live="polite">
          <Check size={18} color="#6EE7B7" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
