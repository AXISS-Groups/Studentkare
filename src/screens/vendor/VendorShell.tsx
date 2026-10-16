import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import type { AccountRole, PartnerKind } from '../../data/workflowTypes';
import { canAccessRoute, RoutePath } from '../../lib/workflowRouting';
import { StudentKareLogo, StudentKareShield } from '../../components/StudentKareLogo';
import { FormError } from '../../components/interface/WorkflowUI';
import { isVendorNavActive, VENDOR_NAVIGATION } from './vendorNavigation';
import type { VendorNavItem } from './vendorNavigation';
import { PARTNER_KIND_LABEL, PARTNER_KINDS, partnerHasItem } from './partnerAccess';
import { setPartnerPreview, usePartnerPreview } from './partnerPreview';
import { isDev } from '@/core/env';
import './vendor-shell.css';

interface VendorShellProps {
  route: RoutePath;
  /** Null while signed out: only the public partner pages are listed. */
  role: AccountRole | null;
  /** The partner's assigned type; the sidebar lists only that type's tools. Ignored for other roles. */
  partnerKind?: PartnerKind | null;
  /** The type a super admin assigned, when `partnerKind` is a development preview of another. */
  assignedPartnerKind?: PartnerKind | null;
  onNavigate: (path: RoutePath) => void;
  /** Omitted when there is no session to end. */
  onSignOut?: () => void;
  signingOut?: boolean;
  signOutError?: string;
  children: ReactNode;
}

function isListed(item: VendorNavItem, role: AccountRole | null, kind: PartnerKind | null): boolean {
  if (role === 'VENDOR' && !partnerHasItem(item, kind)) return false;
  if (!item.route) return true;
  if (item.vendorOnly && role !== 'VENDOR') return false;
  return canAccessRoute(item.route, role);
}

/**
 * Layout for every partner console page (/vendor, /orders, /lab-queue, …), built like
 * the Super Admin shell: one sticky sidebar mounted once for the whole area, the
 * active item derived from the URL (so a refresh keeps it), and a drawer below 1024 px.
 */
export function VendorShell({ route, role, partnerKind = null, assignedPartnerKind = partnerKind, onNavigate, onSignOut, signingOut = false, signOutError = '', children }: VendorShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawerOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [drawerOpen]);

  const go = (path: RoutePath) => {
    setDrawerOpen(false);
    if (path !== route) onNavigate(path);
  };

  return <div className="sk-vendor-shell">
    <header className="sk-vendor-shell-mobilebar">
      <StudentKareLogo size={26} darkVariant showStrapline={false} />
      <button ref={menuButton} type="button" className="sk-vendor-shell-menu-button" aria-label={drawerOpen ? 'Close partner navigation' : 'Open partner navigation'} aria-expanded={drawerOpen} aria-controls="sk-vendor-shell-sidebar" onClick={() => setDrawerOpen(!drawerOpen)}>
        {drawerOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
    </header>

    {drawerOpen && <button type="button" className="sk-vendor-shell-backdrop" aria-label="Close partner navigation" onClick={() => setDrawerOpen(false)} />}

    <aside id="sk-vendor-shell-sidebar" className={`sk-vendor-shell-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label="Partner console sidebar">
      <div className="sk-vendor-shell-brand">
        <StudentKareShield size={44} id="skVendorShield" />
        <span className="sk-vendor-shell-wordmark"><strong>Student <em>Kare</em></strong><span>{role === 'VENDOR' && partnerKind ? `PARTNER · ${PARTNER_KIND_LABEL[partnerKind].toUpperCase()}` : 'PARTNER'}</span></span>
      </div>

      <nav aria-label="Partner links">
        {VENDOR_NAVIGATION.map(group => ({ ...group, items: group.items.filter(item => isListed(item, role, partnerKind)) })).filter(group => group.items.length > 0).map(group => <div key={group.title} className="sk-vendor-shell-group">
          <h2 className="sk-vendor-shell-group-title">{group.title}</h2>
          <ul>
            {group.items.map(item => {
              const { label, icon: Icon, route: target } = item;
              return <li key={label}>
                {target
                  ? <button type="button" className="sk-vendor-shell-link" aria-current={isVendorNavActive(item, route) ? 'page' : undefined} onClick={() => go(target)}>
                    <Icon size={16} aria-hidden="true" /><span>{label}</span>
                  </button>
                  : <span className="sk-vendor-shell-link is-unavailable" aria-disabled="true">
                    <Icon size={16} aria-hidden="true" /><span>{label}</span><small>Not available yet</small>
                  </span>}
              </li>;
            })}
          </ul>
        </div>)}
      </nav>

      <div className="sk-vendor-shell-sidebar-footer">
        {isDev() && role === 'VENDOR' && <PartnerPreviewControl assigned={assignedPartnerKind} />}
        {onSignOut && <>
          <FormError message={signOutError} />
          <button type="button" className="sk-vendor-shell-link" disabled={signingOut} onClick={onSignOut}><LogOut size={16} aria-hidden="true" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
        </>}
      </div>
    </aside>

    {/* Each partner page renders its own <main>; a second landmark here would nest them. */}
    <div className="sk-vendor-shell-main">{children}</div>
  </div>;
}

/**
 * Development only (never rendered in a production build): preview the console as
 * another partner type. Production partners get the type a super admin assigned.
 */
function PartnerPreviewControl({ assigned }: { assigned: PartnerKind | null }) {
  const preview = usePartnerPreview();
  return <label className="sk-vendor-shell-preview">
    <span>Preview as · dev only</span>
    <select value={preview ?? ''} onChange={event => setPartnerPreview(PARTNER_KINDS.find(kind => kind === event.target.value) ?? null)}>
      <option value="">Assigned type ({assigned ? PARTNER_KIND_LABEL[assigned] : 'not set'})</option>
      {PARTNER_KINDS.map(kind => <option key={kind} value={kind}>{PARTNER_KIND_LABEL[kind]}</option>)}
    </select>
  </label>;
}
