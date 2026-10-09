import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { DigitalIdViewModel } from '../DigitalIdViewModel';
import { DigitalIdNativeView, QrCells } from '../../views/DigitalIdNativeView';

type Requester = typeof import('@/data/http').apiRequest;
const base: MemberIdentity = { memberId: 'SK-1', fullName: 'Test Student', university: 'U', rollNumber: 'R1', campusStatus: 'PENDING', issued: false, issuedAt: null };
const issued: MemberIdentity = { ...base, issued: true, issuedAt: 1, code: 'SACARE-ID:a.b', qrMatrix: ['1101', '0000', '1011', '0110'] };

function api(responses: Partial<Record<'GET' | 'POST' | 'DELETE', () => MemberIdentity>>) {
  const calls: string[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET') as 'GET' | 'POST' | 'DELETE';
    calls.push(`${method} ${path}`);
    const reply = responses[method];
    if (!reply) throw new Error('refused');
    return reply();
  }) as unknown as Requester;
  return { request, calls };
}

describe('DigitalIdViewModel on /identity', () => {
  it('loads from /identity, never the missing /digital-id endpoints', async () => {
    const { request, calls } = api({ GET: () => base });
    const vm = new DigitalIdViewModel(request);
    await vm.load();
    expect(calls).toEqual(['GET /identity']);
    expect(vm.identity?.campusStatus).toBe('PENDING');
  });

  it('creates and revokes through the server only', async () => {
    const { request, calls } = api({ GET: () => base, POST: () => issued, DELETE: () => base });
    const vm = new DigitalIdViewModel(request);
    await vm.load();
    await vm.issue();
    expect(vm.identity?.issued).toBe(true);
    vm.askRevoke();
    await vm.revoke();
    expect(vm.identity?.issued).toBe(false);
    expect(calls).toEqual(['GET /identity', 'POST /identity', 'DELETE /identity']);
  });

  it('keeps the QR and says so when revoking fails', async () => {
    const { request } = api({ GET: () => issued });
    const vm = new DigitalIdViewModel(request);
    await vm.load();
    vm.askRevoke();
    await vm.revoke();
    expect(vm.identity?.issued).toBe(true);
    expect(vm.error).toMatch(/still works/);
  });

  it('shows an error, not a card, when the ID cannot load', async () => {
    const vm = new DigitalIdViewModel((async () => { throw new Error('offline'); }) as unknown as Requester);
    await vm.load();
    render(<DigitalIdNativeView viewModel={vm} />);
    expect(screen.getByText("Couldn't load your member ID")).toBeInTheDocument();
  });

  it('makes no verified-member or blood-group claim', async () => {
    const { request } = api({ GET: () => issued });
    const vm = new DigitalIdViewModel(request);
    await vm.load();
    render(<DigitalIdNativeView viewModel={vm} />);
    expect(screen.getByText('Campus review pending')).toBeInTheDocument();
    expect(screen.queryByText(/VERIFIED CAMPUS MEMBER|Blood Group/i)).toBeNull();
    expect(screen.getByRole('img', { name: 'Your member verification QR code' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke QR code' }));
    expect(screen.getByRole('button', { name: 'Yes, revoke it' })).toBeInTheDocument();
  });
});

describe('QrCells', () => {
  it('merges adjacent dark cells into one run per stretch', () => {
    const { container } = render(<QrCells rows={['1101']} label="qr" />);
    // Row "1101" → runs at 0 (length 2) and 3 (length 1).
    const row = container.querySelector('[role="img"]')?.firstElementChild;
    expect(row?.childElementCount).toBe(2);
  });
});
