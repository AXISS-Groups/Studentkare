import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { TwoFactorViewModel } from '../../viewmodel/TwoFactorViewModel';
import { PasswordCardViewModel } from '../../viewmodel/PasswordCardViewModel';
import type { PasswordStatus } from '../../viewmodel/PasswordCardViewModel';
import { SignInSecurityView } from '../SignInSecurityView';

// Sign-in & security, Password (plan tier1-auth-password-2026-10-22, C): set one, change it
// with the current one, change it without after a code sign-in, the server's refusals, axe.

type Requester = typeof import('@/data/services/http').apiRequest;
const NOW = 1_760_000_000_000;
const STATUS: PasswordStatus = { enabled: true, hasPassword: true, locked: false, minLength: 10, replaceWithoutCurrentUntil: null };

async function viewWith(status: PasswordStatus, save: (init?: RequestInit) => unknown = () => ({ success: true })) {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/auth/2fa/status') return { enabled: false, required: false, setupRequired: false };
    if (path === '/auth/password' && init?.method === 'POST') return save(init);
    if (path === '/auth/password') return status;
    return {};
  });
  const twoFa = new TwoFactorViewModel(request as unknown as Requester);
  const password = new PasswordCardViewModel(request as unknown as Requester, () => NOW);
  await Promise.all([twoFa.load(), password.load()]);
  const view = render(<SignInSecurityView viewModel={twoFa} password={password} />);
  return { request, view };
}

const card = () => screen.getByTestId('password-card');
const posted = (request: ReturnType<typeof vi.fn>) => JSON.parse(String(request.mock.calls.find(([p, i]) => p === '/auth/password' && i?.method === 'POST')?.[1]?.body));

describe('Password card', { timeout: 20_000 }, () => {
  it('sets a first password without asking for a current one', async () => {
    const { request } = await viewWith({ ...STATUS, hasPassword: false });
    expect(within(card()).getByText('Not set')).toBeInTheDocument();
    fireEvent.click(within(card()).getByRole('button', { name: 'Set a password' }));
    expect(within(card()).queryByLabelText('Current password')).toBeNull();
    fireEvent.change(within(card()).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(within(card()).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Save password' }));
    expect(await within(card()).findByText(/Password saved/)).toBeInTheDocument();
    expect(posted(request)).toEqual({ password: 'Tamarind-river 42' });
  });

  it('asks for the current password to change it, and says when it is wrong', async () => {
    const { request } = await viewWith(STATUS, () => { throw new ApiError('no', 403, { code: 'PASSWORD_PROOF_NEEDED' }); });
    fireEvent.click(within(card()).getByRole('button', { name: 'Change password' }));
    fireEvent.change(within(card()).getByLabelText('Current password'), { target: { value: 'Old-river 11' } });
    fireEvent.change(within(card()).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(within(card()).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Save password' }));
    expect(await within(card()).findByText('That isn’t your current password.')).toBeInTheDocument();
    expect(posted(request)).toEqual({ password: 'Tamarind-river 42', currentPassword: 'Old-river 11' });
    expect(within(card()).getByLabelText('New password')).toHaveValue('');
  });

  it('doesn’t ask for the old one just after a code sign-in', async () => {
    const { request } = await viewWith({ ...STATUS, replaceWithoutCurrentUntil: NOW / 1000 + 600 });
    fireEvent.click(within(card()).getByRole('button', { name: 'Change password' }));
    expect(within(card()).queryByLabelText('Current password')).toBeNull();
    expect(within(card()).getByText(/the old password isn’t needed/)).toBeInTheDocument();
    fireEvent.change(within(card()).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(within(card()).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Save password' }));
    await waitFor(() => expect(posted(request)).toEqual({ password: 'Tamarind-river 42' }));
  });

  it('refuses two that differ without sending, and shows the server’s weak refusal', async () => {
    const { request } = await viewWith({ ...STATUS, hasPassword: false }, () => { throw new ApiError('weak', 422, { code: 'PASSWORD_WEAK' }); });
    fireEvent.click(within(card()).getByRole('button', { name: 'Set a password' }));
    fireEvent.change(within(card()).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(within(card()).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 43' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Save password' }));
    expect(await within(card()).findByText('The two passwords don’t match.')).toBeInTheDocument();
    expect(request.mock.calls.some(([p, i]) => p === '/auth/password' && i?.method === 'POST')).toBe(false);
    fireEvent.change(within(card()).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Save password' }));
    expect(await within(card()).findByText(/too easy to guess/)).toBeInTheDocument();
  });

  it('is hidden when password sign-in is off', async () => {
    await viewWith({ ...STATUS, enabled: false });
    expect(screen.queryByTestId('password-card')).toBeNull();
  });

  it('is axe-clean with the form open', async () => {
    const { view } = await viewWith(STATUS);
    fireEvent.click(within(card()).getByRole('button', { name: 'Change password' }));
    const violations = await axeViolations(view.container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
