import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, BarChart3, ClipboardList, CreditCard, FileText, FlaskConical, Home, KeyRound, LayoutGrid, Package, RefreshCw, RotateCcw, Scan, Snowflake, Tent, Truck, Users } from 'lucide-react';
import type { PartnerKind } from '../../data/workflowTypes';
import type { MessageKey } from '@/i18n';
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
/** `label` is the English name (stable for keys and tests); `labelKey` is what the sidebar shows, in the chosen language. */
export interface VendorNavItem { label: string; labelKey: MessageKey; icon: LucideIcon; route?: RoutePath; activeFor?: RoutePath[]; vendorOnly?: boolean; kinds?: PartnerKind[] }
export interface VendorNavGroup { title: string; titleKey: MessageKey; items: VendorNavItem[] }

const PHARMACY: PartnerKind[] = ['PHARMACY'];
const LAB: PartnerKind[] = ['LAB'];

export const VENDOR_NAVIGATION: VendorNavGroup[] = [
  {
    title: 'Store',
    titleKey: 'partner.vcon.nav.store',
    items: [
      { label: 'Home', labelKey: 'partner.vcon.nav.home', icon: Home, route: 'vendor' },
      { label: 'Verify student', labelKey: 'partner.vcon.nav.verify', icon: Scan, route: 'scan-verify' },
      // `/orders` is the member orders page for every other role.
      { label: 'Orders', labelKey: 'partner.vcon.nav.orders', icon: Package, route: 'orders', vendorOnly: true, kinds: ['PHARMACY', 'CLINIC'] },
      { label: 'Rx review', labelKey: 'partner.vcon.nav.rxReview', icon: FileText, route: 'rx-review', activeFor: ['vendor-rx-review'], kinds: PHARMACY },
      { label: 'Substitutions', labelKey: 'partner.vcon.nav.substitutions', icon: ArrowLeftRight, route: 'substitutions', activeFor: ['vendor-substitutions'], kinds: PHARMACY },
      { label: 'OTP handover', labelKey: 'partner.vcon.nav.handover', icon: KeyRound, route: 'handover', activeFor: ['vendor-handover'], kinds: PHARMACY },
      { label: 'Returns', labelKey: 'partner.vcon.nav.returns', icon: RotateCcw, route: 'returns', activeFor: ['vendor-returns'], kinds: PHARMACY },
      { label: 'Dispense register', labelKey: 'partner.vcon.nav.dispensing', icon: ClipboardList, route: 'dispensing', activeFor: ['dispense-register', 'vendor-dispense-register'], kinds: PHARMACY },
      { label: 'Reorder rules', labelKey: 'partner.vcon.nav.reorder', icon: RefreshCw, route: 'reorder', activeFor: ['vendor-reorder'], kinds: PHARMACY },
    ],
  },
  {
    title: 'Lab',
    titleKey: 'partner.vcon.nav.lab',
    items: [
      { label: 'Sample queue', labelKey: 'partner.vcon.nav.sampleQueue', icon: FlaskConical, route: 'lab-queue', activeFor: ['vendor-lab-queue'], kinds: LAB },
      { label: 'Run sheet', labelKey: 'partner.vcon.nav.runSheet', icon: Truck, route: 'run-sheet', activeFor: ['lab-collection'], kinds: LAB },
      { label: 'Cold chain', labelKey: 'partner.vcon.nav.coldChain', icon: Snowflake, route: 'cold-chain', activeFor: ['lab-cold-chain'], kinds: LAB },
      { label: 'Camp intake', labelKey: 'partner.vcon.nav.campIntake', icon: Tent, route: 'camp-intake', activeFor: ['vendor-camp-intake'], kinds: LAB },
    ],
  },
  {
    title: 'Business',
    titleKey: 'partner.vcon.nav.business',
    items: [
      { label: 'Staff & roles', labelKey: 'partner.vcon.nav.staff', icon: Users, route: 'partner-staff', activeFor: ['staff', 'vendor-staff', 'staff-roles'] },
      { label: 'Catalogue', labelKey: 'partner.vcon.nav.catalogue', icon: LayoutGrid, route: 'catalogue' },
      { label: 'Settlement', labelKey: 'partner.vcon.nav.settlement', icon: CreditCard, route: 'settlement', activeFor: ['settlements', 'vendor-settlement'] },
      { label: 'Performance', labelKey: 'partner.vcon.nav.performance', icon: BarChart3, route: 'performance', activeFor: ['console', 'vendor-console'] },
    ],
  },
];

export function isVendorNavActive(item: VendorNavItem, route: RoutePath): boolean {
  return item.route === route || (item.activeFor?.includes(route) ?? false);
}
