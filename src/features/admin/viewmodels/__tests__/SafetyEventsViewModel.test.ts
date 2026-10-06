import { describe, expect, it, vi } from 'vitest';
import type { OpsFeed, OpsFeedEvent } from '@/data/workflowTypes';
import type { OpsRepository } from '../../model/opsRepository';
import type { OpsFeedCounts } from '../../model/types';
import { SafetyEventsViewModel } from '../SafetyEventsViewModel';

const event = (id: string): OpsFeedEvent => ({ id, kind: 'SOS_RAISED', domain: 'SAFETY', severity: 'ATTENTION', actorId: '', actorRole: '', subjectId: '', providerId: '', resourceType: 'sos', resourceId: id, summary: id, createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '' });
const feedOf = (...ids: string[]): OpsFeed => ({ items: ids.map(event), total: ids.length, critical: 0, scope: 'all' });
const counts = (safety?: number): OpsFeedCounts => ({ domains: safety === undefined ? { CLINICAL: 4 } : { SAFETY: safety, CLINICAL: 4 } });
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

function repository(overrides: Partial<OpsRepository> = {}): OpsRepository {
  return {
    feed: vi.fn().mockResolvedValue(feedOf()),
    feedCounts: vi.fn().mockResolvedValue(counts(2)),
    domainFeed: vi.fn().mockResolvedValue(feedOf('e1', 'e2')),
    acknowledge: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

/** A repository call that waits until the test settles it, keeping the signal it was given. */
function deferred<T>() {
  const calls: { resolve: (value: T) => void; reject: (reason: Error) => void; signal?: AbortSignal }[] = [];
  const fn = (signal?: AbortSignal) => new Promise<T>((resolve, reject) => { calls.push({ resolve, reject, signal }); });
  return { calls, fn };
}

describe('SafetyEventsViewModel', () => {
  it('is loading before the first load, with nothing open', () => {
    const vm = new SafetyEventsViewModel(repository());
    expect(vm.feedLoading).toBe(true);
    expect(vm.countsLoading).toBe(true);
    expect(vm.feed).toBeNull();
    expect(vm.counts).toBeNull();
    expect(vm.openCount).toBe(0);
    expect(vm.showOpenStatus).toBe(false);
  });

  it('asks the repository for the SAFETY feed (25) and the counts, once each', () => {
    const repo = repository();
    new SafetyEventsViewModel(repo).load();
    expect(repo.domainFeed).toHaveBeenCalledTimes(1);
    expect(repo.domainFeed).toHaveBeenCalledWith('SAFETY', 25, expect.any(AbortSignal));
    expect(repo.feedCounts).toHaveBeenCalledTimes(1);
    expect(repo.feedCounts).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(repo.feed).not.toHaveBeenCalled();
    expect(repo.acknowledge).not.toHaveBeenCalled();
  });

  it('loads the safety feed', async () => {
    const vm = new SafetyEventsViewModel(repository());
    vm.load();
    expect(vm.feedLoading).toBe(true);
    await settle();
    expect(vm.feedLoading).toBe(false);
    expect(vm.feedError).toBe('');
    expect(vm.feed?.items.map(item => item.id)).toEqual(['e1', 'e2']);
  });

  it('loads the counts, and shows the status only when SAFETY has open events', async () => {
    const vm = new SafetyEventsViewModel(repository());
    vm.load();
    expect(vm.countsLoading).toBe(true);
    await settle();
    expect(vm.countsLoading).toBe(false);
    expect(vm.counts).toEqual(counts(2));
    expect(vm.openCount).toBe(2);
    expect(vm.showOpenStatus).toBe(true);
  });

  it('treats an empty feed and zero or missing SAFETY counts as nothing open', async () => {
    const zero = new SafetyEventsViewModel(repository({ domainFeed: vi.fn().mockResolvedValue(feedOf()), feedCounts: vi.fn().mockResolvedValue(counts(0)) }));
    const missing = new SafetyEventsViewModel(repository({ feedCounts: vi.fn().mockResolvedValue(counts()) }));
    zero.load();
    missing.load();
    await settle();
    expect(zero.feed?.items).toEqual([]);
    expect(zero.openCount).toBe(0);
    expect(zero.showOpenStatus).toBe(false);
    expect(missing.openCount).toBe(0);
    expect(missing.showOpenStatus).toBe(false);
  });

  it('keeps a feed error without touching the counts', async () => {
    const vm = new SafetyEventsViewModel(repository({ domainFeed: vi.fn().mockRejectedValue(new Error('Feed timed out')) }));
    vm.load();
    await settle();
    expect(vm.feedError).toBe('Feed timed out');
    expect(vm.feed).toBeNull();
    expect(vm.feedLoading).toBe(false);
    expect(vm.counts).toEqual(counts(2));
    expect(vm.countsError).toBe('');
  });

  it('keeps a counts error without touching the feed, and shows no status', async () => {
    const vm = new SafetyEventsViewModel(repository({ feedCounts: vi.fn().mockRejectedValue(new Error('Counts timed out')) }));
    vm.load();
    await settle();
    expect(vm.countsError).toBe('Counts timed out');
    expect(vm.counts).toBeNull();
    expect(vm.countsLoading).toBe(false);
    expect(vm.showOpenStatus).toBe(false);
    expect(vm.feed?.items).toHaveLength(2);
  });

  it('retries each part on its own after a failure', async () => {
    const domainFeed = vi.fn().mockRejectedValueOnce(new Error('Feed down')).mockResolvedValue(feedOf('e9'));
    const feedCounts = vi.fn().mockRejectedValueOnce(new Error('Counts down')).mockResolvedValue(counts(5));
    const vm = new SafetyEventsViewModel(repository({ domainFeed, feedCounts }));
    vm.load();
    await settle();
    expect(vm.feedError).toBe('Feed down');
    expect(vm.countsError).toBe('Counts down');

    vm.reloadFeed();
    expect(vm.feedLoading).toBe(true);
    expect(vm.feedError).toBe('');
    await settle();
    expect(vm.feed?.items.map(item => item.id)).toEqual(['e9']);
    expect(feedCounts).toHaveBeenCalledTimes(1);

    vm.reloadCounts();
    await settle();
    expect(vm.countsError).toBe('');
    expect(vm.openCount).toBe(5);
    expect(domainFeed).toHaveBeenCalledTimes(2);
    expect(feedCounts).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale answer: only the latest request of each kind counts', async () => {
    const feed = deferred<OpsFeed>();
    const countsCalls = deferred<OpsFeedCounts>();
    const vm = new SafetyEventsViewModel(repository({ domainFeed: (_d, _l, signal) => feed.fn(signal), feedCounts: countsCalls.fn }));
    vm.load();
    vm.reloadFeed();
    vm.reloadCounts();
    feed.calls[1].resolve(feedOf('new'));
    countsCalls.calls[1].resolve(counts(1));
    await settle();
    feed.calls[0].resolve(feedOf('old'));
    countsCalls.calls[0].resolve(counts(9));
    await settle();
    expect(vm.feed?.items.map(item => item.id)).toEqual(['new']);
    expect(vm.openCount).toBe(1);

    // A late failure of a superseded request changes nothing either.
    vm.reloadFeed();
    vm.reloadFeed();
    feed.calls[3].resolve(feedOf('newest'));
    await settle();
    feed.calls[2].reject(new Error('stale'));
    await settle();
    expect(vm.feedError).toBe('');
    expect(vm.feed?.items.map(item => item.id)).toEqual(['newest']);
  });

  it('cancels the previous request when a part is reloaded', () => {
    const feed = deferred<OpsFeed>();
    const countsCalls = deferred<OpsFeedCounts>();
    const vm = new SafetyEventsViewModel(repository({ domainFeed: (_d, _l, signal) => feed.fn(signal), feedCounts: countsCalls.fn }));
    vm.load();
    vm.reloadFeed();
    vm.reloadCounts();
    expect(feed.calls[0].signal?.aborted).toBe(true);
    expect(countsCalls.calls[0].signal?.aborted).toBe(true);
    expect(feed.calls[1].signal?.aborted).toBe(false);
    expect(countsCalls.calls[1].signal?.aborted).toBe(false);
  });

  it('dispose cancels both requests and ignores their late answers', async () => {
    const feed = deferred<OpsFeed>();
    const countsCalls = deferred<OpsFeedCounts>();
    const vm = new SafetyEventsViewModel(repository({ domainFeed: (_d, _l, signal) => feed.fn(signal), feedCounts: countsCalls.fn }));
    vm.load();
    vm.dispose();
    expect(feed.calls[0].signal?.aborted).toBe(true);
    expect(countsCalls.calls[0].signal?.aborted).toBe(true);
    feed.calls[0].resolve(feedOf('late'));
    countsCalls.calls[0].resolve(counts(7));
    await settle();
    expect(vm.feed).toBeNull();
    expect(vm.counts).toBeNull();
    // Still "loading": nothing after dispose writes state, not even the finally blocks.
    expect(vm.feedLoading).toBe(true);
    expect(vm.countsLoading).toBe(true);
  });

  it('makes no state change after dispose, even when a request fails late', async () => {
    const feed = deferred<OpsFeed>();
    const countsCalls = deferred<OpsFeedCounts>();
    const vm = new SafetyEventsViewModel(repository({ domainFeed: (_d, _l, signal) => feed.fn(signal), feedCounts: countsCalls.fn }));
    vm.load();
    vm.dispose();
    feed.calls[0].reject(new Error('late failure'));
    countsCalls.calls[0].reject(new Error('late failure'));
    await settle();
    expect(vm.feedError).toBe('');
    expect(vm.countsError).toBe('');
  });

  it('works again after dispose when loaded once more', async () => {
    const vm = new SafetyEventsViewModel(repository());
    vm.load();
    vm.dispose();
    vm.load();
    await settle();
    expect(vm.feed?.items).toHaveLength(2);
    expect(vm.openCount).toBe(2);
  });

  it('loads the counts only, once, when used for a header status', async () => {
    const repo = repository();
    const vm = new SafetyEventsViewModel(repo);
    vm.reloadCounts();
    await settle();
    expect(repo.feedCounts).toHaveBeenCalledTimes(1);
    expect(repo.domainFeed).not.toHaveBeenCalled();
    expect(vm.showOpenStatus).toBe(true);
  });
});
