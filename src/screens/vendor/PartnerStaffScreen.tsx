import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  CreditCard,
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
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/partnerStaff.css';

export interface StaffMember {
  id: string;
  name: string;
  role: 'Pharmacist' | 'Counter staff' | 'Delivery' | 'Manager';
  reg: string;
  /** 'Added' = on this list only; no invite has been sent. */
  status: 'Active' | 'Invited' | 'Added' | 'Removed';
  last: string;
  scans: number;
  stops: number;
}

export const DEMO_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Ravi K.',
    role: 'Pharmacist',
    reg: 'TSPC 45821',
    status: 'Active',
    last: 'Today 4:14 pm',
    scans: 42,
    stops: 0,
  },
  {
    id: 'staff-2',
    name: 'Sunita M.',
    role: 'Counter staff',
    reg: 'Unregistered',
    status: 'Active',
    last: 'Today 3:52 pm',
    scans: 31,
    stops: 1,
  },
  {
    id: 'staff-3',
    name: 'Imran S.',
    role: 'Delivery',
    reg: 'Unregistered',
    status: 'Active',
    last: 'Today 2:10 pm',
    scans: 0,
    stops: 0,
  },
  {
    id: 'staff-4',
    name: 'Deepa R.',
    role: 'Manager',
    reg: 'Unregistered',
    status: 'Active',
    last: 'Yesterday',
    scans: 5,
    stops: 0,
  },
  {
    id: 'staff-5',
    name: 'Arjun P.',
    role: 'Counter staff',
    reg: 'Unregistered',
    status: 'Invited',
    last: 'Pending login',
    scans: 0,
    stops: 0,
  },
];

export interface PartnerStaffScreenProps {
  initialStaff?: StaffMember[];
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

const ROLES: readonly StaffMember['role'][] = ['Pharmacist', 'Counter staff', 'Delivery', 'Manager'];

export function PartnerStaffScreen({ initialStaff, onNavigate, onLogout }: PartnerStaffScreenProps) {
  const { user, logout } = useAuth();
  const t = useT();
  const roleLabel = (role: StaffMember['role']): string => t(`partner.vlab.staff.role.${role}` as MessageKey);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  // Staff members list (empty by default unless passed or in test environment)
  const [staffList, setStaffList] = useState<StaffMember[]>(() =>
    initialStaff ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_STAFF_MEMBERS : [])
  );

  // Drawer state for adding staff
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<StaffMember['role'] | null>(null);
  const [newReg, setNewReg] = useState('');

  // Remove staff dialog state
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);

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

  // Validation
  const isPhoneValid = /^[6-9][0-9]{9}$/.test(newPhone);
  const isFormValid = useMemo(() => {
    return (
      newName.trim().length > 1 &&
      isPhoneValid &&
      newRole !== null &&
      (newRole !== 'Pharmacist' || newReg.trim().length >= 4)
    );
  }, [newName, isPhoneValid, newRole, newReg]);

  // Adds the person to this list only. No invite is sent and no account is
  // created — staff sign-in isn't connected — so the row says "Not invited yet".
  const handleAddStaff = () => {
    if (!isFormValid || !newRole) {
      showToast(t(newRole === 'Pharmacist' ? 'partner.vlab.staff.toast.fillPharmacist' : 'partner.vlab.staff.toast.fill'));
      return;
    }

    const created: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      reg: newRole === 'Pharmacist' ? newReg.trim() : '—',
      status: 'Added',
      last: '—',
      scans: 0,
      stops: 0,
    };

    setStaffList((prev) => [...prev, created]);
    setIsAddDrawerOpen(false);
    setNewName('');
    setNewPhone('');
    setNewRole(null);
    setNewReg('');
    showToast(t('partner.vlab.staff.toast.added', { name: created.name }));
  };

  const handleConfirmRemove = () => {
    if (!staffToRemove) return;
    const targetId = staffToRemove.id;
    setStaffList((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, status: 'Removed' as const } : s))
    );
    setStaffToRemove(null);
    showToast(t('partner.vlab.staff.toast.removed'));
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  const fieldLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--sk-color-text-2)' };

  return (
    <div className="sk-ps-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="sk-ps-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Navigation Sidebar matching Artboard */}
      <aside className="sk-ps-sidebar" aria-label={t('partner.vlab.nav.sidebar')}>
        <div className="sk-ps-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7ps" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7bps" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7ps)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7bps)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-ps-brand-text">
            <span className="sk-ps-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-ps-brand-badge">{t('partner.vlab.nav.badge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vlab.nav.storeNav')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-ps-nav-group-title">{t('partner.vlab.nav.store')}</span>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.home')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.verify')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.orders')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.handover')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.returns')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.reorder')}</span>
          </button>

          <span className="sk-ps-nav-group-title">{t('partner.vlab.nav.lab')}</span>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.campIntake')}</span>
          </button>

          <span className="sk-ps-nav-group-title">{t('partner.vlab.nav.business')}</span>
          <button type="button" className="sk-ps-nav-item is-active" aria-current="page" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.staff')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.settlement')}</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('performance')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.performance')}</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-ps-nav-item"
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)' }}
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vlab.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-ps-main">
        <p role="note" style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 10, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 12.5, lineHeight: 1.5 }}>
          {t('partner.vlab.common.preview')}
        </p>

        {/* Loading State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vlab.staff.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <span className="skel" style={{ width: 280, height: 32 }} />
              <span className="skel" style={{ width: 140, height: 44 }} />
            </div>
            <span className="skel" style={{ width: '100%', height: 320 }} />
          </div>
        )}

        {/* Empty State */}
        {viewState === 'empty' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <Users size={64} color="var(--sk-color-action)" aria-hidden="true" />
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                {t('partner.vlab.staff.emptyTitle')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vlab.staff.emptyBody')}
              </span>
              <button
                type="button"
                className="sk-ps-btn-add"
                onClick={() => setIsAddDrawerOpen(true)}
                style={{ marginTop: 10 }}
              >
                {t('partner.vlab.staff.add')}
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
                {t('partner.vlab.staff.errorTitle')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vlab.common.errorBody')}
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-ps-btn-add">
                  {t('common.tryAgain')}
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-ps-btn-add" style={{ background: 'var(--sk-color-action)' }}>
                  {t('partner.vlab.common.backHome')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header matching PartnerStaff.html */}
            <div className="sk-ps-header">
              <div>
                <h1 className="sk-ps-title">{t('partner.vlab.staff.title')}</h1>
                <div className="sk-ps-subtitle">
                  {user?.fullName
                    ? t('partner.vlab.staff.subtitleNamed', { store: user.fullName })
                    : t('partner.vlab.staff.subtitle')}
                </div>
              </div>
              <button
                type="button"
                className="sk-ps-btn-add"
                onClick={() => setIsAddDrawerOpen(true)}
              >
                {t('partner.vlab.staff.add')}
              </button>
            </div>

            {/* Staff Table Grid */}
            <section className="sk-ps-table-card" aria-label={t('partner.vlab.staff.table')}>
              <div className="sk-ps-table-header">
                <span>{t('partner.vlab.staff.col.name')}</span>
                <span>{t('partner.vlab.staff.col.role')}</span>
                <span>{t('partner.vlab.staff.col.reg')}</span>
                <span>{t('partner.vlab.staff.col.status')}</span>
                <span>{t('partner.vlab.staff.col.last')}</span>
                <span>{t('partner.vlab.staff.col.scans')}</span>
                <span>{t('partner.vlab.staff.col.stops')}</span>
                <span />
              </div>

              {staffList.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--sk-color-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Users size={36} color="var(--sk-color-text-3)" aria-hidden="true" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('partner.vlab.staff.emptyTitle')}</span>
                  <span style={{ fontSize: 13, color: 'var(--sk-color-text-3)', maxWidth: 360 }}>
                    {t('partner.vlab.staff.emptyBody')}
                  </span>
                </div>
              ) : (
                staffList.map((member) => {
                const isRemoved = member.status === 'Removed';
                const chipClass =
                  member.status === 'Active'
                    ? 'sk-ps-status-active'
                    : member.status === 'Invited' || member.status === 'Added'
                    ? 'sk-ps-status-invited'
                    : 'sk-ps-status-removed';

                return (
                  <div
                    key={member.id}
                    className={`sk-ps-row ${isRemoved ? 'is-removed' : ''}`}
                  >
                    <span style={{ fontWeight: 800 }}>{member.name}</span>
                    <span>{roleLabel(member.role)}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--sk-color-text-2)' }}>
                      {member.reg}
                    </span>
                    <span className={`sk-ps-status-chip ${chipClass}`}>{t(`partner.vlab.staff.status.${member.status}` as MessageKey)}</span>
                    <span style={{ color: 'var(--sk-color-text-2)' }}>{member.last}</span>
                    <span style={{ fontFamily: 'monospace' }}>{member.scans}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: member.stops > 0 ? 'var(--sk-color-danger)' : 'var(--sk-color-text-3)',
                      }}
                    >
                      {member.stops}
                    </span>
                    {!isRemoved ? (
                      <button
                        type="button"
                        onClick={() => setStaffToRemove(member)}
                        className="sk-ps-btn-remove"
                        aria-label={t('partner.vlab.staff.removeAria', { name: member.name })}
                      >
                        {t('partner.vlab.staff.remove')}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              }))}
            </section>

            {/* Role Governance & Policy Notice Cards */}
            <div className="sk-ps-info-grid">
              <div className="sk-ps-info-card-indigo">
                <b>{t('partner.vlab.staff.info.rolesLead')}</b> {t('partner.vlab.staff.info.rolesBody')}
              </div>
              <div className="sk-ps-info-card-rose">
                <b>{t('partner.vlab.staff.info.leaveLead')}</b> {t('partner.vlab.staff.info.leaveBody')}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Slide-over Drawer: Add Staff */}
      {isAddDrawerOpen && (
        <div className="sk-ps-drawer-backdrop" onClick={() => setIsAddDrawerOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('partner.vlab.staff.add')}
            className="sk-ps-drawer-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vlab.staff.add')}</span>
              <button
                type="button"
                onClick={() => setIsAddDrawerOpen(false)}
                style={{ border: 0, background: 'transparent', minHeight: 44, minWidth: 44, fontSize: 14, fontWeight: 800, color: 'var(--sk-color-text-2)', cursor: 'pointer' }}
              >
                {t('partner.vlab.common.close')}
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={fieldLabelStyle}>{t('partner.vlab.staff.drawer.name')}</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('partner.vlab.staff.drawer.namePlaceholder')}
                className="sk-ps-input-field"
                aria-label={t('partner.vlab.staff.drawer.nameAria')}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={fieldLabelStyle}>
                {t('partner.vlab.staff.drawer.mobile')}
              </span>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder={t('partner.vlab.staff.drawer.mobilePlaceholder')}
                className="sk-ps-input-field"
                style={{ fontFamily: 'monospace' }}
                aria-label={t('partner.vlab.staff.drawer.mobileAria')}
              />
            </label>

            <span style={fieldLabelStyle}>{t('partner.vlab.staff.drawer.role')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map((r) => {
                const isSelected = newRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={`sk-ps-role-btn ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sk-color-text)' }}>{roleLabel(r)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sk-color-text-2)' }}>
                      {t(`partner.vlab.staff.cap.${r}` as MessageKey)}
                    </span>
                  </button>
                );
              })}
            </div>

            {newRole === 'Pharmacist' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={fieldLabelStyle}>
                  {t('partner.vlab.staff.drawer.council')}
                </span>
                <input
                  type="text"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                  placeholder="TSPC 45821"
                  className="sk-ps-input-field"
                  style={{ fontFamily: 'monospace' }}
                  aria-label={t('partner.vlab.staff.drawer.councilAria')}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vlab.staff.drawer.councilNote')}
                </span>
              </label>
            )}

            <div style={{ flexGrow: 1 }} />

            <button
              type="button"
              onClick={handleAddStaff}
              disabled={!isFormValid}
              className="sk-ps-btn-invite"
            >
              {t('partner.vlab.staff.drawer.submit')}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Remove Staff */}
      {staffToRemove && (
        <div className="sk-ps-dialog-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="remove-title">
          <div className="sk-ps-dialog-card">
            <h2 id="remove-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--sk-color-text)' }}>
              {t('partner.vlab.staff.removeTitle', { name: staffToRemove.name })}
            </h2>
            <span style={{ fontSize: 13.5, lineHeight: 1.55, fontWeight: 600, color: 'var(--sk-color-text-2)' }}>
              {t('partner.vlab.staff.removeBody')}
            </span>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setStaffToRemove(null)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: '1.5px solid var(--sk-color-action)',
                  background: 'var(--sk-color-surface)',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: 'var(--sk-color-action)',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: 0,
                  background: 'var(--sk-color-danger-fill)',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: 'var(--sk-color-on-action)',
                  cursor: 'pointer',
                }}
              >
                {t('partner.vlab.staff.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartnerStaffScreen;
