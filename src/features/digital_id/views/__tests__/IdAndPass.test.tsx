import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));
const http: { request: (path: string, init?: RequestInit) => Promise<unknown> } = { request: async () => ({ items: [] }) };
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => http.request(path, init),
}));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { M2Responsive, M2SosProvider } from '@/design-system/m2';
import type { M2Layout } from '@/design-system/m2';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { axeViolations, describeViolations } from '@/test/axe';
import { DigitalIdViewModel } from '../../viewmodel/DigitalIdViewModel';
import { DigitalIdNativeView } from '../DigitalIdNativeView';
import { MyPassBoard } from '../MyPassBoard';

/**
 * Digital ID and the check-in pass, one view each at both widths (Tier 1
 * parity plan 2026-10-24 §12 and §22; boards T1DigitalId*, T1Pass*).
 */
afterEach(() => { cleanup(); vi.useRealTimers(); });
const settle = async () => { await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); }); };
const now = () => Date.now() / 1000;
const QR = ['1011', '0110', '1100', '0011'];

const identity = (over: Partial<MemberIdentity> = {}): MemberIdentity => ({
  memberId: 'SK-1', fullName: 'Test Student', university: 'Test University', rollNumber: 'R-1', campusStatus: 'VERIFIED', issued: true, issuedAt: 1,
  code: 'SKPASS1:x', passCode: '482177', expiresAt: now() + 24, rotateSeconds: 30, qrMatrix: QR,
  passWindow: [{ step: 1, token: 'a', passCode: '482177', startsAt: now() - 6, expiresAt: now() + 24, qrMatrix: QR }, { step: 2, token: 'b', passCode: '111222', startsAt: now() + 24, expiresAt: now() + 54, qrMatrix: QR }],
  ...over,
});

const at = (layout: M2Layout, ui: React.ReactElement, sos?: () => void) => render(sos
  ? <M2SosProvider value={sos}><M2Responsive layout={layout}>{ui}</M2Responsive></M2SosProvider>
  : <M2Responsive layout={layout}>{ui}</M2Responsive>);

describe('Check-in pass (§22)', () => {
  const links = () => ({ digitalId: vi.fn(), back: vi.fn() });
  const pending = () => new Promise<MemberIdentity>(() => undefined);

  it('phone: the live code, the ring, the chips and one SOS; desktop: how it works beside it and no SOS', async () => {
    const sos = vi.fn();
    at('phone', <MyPassBoard identity={identity()} links={links()} onRefresh={pending} />, sos);
    expect(screen.getByTestId('pass-code')).toHaveTextContent('482 177');
    expect(screen.getByTestId('pass-qr')).toBeInTheDocument();
    expect(screen.getByText(/Works without signal for 1 min/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'SOS, get help now' })).toHaveLength(1);
    expect(screen.queryByTestId('pass-steps')).toBeNull();
    cleanup();
    const { container } = at('desktop', <MyPassBoard identity={identity()} links={links()} onRefresh={pending} wide />);
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    expect(screen.getByTestId('pass-steps')).toBeInTheDocument();
    expect(screen.getByText(/Member ID SK-1/)).toBeInTheDocument();
    expect(screen.queryByText(/Deleted after 24|Photo matched|4 of 4|This wasn’t me/)).toBeNull();
    expect(screen.getByText(/No check-ins recorded/)).toBeInTheDocument();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('stale: the code is hidden at both layouts, with the attention note and a retry', () => {
    const stale = identity({ expiresAt: now() - 5, passWindow: [] });
    for (const layout of ['phone', 'desktop'] as const) {
      at(layout, <MyPassBoard identity={stale} links={links()} onRefresh={pending} wide={layout === 'desktop'} />);
      expect(screen.queryByText('482 177')).toBeNull();
      expect(screen.queryByTestId('pass-qr')).toBeNull();
      expect(screen.getByTestId('pass-stale')).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('pass-retry')).toBeInTheDocument();
      cleanup();
    }
  });

  it('a failed refresh is said, not swallowed: the codes still held keep working and the note counts them', async () => {
    const short = identity({ passWindow: [{ step: 1, token: 'a', passCode: '482177', startsAt: now() - 6, expiresAt: now() + 24, qrMatrix: QR }] });
    const onRefresh = vi.fn(() => Promise.reject(new Error('offline')));
    at('phone', <MyPassBoard identity={short} links={links()} onRefresh={onRefresh} />);
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    await settle();
    expect(screen.getByTestId('pass-refresh-failed')).toHaveTextContent(/New codes couldn’t be fetched/);
    expect(screen.getByTestId('pass-code')).toHaveTextContent('482 177');
  });

  it('not issued: no code, a step to the Digital ID', () => {
    const to = links();
    at('phone', <MyPassBoard identity={identity({ issued: false, passWindow: [] })} links={to} onRefresh={pending} />);
    expect(screen.getByTestId('pass-none')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create my Digital ID' }));
    expect(to.digitalId).toHaveBeenCalled();
  });

  it('the QR draws in the qr tokens, black on white in both schemes', () => {
    expect(skTokens.color.light.qrForeground).toBe(skTokens.color.dark.qrForeground);
    expect(skTokens.color.light.qrBackground).toBe(skTokens.color.dark.qrBackground);
    const source = readFileSync(resolve(process.cwd(), 'src/features/digital_id/views/DigitalIdNativeView.tsx'), 'utf8');
    expect(source).toMatch(/color\.qrForeground/);
    expect(source).toMatch(/color\.qrBackground/);
    expect(source).not.toMatch(/#000000|#FFFFFF/i);
  });
});

describe('Digital ID (§12)', () => {
  function vmWith(id: MemberIdentity, over: Record<string, unknown> = {}) {
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${path}`;
      if (key in over) { const v = over[key]; if (v instanceof Error) throw v; return v; }
      if (path === '/identity') return id;
      if (path === '/health/policies') return { items: [] };
      throw new Error(`unexpected ${key}`);
    });
    http.request = request as unknown as typeof http.request;
    return { vm: new DigitalIdViewModel(request as unknown as ConstructorParameters<typeof DigitalIdViewModel>[0]), request };
  }

  it('phone: card, QR with its code and controls, rows, one SOS; desktop: three columns and no SOS', async () => {
    const sos = vi.fn();
    const { vm } = vmWith(identity());
    await vm.load();
    const links = { pass: vi.fn(), abha: vi.fn(), insurance: vi.fn() };
    at('phone', <DigitalIdNativeView viewModel={vm} links={links} />, sos);
    await settle();
    expect(screen.getByTestId('digital-id-card')).toHaveTextContent('Test Student');
    expect(screen.getByTestId('digital-id-code')).toHaveTextContent('482177');
    expect(screen.getByTestId('digital-id-replace')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'SOS, get help now' })).toHaveLength(1);
    fireEvent.click(screen.getByTestId('digital-id-pass'));
    expect(links.pass).toHaveBeenCalled();
    cleanup();
    const { container } = at('desktop', <DigitalIdNativeView viewModel={vm} links={{ ...links, passport: vi.fn() }} wide />);
    await settle();
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    expect(screen.getByTestId('digital-id-passport')).toBeInTheDocument();
    expect(screen.getByTestId('digital-id-privacy')).toBeInTheDocument();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('revoke needs the confirm; a failed revoke keeps the QR and says so in the student’s language', async () => {
    const { vm, request } = vmWith(identity(), { 'DELETE /identity': new Error('down') });
    await vm.load();
    at('phone', <DigitalIdNativeView viewModel={vm} links={{}} />);
    await settle();
    fireEvent.click(screen.getByTestId('digital-id-revoke'));
    expect(request).not.toHaveBeenCalledWith('/identity', expect.objectContaining({ method: 'DELETE' }));
    expect(screen.getByTestId('digital-id-revoke-confirm')).toHaveTextContent('Revoke this QR code?');
    fireEvent.click(screen.getByTestId('digital-id-revoke-yes'));
    await settle();
    expect(screen.getByTestId('digital-id-error')).toHaveTextContent('Your QR wasn’t revoked. It still works — try again.');
    expect(screen.getByTestId('digital-id-code')).toHaveTextContent('482177');
  });

  it('not issued offers Create; offline the actions are disabled with a reason', async () => {
    const { vm } = vmWith(identity({ issued: false, passWindow: [] }));
    await vm.load();
    at('phone', <DigitalIdNativeView viewModel={vm} links={{}} />);
    await settle();
    expect(screen.getByTestId('digital-id-not-issued')).toBeInTheDocument();
    expect(screen.getByTestId('digital-id-create')).not.toBeDisabled();
    cleanup();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    at('phone', <DigitalIdNativeView viewModel={vm} links={{}} />);
    await settle();
    expect(screen.getByTestId('digital-id-create')).toBeDisabled();
    expect(screen.getByTestId('digital-id-offline')).toHaveTextContent('Needs a connection');
    vi.restoreAllMocks();
  });

  it('a failed top-up of codes is said, not swallowed', async () => {
    let calls = 0;
    const request = vi.fn(async (path: string) => {
      if (path === '/identity') { calls += 1; if (calls > 1) throw new Error('offline'); return identity({ passWindow: [identity().passWindow![0]] }); }
      if (path === '/health/policies') return { items: [] };
      throw new Error(path);
    });
    http.request = request as unknown as typeof http.request;
    const vm = new DigitalIdViewModel(request as unknown as ConstructorParameters<typeof DigitalIdViewModel>[0]);
    await vm.load();
    vm.tick(Date.now());
    await settle();
    expect(vm.refreshFailed).toBe(true);
    at('phone', <DigitalIdNativeView viewModel={vm} links={{}} />);
    await settle();
    expect(screen.getByTestId('digital-id-refresh-failed')).toBeInTheDocument();
    vm.dispose();
  });
});
