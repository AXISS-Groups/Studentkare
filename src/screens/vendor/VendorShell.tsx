import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from '@/design-system/icons';
import type { AccountRole, PartnerKind } from '../../data/types/workflowTypes';
import { canAccessRoute, RoutePath } from '../../lib/utils/workflowRouting';
import { ConsoleBrand, ConsoleNav, ConsoleSidebarLink } from '@/design-system/console-shell/ConsoleShell';
import type { ConsoleNavGroup } from '@/design-system/console-shell/ConsoleShell';
import { FormError } from '../../components/interface/WorkflowUI';
import { isVendorNavActive, VENDOR_NAVIGATION } from './vendorNavigation';
import type { VendorNavItem } from './vendorNavigation';
import { PARTNER_KIND_LABEL, PARTNER_KINDS, partnerHasItem } from './partnerAccess';
import { setPartnerPreview, usePartnerPreview } from './partnerPreview';
import { isDev } from '@/core/env';
import { useT } from '@/i18n';
import { TeamBadge } from '@/features/team-accounts/TeamBadge';
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
  /** The signed-in partner's own name, shown on the sidebar's help link (canvas footer). */
  accountName?: string;
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
export function VendorShell({ route, role, partnerKind = null, assignedPartnerKind = partnerKind, onNavigate, accountName, onSignOut, signingOut = false, signOutError = '', children }: VendorShellProps) {
  const t = useT();
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

  const groups: ConsoleNavGroup[] = VENDOR_NAVIGATION.map(group => ({
    id: group.title,
    title: t(group.titleKey),
    items: group.items.filter(item => isListed(item, role, partnerKind)).map(item => {
      const target = item.route;
      return {
        id: item.label,
        label: t(item.labelKey),
        icon: item.icon,
        current: isVendorNavActive(item, route),
        onSelect: target ? () => go(target) : undefined,
      };
    }),
  }));

  return <div className="sk-vendor-shell">
    <header className="sk-vendor-shell-mobilebar">
      <ConsoleBrand size={28} />
      <TeamBadge />
      <button ref={menuButton} type="button" className="sk-vendor-shell-menu-button" aria-label={drawerOpen ? t('console.closeNav') : t('console.openNav')} aria-expanded={drawerOpen} aria-controls="sk-vendor-shell-sidebar" onClick={() => setDrawerOpen(!drawerOpen)}>
        <Icon name={drawerOpen ? 'x' : 'menu'} size={22} />
      </button>
    </header>

    {drawerOpen && <button type="button" className="sk-vendor-shell-backdrop" aria-label={t('console.closeNav')} onClick={() => setDrawerOpen(false)} />}

    <aside id="sk-vendor-shell-sidebar" className={`sk-vendor-shell-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label={t('partner.vcon.nav.sidebarLabel')}>
      <div className="sk-vendor-shell-brand">
        <ConsoleBrand role={t('partner.vcon.nav.badge')} />
        <TeamBadge />
      </div>

      <ConsoleNav label={t('partner.vcon.nav.label')} groups={groups} />

      <div className="sk-vendor-shell-sidebar-footer">
        {isDev() && role === 'VENDOR' && <PartnerPreviewControl assigned={assignedPartnerKind} />}
        {/* The canvas footer: help, labelled with the partner's own name. */}
        {accountName && <ConsoleSidebarLink icon="help-circle" label={accountName} hint={t('console.helpCentre')} onClick={() => go('support')} />}
        {onSignOut && <>
          <FormError message={signOutError} />
          <ConsoleSidebarLink icon="log-out" label={signingOut ? t('console.signingOut') : t('console.signOut')} disabled={signingOut} onClick={onSignOut} />
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
