import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';

// Team accounts on the staff page (founder decision 2026-10-22): a "Team PIN"
// option beside the emailed code. The server's one answer for every failure is
// shown as it is, the PIN never survives a try, the authenticator step still
// follows, and the option is gone when the switch is off.

const FAILED = 'That ID and PIN don’t match, or the account is locked. After 5 wrong PINs an account locks for 15 minutes.';
let pinAnswer: () => Promise<unknown> = async () => ({ success: true, user: { id: 'team-campus', role: 'CAMPUS_ADMIN', isTeamAccount: true }, csrfToken: 'c' });
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/staff-pin/sign-in') return pinAnswer();
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

function choosePin() {
  fireEvent.click(screen.getByRole('radio', { name: 'Team PIN' }));
}

function fill(id: string, pin: string) {
  fireEvent.change(screen.getByLabelText('Team account ID'), { target: { value: id } });
  fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  apiRequest.mockClear();
  acceptSession.mockClear();
  pinAnswer = async () => ({ success: true, user: { id: 'team-campus', role: 'CAMPUS_ADMIN', isTeamAccount: true }, csrfToken: 'c' });
});

describe('Staff sign-in with a team PIN', { timeout: 20_000 }, () => {
  it('offers the emailed code first, with the team PIN beside it', () => {
    render(<AdminSignInScreen />);
    const group = screen.getByRole('radiogroup', { name: 'How do you want to sign in?' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Emailed code' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Team PIN' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
  });

  it('signs in with the ID and PIN and opens the session the server gave', async () => {
    render(<AdminSignInScreen />);
    choosePin();
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeDisabled();
    fill('campus@studentkare.co', '48a29x17');           // letters are dropped, six digits kept
    expect(screen.getByLabelText('PIN')).toHaveValue('482917');
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(acceptSession).toHaveBeenCalledTimes(1));
    const [path, init] = apiRequest.mock.calls[0];
    expect(path).toBe('/auth/staff-pin/sign-in');
    expect(JSON.parse(String(init?.body))).toEqual({ identifier: 'campus@studentkare.co', pin: '482917' });
  });

  it('shows the server’s one answer, keeps no PIN and opens nothing', async () => {
    pinAnswer = async () => { throw new ApiError(FAILED, 401, { code: 'STAFF_PIN_FAILED', message: FAILED }); };
    render(<AdminSignInScreen />);
    choosePin();
    fill('campus@studentkare.co', '482917');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(FAILED);
    expect(screen.getByLabelText('PIN')).toHaveValue('');
    expect(screen.getByLabelText('PIN')).toHaveAttribute('aria-invalid', 'true');
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('still asks for the authenticator when the account has one', async () => {
    pinAnswer = async () => ({ success: true, requires2FA: true, tempToken: 't1', user: null });
    render(<AdminSignInScreen />);
    choosePin();
    fill('superadmin@studentkare.co', '482917');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Two-factor check.')).toBeInTheDocument();
    expect(acceptSession).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(acceptSession).toHaveBeenCalledTimes(1));
  });

  it('moves between the two options with the arrow keys', () => {
    render(<AdminSignInScreen />);
    const code = screen.getByRole('radio', { name: 'Emailed code' });
    fireEvent.keyDown(code, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Team PIN' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Team account ID')).toBeInTheDocument();
  });

  it('has no PIN option when the switch is off', () => {
    const vm = new AuthViewModel('login', null, vi.fn());
    vm.setAudience('STAFF');
    render(<AdminSignInView vm={vm} onAccept={vi.fn()} pinEnabled={false} passwordEnabled={false} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByLabelText('PIN')).toBeNull();
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
  });

  it('never claims there are no shared accounts', () => {
    render(<AdminSignInScreen />);
    expect(screen.queryByText(/no shared accounts/i)).toBeNull();
  });

  it('is axe-clean with the PIN form and with its error', async () => {
    pinAnswer = async () => { throw new ApiError(FAILED, 401); };
    const { container } = render(<AdminSignInScreen />);
    choosePin();
    let violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    fill('campus@studentkare.co', '482917');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
