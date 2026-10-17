import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/http';
import { TwoFactorViewModel } from '@/features/account/viewmodel/TwoFactorViewModel';
import { TwoFactorHeldNativeView } from '../TwoFactorHeldNativeView';

const SECRET = 'JBSWY3DPEHPK3PXP';

function server(enableFails = false) {
  return vi.fn(async (path: string): Promise<unknown> => {
    if (path === '/auth/2fa/status') return { enabled: false, required: true, setupRequired: true };
    if (path === '/auth/2fa/setup') return { secret: SECRET, otpauthUrl: `otpauth://totp/StudentKare:root?secret=${SECRET}`, qrMatrix: ['1'] };
    if (path === '/auth/2fa/enable') {
      if (enableFails) throw new ApiError('Invalid authenticator code', 400);
      return { success: true };
    }
    return {};
  });
}

async function show(request: ReturnType<typeof server>) {
  const onEnabled = vi.fn();
  const onSignOut = vi.fn();
  const vm = new TwoFactorViewModel(request as never, onEnabled);
  await vm.load();
  render(<TwoFactorHeldNativeView viewModel={vm} onContinue={onEnabled} onSignOut={onSignOut} />);
  return { vm, onEnabled, onSignOut };
}

// Several renders and awaited requests: give it room when the whole suite runs at once.
describe('Native: a session held to two-step set-up', { timeout: 20_000 }, () => {
  it('explains the hold, offers sign-out and help, and sets up with the key as grouped text', async () => {
    const request = server();
    const { onEnabled, onSignOut } = await show(request);
    expect(screen.getByText('Turn on two-step sign-in to continue')).toBeInTheDocument();
    expect(screen.getByText('You can also set it up on the web, under Sign-in & security.')).toBeInTheDocument();
    expect(screen.getByTestId('crisis-links')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(await screen.findByTestId('two-step-secret')).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
    expect(screen.getByRole('button', { name: 'Open in an authenticator app on this device' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn on' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('6-digit code from your app'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    await waitFor(() => expect(onEnabled).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ token: '123456' }) });
    // The secret is gone from the screen once 2FA is on.
    expect(screen.queryByTestId('two-step-secret')).toBeNull();

    fireEvent.click(screen.getByTestId('two-step-held-sign-out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('a wrong code keeps the session held and says so', async () => {
    const { onEnabled } = await show(server(true));
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    await screen.findByTestId('two-step-secret');
    fireEvent.change(screen.getByLabelText('6-digit code from your app'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(await screen.findByText(/That code didn't match/)).toBeInTheDocument();
    expect(onEnabled).not.toHaveBeenCalled();
  });
});
