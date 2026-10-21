import type { SkIconName } from '@/design-system/icons';
import type { PartnerKind } from '../../data/types/workflowTypes';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '../../lib/utils/workflowRouting';

/**
 * The partner console sidebar, in the order every vendor screen drew it, with the
 * icons named in design/screens/briefs/VendorConsole.md and VendorHome.md.
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
/** `shortcut`: a second way into a page another item owns; it opens that page but is never the current item. */
export interface VendorNavItem { label: string; labelKey: MessageKey; icon: SkIconName; route?: RoutePath; activeFor?: RoutePath[]; vendorOnly?: boolean; kinds?: PartnerKind[]; shortcut?: boolean }
export interface VendorNavGroup { title: string; titleKey: MessageKey; items: VendorNavItem[] }

const PHARMACY: PartnerKind[] = ['PHARMACY'];
const LAB: PartnerKind[] = ['LAB'];

export const VENDOR_NAVIGATION: VendorNavGroup[] = [
  {
    title: 'Store',
    titleKey: 'partner.vcon.nav.store',
    items: [
      { label: 'Home', labelKey: 'partner.vcon.nav.home', icon: 'home-2', route: 'vendor' },
      { label: 'Verify student', labelKey: 'partner.vcon.nav.verify', icon: 'scan', route: 'scan-verify', activeFor: ['staff-verify'] },
      // `/orders` is the member orders page for every other role. A wellness centre takes
      // bookings like a clinic (founder decision 2026-10-22).
      { label: 'Orders', labelKey: 'partner.vcon.nav.orders', icon: 'box-2', route: 'orders', vendorOnly: true, kinds: ['PHARMACY', 'CLINIC', 'WELLNESS'] },
      { label: 'Rx review', labelKey: 'partner.vcon.nav.rxReview', icon: 'prescription', route: 'rx-review', activeFor: ['vendor-rx-review'], kinds: PHARMACY },
      { label: 'Substitutions', labelKey: 'partner.vcon.nav.substitutions', icon: 'arrows-left-right-2', route: 'substitutions', activeFor: ['vendor-substitutions'], kinds: PHARMACY },
      { label: 'OTP handover', labelKey: 'partner.vcon.nav.handover', icon: 'key', route: 'handover', activeFor: ['vendor-handover', 'staff-handover'], kinds: PHARMACY },
      { label: 'Returns', labelKey: 'partner.vcon.nav.returns', icon: 'undo', route: 'returns', activeFor: ['vendor-returns'], kinds: PHARMACY },
      { label: 'Dispense register', labelKey: 'partner.vcon.nav.dispensing', icon: 'clipboard', route: 'dispensing', activeFor: ['dispense-register', 'vendor-dispense-register'], kinds: PHARMACY },
      { label: 'Reorder rules', labelKey: 'partner.vcon.nav.reorder', icon: 'repeat', route: 'reorder', activeFor: ['vendor-reorder'], kinds: PHARMACY },
    ],
  },
  {
    title: 'Lab',
    titleKey: 'partner.vcon.nav.lab',
    items: [
      { label: 'Sample queue', labelKey: 'partner.vcon.nav.sampleQueue', icon: 'flask', route: 'lab-queue', activeFor: ['vendor-lab-queue'], kinds: LAB },
      { label: 'Run sheet', labelKey: 'partner.vcon.nav.runSheet', icon: 'truck', route: 'run-sheet', activeFor: ['lab-collection', 'staff-collect'], kinds: LAB },
      { label: 'Cold chain', labelKey: 'partner.vcon.nav.coldChain', icon: 'asterisk', route: 'cold-chain', activeFor: ['lab-cold-chain'], kinds: LAB },
      // The board's "Release results" slot (WP-15). A lab files reports and a doctor releases
      // them, so the entry keeps the name "Lab reports"; it opens the LabReporting board, which
      // shows where every filed report has got to (with the doctor, released, acknowledged).
      { label: 'Lab reports', labelKey: 'partner.vhome.home.tool.labReports', icon: 'file', route: 'lab-reporting', kinds: LAB },
      // Camp fast mode (the staff app board) opens from Camp intake and keeps it lit.
      { label: 'Camp intake', labelKey: 'partner.vcon.nav.campIntake', icon: 'alert-triangle-2', route: 'camp-intake', activeFor: ['vendor-camp-intake', 'camp-fast'], kinds: LAB },
    ],
  },
  {
    title: 'Business',
    titleKey: 'partner.vcon.nav.business',
    items: [
      { label: 'Staff & roles', labelKey: 'partner.vcon.nav.staff', icon: 'users', route: 'partner-staff', activeFor: ['staff', 'vendor-staff', 'staff-roles'] },
      { label: 'Catalogue', labelKey: 'partner.vcon.nav.catalogue', icon: 'grid', route: 'catalogue' },
      { label: 'Settlement', labelKey: 'partner.vcon.nav.settlement', icon: 'banknote', route: 'settlement', activeFor: ['settlements', 'vendor-settlement'] },
      { label: 'Performance', labelKey: 'partner.vcon.nav.performance', icon: 'bar-chart', route: 'performance', activeFor: ['console', 'vendor-console'] },
    ],
  },
];

export function isVendorNavActive(item: VendorNavItem, route: RoutePath): boolean {
  if (item.shortcut) return false;
  return item.route === route || (item.activeFor?.includes(route) ?? false);
}
