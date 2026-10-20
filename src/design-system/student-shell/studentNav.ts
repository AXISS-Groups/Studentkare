import type { MessageKey } from '@/i18n';
import type { SkIconName } from '../icons/Icon';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * The signed-in student web shell's navigation, as drawn on the canvas boards
 * WebDashboard and WebVault (page 3b): three sidebar groups and the top nav.
 * Icon names are the brief's; labels are i18n keys (studentshell area).
 */
export type StudentNavId =
  | 'your-care' | 'vault' | 'lab-tests' | 'insights' | 'emergency' | 'pass'
  | 'orders' | 'buy-again' | 'ayush' | 'requests'
  | 'account' | 'verify' | 'security' | 'notifications' | 'plan';

export interface StudentNavItem {
  id: StudentNavId;
  label: MessageKey;
  icon: SkIconName;
  /** null: the canvas has the item but the app has no student screen for it yet. Shown, never interactive. */
  route: RoutePath | null;
}

export interface StudentNavGroup { id: 'care' | 'services' | 'account'; label: MessageKey; items: StudentNavItem[] }

export const STUDENT_NAV: StudentNavGroup[] = [
  {
    id: 'care',
    label: 'shell.group.care',
    items: [
      { id: 'your-care', label: 'shell.item.yourCare', icon: 'map-pin', route: 'health' },
      { id: 'vault', label: 'shell.item.vault', icon: 'lock-2', route: 'records' },
      { id: 'lab-tests', label: 'shell.item.labTests', icon: 'flask', route: null },
      { id: 'insights', label: 'shell.item.insights', icon: 'bar-chart', route: null },
      { id: 'emergency', label: 'shell.item.emergency', icon: 'heart-plus', route: 'emergency-card' },
      { id: 'pass', label: 'shell.item.pass', icon: 'qr-code', route: 'pass' },
    ],
  },
  {
    id: 'services',
    label: 'shell.group.services',
    items: [
      { id: 'orders', label: 'shell.item.orders', icon: 'shopping-bag-2', route: 'orders' },
      // /reorder is the partner console's page; students have no buy-again screen yet.
      { id: 'buy-again', label: 'shell.item.buyAgain', icon: 'repeat', route: null },
      { id: 'ayush', label: 'shell.item.ayush', icon: 'sparkle', route: 'ayush' },
      { id: 'requests', label: 'shell.item.requests', icon: 'message-square-text', route: 'my-requests' },
    ],
  },
  {
    id: 'account',
    label: 'shell.group.account',
    items: [
      { id: 'account', label: 'shell.item.account', icon: 'user', route: 'profile' },
      { id: 'verify', label: 'shell.item.verify', icon: 'shield-check-2', route: 'verify' },
      { id: 'security', label: 'shell.item.security', icon: 'shield', route: 'security' },
      { id: 'notifications', label: 'shell.item.notifications', icon: 'bell', route: 'notifications' },
      { id: 'plan', label: 'shell.item.plan', icon: 'credit-card', route: 'billing' },
    ],
  },
];

/** Top nav links (canvas header: Shop · Lab tests · Doctors · Health vault · Ayush). */
export const STUDENT_TOP_NAV: { label: MessageKey; route: RoutePath }[] = [
  { label: 'shell.top.shop', route: 'shop' },
  { label: 'shell.top.labTests', route: 'lab-tests' },
  { label: 'shell.top.doctors', route: 'care' },
  { label: 'shell.top.vault', route: 'records' },
  { label: 'shell.top.ayush', route: 'ayush' },
];

/** Workspace routes that belong to a sidebar item without being its own route. */
const EXTRA: Partial<Record<RoutePath, StudentNavId>> = {
  'digital-id': 'account',
  insurance: 'account',
  'notification-settings': 'notifications',
  'visit-summaries': 'vault',
  'return-request': 'requests',
  'hostel-visit': 'requests',
  'refill-request': 'requests',
};

/** The sidebar item to mark current for a route, or null when the route is not in the sidebar. */
export function studentNavIdFor(route: RoutePath): StudentNavId | null {
  for (const group of STUDENT_NAV) {
    const item = group.items.find((entry) => entry.route === route);
    if (item) return item.id;
  }
  return EXTRA[route] ?? null;
}
