import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type * as http from '@/data/services/http';
import { translate } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { axeViolations, describeViolations } from '@/test/axe';
import { WalletPassPanel } from '../WalletPassPanel';
import { WalletPassViewModel } from '../../viewmodel/WalletPassViewModel';
import type { WalletPassInfo, WalletPlatform, WalletStatus } from '../../viewmodel/WalletPassViewModel';
import { ProfileViewModel } from '@/features/m2profile/viewmodel/ProfileViewModel';

const en = (key: MessageKey, vars?: Record<string, string | number>) => translate('en', key, vars);
type Requester = typeof http.apiRequest;

const status = (over: Partial<WalletStatus> = {}): WalletStatus => ({
  available: { apple: true, google: true },
  fields: ['name', 'blood', 'contact', 'allergies', 'conditions', 'medicines'],
  defaultFields: ['name', 'blood', 'contact'],
  passes: [],
  googleConsentVersion: 'wallet-google-2026-10-24',
  googleConsent: null,
  ...over,
});
const pass = (platform: WalletPlatform, over: Partial<WalletPassInfo> = {}): WalletPassInfo => ({
  platform, status: 'ACTIVE', fields: ['name', 'blood', 'contact'], updatedAt: 1792800000, inWallet: true, pending: false, ...over,
});

interface Call { path: string; method: string; body: Record<string, unknown> | null }

function setup(first: WalletStatus | Error, after: (call: Call) => unknown = () => status(), devices: WalletPlatform[] = ['APPLE', 'GOOGLE']) {
  const calls: Call[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const call = { path, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null };
    calls.push(call);
    if (call.method === 'GET') {
      if (first instanceof Error) throw first;
      return first;
    }
    const answer = after(call);
    if (answer instanceof Error) throw answer;
    return answer;
  }) as unknown as Requester;
  const opened: Array<[WalletPlatform, string]> = [];
  const open = vi.fn(async (platform: WalletPlatform, url: string) => { opened.push([platform, url]); });
  const vm = new WalletPassViewModel(open, devices, request);
  return { vm, calls, opened, open };
}

async function mount(vm: WalletPassViewModel) {
  const view = render(<WalletPassPanel vm={vm} />);
  await act(async () => { await vm.load(); });
  return view;
}

afterEach(cleanup);

describe('WalletPassPanel (plan tier1-emergency-card-wallet-2026-10-24)', () => {
  it('draws nothing while no wallet is offered and there is no pass', async () => {
    const { vm } = setup(status({ available: { apple: false, google: false } }));
    await mount(vm);
    expect(screen.queryByTestId('wallet-panel')).toBeNull();
  });

  it('offers only the wallets this device can hold', async () => {
    const { vm } = setup(status(), undefined, ['APPLE']);
    await mount(vm);
    expect(screen.getByText(en('wlt.addApple'))).toBeTruthy();
    expect(screen.queryByText(en('wlt.addGoogle'))).toBeNull();
    expect(screen.getByTestId('wallet-status-none').textContent).toBe(en('wlt.status.none'));
  });

  it('opens the picker with the defaults on, health details off, and the lock-screen warning', async () => {
    const { vm } = setup(status());
    await mount(vm);
    fireEvent.click(screen.getByTestId('wallet-apple-add'));
    expect(screen.getByTestId('wallet-lock-screen').textContent).toContain(en('wlt.picker.lockScreen'));
    expect(screen.getByTestId('wallet-where').textContent).toContain(en('wlt.picker.appleWhere'));
    expect(vm.chosen).toEqual(['name', 'blood', 'contact']);
    for (const field of ['allergies', 'conditions', 'medicines']) {
      expect(screen.getByTestId(`wallet-field-${field}`).getAttribute('aria-checked')).toBe('false');
    }
    expect(screen.getByTestId('wallet-field-name').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(en('wlt.picker.always'))).toBeTruthy();
    const violations = await axeViolations(screen.getByRole('dialog'));
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('adds to Apple Wallet with only the chosen fields and hands the pass to the wallet', async () => {
    const { vm, calls, opened } = setup(status(), () => ({ ...status({ passes: [pass('APPLE', { inWallet: false, fields: ['name', 'blood', 'contact', 'allergies'] })] }), downloadPath: '/wallet/apple/download/tok' }));
    await mount(vm);
    fireEvent.click(screen.getByTestId('wallet-apple-add'));
    fireEvent.click(screen.getByTestId('wallet-field-allergies'));
    await act(async () => { fireEvent.click(screen.getByTestId('wallet-picker-add')); });
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.path).toBe('/wallet/emergency-card/apple');
    expect(post?.body).toEqual({ fields: ['name', 'blood', 'contact', 'allergies'] });
    expect(opened).toEqual([['APPLE', '/wallet/apple/download/tok']]);
    expect(screen.getByTestId('wallet-apple-status').textContent).toBe(en('wlt.status.madeApple'));
  });

  it('needs the Google consent ticked, never pre-ticks it, and sends its version', async () => {
    const given = status({ googleConsent: { version: 'wallet-google-2026-10-24', givenAt: 1 } });
    const { vm, calls, opened } = setup(given, () => ({ ...status({ passes: [pass('GOOGLE')] }), saveUrl: 'https://pay.google.com/gp/v/save/jwt' }));
    await mount(vm);
    fireEvent.click(screen.getByTestId('wallet-google-add'));
    expect(screen.getByTestId('wallet-where').textContent).toContain(en('wlt.picker.googleWhere'));
    expect(vm.googleConsent).toBe(false);
    expect(vm.canAdd).toBe(false);
    fireEvent.click(screen.getByTestId('wallet-google-consent'));
    expect(vm.canAdd).toBe(true);
    await act(async () => { fireEvent.click(screen.getByTestId('wallet-picker-add')); });
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.path).toBe('/wallet/emergency-card/google');
    expect(post?.body).toMatchObject({ fields: ['name', 'blood', 'contact'], consentGranted: true, consentVersion: 'wallet-google-2026-10-24' });
    expect(opened).toEqual([['GOOGLE', 'https://pay.google.com/gp/v/save/jwt']]);
  });

  it('a failed add says nothing was added, keeps the picker open and opens no wallet', async () => {
    const { vm, open } = setup(status(), () => new Error('502'));
    await mount(vm);
    fireEvent.click(screen.getByTestId('wallet-apple-add'));
    await act(async () => { fireEvent.click(screen.getByTestId('wallet-picker-add')); });
    expect(screen.getByTestId('wallet-picker-error').textContent).toContain(en('wlt.addFailed'));
    expect(vm.picker).toBe('APPLE');
    expect(open).not.toHaveBeenCalled();
  });

  it('cannot add a pass with nothing on it', async () => {
    const { vm } = setup(status());
    await mount(vm);
    fireEvent.click(screen.getByTestId('wallet-apple-add'));
    for (const field of ['name', 'blood', 'contact']) fireEvent.click(screen.getByTestId(`wallet-field-${field}`));
    expect(screen.getByTestId('wallet-nothing').textContent).toBe(en('wlt.picker.nothing'));
    expect(vm.canAdd).toBe(false);
  });

  it('shows where the pass is and removes it', async () => {
    const { vm, calls } = setup(status({ passes: [pass('APPLE')] }), () => status());
    await mount(vm);
    expect(screen.getByTestId('wallet-apple-status').textContent).toContain('In Apple Wallet · updated');
    expect(screen.getByText(en('wlt.change'))).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByTestId('wallet-apple-remove')); });
    expect(calls.find((c) => c.method === 'DELETE')?.path).toBe('/wallet/emergency-card/apple');
    expect(screen.getByTestId('wallet-notice').textContent).toContain(en('wlt.removed'));
  });

  it('keeps an existing pass removable even when its wallet is no longer offered', async () => {
    const { vm } = setup(status({ available: { apple: false, google: false }, passes: [pass('GOOGLE', { pending: true })] }), undefined, ['APPLE']);
    await mount(vm);
    expect(screen.queryByTestId('wallet-google-add')).toBeNull();
    expect(screen.getByTestId('wallet-google-remove')).toBeTruthy();
    expect(screen.getByTestId('wallet-google-pending').textContent).toBe(en('wlt.status.sending'));
  });

  it('says so when the wallet status cannot load, with a retry', async () => {
    const { vm } = setup(new Error('500'));
    await mount(vm);
    await waitFor(() => expect(screen.getByText(en('wlt.failed'))).toBeTruthy());
  });
});

describe('Profile line about where the card is kept', () => {
  const profileVm = (wallet: WalletStatus | Error) => {
    const request = vi.fn(async (path: string) => {
      if (path === '/wallet/emergency-card') {
        if (wallet instanceof Error) throw wallet;
        return wallet;
      }
      return new Promise(() => undefined);
    }) as unknown as Requester;
    return new ProfileViewModel(request);
  };

  it('says nothing about it until the wallet status is known', async () => {
    const vm = profileVm(new Error('500'));
    expect(vm.emergencyBody).toBe('m2.prof.emergencyBodyShort');
    await act(async () => { await vm.wallet.load(); });
    expect(vm.emergencyBody).toBe('m2.prof.emergencyBodyShort');
  });

  it('"Not kept on this phone" without a pass in a wallet, "In your phone’s wallet" with one', async () => {
    const none = profileVm(status({ passes: [pass('APPLE', { inWallet: false })] }));
    await act(async () => { await none.wallet.load(); });
    expect(none.emergencyBody).toBe('m2.prof.emergencyBody');
    expect(en('m2.prof.emergencyBody')).toContain('Not kept on this phone');
    const held = profileVm(status({ passes: [pass('GOOGLE')] }));
    await act(async () => { await held.wallet.load(); });
    expect(held.emergencyBody).toBe('m2.prof.emergencyBodyWallet');
    expect(en('m2.prof.emergencyBodyWallet')).toContain('In your phone’s wallet');
  });
});
