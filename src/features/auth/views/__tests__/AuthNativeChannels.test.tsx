import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';

// Expo sign in and create account read /auth/options too: only channels that
// can deliver are drawn, a WhatsApp failure offers email in one tap with the
// typed details kept, and with no channel the screen says so (crisis strip on).
let channels: string[] = ['EMAIL', 'WHATSAPP'];
let send: () => Promise<unknown> = async () => ({ targetMasked: 'a***@example.test' });
const apiRequest = vi.fn(async (path: string): Promise<unknown> => {
  if (path === '/auth/options') return { channels };
  if (path === '/auth/otp/send') return send();
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string) => apiRequest(path),
}));

import { AuthViewModel } from '../../viewmodel/AuthViewModel';
import { CreateAccountNativeView } from '../CreateAccountNativeView';
import { SignInNativeView } from '../SignInNativeView';

beforeEach(() => {
  apiRequest.mockClear();
  channels = ['EMAIL', 'WHATSAPP'];
  send = async () => ({ targetMasked: 'a***@example.test' });
});

function profiled(): AuthViewModel {
  const vm = new AuthViewModel('signup', null);
  vm.setField('fullName', 'Asha Rao');
  vm.setField('university', 'Test University');
  vm.setField('rollNumber', 'R1');
  vm.setField('dob', '2001-04-02');
  return vm;
}

describe('Expo auth channels', () => {
  it('a WhatsApp failure keeps the details and offers email in one tap', async () => {
    send = async () => { throw new ApiError('down', 503, { code: 'CHANNEL_UNAVAILABLE', channel: 'WHATSAPP', channels: ['EMAIL'] }); };
    const vm = profiled();
    render(<CreateAccountNativeView vm={vm} />);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/options'));
    fireEvent.click(screen.getByRole('button', { name: 'Next: contact details' }));
    fireEvent.click(screen.getByRole('radio', { name: /WhatsApp/ }));
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9121495077' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    expect(await screen.findByText('We couldn’t send your code on WhatsApp')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/administrator/i);
    fireEvent.click(screen.getByRole('button', { name: 'Send the code by email instead' }));
    expect(vm.channel).toBe('EMAIL');
    expect(vm.fullName).toBe('Asha Rao');
    expect(screen.getByLabelText('Campus email address')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /WhatsApp/ })).toBeNull();
    expect(screen.getByRole('button', { name: /call 112/i })).toBeInTheDocument();
  });

  it('sign in with no channel says so instead of drawing a dead form', async () => {
    channels = [];
    render(<SignInNativeView vm={new AuthViewModel('login', null, vi.fn())} />);
    expect(await screen.findByText('Sign-in codes can’t be sent right now')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send verification code' })).toBeNull();
    expect(screen.getByRole('button', { name: /call 112/i })).toBeInTheDocument();
  });

  it('one channel draws no switcher', async () => {
    channels = ['EMAIL'];
    render(<SignInNativeView vm={new AuthViewModel('login', null, vi.fn())} />);
    expect(await screen.findByLabelText('Campus email address')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /WhatsApp/ })).toBeNull();
  });
});
