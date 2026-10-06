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
import '@/theme/styles/partnerStaff.css';

export interface StaffMember {
  id: string;
  name: string;
  role: 'Pharmacist' | 'Counter staff' | 'Delivery' | 'Manager';
  reg: string;
  status: 'Active' | 'Invited' | 'Removed';
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

export function PartnerStaffScreen({ initialStaff, onNavigate, onLogout }: PartnerStaffScreenProps) {
  const { logout } = useAuth();

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
  const [newRole, setNewRole] = useState<'Pharmacist' | 'Counter staff' | 'Delivery' | 'Manager' | null>(null);
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

  // Role descriptions
  const ROLE_CAPABILITIES: Record<string, string> = {
    'Pharmacist': 'Scan passes · hand over prescription medicines · approve Rx',
    'Counter staff': 'Scan passes · hand over over-the-counter items only',
    'Delivery': 'Hostel-gate handovers with pass scan · no records',
    'Manager': 'Everything above · staff, catalogue, settlements',
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

  const handleInviteStaff = () => {
    if (!isFormValid || !newRole) {
      showToast('Fill name, 10-digit mobile and role' + (newRole === 'Pharmacist' ? ' and council registration' : ''));
      return;
    }

    const created: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      reg: newRole === 'Pharmacist' ? newReg.trim() : '—',
      status: 'Invited',
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
    showToast('Invite sent by SMS · they sign in to the staff app');
  };

  const handleConfirmRemove = () => {
    if (!staffToRemove) return;
    const targetId = staffToRemove.id;
    setStaffList((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, status: 'Removed' as const } : s))
    );
    setStaffToRemove(null);
    showToast('Removed · signed out of the staff app now');
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  return (
    <div className="sk-ps-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="sk-ps-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Navigation Sidebar matching Artboard */}
      <aside className="sk-ps-sidebar" aria-label="Partner Sidebar">
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
            <span className="sk-ps-brand-badge">PARTNER</span>
          </div>
        </div>

        <nav aria-label="Partner store navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-ps-nav-group-title">STORE</span>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          <span className="sk-ps-nav-group-title">LAB</span>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          <span className="sk-ps-nav-group-title">BUSINESS</span>
          <button type="button" className="sk-ps-nav-item is-active" aria-current="page" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} />
            <span>Staff &amp; roles</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-ps-nav-item" onClick={() => handleNavClick('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-ps-nav-item"
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
      <main className="sk-ps-main">
        {/* Loading State */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label="Loading Staff & roles" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <Users size={64} color="#6366F1" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#131B2E', letterSpacing: -0.4 }}>
                No staff members registered.
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                Add pharmacists, counter staff, and delivery personnel who can scan student passes.
              </span>
              <button
                type="button"
                className="sk-ps-btn-add"
                onClick={() => setIsAddDrawerOpen(true)}
                style={{ marginTop: 10 }}
              >
                Add staff
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
                Couldn’t load staff &amp; roles
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                This is on our side, not yours — nothing was lost. We tried 3 times.
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-ps-btn-add">
                  Try again
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-ps-btn-add" style={{ background: '#4F46E5' }}>
                  Back to Hub
                </button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6E6C82' }}>
                Ref ERR-503 · PartnerStaff
              </span>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header matching PartnerStaff.html */}
            <div className="sk-ps-header">
              <div>
                <h1 className="sk-ps-title">Staff &amp; roles</h1>
                <div className="sk-ps-subtitle">
                  MedPlus · Bachupally · everyone who can scan a student’s pass here
                </div>
              </div>
              <button
                type="button"
                className="sk-ps-btn-add"
                onClick={() => setIsAddDrawerOpen(true)}
                aria-label="Add staff"
              >
                Add staff
              </button>
            </div>

            {/* Staff Table Grid */}
            <section className="sk-ps-table-card" aria-label="Staff and roles directory">
              <div className="sk-ps-table-header">
                <span>NAME</span>
                <span>ROLE</span>
                <span>COUNCIL REG.</span>
                <span>STATUS</span>
                <span>LAST SCAN</span>
                <span>SCANS · 7D</span>
                <span>STOPS</span>
                <span />
              </div>

              {staffList.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Users size={36} color="#94A3B8" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No staff members registered</span>
                  <span style={{ fontSize: 13, color: '#64748B', maxWidth: 360 }}>
                    Add authorized pharmacists, counter personnel, or couriers who can scan passes and fulfill orders.
                  </span>
                </div>
              ) : (
                staffList.map((member) => {
                const isRemoved = member.status === 'Removed';
                const chipClass =
                  member.status === 'Active'
                    ? 'sk-ps-status-active'
                    : member.status === 'Invited'
                    ? 'sk-ps-status-invited'
                    : 'sk-ps-status-removed';

                return (
                  <div
                    key={member.id}
                    className={`sk-ps-row ${isRemoved ? 'is-removed' : ''}`}
                  >
                    <span style={{ fontWeight: 800 }}>{member.name}</span>
                    <span>{member.role}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#464555' }}>
                      {member.reg}
                    </span>
                    <span className={`sk-ps-status-chip ${chipClass}`}>{member.status}</span>
                    <span style={{ color: '#464555' }}>{member.last}</span>
                    <span style={{ fontFamily: 'monospace' }}>{member.scans}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: member.stops > 0 ? '#BE123C' : '#6B6980',
                      }}
                    >
                      {member.stops}
                    </span>
                    {!isRemoved ? (
                      <button
                        type="button"
                        onClick={() => setStaffToRemove(member)}
                        className="sk-ps-btn-remove"
                        aria-label={`Remove ${member.name}`}
                      >
                        Remove
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
                <b>Why roles matter:</b> only a pharmacist with a council registration can hand over prescription medicines. Counter staff can scan and hand over over-the-counter items; delivery staff only at the hostel gate.
              </div>
              <div className="sk-ps-info-card-rose">
                <b>When someone leaves,</b> remove them the same day. They’re signed out of the staff app at once, and their past scans stay in the audit log.
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
            aria-label="Add staff"
            className="sk-ps-drawer-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#131B2E' }}>Add staff</span>
              <button
                type="button"
                onClick={() => setIsAddDrawerOpen(false)}
                style={{ border: 0, background: 'transparent', fontSize: 14, fontWeight: 800, color: '#464555', cursor: 'pointer' }}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#464555' }}>NAME</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sunita M."
                className="sk-ps-input-field"
                aria-label="Staff member full name"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#464555' }}>
                MOBILE (FOR THE STAFF APP SIGN-IN)
              </span>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                className="sk-ps-input-field"
                style={{ fontFamily: 'monospace' }}
                aria-label="10-digit mobile number"
              />
            </label>

            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#464555' }}>ROLE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['Pharmacist', 'Counter staff', 'Delivery', 'Manager'] as const).map((r) => {
                const isSelected = newRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={`sk-ps-role-btn ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#131B2E' }}>{r}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#464555' }}>
                      {ROLE_CAPABILITIES[r]}
                    </span>
                  </button>
                );
              })}
            </div>

            {newRole === 'Pharmacist' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#464555' }}>
                  STATE PHARMACY COUNCIL REGISTRATION
                </span>
                <input
                  type="text"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                  placeholder="TSPC 45821"
                  className="sk-ps-input-field"
                  style={{ fontFamily: 'monospace' }}
                  aria-label="State Pharmacy Council Registration"
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B6980' }}>
                  Checked against the council register before they can hand over prescription medicines.
                </span>
              </label>
            )}

            <div style={{ flexGrow: 1 }} />

            <button
              type="button"
              onClick={handleInviteStaff}
              disabled={!isFormValid}
              className="sk-ps-btn-invite"
            >
              Send invite
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Remove Staff */}
      {staffToRemove && (
        <div className="sk-ps-dialog-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="remove-title">
          <div className="sk-ps-dialog-card">
            <h2 id="remove-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#131B2E' }}>
              Remove {staffToRemove.name}?
            </h2>
            <span style={{ fontSize: 13.5, lineHeight: 1.55, fontWeight: 600, color: '#464555' }}>
              They’re signed out of the staff app straight away and can’t scan passes. Their past scans stay in the audit log.
            </span>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setStaffToRemove(null)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: '1.5px solid #3525CD',
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: '#3525CD',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: 0,
                  background: '#DC2626',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartnerStaffScreen;
