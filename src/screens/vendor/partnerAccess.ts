import type { AccountRole, PartnerKind } from '../../data/workflowTypes';
import type { RoutePath } from '../../lib/workflowRouting';
import { isVendorNavActive, VENDOR_NAVIGATION } from './vendorNavigation';
import type { VendorNavItem } from './vendorNavigation';

export const PARTNER_KINDS: PartnerKind[] = ['PHARMACY', 'LAB', 'CLINIC', 'WELLNESS'];

export const PARTNER_KIND_LABEL: Record<PartnerKind, string> = {
  PHARMACY: 'Pharmacy',
  LAB: 'Lab',
  CLINIC: 'Clinic',
  WELLNESS: 'Wellness centre',
};

/** The type a super admin assigned to this partner, or null — never a default. */
export function partnerKindOf(user: { role: AccountRole; partnerKind?: string } | null | undefined): PartnerKind | null {
  if (!user || user.role !== 'VENDOR') return null;
  return PARTNER_KINDS.find(kind => kind === user.partnerKind) ?? null;
}

/**
 * Whether a partner of this type gets this sidebar item. Fails closed: a partner
 * with no type gets Home only (which says the account is not set up yet), and an
 * item limited to some types is hidden from every other type.
 */
export function partnerHasItem(item: VendorNavItem, kind: PartnerKind | null): boolean {
  if (item.route === 'vendor') return true;
  if (kind === null) return false;
  return !item.kinds || item.kinds.includes(kind);
}

/**
 * Whether this account may open a partner console route. Super admins see every
 * partner tool; a partner sees the routes of their own type; anyone else falls
 * back to the route's own role rules (applied by the router before this).
 */
export function canOpenPartnerRoute(route: RoutePath, role: AccountRole | null, kind: PartnerKind | null): boolean {
  if (role !== 'VENDOR') return true;
  // A partner's catalogue is also reachable as /admin/catalog.
  const target: RoutePath = route === 'admin/catalog' ? 'catalogue' : route;
  const item = VENDOR_NAVIGATION.flatMap(group => group.items).find(entry => isVendorNavActive(entry, target));
  return item ? partnerHasItem(item, kind) : false;
}

/** The signed-in partner's own name, never a sample business. */
export function partnerDisplayName(user: { fullName?: string } | null | undefined): string {
  return user?.fullName?.trim() || 'Your partner account';
}

export function partnerInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'P';
}
