import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';

// Claim a college's invite (plan tier1-auth-password-2026-10-22, amendment b): the token is
// read from the fragment and removed from the address bar; four steps; one request at the end;
// the server's refusals send the student back to the step they concern.

const SUMMARY = { firstName: 'Ravi', university: 'Partner College', sentTo: 'r•••@partner.test', minLength: 10, expiresAt: 1_760_259_200 };
let answers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn(async (path: string, init?: RequestInit): Promise<unknown> => (answers[path] ? answers[path](init) : {}));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
const acceptSession = vi.fn();
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ acceptSession, status: 'anonymous', user: null }) }));
const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: (route: string) => navigate(route),
}));

import { ClaimInviteScreen } from '../ClaimInviteScreen';
import { tokenFromHash } from '../../viewmodel/ClaimInviteViewModel';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
const body = (path: string) => JSON.parse(String(apiRequest.mock.calls.find(([p]) => p === path)?.[1]?.body));

function open() {
  window.history.replaceState(null, '', `/claim#token=${TOKEN}`);
  return render(<ClaimInviteScreen />);
}

async function throughToConsent() {
  fireEvent.change(await screen.findByLabelText('Temporary password'), { target: { value: 'Kp7sQx2mNa9r' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Monsoon kettle 7!' } });
  fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Monsoon kettle 7!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '2002-02-02' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  (await screen.findAllByRole('checkbox')).forEach((box) => fireEvent.click(box));
}

const submit = () => screen.getAllByRole('button').find((button) => (button as HTMLButtonElement).type === 'submit') as HTMLElement;

beforeEach(() => {
  apiRequest.mockClear();
  acceptSession.mockClear();
  navigate.mockClear();
  answers = { '/auth/invite/lookup': async () => SUMMARY };
});

describe('Claim your account', { timeout: 20_000 }, () => {
  it('reads the token from the fragment only', () => {
    expect(tokenFromHash(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash('#token=<script>')).toBe('');
    expect(tokenFromHash('')).toBe('');
  });

  it('looks the link up, then takes the token out of the address bar', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'Welcome, Ravi' })).toBeInTheDocument();
    expect(body('/auth/invite/lookup')).toEqual({ token: TOKEN });
    expect(window.location.hash).toBe('');
    expect(screen.getByText(/The link came to r•••@partner.test/)).toBeInTheDocument();
  });

  it('claims in four steps and opens the account', async () => {
    answers['/auth/invite/claim'] = async () => ({ success: true, user: { id: 's1', role: 'STUDENT' }, csrfToken: 'c' });
    open();
    await throughToConsent();
    fireEvent.click(submit());
    await waitFor(() => expect(acceptSession).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith('account-ready');
    const sent = body('/auth/invite/claim');
    expect(sent).toMatchObject({ token: TOKEN, tempPassword: 'Kp7sQx2mNa9r', password: 'Monsoon kettle 7!', dob: '2002-02-02' });
    expect(sent.consent.purposes).toHaveLength(3);
  });

  it('refuses the temporary password as the new one before sending', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Temporary password'), { target: { value: 'Kp7sQx2mNa9r' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Kp7sQx2mNa9r' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Kp7sQx2mNa9r' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('not the temporary one');
  });

  it('goes back to the temporary password when the server refuses it', async () => {
    answers['/auth/invite/claim'] = async () => { throw new ApiError('That temporary password doesn’t match.', 401, { code: 'INVITE_FAILED' }); };
    open();
    await throughToConsent();
    fireEvent.click(submit());
    expect(await screen.findByLabelText('Temporary password')).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent('doesn’t match');
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('says plainly when the link no longer works', async () => {
    answers['/auth/invite/lookup'] = async () => { throw new ApiError('gone', 404, { code: 'INVITE_INVALID' }); };
    open();
    expect(await screen.findByRole('heading', { name: 'This link doesn’t work any more' })).toBeInTheDocument();
  });

  it('is axe-clean', async () => {
    const { container } = open();
    await screen.findByRole('heading', { name: 'Welcome, Ravi' });
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
