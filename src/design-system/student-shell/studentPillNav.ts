import type { PillNavKey } from '@/design-system/m2';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * The Mobile 2.0 pill nav on the web (canvas page 9, approved 2026-10-21): Home
 * · Orders · Ask Ayush · My health · Profile, replacing the five-tab bar
 * (Discover · Wellness · Ayush AI · Lab Tests · Your Care). Destination, then
 * the web route it opens:
 * - Home (M2Home) opens /health, the student home.
 * - Orders (M2Orders) opens /orders.
 * - Ask Ayush (M2AskAyush) opens /ayush.
 * - My health (M2Insights) opens /your-care.
 * - Profile (M2Profile) opens /profile.
 * The old tabs' shop and lab tests are on Home's service rail.
 */
export const STUDENT_NAV_ROUTES: Readonly<Record<PillNavKey, RoutePath>> = {
  home: 'home',
  orders: 'orders',
  ayush: 'ayush',
  health: 'your-care',
  profile: 'profile',
};
