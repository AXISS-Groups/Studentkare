import type { MessageKey } from '@/i18n';
import type { SkIconName } from '../icons/Icon';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * The signed-in student web shell's navigation, as drawn on the canvas boards
 * WebDashboard and WebVault (page 3b): three sidebar groups and the top nav.
 * Icon names are the brief's; labels are i18n keys (studentshell area).
 */
export type StudentNavId =
  | 'home' | 'my-health' | 'vault' | 'insights' | 'medicines' | 'water' | 'emergency' | 'pass'
  | 'orders' | 'buy-again' | 'requests'
  | 'verify' | 'security' | 'notifications' | 'plan';

export interface StudentNavItem {
  id: StudentNavId;
  label: MessageKey;
  icon: SkIconName;
  /** null: the canvas has the item but the app has no student screen for it yet. Shown, never interactive. */
  route: RoutePath | null;
}

export interface StudentNavGroup { id: 'care' | 'services' | 'account'; label: MessageKey; items: StudentNavItem[] }

/**
 * Each place appears once (founder decisions, 23 Oct 2026, parity audit):
 * - Home and My health carry the phone's names and routes (Home /health,
 *   My health /your-care), replacing "Your Care".
 * - Ayush is the floating bubble only (no sidebar or top-nav entry).
 * - My lab tests is a tab of Orders; Medications is Medicines today.
 * - Health vault and Orders live here, not in the top bar; the account is the
 *   avatar and the account header (no "Account" item).
 * - Notifications here is the settings page; the inbox opens from the bell.
 */
export const STUDENT_NAV: StudentNavGroup[] = [
  {
    id: 'care',
    label: 'shell.group.care',
    items: [
      { id: 'home', label: 'm2.nav.home', icon: 'home', route: 'health' },
      { id: 'my-health', label: 'm2.nav.health', icon: 'heart', route: 'your-care' },
      { id: 'vault', label: 'shell.item.vault', icon: 'lock-2', route: 'records' },
      { id: 'insights', label: 'shell.item.insights', icon: 'bar-chart', route: 'report-insights' },
      // Mobile 2.0 Medicines today and Water (reminders ticket; not on the WebDashboard board): the phone boards in the page column.
      { id: 'medicines', label: 'm2r.meds.title', icon: 'pill-3', route: 'health/medicines' },
      { id: 'water', label: 'nav.water', icon: 'glass', route: 'health/water' },
      { id: 'emergency', label: 'shell.item.emergency', icon: 'heart-plus', route: 'emergency-card' },
      { id: 'pass', label: 'shell.item.pass', icon: 'qr-code', route: 'pass' },
    ],
  },
  {
    id: 'services',
    label: 'shell.group.services',
    items: [
      { id: 'orders', label: 'shell.item.orders', icon: 'shopping-bag-2', route: 'orders' },
      // The student's Buy again (WebReorder). /reorder stays the partner console's page.
      { id: 'buy-again', label: 'shell.item.buyAgain', icon: 'repeat', route: 'buy-again' },
      { id: 'requests', label: 'shell.item.requests', icon: 'message-square-text', route: 'my-requests' },
    ],
  },
  {
    id: 'account',
    label: 'shell.group.account',
    items: [
      { id: 'verify', label: 'shell.item.verify', icon: 'shield-check-2', route: 'verify' },
      { id: 'security', label: 'shell.item.security', icon: 'shield', route: 'security' },
      // The settings page (WebNotifications); the inbox opens from the bell.
      { id: 'notifications', label: 'shell.item.notificationSettings', icon: 'bell', route: 'notification-settings' },
      { id: 'plan', label: 'shell.item.plan', icon: 'credit-card', route: 'billing' },
    ],
  },
];

/** Top nav links: the store (Shop · Lab tests · Doctors). Health vault and Ayush are in the sidebar and the bubble. */
export const STUDENT_TOP_NAV: { label: MessageKey; route: RoutePath }[] = [
  { label: 'shell.top.shop', route: 'shop' },
  { label: 'shell.top.labTests', route: 'lab-tests' },
  { label: 'shell.top.doctors', route: 'care' },
];

/** Workspace routes that belong to a sidebar item without being its own route. */
const EXTRA: Partial<Record<RoutePath, StudentNavId>> = {
  'visit-summaries': 'vault',
  'my-lab-tests': 'orders',
  medications: 'medicines',
  'return-request': 'requests',
  'hostel-visit': 'requests',
  'refill-request': 'requests',
  // My health's own screens (as the phone's pill nav marks them).
  'health/trends': 'my-health',
  'health/report-upload': 'my-health',
  'health/steps': 'my-health',
  'health/refills': 'my-health',
};

/** The sidebar item to mark current for a route, or null when the route is not in the sidebar. */
export function studentNavIdFor(route: RoutePath): StudentNavId | null {
  for (const group of STUDENT_NAV) {
    const item = group.items.find((entry) => entry.route === route);
    if (item) return item.id;
  }
  return EXTRA[route] ?? null;
}
