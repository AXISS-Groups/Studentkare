/**
 * Roles and permissions, for display only (P48).
 *
 * The client never enforces access: it uses this table to label and hide UI
 * (e.g. the admin accounts screen says what a role may read). Every real access
 * decision is made by the backend's role guards. An earlier version also held
 * "break-glass" sessions in a browser Map with Math.random ids; that was removed
 * (audit TD-37). Emergency access, if built, is a server endpoint with an audit
 * log, never client state.
 */

export type UserRole =
  | 'student'
  | 'parent'
  | 'campus_admin'
  | 'campus_clinician'
  | 'external_clinician'
  | 'support'
  | 'super_admin'
  | 'service_account';

export type Permission =
  | 'read:own_profile'
  | 'read:own_clinical'
  | 'write:own_clinical'
  | 'read:consented_clinical'
  | 'write:consented_clinical'
  | 'read:operational_metadata'
  | 'manage:tenant_roster';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: ['read:own_profile', 'read:own_clinical', 'write:own_clinical'],
  parent: ['read:own_profile'],
  campus_admin: ['read:own_profile', 'read:operational_metadata', 'manage:tenant_roster'],
  campus_clinician: ['read:own_profile', 'read:consented_clinical', 'write:consented_clinical'],
  external_clinician: ['read:own_profile', 'read:consented_clinical', 'write:consented_clinical'],
  support: ['read:own_profile', 'read:operational_metadata'], // NO clinical read permission! (P48)
  super_admin: ['read:own_profile', 'read:operational_metadata', 'manage:tenant_roster'], // NO direct clinical access
  service_account: ['read:operational_metadata'],
};

export class RBACManager {
  private static instance: RBACManager;

  private constructor() {}

  public static getInstance(): RBACManager {
    if (!RBACManager.instance) {
      RBACManager.instance = new RBACManager();
    }
    return RBACManager.instance;
  }

  /**
   * Checks whether a role has a specific permission.
   */
  public hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }
}
