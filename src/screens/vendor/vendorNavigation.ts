import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, BarChart3, CheckCircle2, ClipboardList, CreditCard, FileText, FlaskConical, Home, KeyRound, LayoutGrid, Package, RefreshCw, RotateCcw, Scan, Snowflake, Tent, Truck, Users } from 'lucide-react';
import type { PartnerKind } from '../../data/workflowTypes';
import type { RoutePath } from '../../lib/workflowRouting';

/**
 * The partner console sidebar, in the order every vendor screen drew it.
 *
 * `route` is the canonical path the item opens; `activeFor` lists the alias paths
 * that render the same screen, so the item stays highlighted on any of them (and
 * after a refresh on any of them). An entry without a `route` has no screen yet:
 * it renders greyed out and never navigates, instead of falling through to the
 * router's catch-all.
 *
 * `kinds` limits an item to the partner types it belongs to (see partnerAccess.ts);
 * without it, every partner type gets the item.
 */
export interface VendorNavItem { label: string; icon: LucideIcon; route?: RoutePath; activeFor?: RoutePath[]; vendorOnly?: boolean; kinds?: PartnerKind[] }
export interface VendorNavGroup { title: string; items: VendorNavItem[] }

const PHARMACY: PartnerKind[] = ['PHARMACY'];
const LAB: PartnerKind[] = ['LAB'];

export const VENDOR_NAVIGATION: VendorNavGroup[] = [
  {
    title: 'Store',
    items: [
      { label: 'Home', icon: Home, route: 'vendor' },
      { label: 'Verify student', icon: Scan, route: 'verify' },
      // `/orders` is the member orders page for every other role.
      { label: 'Orders', icon: Package, route: 'orders', vendorOnly: true, kinds: ['PHARMACY', 'CLINIC'] },
      { label: 'Rx review', icon: FileText, route: 'rx-review', activeFor: ['vendor-rx-review'], kinds: PHARMACY },
      { label: 'Substitutions', icon: ArrowLeftRight, route: 'substitutions', activeFor: ['vendor-substitutions'], kinds: PHARMACY },
      { label: 'OTP handover', icon: KeyRound, route: 'handover', activeFor: ['vendor-handover'], kinds: PHARMACY },
      { label: 'Returns', icon: RotateCcw, route: 'returns', activeFor: ['vendor-returns'], kinds: PHARMACY },
      { label: 'Dispense register', icon: ClipboardList, route: 'dispensing', activeFor: ['dispense-register', 'vendor-dispense-register'], kinds: PHARMACY },
      { label: 'Reorder rules', icon: RefreshCw, route: 'reorder', activeFor: ['vendor-reorder'], kinds: PHARMACY },
    ],
  },
  {
    title: 'Lab',
    items: [
      { label: 'Sample queue', icon: FlaskConical, route: 'lab-queue', activeFor: ['vendor-lab-queue'], kinds: LAB },
      { label: 'Run sheet', icon: Truck, route: 'run-sheet', activeFor: ['lab-collection'], kinds: LAB },
      { label: 'Cold chain', icon: Snowflake, route: 'cold-chain', activeFor: ['lab-cold-chain'], kinds: LAB },
      { label: 'Release results', icon: CheckCircle2, kinds: LAB },
      { label: 'Camp intake', icon: Tent, route: 'camp-intake', activeFor: ['vendor-camp-intake'], kinds: LAB },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Staff & roles', icon: Users, route: 'partner-staff', activeFor: ['staff', 'vendor-staff', 'staff-roles'] },
      { label: 'Catalogue', icon: LayoutGrid, route: 'catalogue' },
      { label: 'Settlement', icon: CreditCard, route: 'settlement', activeFor: ['settlements', 'vendor-settlement'] },
      { label: 'Performance', icon: BarChart3, route: 'performance', activeFor: ['console', 'vendor-console'] },
    ],
  },
];

export function isVendorNavActive(item: VendorNavItem, route: RoutePath): boolean {
  return item.route === route || (item.activeFor?.includes(route) ?? false);
}
