import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { TwoFactorViewModel } from '../../viewmodel/TwoFactorViewModel';
import { ContactsViewModel } from '../../viewmodel/ContactsViewModel';
import type { Contact } from '../../viewmodel/ContactsViewModel';
import { SignInSecurityView } from '../SignInSecurityView';

// Sign-in & security → your email and WhatsApp (plan tier1-auth-password-2026-10-22, A):
// loading and error, the sign-in ID marked, adding WhatsApp with a code, verifying
// one an admin typed, the server's refusals, removing, and axe.

type Requester = typeof import('@/data/services/http').apiRequest;
const EMAIL: Contact = { kind: 'EMAIL', value: 'asha@example.test', verified: true, primary: true };
const PHONE: Contact = { kind: 'WHATSAPP', value: '9876543210', verified: true, primary: false };

function server(items: Contact[], over: Partial<Record<string, (init?: RequestInit) => unknown>> = {}) {
  let current = items;
  return vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/auth/2fa/status') return { enabled: false, required: false, setupRequired: false };
    if (over[path]) return over[path]!(init);
    if (path === '/auth/contacts') return { items: current };
    if (path === '/auth/contacts/send-code') return { success: true, alreadyVerified: false, targetMasked: '+91 ••••••3210' };
    if (path === '/auth/contacts/verify') { current = [EMAIL, PHONE]; return { items: current }; }
    if (path === '/auth/contacts/WHATSAPP') { current = [EMAIL]; return { items: current }; }
    return {};
  });
}

async function viewWith(request: ReturnType<typeof server>) {
  const twoFa = new TwoFactorViewModel(request as unknown as Requester);
  const contacts = new ContactsViewModel(request as unknown as Requester);
  await Promise.all([twoFa.load(), contacts.load()]);
  const view = render(<SignInSecurityView viewModel={twoFa} contacts={contacts} />);
  return { contacts, view };
}

const card = () => screen.getByTestId('contacts-card');

describe('Your email and WhatsApp', { timeout: 20_000 }, () => {
  it('marks the sign-in ID and offers to add WhatsApp', async () => {
    await viewWith(server([EMAIL]));
    const email = within(card()).getByTestId('contact-EMAIL');
    expect(within(email).getByText('asha@example.test')).toBeInTheDocument();
    expect(within(email).getByText('Your sign-in ID')).toBeInTheDocument();
    expect(within(email).getByText('Verified')).toBeInTheDocument();
    expect(within(email).queryByRole('button')).toBeNull();          // the sign-in ID can't be changed here
    expect(within(card()).getByText('Not added')).toBeInTheDocument();
    expect(within(card()).getByRole('button', { name: 'Add WhatsApp' })).toBeInTheDocument();
  });

  it('adds WhatsApp with a code', async () => {
    const request = server([EMAIL]);
    await viewWith(request);
    fireEvent.click(within(card()).getByRole('button', { name: 'Add WhatsApp' }));
    fireEvent.change(within(card()).getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Send a code' }));
    expect(await within(card()).findByText(/Sent to \+91 ••••••3210/)).toBeInTheDocument();
    const [, init] = request.mock.calls.find(([path]) => path === '/auth/contacts/send-code')!;
    expect(JSON.parse(String(init?.body))).toEqual({ kind: 'WHATSAPP', value: '9876543210' });
    fireEvent.change(within(card()).getByLabelText('The 6-digit code'), { target: { value: '482917' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Verify' }));
    expect(await within(card()).findByText(/WhatsApp verified/)).toBeInTheDocument();
    expect(within(within(card()).getByTestId('contact-WHATSAPP')).getByText('Verified')).toBeInTheDocument();
  });

  it('verifies a number an admin typed, with it already filled in', async () => {
    await viewWith(server([EMAIL, { ...PHONE, verified: false }]));
    const row = within(card()).getByTestId('contact-WHATSAPP');
    expect(within(row).getByText('Not verified')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'Verify WhatsApp' }));
    expect((within(card()).getByLabelText('WhatsApp number') as HTMLInputElement).value.replace(/\D/g, '')).toBe('9876543210');
  });

  it('says when the number is on another account, and when a code is wrong', async () => {
    const request = server([EMAIL], {
      '/auth/contacts/send-code': () => { throw new ApiError('used', 409, { code: 'CONTACT_IN_USE' }); },
    });
    await viewWith(request);
    fireEvent.click(within(card()).getByRole('button', { name: 'Add WhatsApp' }));
    fireEvent.change(within(card()).getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Send a code' }));
    expect(await within(card()).findByText('That is already used by another account.')).toBeInTheDocument();
  });

  it('empties the code after a wrong one', async () => {
    const request = server([EMAIL], {
      '/auth/contacts/verify': () => { throw new ApiError('bad', 401, { code: 'CONTACT_CODE_FAILED' }); },
    });
    await viewWith(request);
    fireEvent.click(within(card()).getByRole('button', { name: 'Add WhatsApp' }));
    fireEvent.change(within(card()).getByLabelText('WhatsApp number'), { target: { value: '9876543210' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Send a code' }));
    fireEvent.change(await within(card()).findByLabelText('The 6-digit code'), { target: { value: '000000' } });
    fireEvent.click(within(card()).getByRole('button', { name: 'Verify' }));
    expect(await within(card()).findByText(/That code is wrong or has expired/)).toBeInTheDocument();
    expect(within(card()).getByLabelText('The 6-digit code')).toHaveValue('');
  });

  it('removes the second contact only after confirming', async () => {
    const request = server([EMAIL, PHONE]);
    await viewWith(request);
    fireEvent.click(within(card()).getByRole('button', { name: 'Remove WhatsApp' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove WhatsApp' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/auth/contacts/WHATSAPP', { method: 'DELETE' }));
    expect(await within(card()).findByText('WhatsApp removed.')).toBeInTheDocument();
  });

  it('shows an error with retry when the contacts can’t load', async () => {
    let fail = true;
    const request = server([EMAIL], { '/auth/contacts': () => { if (fail) throw new ApiError('down', 503); return { items: [EMAIL] }; } });
    await viewWith(request);
    expect(screen.getByText('Your contacts couldn’t load')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getAllByRole('button', { name: /try again/i })[0]);
    expect(await screen.findByTestId('contacts-card')).toBeInTheDocument();
  });

  it('is axe-clean', async () => {
    const { view } = await viewWith(server([EMAIL, { ...PHONE, verified: false }]));
    const violations = await axeViolations(view.container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
