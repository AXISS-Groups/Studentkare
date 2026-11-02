import { describe, expect, it, vi } from 'vitest';
import { HealthVaultViewModel, SHARE_DAYS } from '../HealthVaultViewModel';
import type { RecordShare, VaultDocument } from '../HealthVaultViewModel';

type Requester = typeof import('@/data/services/http').apiRequest;
const doc: VaultDocument = { id: 'doc_1', title: 'CBC report', category: 'LAB', createdAt: 1_760_000_000 };
const share: RecordShare = { id: 'shr_1', clinician: 'Dr. Test', document: 'CBC report', documentId: 'doc_1', grantedAt: 1, expiresAt: 4_000_000_000, revoked: false, active: true };

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


describe('HealthVaultViewModel, one vault view (Tier 1 parity plan 2026-10-24 §6)', () => {
  const second: RecordShare = { ...share, id: 'shr_2', clinician: 'Dr. Second' };

  it('stops every share of a document and reads the shares back from the server', async () => {
    const calls: string[] = [];
    let revoked = false;
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${path}`);
      if (path.startsWith('/health/documents')) return { items: [doc], total: 1 };
      if (path === '/records/shares') return { items: revoked ? [] : [share, second] };
      if (path.endsWith('/revoke')) { revoked = true; return { success: true }; }
      throw new Error(`unexpected ${path}`);
    }) as unknown as Requester;
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    expect(vm.activeSharesOf('doc_1')).toHaveLength(2);
    expect(vm.sharedNow).toBe(1);
    expect(await vm.revokeDocument('doc_1')).toBe(true);
    expect(calls.filter((c) => c.endsWith('/revoke'))).toEqual(['POST /records/shares/shr_1/revoke', 'POST /records/shares/shr_2/revoke']);
    expect(calls.filter((c) => c === 'GET /records/shares')).toHaveLength(2);
    expect(vm.activeSharesOf('doc_1')).toEqual([]);
    expect(vm.revokeOutcome).toBeNull();
  });

  it('a revoke that half fails names who the server still lists and shows nothing as revoked that it still has', async () => {
    const request = vi.fn(async (path: string) => {
      if (path.startsWith('/health/documents')) return { items: [doc], total: 1 };
      if (path === '/records/shares') return { items: [share, second] };
      if (path.endsWith('/shr_1/revoke')) return { success: true };
      if (path.endsWith('/shr_2/revoke')) throw new Error('down');
      throw new Error(`unexpected ${path}`);
    }) as unknown as Requester;
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    expect(await vm.revokeDocument('doc_1')).toBe(false);
    // The server still lists both (its list is the truth; the mock never drops any): nothing flips locally.
    expect(vm.activeSharesOf('doc_1')).toHaveLength(2);
    expect(vm.revokeOutcome).toEqual({ documentId: 'doc_1', stillShared: ['Dr. Test', 'Dr. Second'] });
  });

  it('refuses a share outside 1–90 days before the server sees it, and sends the same body as before', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      calls.push([path, init]);
      if (path.startsWith('/health/documents')) return { items: [doc], total: 1 };
      if (path === '/records/shares' && init?.method === 'POST') return { id: 'shr_9' };
      if (path === '/records/shares') return { items: [] };
      throw new Error(`unexpected ${path}`);
    }) as unknown as Requester;
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    expect(await vm.share('doc_1', 'dr@example.test', SHARE_DAYS.max + 1)).toBe(false);
    expect(await vm.share('doc_1', 'dr@example.test', 0)).toBe(false);
    expect(calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    expect(await vm.share('doc_1', ' dr@example.test ', 7)).toBe(true);
    const post = calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[1]?.body).toBe(JSON.stringify({ documentId: 'doc_1', clinicianEmail: 'dr@example.test', expiresInDays: 7 }));
  });

  it('keeps the server’s reason when a share is refused', async () => {
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/health/documents')) return { items: [doc], total: 1 };
      if (path === '/records/shares' && init?.method === 'POST') throw new Error('No clinician with that email.');
      if (path === '/records/shares') return { items: [] };
      throw new Error(`unexpected ${path}`);
    }) as unknown as Requester;
    const vm = new HealthVaultViewModel(request);
    await vm.load();
    expect(await vm.share('doc_1', 'x@y.z', 7)).toBe(false);
    expect(vm.shareError).toBe('No clinician with that email.');
  });
});
