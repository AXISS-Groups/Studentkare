import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AccountRole } from '@/data/types/workflowTypes';

const auth: { status: string; user: { role: AccountRole } | null; error: string; errorStatus: number; refresh: () => void } = { status: 'anonymous', user: null, error: '', errorStatus: 0, refresh: vi.fn() };
let pathname = '/admin/accounts';

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => auth }));
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
  auth.error = '';
  auth.errorStatus = 0;
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

describe('a session check that failed', () => {
  it('says the session could not be checked, with the reason and a retry', () => {
    auth.status = 'error';
    auth.error = 'Cannot connect to the care service.';
    render(<RouteGuard access={superAdminOnly}><p>Accounts</p></RouteGuard>);
    expect(screen.getByRole('alert')).toHaveTextContent('Your session could not be checked.');
    expect(screen.getByText('Cannot connect to the care service.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry session check' })).toBeInTheDocument();
    expect(screen.queryByText('Accounts')).toBeNull();
  });

  it('asks for a moment, not a broken session, when the server rate-limited the check (429)', () => {
    auth.status = 'error';
    auth.error = 'Too many requests. Please try again shortly.';
    auth.errorStatus = 429;
    render(<RouteGuard access={superAdminOnly}><p>Accounts</p></RouteGuard>);
    expect(screen.getByRole('alert')).toHaveTextContent('Too many requests — try again in a moment');
    expect(screen.queryByText('Your session could not be checked.')).toBeNull();
    screen.getByRole('button', { name: 'Retry session check' }).click();
    expect(auth.refresh).toHaveBeenCalled();
    expect(screen.queryByText('Accounts')).toBeNull();
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

  it('keeps students out of the campus admin consoles', () => {
    ['/campus', '/campus-access-requests', '/campus-break-glass'].forEach(path => {
      expect(resolveAccess(path, 'STUDENT'), path).toBe(false);
      expect(resolveAccess(path, 'CAMPUS_ADMIN'), path).toBe(true);
    });
  });
});
