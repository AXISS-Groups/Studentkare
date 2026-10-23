import { apiRequest } from '@/data/services/http';
import type { AccountRole, PartnerKind } from '@/data/types/workflowTypes';

/** One shared team account, as GET /ops/team-accounts lists it. Never its PIN, password or a hash. */
export interface TeamAccount {
  id: string;
  identifier: string;
  fullName: string;
  role: AccountRole;
  partnerKind: PartnerKind | '';
  active: boolean;
  /** The test campus or test partner organisation it sees; "" for the super admin (whole platform). */
  scope: string;
  hasPin: boolean;
  locked: boolean;
  /** Seconds since the epoch, while locked. */
  lockedUntil: number | null;
  failedAttempts: number;
  hasPassword: boolean;
  /** Too many wrong passwords: Unlock clears it, like the PIN lock. */
  passwordLocked: boolean;
  lastSignInAt: number | null;
  rotatedAt: number | null;
  /** The account this session is signed in with. */
  isSelf: boolean;
  /** The shared super admin, retired for named super admins (audit H3): stays off, can't be rotated. */
  retired?: boolean;
}

export interface TeamAccountList { items: TeamAccount[]; pinSignInEnabled: boolean; passwordSignInEnabled: boolean }

/** Only for your own account: the PIN or the password you have now. The server refuses without one. */
export interface CurrentSecret { currentPin?: string; currentPassword?: string }

/** The new PIN, in the one answer that ever carries it. */
export interface RotatedPin { id: string; identifier: string; pin: string }

/** Super admin → Team accounts. The only place that knows the /ops/team-accounts endpoints. */
export interface TeamAccountsRepository {
  list(signal?: AbortSignal): Promise<TeamAccountList>;
  /** `currentPin` only for your own account: the server refuses without it. */
  rotate(accountId: string, currentPin?: string): Promise<RotatedPin>;
  unlock(accountId: string): Promise<TeamAccount>;
  disable(accountId: string): Promise<TeamAccount>;
  /** Sets or replaces the password. The answer is the account's row, never the password. */
  setPassword(accountId: string, password: string, current?: CurrentSecret): Promise<TeamAccount>;
}

const path = (accountId: string, action: string) => `/ops/team-accounts/${encodeURIComponent(accountId)}/${action}`;

export const teamAccountsRepository: TeamAccountsRepository = {
  list: signal => apiRequest<TeamAccountList>('/ops/team-accounts', { signal }),
  rotate: (accountId, currentPin) => apiRequest<RotatedPin>(path(accountId, 'rotate'), {
    method: 'POST', body: JSON.stringify(currentPin ? { currentPin } : {}),
  }),
  unlock: accountId => apiRequest<TeamAccount>(path(accountId, 'unlock'), { method: 'POST' }),
  disable: accountId => apiRequest<TeamAccount>(path(accountId, 'disable'), { method: 'POST' }),
  setPassword: (accountId, password, current) => apiRequest<TeamAccount>(path(accountId, 'password'), {
    method: 'POST', body: JSON.stringify({ password, ...current }),
  }),
};

/** A super admin who is one named person (GET /ops/super-admins; audit H3). */
export interface NamedSuperAdmin {
  id: string;
  fullName: string;
  identifier: string;
  active: boolean;
  twoFactorEnabled: boolean;
  createdAt: number;
  /** The first sign-in through the authenticator step; what retiring the shared one waits for. */
  totpSignedInAt: number | null;
  isSelf: boolean;
}

export interface NamedSuperAdminState {
  items: NamedSuperAdmin[];
  shared: { id: string; identifier: string; active: boolean; retired: boolean } | null;
  readyToRetire: boolean;
  viewerIsNamed: boolean;
}

/** The only place that knows the /ops/super-admins endpoints. */
export interface NamedSuperAdminsRepository {
  state(): Promise<NamedSuperAdminState>;
  create(email: string, fullName: string): Promise<NamedSuperAdminState>;
  /** The typed confirmation word is checked by the server too. */
  retireShared(confirm: string): Promise<NamedSuperAdminState>;
}

export const namedSuperAdminsRepository: NamedSuperAdminsRepository = {
  state: () => apiRequest<NamedSuperAdminState>('/ops/super-admins'),
  create: (email, fullName) => apiRequest<NamedSuperAdminState>('/ops/super-admins', { method: 'POST', body: JSON.stringify({ email, fullName }) }),
  retireShared: confirm => apiRequest<NamedSuperAdminState>('/ops/super-admins/retire-shared', { method: 'POST', body: JSON.stringify({ confirm }) }),
};

/** What the person types to retire the shared super admin (backend named_super_admins.CONFIRM_WORD). */
export const RETIRE_CONFIRM_WORD = 'RETIRE';
