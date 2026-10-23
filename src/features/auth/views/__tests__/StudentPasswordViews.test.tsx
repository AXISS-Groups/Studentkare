import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';

// Plan tier1-auth-password-2026-10-22: "Use my password" on sign in, and the two new
// sign-up steps (verify the other contact, create a password). The server's one answer
// for every failure is shown as it is; typed secrets never survive a try.

const FAILED = 'That ID and password don’t match, or the account is locked. After 5 wrong passwords it locks for 15 minutes.';
let answers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => (answers[path] ? answers[path]() : {}));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
  setCsrfToken: vi.fn(),
}));

import { AuthViewModel, PASSWORD_STEP, SECOND_CONTACT_STEP } from '../../viewmodel/AuthViewModel';
import { CreatePasswordStep, PasswordSignInView, SecondContactStep } from '../StudentPasswordViews';

const body = (path: string) => JSON.parse(String(apiRequest.mock.calls.find(([p]) => p === path)?.[1]?.body));

beforeEach(() => {
  apiRequest.mockClear();
  answers = {};
});

describe('Use my password', { timeout: 20_000 }, () => {
  function signInVm(identifier = 'asha@example.test') {
    const vm = new AuthViewModel('login', null, vi.fn());
    vm.setIdentifier(identifier);
    vm.startPassword();
    return vm;
  }

  it('needs the email or number typed first', () => {
    const vm = new AuthViewModel('login', null, vi.fn());
    vm.startPassword();
    expect(vm.passwordEntry).toBe(false);
    expect(vm.passwordProblem).toBe('NEED_ID');
  });

  it('signs in with what was typed and opens the server’s session', async () => {
    answers['/auth/password/sign-in'] = async () => ({ success: true, user: { id: 's1', role: 'STUDENT' }, csrfToken: 'c' });
    const accept = vi.fn();
    render(<PasswordSignInView vm={signInVm()} onAccept={accept} />);
    expect(screen.getByText('For asha@example.test.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
    expect(body('/auth/password/sign-in')).toEqual({ identifier: 'asha@example.test', password: 'Tamarind-river 42' });
  });

  it('shows the one answer and keeps no password', async () => {
    answers['/auth/password/sign-in'] = async () => { throw new ApiError(FAILED, 401, { code: 'PASSWORD_FAILED' }); };
    const accept = vi.fn();
    render(<PasswordSignInView vm={signInVm()} onAccept={accept} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Wrong-river 99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(accept).not.toHaveBeenCalled();
  });

  it('goes to the authenticator when the account has one', async () => {
    answers['/auth/password/sign-in'] = async () => ({ success: true, requires2FA: true, tempToken: 't', user: null });
    const vm = signInVm();
    render(<PasswordSignInView vm={vm} onAccept={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(vm.step).toBe(7));
  });

  it('offers a code beside it, and “forgot” signs in with a code first', async () => {
    answers['/auth/otp/send'] = async () => ({ targetMasked: 'a•••@example.test', expiresInSeconds: 300 });
    const vm = signInVm();
    render(<PasswordSignInView vm={vm} onAccept={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password? Sign in with a code' }));
    await waitFor(() => expect(vm.step).toBe(3));
    expect(vm.next).toBe('security');
  });

  it('shows and hides the password', () => {
    render(<PasswordSignInView vm={signInVm()} onAccept={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show the password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('is axe-clean', async () => {
    const { container } = render(<PasswordSignInView vm={signInVm()} onAccept={vi.fn()} />);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('Sign-up: the other contact', { timeout: 20_000 }, () => {
  function signupVm() {
    const vm = new AuthViewModel('signup', null, vi.fn());
    vm.setChannel('EMAIL');
    vm.advance(SECOND_CONTACT_STEP);
    return vm;
  }

  it('asks for WhatsApp after an email, sends a code and verifies it', async () => {
    answers['/auth/signup/contact/send-code'] = async () => ({ targetMasked: '+91 ••••••6780' });
    answers['/auth/signup/contact/verify'] = async () => ({ success: true, verified: true });
    const vm = signupVm();
    render(<SecondContactStep vm={vm} />);
    expect(screen.getByRole('heading', { name: 'Add your WhatsApp number' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9123456780' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a code' }));
    expect(await screen.findByText(/Sent to \+91 ••••••6780/)).toBeInTheDocument();
    expect(body('/auth/signup/contact/send-code')).toEqual({ value: '9123456780' });
    fireEvent.change(screen.getByLabelText('The 6-digit code'), { target: { value: '482917' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(vm.step).toBe(4));
    expect(vm.secondVerified).toBe(true);
  });

  it('says when the number is on another account', async () => {
    answers['/auth/signup/contact/send-code'] = async () => { throw new ApiError('used', 409, { code: 'CONTACT_IN_USE' }); };
    render(<SecondContactStep vm={signupVm()} />);
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9123456780' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That is already used by another account.');
  });

  it('goes straight to details when the other channel can’t deliver', async () => {
    answers['/auth/options'] = async () => ({ channels: ['EMAIL'] });
    answers['/auth/otp/verify'] = async () => ({ success: true, requiresSignup: true, csrfToken: 'c', user: null });
    const vm = new AuthViewModel('signup', null, vi.fn());
    await vm.loadOptions();
    vm.setCode('123456');
    await vm.verify(vi.fn());
    expect(vm.step).toBe(4);
  });
});

describe('Sign-up: create a password', { timeout: 20_000 }, () => {
  function passwordVm() {
    const vm = new AuthViewModel('signup', null, vi.fn());
    vm.advance(PASSWORD_STEP);
    return vm;
  }

  it('checks the length and that both match before going on', () => {
    const vm = passwordVm();
    render(<CreatePasswordStep vm={vm} next={8} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 10 characters.');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Tamarind-river 43' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The two passwords don’t match.');
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(vm.step).toBe(8);
  });

  it('sends the password with sign-up, and comes back here when the server finds it weak', async () => {
    answers['/auth/signup'] = async () => { throw new ApiError('weak', 422, { code: 'PASSWORD_WEAK' }); };
    const vm = passwordVm();
    vm.setNewPassword('Tamarind-river 42');
    vm.setPasswordAgain('Tamarind-river 42');
    vm.consent.toggle('RECORDS_STORAGE');
    vm.consent.toggle('CAMPUS_ENROLMENT');
    vm.consent.toggle('ADULT_18_PLUS');
    vm.advance(8);
    await vm.completeSignup(vi.fn());
    expect(body('/auth/signup').password).toBe('Tamarind-river 42');
    expect(vm.step).toBe(PASSWORD_STEP);
    expect(vm.newPasswordProblem).toBe('authpw.weak');
    expect(vm.password).toBe('');
  });

  it('is axe-clean', async () => {
    const { container } = render(<CreatePasswordStep vm={passwordVm()} next={8} />);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
