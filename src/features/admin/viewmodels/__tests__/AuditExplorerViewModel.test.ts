import { describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '@/data/workflowTypes';
import type { AuditRepository } from '../../model/auditRepository';
import type { AuditPage } from '../../model/types';
import { AuditExplorerViewModel } from '../AuditExplorerViewModel';

// The page size the screen has always requested.
const AUDIT_PAGE_SIZE = 50;

const event = (id: string, action: string, actorId: string, createdAt: number): AuditEvent => ({ id, action, actorId, resourceId: `res-${id}`, createdAt });
const events = [
  event('a1', 'ACCOUNT_CREATED', 'actor-1', 1790000000),
  event('a2', 'CATALOG_UPDATED', 'actor-2', 1790086400),
  event('a3', 'ACCOUNT_CREATED', 'actor-2', 1790172800),
];
const pageOf = (items: AuditEvent[], total = items.length): AuditPage => ({ items, total });

/** A repository whose answers the test releases one at a time. */
function deferredRepository() {
  const pending: { offset: number; limit: number; signal?: AbortSignal; resolve: (page: AuditPage) => void; reject: (error: Error) => void }[] = [];
  const repository: AuditRepository = {
    listEvents: vi.fn((offset: number, limit: number, signal?: AbortSignal) => new Promise<AuditPage>((resolve, reject) => { pending.push({ offset, limit, signal, resolve, reject }); })),
  };
  return { repository, pending };
}

describe('AuditExplorerViewModel', () => {
  it('starts in the loading state, then loads the first page', async () => {
    const repository: AuditRepository = { listEvents: vi.fn().mockResolvedValue(pageOf(events, 3)) };
    const vm = new AuditExplorerViewModel(repository);
    expect(vm.loading).toBe(true);
    expect(vm.items).toEqual([]);
    await vm.load();
    expect(repository.listEvents).toHaveBeenCalledWith(0, AUDIT_PAGE_SIZE, expect.any(AbortSignal));
    expect(vm.loading).toBe(false);
    expect(vm.error).toBe('');
    expect(vm.items).toEqual(events);
    expect(vm.total).toBe(3);
    expect(vm.actors).toEqual(['actor-1', 'actor-2']);
    expect(vm.eventTypes).toEqual(['ACCOUNT_CREATED', 'CATALOG_UPDATED']);
  });

  it('pages by offset, clearing the old page and showing loading while the next one arrives', async () => {
    const { repository, pending } = deferredRepository();
    const vm = new AuditExplorerViewModel(repository);
    void vm.load();
    pending[0].resolve(pageOf(events, 120));
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.lastPage).toBe(2);
    vm.goTo(1);
    expect(pending[1]).toMatchObject({ offset: 50, limit: 50 });
    expect(vm.page).toBe(1);
    expect(vm.loading).toBe(true);
    expect(vm.data).toBeNull();
    expect(vm.items).toEqual([]);
  });

  it('combines search, actor, event type and date filters on the loaded page', async () => {
    const vm = new AuditExplorerViewModel({ listEvents: vi.fn().mockResolvedValue(pageOf(events)) });
    await vm.load();
    expect(vm.filtering).toBe(false);
    expect(vm.filtered).toHaveLength(3);
    vm.setEventType('ACCOUNT_CREATED');
    expect(vm.filtered.map(item => item.id)).toEqual(['a1', 'a3']);
    vm.setActor('actor-2');
    expect(vm.filtered.map(item => item.id)).toEqual(['a3']);
    vm.setActor('');
    vm.setEventType('');
    vm.setSearch('  RES-A2 ');
    expect(vm.filtering).toBe(true);
    expect(vm.filtered.map(item => item.id)).toEqual(['a2']);
    vm.setSearch('');
    // Date bounds are local days: from midnight to 23:59:59, as before.
    const day = (seconds: number) => { const date = new Date(seconds * 1000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
    vm.setFrom(day(1790086400));
    expect(vm.filtered.map(item => item.id)).toEqual(['a2', 'a3']);
    vm.setTo(day(1790086400));
    expect(vm.filtered.map(item => item.id)).toEqual(['a2']);
  });

  it('selects an event', async () => {
    const vm = new AuditExplorerViewModel({ listEvents: vi.fn().mockResolvedValue(pageOf(events)) });
    await vm.load();
    vm.select(events[1]);
    expect(vm.selected).toBe(events[1]);
  });

  it('clears the selection when the page changes, but not on reload', async () => {
    const vm = new AuditExplorerViewModel({ listEvents: vi.fn().mockResolvedValue(pageOf(events, 120)) });
    await vm.load();
    vm.select(events[0]);
    vm.reload();
    expect(vm.selected).toBe(events[0]);
    vm.goTo(1);
    expect(vm.selected).toBeNull();
  });

  it('ignores a stale response and cancels its request', async () => {
    const { repository, pending } = deferredRepository();
    const vm = new AuditExplorerViewModel(repository);
    void vm.load();
    vm.goTo(1);
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve(pageOf([events[2]], 120));
    await Promise.resolve();
    await Promise.resolve();
    pending[0].resolve(pageOf([events[0]], 120));
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.items).toEqual([events[2]]);
    expect(vm.loading).toBe(false);
  });

  it('shows the request’s own error message, with no data', async () => {
    const vm = new AuditExplorerViewModel({ listEvents: vi.fn().mockRejectedValue(new Error('Network error')) });
    await vm.load();
    expect(vm.error).toBe('Network error');
    expect(vm.loading).toBe(false);
    expect(vm.data).toBeNull();
    expect(vm.total).toBe(0);
  });

  it('reloads the current page', async () => {
    const listEvents = vi.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(pageOf(events, 120));
    const vm = new AuditExplorerViewModel({ listEvents });
    await vm.load();
    vm.goTo(2);
    await Promise.resolve();
    listEvents.mockClear();
    vm.reload();
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(listEvents).toHaveBeenCalledWith(100, AUDIT_PAGE_SIZE, expect.any(AbortSignal));
  });

  it('stops the request in flight on dispose, and can load again after', async () => {
    const { repository, pending } = deferredRepository();
    const vm = new AuditExplorerViewModel(repository);
    void vm.load();
    vm.dispose();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[0].resolve(pageOf(events));
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.data).toBeNull();
    void vm.load();
    pending[1].resolve(pageOf(events));
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.items).toEqual(events);
  });
});
