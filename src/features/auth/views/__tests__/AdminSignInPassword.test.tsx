import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';

// Passwords on the staff page (plan tier1-auth-password-2026-10-22): a "Password"
// option beside the emailed code and the team PIN. The server's one answer for
// every failure is shown as it is, the password never survives a try, the
// authenticator step still follows, and the option is gone when the switch is off.

const FAILED = 'That ID and password don’t match, or the account is locked. After 5 wrong passwords it locks for 15 minutes.';
const PASSWORD = 'Tamarind-river 42';
let passwordAnswer: () => Promise<unknown> = async () => ({ success: true, user: { id: 'team-campus', role: 'CAMPUS_ADMIN', isTeamAccount: true }, csrfToken: 'c' });
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/staff-password/sign-in') return passwordAnswer();
  if (path === '/auth/2fa/challenge') return { success: true, user: { id: 'team-superadmin', role: 'SUPER_ADMIN' }, csrfToken: 'c' };
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
const acceptSession = vi.fn();
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ acceptSession, status: 'anonymous', user: null }) }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: vi.fn(),
}));

import { AdminSignInScreen, AdminSignInView } from '../AdminSignInView';
import { AuthViewModel } from '../../viewmodel/AuthViewModel';

function choosePassword() {
  fireEvent.click(screen.getByRole('radio', { name: 'Password' }));
}

function fill(id: string, password: string) {
  fireEvent.change(screen.getByLabelText('Team account ID'), { target: { value: id } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  apiRequest.mockClear();
  acceptSession.mockClear();
  passwordAnswer = async () => ({ success: true, user: { id: 'team-campus', role: 'CAMPUS_ADMIN', isTeamAccount: true }, csrfToken: 'c' });
});

describe('Staff sign-in with a password', { timeout: 20_000 }, () => {
  it('offers the password as a third option', () => {
    render(<AdminSignInScreen />);
    expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Emailed code', 'Team PIN', 'Password']);
    expect(screen.getByRole('radio', { name: 'Password' })).toHaveAttribute('aria-checked', 'false');
  });

  it('signs in with the ID and password exactly as typed', async () => {
    render(<AdminSignInScreen />);
    choosePassword();
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeDisabled();
    fill('campus@studentkare.co', PASSWORD);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    fireEvent.click(submit);
    await waitFor(() => expect(acceptSession).toHaveBeenCalledTimes(1));
    const [path, init] = apiRequest.mock.calls[0];
    expect(path).toBe('/auth/staff-password/sign-in');
    expect(JSON.parse(String(init?.body))).toEqual({ identifier: 'campus@studentkare.co', password: PASSWORD });
  });

  it('shows and hides the password with a labelled button', () => {
    render(<AdminSignInScreen />);
    choosePassword();
    fill('campus@studentkare.co', PASSWORD);
    const reveal = screen.getByRole('button', { name: 'Show the password' });
    expect(reveal).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(reveal);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide the password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('shows the server’s one answer, keeps no password and opens nothing', async () => {
    passwordAnswer = async () => { throw new ApiError(FAILED, 401, { code: 'PASSWORD_FAILED', message: FAILED }); };
    render(<AdminSignInScreen />);
    choosePassword();
    fill('campus@studentkare.co', PASSWORD);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(FAILED);
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('still asks for the authenticator when the account has one', async () => {
    passwordAnswer = async () => ({ success: true, requires2FA: true, tempToken: 't1', user: null });
    render(<AdminSignInScreen />);
    choosePassword();
    fill('superadmin@studentkare.co', PASSWORD);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Two-factor check.')).toBeInTheDocument();
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('has no password option when its switch is off, and keeps the PIN', () => {
    const vm = new AuthViewModel('login', null, vi.fn());
    vm.setAudience('STAFF');
    render(<AdminSignInView vm={vm} onAccept={vi.fn()} pinEnabled passwordEnabled={false} />);
    expect(screen.queryByRole('radio', { name: 'Password' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Team PIN' })).toBeInTheDocument();
  });

  it('offers the password beside the code when only the PIN is off', () => {
    const vm = new AuthViewModel('login', null, vi.fn());
    vm.setAudience('STAFF');
    render(<AdminSignInView vm={vm} onAccept={vi.fn()} pinEnabled={false} passwordEnabled />);
    expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Emailed code', 'Password']);
  });

  it('is axe-clean with the password form and with its error', async () => {
    passwordAnswer = async () => { throw new ApiError(FAILED, 401); };
    const { container } = render(<AdminSignInScreen />);
    choosePassword();
    let violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    fill('campus@studentkare.co', PASSWORD);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
