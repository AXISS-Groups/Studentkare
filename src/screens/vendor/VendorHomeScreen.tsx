import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
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
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/styles/vendorHome.css';

export type ProviderType = 'pharmacy' | 'lab' | 'clinic' | 'wellness';
export type ViewState = 'data' | 'loading' | 'empty' | 'error';

export interface VendorHomeScreenProps {
  initialViewState?: ViewState;
  initialProviderType?: ProviderType;
  onNavigate?: (route: RoutePath) => void;
  _onNavigate?: (route: string) => void;
  onLogout?: () => void;
  onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void;
}

/** A tool tile: its label/meta keys are `partner.vhome.home.tool.<id>` and `…<id>Meta`. */
interface ToolItem {
  id: string;
  actionKey: string;
}

/**
 * What changes per provider type. There is no live partner data source yet,
 * so the console shows the shape of the day (KPI labels, queue, tools) with
 * honest "not connected" values — never sample businesses, orders or counts.
 */
interface ProviderData {
  kpis: [string, string, string, string];
  tools: ToolItem[];
}

const PROVIDER_CONFIG: Record<ProviderType, ProviderData> = {
  pharmacy: {
    kpis: ['new', 'rxToReview', 'outForDelivery', 'acceptRate'],
    tools: [
      { id: 'orders', actionKey: 'orders' },
      { id: 'rxReview', actionKey: 'rx-review' },
      { id: 'substitutions', actionKey: 'substitutions' },
      { id: 'catalogue', actionKey: 'catalogue' },
      { id: 'handover', actionKey: 'handover' },
    ],
  },
  lab: {
    kpis: ['toCollect', 'inTransit', 'toRelease', 'tat'],
    tools: [
      { id: 'runSheet', actionKey: 'run-sheet' },
      { id: 'sampleQueue', actionKey: 'lab-queue' },
      { id: 'coldChain', actionKey: 'cold-chain' },
      { id: 'labReports', actionKey: 'lab-reports' },
      { id: 'campIntake', actionKey: 'camp-intake' },
    ],
  },
  clinic: {
    kpis: ['today', 'doctorsOn', 'roomsFree', 'noShow'],
    tools: [
      { id: 'doctorsRooms', actionKey: 'doctors-rooms' },
      { id: 'slots', actionKey: 'slots' },
      { id: 'bookings', actionKey: 'orders' },
      { id: 'settlement', actionKey: 'settlement' },
      { id: 'staff', actionKey: 'staff' },
    ],
  },
  wellness: {
    kpis: ['sessionsToday', 'booked', 'waitlist', 'attendance'],
    tools: [
      { id: 'timetable', actionKey: 'timetable' },
      { id: 'checkIn', actionKey: 'scan-verify' },
      { id: 'coaches', actionKey: 'staff' },
      { id: 'settlement', actionKey: 'settlement' },
      { id: 'workshops', actionKey: 'workshops' },
    ],
  },
};

const PROVIDER_TYPES: ProviderType[] = ['pharmacy', 'lab', 'clinic', 'wellness'];

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export function VendorHomeScreen({ initialViewState, initialProviderType, onNavigate, _onNavigate, onLogout, onSwitchRole }: VendorHomeScreenProps) {
  const { user, logout } = useAuth();
  const t = useT();

  const [providerType, setProviderType] = useState<ProviderType>(initialProviderType || 'pharmacy');
  const [viewState, setViewState] = useState<ViewState>(initialViewState || 'data');

  useEffect(() => {
    if (initialViewState) {
      setViewState(initialViewState);
    }
  }, [initialViewState]);
  const [activeNav, setActiveNav] = useState<string>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentData = PROVIDER_CONFIG[providerType];
  const accountName = user?.fullName || t('partner.vhome.home.accountFallback');
  const typeLabel = t(`partner.vhome.home.type.${providerType}` as MessageKey);

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

  // No partner data source is wired to this console yet, so "try again"
  // simply returns to the (honestly empty) dashboard — it never claims a refresh.
  const handleRetryError = () => {
    setViewState('data');
  };

  const handleProviderChange = (type: ProviderType) => {
    setProviderType(type);
    setSearchQuery('');
  };

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
    if (actionKey === 'lab-queue' || actionKey === 'lab-reports') {
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
    if (actionKey === 'scan-verify') {
      doNavigate('scan-verify' as RoutePath);
      return;
    }
    if (actionKey === 'workshops') {
      doNavigate('campus-wellness' as RoutePath);
      return;
    }
    // Nothing opens for the remaining tools yet — say so rather than pretend.
    showToast(t('partner.vhome.home.notAvailable'));
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
    if (navKey === 'scan-verify') {
      doNavigate('scan-verify' as RoutePath);
      return;
    }
    if (navKey === 'lab-queue' || navKey === 'lab-reports') {
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
    showToast(t('partner.vhome.home.notAvailable'));
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const navButton = (key: string, icon: React.ReactNode, label: MessageKey) => (
    <button
      type="button"
      className={`sk-vendor-nav-item ${activeNav === key ? 'is-active' : ''}`}
      onClick={() => handleNavClick(key)}
      aria-current={activeNav === key ? 'page' : undefined}
    >
      {icon}
      <span>{t(label)}</span>
    </button>
  );

  return (
    <div className="sk-vendor-home">
      {/* ================= Left Sidebar ================= */}
      <aside className="sk-vendor-sidebar" aria-label={t('partner.vhome.nav.sidebar')}>
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
            <span className="sk-vendor-brand-partner">{t('partner.vhome.nav.partnerBadge')}</span>
          </div>
        </div>

        <nav className="sk-vendor-nav" aria-label={t('partner.vhome.nav.links')}>
          {/* Section: STORE */}
          <span className="sk-vendor-nav-section">{t('partner.vhome.nav.store')}</span>
          {navButton('home', <Home size={15} />, 'partner.vhome.nav.home')}
          {navButton('scan-verify', <Scan size={15} />, 'partner.vhome.nav.verify')}
          {navButton('orders', <Package size={15} />, 'partner.vhome.nav.orders')}
          {navButton('rx-review', <FileText size={15} />, 'partner.vhome.nav.rxReview')}
          {navButton('substitutions', <ArrowLeftRight size={15} />, 'partner.vhome.nav.substitutions')}
          {navButton('handover', <KeyRound size={15} />, 'partner.vhome.nav.handover')}
          {navButton('returns', <RotateCcw size={15} />, 'partner.vhome.nav.returns')}
          {navButton('dispensing', <ClipboardList size={15} />, 'partner.vhome.nav.dispense')}
          {navButton('reorder', <RefreshCw size={15} />, 'partner.vhome.nav.reorder')}

          {/* Section: LAB */}
          <span className="sk-vendor-nav-section">{t('partner.vhome.nav.lab')}</span>
          {navButton('lab-queue', <FlaskConical size={15} />, 'partner.vhome.nav.sampleQueue')}
          {navButton('run-sheet', <Truck size={15} />, 'partner.vhome.nav.runSheet')}
          {navButton('cold-chain', <Snowflake size={15} />, 'partner.vhome.nav.coldChain')}
          {navButton('lab-reports', <CheckCircle2 size={15} />, 'partner.nav.labReports')}
          {navButton('camp-intake', <Tent size={15} />, 'partner.vhome.nav.campIntake')}

          {/* Section: BUSINESS */}
          <span className="sk-vendor-nav-section">{t('partner.vhome.nav.business')}</span>
          {navButton('staff', <Users size={15} />, 'partner.vhome.nav.staff')}
          {navButton('catalogue', <LayoutGrid size={15} />, 'partner.vhome.nav.catalogue')}
          {navButton('settlement', <CreditCard size={15} />, 'partner.vhome.nav.settlement')}
          {navButton('performance', <BarChart3 size={15} />, 'partner.vhome.nav.performance')}
        </nav>

        <div className="sk-vendor-sidebar-bottom">
          <button
            type="button"
            className="sk-vendor-help-link"
            onClick={() => showToast(t('partner.vhome.nav.helpToast'))}
          >
            <HelpCircle size={15} />
            <span>{t('partner.vhome.nav.help')}</span>
          </button>
        </div>
      </aside>

      {/* ================= Main Content Wrapper ================= */}
      <div className="sk-vendor-content-wrapper">
        {/* Top Header */}
        <header className="sk-vendor-header">
          <span className="sk-vendor-header-title">{t('partner.vhome.home.header')}</span>

          {/* Search Bar */}
          <div className="sk-vendor-search-bar">
            <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
            <input
              type="search"
              className="sk-vendor-search-input"
              aria-label={t('partner.vhome.home.search')}
              placeholder={t('partner.vhome.home.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ flexGrow: 1 }} />

          {/* Notifications Button — not wired to any feed yet, so no unread dot */}
          <button
            type="button"
            className="sk-vendor-notify-btn"
            aria-label={t('partner.vhome.home.notifications')}
            onClick={() => showToast(t('partner.vhome.home.notificationsOff'))}
          >
            <Bell size={18} color="var(--sk-color-text)" />
          </button>

          {/* Partner Profile Pill / Dropdown */}
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              type="button"
              className="sk-vendor-profile-btn"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-label={t('partner.vhome.home.accountMenu')}
            >
              <span className="sk-vendor-profile-avatar" aria-hidden="true">{initialsOf(accountName)}</span>
              <div className="sk-vendor-profile-info">
                <span className="sk-vendor-profile-name">{accountName}</span>
                <span className="sk-vendor-profile-sub">{typeLabel}</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="sk-vendor-profile-menu" role="menu">
                <div style={{ padding: '6px 12px 10px', borderBottom: '1px solid var(--sk-color-rule-soft)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                    {accountName}
                  </div>
                  {user?.email && <div style={{ fontSize: 11, color: 'var(--sk-color-text-3)' }}>{user.email}</div>}
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
                      <GraduationCap size={15} color="var(--sk-color-action)" />
                      <span>{t('partner.vhome.home.switchStudent')}</span>
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
                      <Shield size={15} color="var(--sk-color-action)" />
                      <span>{t('partner.vhome.home.switchAdmin')}</span>
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
                  <LogOut size={15} color="var(--sk-color-danger)" />
                  <span>{t('partner.vhome.nav.signOut')}</span>
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
                  <h1 className="sk-vendor-hero-title">{t(`partner.vhome.home.title.${providerType}` as MessageKey)}</h1>
                  <span className="sk-vendor-hero-sub">{t(`partner.vhome.home.sub.${providerType}` as MessageKey)}</span>
                </div>

                <div
                  role="tablist"
                  aria-label={t('partner.vhome.home.typeTabs')}
                  className="sk-vendor-type-tabs"
                >
                  {PROVIDER_TYPES.map((type) => {
                    const isActive = providerType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`sk-vendor-type-tab ${isActive ? 'is-active' : ''}`}
                        onClick={() => handleProviderChange(type)}
                      >
                        {t(`partner.vhome.home.type.${type}` as MessageKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 KPI Cards — no data source yet, so no numbers */}
              <div className="sk-vendor-kpi-grid">
                {currentData.kpis.map((kpi) => (
                  <div key={kpi} className="sk-vendor-kpi-card">
                    <span className="sk-vendor-kpi-label">{t(`partner.vhome.home.kpi.${kpi}` as MessageKey)}</span>
                    <span className="sk-vendor-kpi-value sk-vendor-mono">—</span>
                    <span className="sk-vendor-kpi-meta">{t('partner.vhome.home.kpiNotConnected')}</span>
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
                        {t(`partner.vhome.home.queue.${providerType}` as MessageKey)}
                      </span>
                      <span className="sk-vendor-panel-sub">{t(`partner.vhome.home.queueSub.${providerType}` as MessageKey)}</span>
                    </div>
                  </div>

                  <div className="sk-vendor-queue-list">
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 13.5 }}>
                      {searchQuery.trim()
                        ? t('partner.vhome.home.queueNoMatch', { query: searchQuery.trim() })
                        : t('partner.vhome.home.queueNotConnected')}
                    </div>
                  </div>
                </section>

                {/* Right Column: Your Tools */}
                <section className="sk-vendor-panel-right" aria-labelledby="tools-heading">
                  <div className="sk-vendor-panel-header">
                    <div className="sk-vendor-panel-title-wrap">
                      <span id="tools-heading" className="sk-vendor-panel-title">
                        {t('partner.vhome.home.toolsTitle')}
                      </span>
                      <span className="sk-vendor-panel-sub">{t('partner.vhome.home.toolsSub')}</span>
                    </div>
                  </div>

                  <div className="sk-vendor-tools-list">
                    {currentData.tools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        className="sk-vendor-tool-link"
                        onClick={() => handleToolAction(tool.actionKey)}
                        style={{ minHeight: 44, width: '100%', textAlign: 'left', font: 'inherit' }}
                      >
                        <span className="sk-vendor-tool-sphere" aria-hidden="true" />
                        <span className="sk-vendor-tool-info">
                          <span className="sk-vendor-tool-name">{t(`partner.vhome.home.tool.${tool.id}` as MessageKey)}</span>
                          <span className="sk-vendor-tool-desc">{t(`partner.vhome.home.tool.${tool.id}Meta` as MessageKey)}</span>
                        </span>
                        <ChevronRight size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* View State: LOADING SKELETON */}
          {viewState === 'loading' && (
            <div className="sk-vendor-loading-wrap" aria-busy="true" aria-label={t('partner.vhome.home.loading')}>
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
                <span className="sk-vendor-empty-title">{t('partner.vhome.home.emptyTitle')}</span>
                <span className="sk-vendor-empty-desc">
                  {t('partner.vhome.home.emptyDesc')}
                </span>
                <button
                  type="button"
                  className="sk-vendor-empty-btn"
                  onClick={() => handleToolAction('catalogue')}
                >
                  {t('partner.vhome.home.emptyCta')}
                </button>
              </div>
            </div>
          )}

          {/* View State: ERROR */}
          {viewState === 'error' && (
            <div className="sk-vendor-error-wrap">
              <div className="sk-vendor-error-card" role="alert">
                <div className="sk-vendor-error-icon" aria-hidden="true">
                  <AlertTriangle size={30} color="var(--sk-color-danger)" />
                </div>
                <span className="sk-vendor-error-title">{t('partner.vhome.home.errorTitle')}</span>
                <span className="sk-vendor-error-desc">
                  {t('partner.vhome.home.errorDesc')}
                </span>
                <div className="sk-vendor-error-actions">
                  <button type="button" className="sk-vendor-error-retry" onClick={handleRetryError}>
                    {t('common.tryAgain')}
                  </button>
                  <button
                    type="button"
                    className="sk-vendor-error-help"
                    onClick={() => showToast(t('partner.vhome.nav.helpToast'))}
                  >
                    {t('partner.vhome.nav.help')}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="sk-vendor-toast" role="status" aria-live="polite">
          <Check size={18} color="var(--sk-color-positive)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
