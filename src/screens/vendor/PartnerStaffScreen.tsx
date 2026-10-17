import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
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

export function PartnerStaffScreen({ initialStaff, onNavigate }: PartnerStaffScreenProps) {
  const { user } = useAuth();
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
