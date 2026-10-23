import type { RoutePath } from '../workflowRouting';

/**
 * Routes open without a session, one per line, sorted. Partner consoles are not public:
 * the route registry holds them to VENDOR and SUPER_ADMIN (features/health/module.ts), and
 * listing them here made readReturnPath drop them as sign-in targets.
 * This file is merged with git's union driver (.gitattributes): keep it a pure list.
 */
export const publicRoutes: RoutePath[] = [
  // keep-sorted start
  'blog',
  'campuses',
  'campuses/apply',
  'care',
  'claim',
  'clinicians',
  'clinicians/apply',
  'crisis',
  'find-care',
  'lab-tests',
  'landing',
  'logged-out',
  'login',
  'medicine-info',
  'news',
  'partnerships',
  'partnerships/apply',
  'pricing',
  'privacy',
  'series',
  'shop',
  'signup',
  'staff-sign-in',
  'terms',
  'welcome',
  // keep-sorted end
];
