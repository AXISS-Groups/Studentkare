import type { AccountRole } from '@/data/workflowTypes';
import { RBACManager, type UserRole } from '@/core/auth/rbac';
import { homeForRole, type RoutePath } from '@/lib/workflowRouting';

/**
 * What each account role may do, read from the app's own rules for display on Accounts &
 * roles. These describe the client; the server and database checks are the ones that hold.
 */

/** The account roles, in the order Accounts & roles lists them: role, name, who holds it. */
export const ROLE_ROWS: [AccountRole, string, string][] = [
  ['STUDENT', 'Student', 'Owns their own record'],
  ['NMC_DOCTOR', 'NMC Doctor', 'Registered clinician'],
  ['VENDOR', 'Vendor', 'Pharmacy, lab or provider'],
  ['CAMPUS_ADMIN', 'Campus Admin', 'Institution staff'],
  ['SUPER_ADMIN', 'Super Admin', 'Platform operations'],
];

/** Clinical access from the app's permission table (src/core/auth/rbac.ts). */
const RBAC_ROLE: Partial<Record<AccountRole, UserRole>> = { STUDENT: 'student', NMC_DOCTOR: 'campus_clinician', CAMPUS_ADMIN: 'campus_admin', SUPER_ADMIN: 'super_admin' };
export function clinicalAccess(role: AccountRole): { label: string; tone: string } {
  const mapped = RBAC_ROLE[role];
  if (!mapped) return { label: 'Permission policy unavailable', tone: 'is-attention' };
  const rbac = RBACManager.getInstance();
  if (rbac.hasPermission(mapped, 'read:consented_clinical')) return { label: 'Consented records only', tone: 'is-positive' };
  if (rbac.hasPermission(mapped, 'read:own_clinical')) return { label: 'Own record only', tone: 'is-positive' };
  return { label: 'No clinical access', tone: 'is-positive' };
}

/** Names for the workspace each role is sent to after sign-in (homeForRole). */
const HOME_LABEL: Partial<Record<RoutePath, string>> = { health: 'Student portal', clinician: 'Clinical workspace', vendor: 'Vendor workspace', campus: 'Campus administration', admin: 'Platform administration' };

/** The part of the app a role works in: its home route from the app's own routing. */
export const appAccess = (role: AccountRole): string => HOME_LABEL[homeForRole(role)] ?? 'Workspace unavailable';
