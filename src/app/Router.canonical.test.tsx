import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AccountRole } from '@/data/types/workflowTypes';
import { BrowserRouter, useLocation, useParams } from '@/core/navigation';

const auth: { status: string; user: { role: AccountRole } | null; error: string; errorStatus: number; refresh: () => void } = { status: 'authenticated', user: { role: 'SUPER_ADMIN' }, error: '', errorStatus: 0, refresh: vi.fn() };

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/design-system/feedback/ScreenLoading', () => ({ ScreenLoading: () => <p>Loading…</p> }));

import { AppRouter, CanonicalPath } from './Router';
import { registerModule } from '@/core/routing/registry';

const page = (text: string) => () => Promise.resolve({ default: () => <p>{text}</p> });
const superAdmin = (role: AccountRole | null) => role === 'SUPER_ADMIN';

function PostPage() {
  const { slug = '' } = useParams();
  return <p>Post {slug}</p>;
}

registerModule({
  id: 'canonical-path-test',
  title: 'Canonical path test',
  basePath: '/',
  routes: [
    { path: '/', public: true, load: page('Home page') },
    { path: '/shop', public: true, load: page('Shop page') },
    { path: '/login', public: true, load: page('Sign-in page') },
    { path: '/admin', access: superAdmin, load: page('Admin overview') },
    { path: '/admin/accounts', access: superAdmin, load: page('Accounts board') },
    { path: '/blog/:slug', public: true, load: () => Promise.resolve({ default: PostPage }) },
  ],
});

function Where() {
  const location = useLocation();
  return <output data-testid="where">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function renderAt(url: string) {
  window.history.replaceState({}, '', url);
  render(<BrowserRouter><CanonicalPath><AppRouter /></CanonicalPath><Where /></BrowserRouter>);
}

beforeEach(() => {
  auth.status = 'authenticated';
  auth.user = { role: 'SUPER_ADMIN' };
});

describe('CanonicalPath sends every spelling of a path to its canonical form', () => {
  it('opens the admin screen for /admin/, not the shop', async () => {
    renderAt('/admin/');
    expect(await screen.findByText('Admin overview')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin$/);
  });

  it('opens the admin screen for /ADMIN', async () => {
    renderAt('/ADMIN');
    expect(await screen.findByText('Admin overview')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin$/);
  });

  it('collapses repeated slashes, fixes the case and keeps the query and hash', async () => {
    renderAt('/Admin//Accounts/?tab=open#row-2');
    expect(await screen.findByText('Accounts board')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin\/accounts\?tab=open#row-2$/);
  });

  it('fixes /blog but hands the slug to the page as typed', async () => {
    renderAt('/Blog/Exam-Stress/?ref=home#top');
    expect(await screen.findByText('Post Exam-Stress')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/blog\/Exam-Stress\?ref=home#top$/);
  });

  it('leaves a canonical path alone', async () => {
    window.history.replaceState({}, '', '/admin/accounts?tab=open');
    const replace = vi.spyOn(window.history, 'replaceState');
    render(<BrowserRouter><CanonicalPath><AppRouter /></CanonicalPath><Where /></BrowserRouter>);
    expect(await screen.findByText('Accounts board')).toBeInTheDocument();
    // BrowserRouter stamps its own history state on mount; no call may change the URL.
    expect(replace.mock.calls.filter((call) => call[2] !== undefined)).toEqual([]);
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin\/accounts\?tab=open$/);
    replace.mockRestore();
  });

  it('leaves the root alone', async () => {
    renderAt('/');
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('keeps ?next= on the sign-in page', async () => {
    auth.status = 'anonymous';
    auth.user = null;
    renderAt('/login/?next=admin');
    expect(await screen.findByText('Sign-in page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/login\?next=admin$/);
  });

  it('asks a signed-out visitor to sign in with the canonical page as next', async () => {
    auth.status = 'anonymous';
    auth.user = null;
    renderAt('/ADMIN/accounts/');
    expect(await screen.findByText('Sign-in page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/login\?next=admin%2Faccounts$/);
  });
});
