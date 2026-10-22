import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Phone signup used to stop after the code: nothing ever called /auth/signup.
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/otp/send') return { targetMasked: 'a***@example.test' };
  if (path === '/auth/otp/verify') return { requiresSignup: true, csrfToken: 'grant-csrf', user: null };
  if (path === '/auth/signup/contact/send-code') return { targetMasked: '+91 ••••••6780' };
  if (path === '/auth/signup/contact/verify') return { success: true, verified: true };
  if (path === '/auth/signup') return { user: { id: 'u1', fullName: 'Asha', role: 'STUDENT' }, csrfToken: 'session-csrf' };
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { AuthViewModel } from '../../viewmodel/AuthViewModel';
import { CreateAccountNativeView } from '../CreateAccountNativeView';

beforeEach(() => apiRequest.mockClear());

describe('Phone signup', () => {
  it('goes from the code to the other contact, a password, then consent, to an account', async () => {
    const vm = new AuthViewModel('signup', null);
    vm.setField('fullName', 'Asha');
    vm.setField('university', 'Test University');
    vm.setField('rollNumber', 'R1');
    vm.setField('dob', '2001-04-02');
    vm.channel = 'EMAIL';
    vm.identifier = 'asha@example.test';
    const onSuccess = vi.fn();
    render(<CreateAccountNativeView vm={vm} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next: contact details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Send verification code' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/otp/send', expect.anything()));
    vm.code = '123456';
    fireEvent.click(await screen.findByRole('button', { name: 'Complete registration' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/otp/verify', expect.anything()));

    // The other contact, with its own code (plan tier1-auth-password-2026-10-22, B).
    fireEvent.change(await screen.findByLabelText('WhatsApp number'), { target: { value: '9123456780' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a code' }));
    fireEvent.change(await screen.findByLabelText('The 6-digit code'), { target: { value: '482917' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));

    // Then the password.
    fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // The consent step: three unticked items, and no account until all are ticked.
    const items = await screen.findAllByRole('checkbox');
    expect(items).toHaveLength(3);
    const create = screen.getByRole('button', { name: 'Tick the three required items' });
    fireEvent.click(create);
    expect(apiRequest).not.toHaveBeenCalledWith('/auth/signup', expect.anything());

    items.forEach((item) => fireEvent.click(item));
    fireEvent.click(await screen.findByRole('button', { name: 'Complete registration' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/signup', expect.anything()));
    const body = JSON.parse(String(apiRequest.mock.calls.find(([path]) => path === '/auth/signup')?.[1]?.body));
    expect(body).toMatchObject({ fullName: 'Asha', university: 'Test University', rollNumber: 'R1', dob: '2001-04-02' });
    expect(body.consent.purposes).toEqual(['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS']);
    expect(body.password).toBe('Tamarind-river 42');
  });
});
