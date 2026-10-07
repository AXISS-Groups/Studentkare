import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AccountRole } from '@/data/workflowTypes';

const auth: { status: string; user: { role: AccountRole } | null; error: string; refresh: () => void } = { status: 'anonymous', user: null, error: '', refresh: vi.fn() };
let pathname = '/admin/accounts';

vi.mock('@/data/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/core/navigation', () => ({
  useLocation: () => ({ pathname, search: '' }),
  Navigate: ({ to }: { to: string }) => <p>Redirect to {to}</p>,
  Route: () => null,
  Routes: () => null,
}));
vi.mock('@/components/health/ScreenLoading', () => ({ ScreenLoading: () => <p>Loading…</p> }));

import { RouteGuard } from '../Router';
import { resolveAccess } from '../registry';
import '@/features/health/module';

const superAdminOnly = (role: AccountRole | null) => role === 'SUPER_ADMIN';

beforeEach(() => {
  auth.status = 'anonymous';
  auth.user = null;
  pathname = '/admin/accounts';
});

describe('authentication: is this user signed in?', () => {
  it('sends a signed-out user to /login and keeps the page they wanted', () => {
    render(<RouteGuard access={superAdminOnly}><p>Accounts</p></RouteGuard>);
    expect(screen.getByText('Redirect to /login?next=admin%2Faccounts')).toBeInTheDocument();
    expect(screen.queryByText('Accounts')).toBeNull();
  });

  it('waits for the session check before deciding', () => {
    auth.status = 'loading';
    render(<RouteGuard access={superAdminOnly}><p>Accounts</p></RouteGuard>);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Accounts')).toBeNull();
  });

  it('lets public pages through without a session', () => {
    render(<RouteGuard public><p>Login</p></RouteGuard>);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});

describe('authorisation: may this role open it?', () => {
  it.each([
    ['STUDENT', '/health'],
    ['VENDOR', '/vendor'],
    ['NMC_DOCTOR', '/clinician'],
    ['CAMPUS_ADMIN', '/campus'],
  ] as [AccountRole, string][])('sends a %s who types an admin URL to their own home (%s)', (role, home) => {
    auth.status = 'authenticated';
    auth.user = { role };
    render(<RouteGuard access={superAdminOnly}><p>Accounts</p></RouteGuard>);
    expect(screen.getByText(`Redirect to ${home}`)).toBeInTheDocument();
    expect(screen.queryByText('Accounts')).toBeNull();
  });

  it('shows the admin page to a super admin', () => {
    auth.status = 'authenticated';
    auth.user = { role: 'SUPER_ADMIN' };
    render(<RouteGuard access={superAdminOnly}><p>Accounts</p></RouteGuard>);
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('grants the registered /admin routes to super admins only', () => {
    (['/admin', '/admin/accounts', '/admin/audit'] as const).forEach(path => {
      expect(resolveAccess(path, 'SUPER_ADMIN')).toBe(true);
      (['STUDENT', 'VENDOR', 'NMC_DOCTOR', 'CAMPUS_ADMIN'] as AccountRole[]).forEach(role => expect(resolveAccess(path, role), `${role} ${path}`).toBe(false));
      expect(resolveAccess(path, null)).toBe(false);
    });
  });
});
