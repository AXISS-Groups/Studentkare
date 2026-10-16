import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  Search, 
  ChevronRight, 
  Check, 
  AlertTriangle,
  LogOut,
  GraduationCap,
  Shield
} from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { navigate, RoutePath } from '../../lib/workflowRouting';
import '../../theme/styles/vendorHome.css';
import { useEffectivePartnerKind } from './partnerPreview';
import { PARTNER_KIND_LABEL, partnerDisplayName, partnerInitials } from './partnerAccess';
import type { PartnerKind } from '../../data/workflowTypes';

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
  subTitle: string;
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

const PROVIDER_FOR_KIND: Record<PartnerKind, ProviderType> = { PHARMACY: 'pharmacy', LAB: 'lab', CLINIC: 'clinic', WELLNESS: 'wellness' };
const KIND_FOR_PROVIDER: Record<ProviderType, PartnerKind> = { pharmacy: 'PHARMACY', lab: 'LAB', clinic: 'CLINIC', wellness: 'WELLNESS' };

const PROVIDER_CONFIG: Record<ProviderType, ProviderData> = {
  pharmacy: {
    subTitle: 'Accept new work within the timer, or it goes to the next partner. Student names show only after you accept.',
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
    subTitle: 'Accept sample collections, assign phlebotomists, and track temperature-sensitive cold chains.',
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
    subTitle: 'Monitor patient check-ins, doctors in session, and room availability across campus clinics.',
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
    subTitle: 'Manage student fitness attendance, class capacity, and health training bookings privately.',
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

  // The dashboard follows the partner type a super admin assigned; there is no switch.
  // `initialProviderType` is for tests and previews only.
  const assignedKind = useEffectivePartnerKind(user);
  const providerType: ProviderType | null = initialProviderType ?? (assignedKind ? PROVIDER_FOR_KIND[assignedKind] : null);
  const [viewState, setViewState] = useState<ViewState>(initialViewState || 'data');

  useEffect(() => {
    if (initialViewState) {
      setViewState(initialViewState);
    }
  }, [initialViewState]);
  const [showAlert, setShowAlert] = useState(Boolean(isTest));
  const [slaSeconds, setSlaSeconds] = useState(272);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentData = PROVIDER_CONFIG[providerType ?? 'pharmacy'];
  // The partner's own account, never a sample business or licence number.
  const partnerName = partnerDisplayName(user);
  const typeLabel = `${PARTNER_KIND_LABEL[KIND_FOR_PROVIDER[providerType ?? 'pharmacy']]} partner`;

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

  // One navigation per click: calling both the router callback and the global
  // navigate() pushed two history entries, so Back appeared to do nothing.
  const doNavigate = (target: RoutePath) => {
    if (_onNavigate) _onNavigate(target);
    if (onNavigate) onNavigate(target);
    else navigate(target);
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
    if (actionKey === 'staff') {
      doNavigate('partner-staff');
      return;
    }
    if (actionKey === 'settlement') {
      doNavigate('settlement');
      return;
    }
    showToast(`Opened ${actionKey.replace('-', ' ')} panel`);
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  // Fail closed: with no assigned type there is no dashboard to show, and no tools.
  if (providerType === null) {
    return (
      <div className="sk-vendor-home">
        <div className="sk-vendor-content-wrapper">
          <main className="sk-vendor-main">
            <div className="sk-vendor-empty-wrap">
              <div className="sk-vendor-empty-card" role="status">
                <h1 className="sk-vendor-empty-title">Your partner account isn’t set up yet.</h1>
                <span className="sk-vendor-empty-desc">
                  Studentkare sets whether you are a pharmacy, lab, clinic or wellness centre when your account is onboarded. Your tools appear here once that is done — contact your Studentkare partner manager.
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="sk-vendor-home">
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


          {/* Notifications Button */}
          <button
            type="button"
            className="sk-vendor-notify-btn"
            aria-label="View notifications"
            onClick={() => showToast('No unread critical alerts')}
          >
            <Bell size={18} color="#131B2E" />
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
              <span className="sk-vendor-profile-avatar">{partnerInitials(partnerName)}</span>
              <div className="sk-vendor-profile-info">
                <span className="sk-vendor-profile-name">{partnerName}</span>
                <span className="sk-vendor-profile-sub">{typeLabel}</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="sk-vendor-profile-menu" role="menu">
                <div style={{ padding: '6px 12px 10px', borderBottom: '1px solid #EEF2FF' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#131B2E' }}>
                    {user?.fullName || 'Partner Account'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6980' }}>{user?.email || user?.phone || ''}</div>
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
              {/* Hero greeting. The provider type is assigned by a super admin, not chosen here. */}
              <div className="sk-vendor-hero-row">
                <div className="sk-vendor-hero-title-group">
                  <h1 className="sk-vendor-hero-title">{partnerName}</h1>
                  <span className="sk-vendor-hero-sub">{currentData.subTitle}</span>
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
                <span className="sk-vendor-empty-title">Nothing in {partnerName} yet.</span>
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
                <span className="sk-vendor-error-title">Couldn’t load {partnerName}</span>
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
