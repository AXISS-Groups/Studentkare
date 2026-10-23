import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HealthVaultViewModel } from '../HealthVaultViewModel';
import type { RecordShare, VaultDocument } from '../HealthVaultViewModel';
import { HealthVaultNativeView } from '../../views/HealthVaultNativeView';

type Requester = typeof import('@/data/services/http').apiRequest;
const doc: VaultDocument = { id: 'doc_1', title: 'CBC report', category: 'LAB', createdAt: 1_760_000_000 };
const share: RecordShare = { id: 'shr_1', clinician: 'Dr. Test', document: 'CBC report', grantedAt: 1, expiresAt: 4_000_000_000, revoked: false, active: true };

function api(revoke: () => unknown = () => ({ success: true })) {
  const calls: string[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (path.startsWith('/health/documents')) return { items: [doc] };
    if (path === '/records/shares') return { items: [share] };
    if (path.endsWith('/revoke')) return revoke();
    throw new Error(`unexpected ${path}`);
  }) as unknown as Requester;
  return { request, calls };
}

describe('HealthVaultViewModel', () => {
  it('reads documents and shares from the real endpoints, nothing invented', async () => {
    const { request, calls } = api();
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    expect(calls).toEqual(['GET /health/documents?limit=100', 'GET /records/shares']);
    expect(vm.documents).toEqual([doc]);
    expect(calls.some((c) => c.includes('/vault/consent'))).toBe(false);
  });

  it('withdraws access through the server', async () => {
    const { request, calls } = api();
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    await vm.revoke('shr_1');
    expect(calls).toContain('POST /records/shares/shr_1/revoke');
    expect(vm.activeShares).toEqual([]);
  });

  it('keeps the share listed as active when withdrawing fails', async () => {
    const { request } = api(() => { throw new Error('offline'); });
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    await vm.revoke('shr_1');
    expect(vm.activeShares).toHaveLength(1);
    expect(vm.error).toMatch(/can still see/);
  });
});

describe('HealthVaultNativeView', () => {
  it('shows who can see what, with a labelled withdraw button', async () => {
    const { request } = api();
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    render(<HealthVaultNativeView viewModel={vm} />);
    expect(screen.getByText('CBC report', { selector: 'div' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Withdraw Dr. Test’s access to CBC report" }));
    await waitFor(() => expect(screen.getByText('No one else can see your records.')).toBeInTheDocument());
    expect(screen.queryByText(/encrypted/i)).toBeNull();
  });

  it('shows an error state when records cannot load', async () => {
    const vm = new HealthVaultViewModel((async () => { throw new Error('x'); }) as unknown as Requester);
    await vm.load();
    render(<HealthVaultNativeView viewModel={vm} />);
    expect(screen.getByText("Couldn’t load your records")).toBeInTheDocument();
  });
});
