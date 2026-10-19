import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as http from '@/data/services/http';
import type { Account } from '@/data/types/workflowTypes';
import { AuthProvider } from '@/data/contexts/AuthContext';
import { ThemeProvider, applyCachedTheme } from '@/theme/tokens/theme';
import { AppearanceSetting } from '@/components/interface/AppearanceSetting';
import { AccountAppearanceProvider } from '../AccountAppearanceSync';

const student: Account = {
  id: 'a1', fullName: 'Asha Rao', role: 'STUDENT', email: 'a@b.edu', phone: '', dob: '', university: '',
  rollNumber: '', bloodGroup: '', ageVerified: true, isVerifiedStudent: false,
};

const store = new Map<string, string>();
const stubStorage = () => vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear(),
});

beforeEach(() => {
  stubStorage();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  store.clear();
  document.documentElement.removeAttribute('data-theme');
});

type Server = { signedIn: boolean; account: string | null; patchFails?: boolean };

function serve(server: Server) {
  return vi.spyOn(http, 'apiRequest').mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/auth/session') return server.signedIn ? { user: student, csrfToken: 't' } : { user: null, csrfToken: '' };
    if (path === '/profile/appearance') {
      if (!server.signedIn) throw new http.ApiError('Sign in to continue.', 401);
      if (init?.method === 'PATCH') {
        if (server.patchFails) throw new http.ApiError('Cannot connect to the care service.', 0);
        server.account = JSON.parse(String(init.body)).appearance;
      }
      return { appearance: server.account, updatedAt: server.account ? 1 : null };
    }
    throw new Error(`unexpected ${path}`);
  });
}

function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <AccountAppearanceProvider>
          <AppearanceSetting />
        </AccountAppearanceProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

const patches = (spy: ReturnType<typeof serve>) => spy.mock.calls.filter(([, init]) => init?.method === 'PATCH').map(([, init]) => JSON.parse(String(init?.body)));

describe('appearance across devices (web)', () => {
  it('applies the cached choice before React draws, so there is no flash of the wrong theme', () => {
    store.set('sa_care_theme', 'dark');
    applyCachedTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('signed in: the account’s choice replaces the cached one and becomes the new cache', async () => {
    store.set('sa_care_theme', 'light');
    const spy = serve({ signedIn: true, account: 'DARK' });
    renderApp();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(store.get('sa_care_theme')).toBe('dark');
    expect(patches(spy)).toEqual([]);
    expect(await screen.findByText('Saved to your account. The Studentkare app uses it too.')).toBeInTheDocument();
  });

  it('signed in: a new choice is applied at once and saved to the account', async () => {
    const server: Server = { signedIn: true, account: null };
    const spy = serve(server);
    renderApp();
    await screen.findByText('Saved to your account. The Studentkare app uses it too.');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await waitFor(() => expect(patches(spy)).toEqual([{ appearance: 'DARK' }]));
    expect(server.account).toBe('DARK');
  });

  it('offline save: keeps the look on this device, says it is not on the account, and retries', async () => {
    const server: Server = { signedIn: true, account: null, patchFails: true };
    const spy = serve(server);
    renderApp();
    await screen.findByText('Saved to your account. The Studentkare app uses it too.');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(await screen.findByText("Saved on this device only. We couldn't save it to your account. Try again.")).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(store.get('sa_care_theme')).toBe('dark');

    server.patchFails = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Saved to your account. The Studentkare app uses it too.');
    expect(server.account).toBe('DARK');
    expect(patches(spy)).toHaveLength(2);
  });

  it('signed out: the choice is this browser’s only and nothing asks the account', async () => {
    const spy = serve({ signedIn: false, account: null });
    renderApp();
    await screen.findByText('Saved on this device. Sign in to use it on all your devices.');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(spy.mock.calls.some(([path]) => path === '/profile/appearance')).toBe(false);
  });
});
