import type { PillNavKey } from '@/design-system/m2';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * The Mobile 2.0 pill nav's five destinations (canvas page 9, approved
 * 2026-10-21) and the web route each opens. Moved out of
 * screens/workspace/StudentPhoneFrame.tsx (architecture guardrail, phase 3):
 * it is plain data, not a screen, so feature views may import it directly
 * instead of reaching into screens/.
 */
export const STUDENT_NAV_ROUTES: Readonly<Record<PillNavKey, RoutePath>> = {
  home: 'dashboard',
  orders: 'orders',
  ayush: 'ayush',
  health: 'health',
  profile: 'profile',
};
