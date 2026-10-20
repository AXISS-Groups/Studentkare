import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../../data/contexts/AuthContext';
import { navigate, RoutePath } from '../../lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/styles/vendorHome.css';
import { useEffectivePartnerKind } from './partnerPreview';
import { partnerInitials } from './partnerAccess';
import type { PartnerKind } from '../../data/types/workflowTypes';

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

const PROVIDER_FOR_KIND: Record<PartnerKind, ProviderType> = { PHARMACY: 'pharmacy', LAB: 'lab', CLINIC: 'clinic', WELLNESS: 'wellness' };

export function VendorHomeScreen({ initialViewState, initialProviderType, onNavigate, _onNavigate, onLogout, onSwitchRole }: VendorHomeScreenProps) {
  const { user, logout } = useAuth();
  const t = useT();

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentData = PROVIDER_CONFIG[providerType ?? 'pharmacy'];
  // The partner's own account, never a sample business or licence number.
  const accountName = user?.fullName?.trim() || t('partner.vhome.home.accountFallback');
  const typeLabel = t(`partner.vhome.home.type.${providerType ?? 'pharmacy'}` as MessageKey);

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
              <span className="sk-vendor-profile-avatar" aria-hidden="true">{partnerInitials(accountName)}</span>
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
              {/* Hero: the signed-in account. The provider type is assigned by a super admin, not chosen here. */}
              <div className="sk-vendor-hero-row">
                <div className="sk-vendor-hero-title-group">
                  <h1 className="sk-vendor-hero-title">{accountName}</h1>
                  <span className="sk-vendor-hero-sub">{t(`partner.vhome.home.sub.${providerType}` as MessageKey)}</span>
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
                  <ellipse cx="36" cy="66" rx="22" ry="3.6" fill="var(--sk-color-illustration-peach)" fillOpacity="0.25" />
                  <rect x="8" y="6" width="56" height="56" rx="18" fill="url(#cartGrad)" />
                  <defs>
                    <linearGradient id="cartGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="var(--sk-color-illustration-peach-soft)" />
                      <stop offset="0.55" stopColor="var(--sk-color-illustration-peach)" />
                      <stop offset="1" stopColor="var(--sk-color-illustration-peach-deep)" />
                    </linearGradient>
                  </defs>
                  <g transform="translate(18, 16) scale(1.5)" stroke="var(--sk-color-illustration-highlight)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 7h14l-1.8 8H7.5z" fill="var(--sk-color-illustration-highlight)" fillOpacity="0.3" />
                    <path d="M3 4h2l1 3h14l-1.8 8H7.5L6 7" />
                    <circle cx="9" cy="19.5" r="1.5" fill="var(--sk-color-illustration-highlight)" />
                    <circle cx="17" cy="19.5" r="1.5" fill="var(--sk-color-illustration-highlight)" />
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
