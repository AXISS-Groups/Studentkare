import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/http';
import { TwoFactorViewModel } from '../../viewmodel/TwoFactorViewModel';
import type { TwoFactorStatus } from '../../viewmodel/TwoFactorViewModel';
import { SignInSecurityView } from '../SignInSecurityView';

type Requester = typeof import('@/data/http').apiRequest;
const SETUP = { secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/StudentKare:a?secret=JBSWY3DPEHPK3PXP', qrMatrix: ['1010', '0101'] };

async function viewWith(status: TwoFactorStatus, enable: () => unknown = () => ({ success: true })) {
  const request = vi.fn(async (path: string) => {
    if (path === '/auth/2fa/status') return status;
    if (path === '/auth/2fa/setup') return SETUP;
    if (path === '/auth/2fa/enable') return enable();
    return { success: true };
  }) as unknown as Requester;
  const vm = new TwoFactorViewModel(request);
  await vm.load();
  render(<SignInSecurityView viewModel={vm} onContinue={() => undefined} />);
  return vm;
}

describe('SignInSecurityView', () => {
  it('shows the status and walks through set-up with a QR, the key and a code', async () => {
    await viewWith({ enabled: false, required: false, setupRequired: false });
    expect(screen.getByText('Sign-in & security')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Lost your phone?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(await screen.findByRole('img', { name: 'QR code that adds this account to your authenticator app' })).toBeInTheDocument();
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('6-digit code from your app'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(await screen.findByText('Two-step sign-in is on.')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.queryByText('JBSW Y3DP EHPK 3PXP')).not.toBeInTheDocument();
  });

  it('keeps the set-up open and explains a wrong code', async () => {
    await viewWith({ enabled: false, required: false, setupRequired: false }, () => { throw new ApiError('Invalid authenticator code', 400); });
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    fireEvent.change(await screen.findByLabelText('6-digit code from your app'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(await screen.findByText(/That code didn't match/)).toBeInTheDocument();
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
  });

  it('tells a held staff account why it is here', async () => {
    await viewWith({ enabled: false, required: true, setupRequired: true });
    expect(screen.getByText(/Your role needs two-step sign-in. Turn it on/)).toBeInTheDocument();
  });

  it('asks for a code in a confirm dialog before turning it off', async () => {
    await viewWith({ enabled: true, required: false, setupRequired: false });
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Turn off two-step sign-in?')).toBeInTheDocument();
    expect(screen.getByLabelText('6-digit code from your app')).toBeInTheDocument();
  });

  it('offers no switch-off to a role that must keep it', async () => {
    await viewWith({ enabled: true, required: true, setupRequired: false });
    expect(screen.queryByRole('button', { name: 'Turn off' })).not.toBeInTheDocument();
    expect(screen.getByText(/so it stays on/)).toBeInTheDocument();
  });
});
