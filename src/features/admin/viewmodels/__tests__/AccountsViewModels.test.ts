import { describe, expect, it, vi } from 'vitest';
import type { AccountRole, OpsFeed, OpsFeedEvent, StaffAccount } from '@/data/workflowTypes';
import type { AccountsRepository } from '../../model/accountsRepository';
import type { OpsRepository } from '../../model/opsRepository';
import type { AccountListQuery, AccountPage } from '../../model/types';
import { appAccess, clinicalAccess, ROLE_ROWS } from '../../model/accessRules';
import { AccountsListViewModel } from '../AccountsListViewModel';
import { AccountsOverviewViewModel } from '../AccountsOverviewViewModel';

const TOTALS: Record<AccountRole, number> = { STUDENT: 900, NMC_DOCTOR: 40, VENDOR: 12, CAMPUS_ADMIN: 6, SUPER_ADMIN: 2 };
const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };
const account = (id: string): StaffAccount => ({ id, fullName: id, identifier: `${id}@example.test`, role: 'VENDOR', active: true });
const feedEvent = (id: string, kind: string): OpsFeedEvent => ({ id, kind, domain: 'ACCOUNT', severity: 'INFO', actorId: '', actorRole: '', subjectId: '', providerId: '', resourceType: '', resourceId: '', summary: id, createdAt: 1, acknowledgedAt: null, acknowledgedBy: '' });
const feedOf = (...events: OpsFeedEvent[]): OpsFeed => ({ items: events, total: events.length, critical: 0, scope: 'all' });

function accounts(overrides: Partial<AccountsRepository> = {}): AccountsRepository {
  return {
    countByRole: vi.fn(async (role: AccountRole) => ({ items: [], total: TOTALS[role] })),
    list: vi.fn().mockResolvedValue({ items: [account('a1')], total: 40 }),
    listAll: vi.fn().mockResolvedValue({ items: [account('a1')] }),
    create: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}
function ops(overrides: Partial<OpsRepository> = {}): OpsRepository {
  return {
    feed: vi.fn(), feedCounts: vi.fn(), acknowledge: vi.fn(),
    domainFeed: vi.fn().mockResolvedValue(feedOf(feedEvent('1', 'STAFF_ACCOUNT_CREATED'), feedEvent('2', 'SUBSCRIPTION_STARTED'))),
    ...overrides,
  };
}

describe('account access rules', () => {
  it('reads clinical access from the permission table, unchanged', () => {
    expect(ROLE_ROWS.map(([role]) => [role, clinicalAccess(role)])).toEqual([
      ['STUDENT', { label: 'Own record only', tone: 'is-positive' }],
      ['NMC_DOCTOR', { label: 'Consented records only', tone: 'is-positive' }],
      ['VENDOR', { label: 'Permission policy unavailable', tone: 'is-attention' }],
      ['CAMPUS_ADMIN', { label: 'No clinical access', tone: 'is-positive' }],
      ['SUPER_ADMIN', { label: 'No clinical access', tone: 'is-positive' }],
    ]);
  });

  it('names the workspace each role is sent to after sign-in', () => {
    expect(ROLE_ROWS.map(([role]) => appAccess(role))).toEqual(['Student portal', 'Clinical workspace', 'Vendor workspace', 'Campus administration', 'Platform administration']);
  });
});

describe('AccountsOverviewViewModel', () => {
  it('is loading before the first load, then counts every role in order', async () => {
    const repo = accounts();
    const vm = new AccountsOverviewViewModel(repo, ops());
    expect(vm.loading).toBe(true);
    vm.load();
    expect(vi.mocked(repo.countByRole).mock.calls.map(([role]) => role)).toEqual(['STUDENT', 'NMC_DOCTOR', 'VENDOR', 'CAMPUS_ADMIN', 'SUPER_ADMIN']);
    expect(vi.mocked(repo.countByRole).mock.calls.every(([, signal]) => signal instanceof AbortSignal)).toBe(true);
    await settle();
    expect(vm.loading).toBe(false);
    expect(vm.error).toBeNull();
    expect(vm.total).toBe(960);
    expect(vm.roleCount).toBe(5);
    expect(vm.roleRows.map(row => [row.role, row.count, row.access.label, row.app])).toEqual([
      ['STUDENT', 900, 'Own record only', 'Student portal'],
      ['NMC_DOCTOR', 40, 'Consented records only', 'Clinical workspace'],
      ['VENDOR', 12, 'Permission policy unavailable', 'Vendor workspace'],
      ['CAMPUS_ADMIN', 6, 'No clinical access', 'Campus administration'],
      ['SUPER_ADMIN', 2, 'No clinical access', 'Platform administration'],
    ]);
  });

  it('stays loading until every count has arrived', async () => {
    let releaseAdmins!: () => void;
    const countByRole = vi.fn((role: AccountRole) => role === 'SUPER_ADMIN'
      ? new Promise<AccountPage>(resolve => { releaseAdmins = () => resolve({ items: [], total: 2 }); })
      : Promise.resolve({ items: [], total: TOTALS[role] }));
    const vm = new AccountsOverviewViewModel(accounts({ countByRole }), ops());
    vm.load();
    await settle();
    expect(vm.loading).toBe(true);
    releaseAdmins();
    await settle();
    expect(vm.loading).toBe(false);
  });

  it('reports the first failing count in role order, and reloads every count', async () => {
    const countByRole = vi.fn(async (role: AccountRole) => {
      if (role === 'VENDOR') throw new Error('Vendor count timed out');
      if (role === 'SUPER_ADMIN') throw new Error('Admin count timed out');
      return { items: [], total: TOTALS[role] };
    });
    const vm = new AccountsOverviewViewModel(accounts({ countByRole }), ops());
    vm.load();
    await settle();
    expect(vm.error).toBe('Vendor count timed out');
    countByRole.mockImplementation(async (role: AccountRole) => ({ items: [], total: TOTALS[role] }));
    vm.load();
    expect(vm.loading).toBe(true);
    await settle();
    expect(countByRole).toHaveBeenCalledTimes(10);
    expect(vm.error).toBeNull();
    expect(vm.total).toBe(960);
  });

  it('loads recent changes on request, keeping only staff accounts created', async () => {
    const opsRepo = ops();
    const vm = new AccountsOverviewViewModel(accounts(), opsRepo);
    vm.load();
    expect(opsRepo.domainFeed).not.toHaveBeenCalled();
    expect(vm.recentLoading).toBe(true);
    await vm.loadRecentChanges();
    expect(opsRepo.domainFeed).toHaveBeenCalledWith('ACCOUNT', 200, expect.any(AbortSignal));
    expect(vm.recentChanges.map(event => event.id)).toEqual(['1']);
    void vm.loadRecentChanges();
    expect(vm.recentLoading).toBe(true);
    expect(vm.recentFeed).toBeNull();
  });

  it('shows a recent-changes error with its own message', async () => {
    const vm = new AccountsOverviewViewModel(accounts(), ops({ domainFeed: vi.fn().mockRejectedValue(new Error('Feed unavailable')) }));
    await vm.loadRecentChanges();
    expect(vm.recentError).toBe('Feed unavailable');
    expect(vm.recentFeed).toBeNull();
    expect(vm.recentLoading).toBe(false);
  });

  it('cancels recent changes when they are no longer shown, and ignores the late answer', async () => {
    let resolve!: (value: OpsFeed) => void;
    let signal: AbortSignal | undefined;
    const domainFeed = vi.fn((_domain: string, _limit: number, s?: AbortSignal) => { signal = s; return new Promise<OpsFeed>(r => { resolve = r; }); });
    const vm = new AccountsOverviewViewModel(accounts(), ops({ domainFeed }));
    void vm.loadRecentChanges();
    vm.stopRecentChanges();
    expect(signal?.aborted).toBe(true);
    resolve(feedOf(feedEvent('1', 'STAFF_ACCOUNT_CREATED')));
    await settle();
    expect(vm.recentFeed).toBeNull();
  });

  it('ignores a stale count, and changes nothing after dispose', async () => {
    const pending: { signal?: AbortSignal; resolve: (value: AccountPage) => void }[] = [];
    const countByRole = vi.fn((_role: AccountRole, signal?: AbortSignal) => new Promise<AccountPage>(resolve => { pending.push({ signal, resolve }); }));
    const vm = new AccountsOverviewViewModel(accounts({ countByRole }), ops());
    void vm.loadCount('STUDENT');
    void vm.loadCount('STUDENT');
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [], total: 7 });
    await settle();
    pending[0].resolve({ items: [], total: 1 });
    await settle();
    expect(vm.countOf('STUDENT')).toBe(7);
    void vm.loadCount('NMC_DOCTOR');
    vm.dispose();
    expect(pending[2].signal?.aborted).toBe(true);
    pending[2].resolve({ items: [], total: 40 });
    await settle();
    expect(vm.countOf('NMC_DOCTOR')).toBe(0);
    vm.load();
    expect(countByRole).toHaveBeenCalledTimes(8);
  });
});

describe('AccountsListViewModel', () => {
  const queries = (repo: AccountsRepository) => vi.mocked(repo.list).mock.calls.map(([query]) => query);

  it('loads the first page of 15', async () => {
    const repo = accounts();
    const vm = new AccountsListViewModel(repo);
    expect(vm.loading).toBe(true);
    await vm.load();
    expect(repo.list).toHaveBeenCalledWith({ limit: 15, offset: 0, query: '', role: '' }, expect.any(AbortSignal));
    expect(vm.data?.items.map(item => item.id)).toEqual(['a1']);
    expect(vm.total).toBe(40);
  });

  it('starts a search or role filter from the first page, and pages by offset', async () => {
    const repo = accounts();
    const vm = new AccountsListViewModel(repo);
    await vm.load();
    vm.setPage(2);
    vm.setQuery('asha r');
    vm.setRoleFilter('VENDOR');
    vm.setPage(1);
    expect(queries(repo)).toEqual<AccountListQuery[]>([
      { limit: 15, offset: 0, query: '', role: '' },
      { limit: 15, offset: 30, query: '', role: '' },
      { limit: 15, offset: 0, query: 'asha r', role: '' },
      { limit: 15, offset: 0, query: 'asha r', role: 'VENDOR' },
      { limit: 15, offset: 15, query: 'asha r', role: 'VENDOR' },
    ]);
  });

  it('does not reload for a query that did not change, but reloads on request', async () => {
    const repo = accounts();
    const vm = new AccountsListViewModel(repo);
    await vm.load();
    vm.setPage(0);
    vm.setRoleFilter('');
    expect(repo.list).toHaveBeenCalledTimes(1);
    vm.reload();
    expect(repo.list).toHaveBeenCalledTimes(2);
    expect(vm.loading).toBe(true);
    expect(vm.data).toBeNull();
  });

  it('shows a list error with its own message', async () => {
    const vm = new AccountsListViewModel(accounts({ list: vi.fn().mockRejectedValue(new Error('Accounts unavailable')) }));
    await vm.load();
    expect(vm.error).toBe('Accounts unavailable');
    expect(vm.total).toBe(0);
  });

  it('creates a staff account, clears name and contact, keeps role and channel, and reloads', async () => {
    const repo = accounts();
    const vm = new AccountsListViewModel(repo);
    await vm.load();
    expect([vm.role, vm.channel]).toEqual(['VENDOR', 'EMAIL']);
    vm.setFullName('Dr Meera Iyer');
    vm.setIdentifier('+919800000000');
    vm.setRole('NMC_DOCTOR');
    vm.setChannel('WHATSAPP');
    expect(await vm.create()).toBe(true);
    const sent = vi.mocked(repo.create).mock.calls[0][0];
    expect(sent).toEqual({ fullName: 'Dr Meera Iyer', identifier: '+919800000000', channel: 'WHATSAPP', role: 'NMC_DOCTOR' });
    expect(Object.keys(sent)).toEqual(['fullName', 'identifier', 'channel', 'role']);
    expect([vm.fullName, vm.identifier, vm.role, vm.channel]).toEqual(['', '', 'NMC_DOCTOR', 'WHATSAPP']);
    expect(repo.list).toHaveBeenCalledTimes(2);
  });

  it('keeps the form and the error when creating fails, with a generic fallback, cleared on the next attempt', async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error('Already registered')).mockRejectedValueOnce('nope');
    const repo = accounts({ create });
    const vm = new AccountsListViewModel(repo);
    vm.setFullName('Asha Rao');
    expect(await vm.create()).toBe(false);
    expect(vm.createError).toBe('Already registered');
    expect(vm.fullName).toBe('Asha Rao');
    expect(repo.list).not.toHaveBeenCalled();
    const next = vm.create();
    expect(vm.createError).toBe('');
    await next;
    expect(vm.createError).toBe('The request could not be completed.');
  });

  it('creates one account at a time', async () => {
    let release!: () => void;
    const create = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const vm = new AccountsListViewModel(accounts({ create }));
    const first = vm.create();
    expect(vm.creating).toBe(true);
    expect(await vm.create()).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toBe(true);
  });

  it('ignores a stale page, and changes nothing after dispose', async () => {
    const pending: { signal?: AbortSignal; resolve: (value: AccountPage) => void }[] = [];
    const list = vi.fn((_query: AccountListQuery, signal?: AbortSignal) => new Promise<AccountPage>(resolve => { pending.push({ signal, resolve }); }));
    let release!: () => void;
    const create = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const repo = accounts({ list, create });
    const vm = new AccountsListViewModel(repo);
    void vm.load();
    vm.setQuery('a');
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [account('new')], total: 1 });
    await settle();
    pending[0].resolve({ items: [account('old')], total: 1 });
    await settle();
    expect(vm.data?.items.map(item => item.id)).toEqual(['new']);
    vm.setFullName('Asha');
    const creating = vm.create();
    vm.dispose();
    release();
    expect(await creating).toBe(false);
    expect(vm.fullName).toBe('Asha');
    expect(list).toHaveBeenCalledTimes(2);
    void vm.load();
    expect(list).toHaveBeenCalledTimes(3);
  });
});
