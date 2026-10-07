import { describe, expect, it, vi } from 'vitest';
import type { OpsFeed, OpsFeedEvent } from '@/data/workflowTypes';
import type { OpsRepository } from '../../model/opsRepository';
import type { FeedQuery, OpsFeedCounts } from '../../model/types';
import { ActivityFeedViewModel } from '../ActivityFeedViewModel';

const event = (id: string): OpsFeedEvent => ({ id, kind: 'ORDER_PLACED', domain: 'MARKETPLACE', severity: 'INFO', actorId: '', actorRole: '', subjectId: '', providerId: '', resourceType: 'order', resourceId: id, summary: id, createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '' });
const feedOf = (...ids: string[]): OpsFeed => ({ items: ids.map(event), total: ids.length, critical: 0, scope: 'platform' });
const counts: OpsFeedCounts = { domains: { CLINICAL: 2, PHARMACY: 0, SAFETY: 3, ACCOUNT: 9 } };
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

function repository(overrides: Partial<OpsRepository> = {}): OpsRepository {
  return {
    feed: vi.fn().mockResolvedValue(feedOf('e1')),
    feedCounts: vi.fn().mockResolvedValue(counts),
    domainFeed: vi.fn().mockResolvedValue(feedOf()),
    acknowledge: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}
const queries = (repo: OpsRepository) => vi.mocked(repo.feed).mock.calls.map(([query]) => query);

describe('ActivityFeedViewModel', () => {
  it('is loading before the first load, then loads the outstanding feed and the counts', async () => {
    const repo = repository();
    const vm = new ActivityFeedViewModel(repo);
    expect(vm.feedLoading).toBe(true);
    expect(vm.countsLoading).toBe(true);
    vm.load();
    expect(repo.feed).toHaveBeenCalledWith({ limit: 50, domain: undefined, unacknowledgedOnly: true }, expect.any(AbortSignal));
    expect(repo.feedCounts).toHaveBeenCalledWith(expect.any(AbortSignal));
    await settle();
    expect(vm.feed?.items.map(item => item.id)).toEqual(['e1']);
    expect(vm.counts).toEqual(counts);
    expect(vm.feedLoading).toBe(false);
    expect(vm.countsLoading).toBe(false);
  });

  it('shows cards for domains with outstanding events, in fixed order, plus the selected one', async () => {
    const vm = new ActivityFeedViewModel(repository());
    vm.load();
    await settle();
    // ACCOUNT has a count but no card, as before.
    expect(vm.visibleDomains).toEqual(['CLINICAL', 'SAFETY']);
    expect(vm.countOf('CLINICAL')).toBe(2);
    expect(vm.countOf('LAB')).toBe(0);
    vm.setDomain('PHARMACY');
    expect(vm.visibleDomains).toEqual(['CLINICAL', 'PHARMACY', 'SAFETY']);
  });

  it('builds the query from the domain and outstanding filters, and toggles a domain off', async () => {
    const repo = repository();
    const vm = new ActivityFeedViewModel(repo);
    vm.load();
    vm.toggleDomain('LAB');
    vm.setOutstanding(false);
    vm.toggleDomain('LAB');
    vm.setOutstanding(true);
    expect(queries(repo)).toEqual<FeedQuery[]>([
      { limit: 50, domain: undefined, unacknowledgedOnly: true },
      { limit: 50, domain: 'LAB', unacknowledgedOnly: true },
      { limit: 50, domain: 'LAB', unacknowledgedOnly: false },
      { limit: 50, domain: undefined, unacknowledgedOnly: false },
      { limit: 50, domain: undefined, unacknowledgedOnly: true },
    ]);
    expect(repo.feedCounts).toHaveBeenCalledTimes(1);
  });

  it('does not reload for a filter that did not change', () => {
    const repo = repository();
    const vm = new ActivityFeedViewModel(repo);
    vm.load();
    vm.setOutstanding(true);
    vm.setDomain('');
    expect(repo.feed).toHaveBeenCalledTimes(1);
  });

  it('clears the feed and shows loading when a filter changes', async () => {
    const vm = new ActivityFeedViewModel(repository());
    vm.load();
    await settle();
    vm.setOutstanding(false);
    expect(vm.feedLoading).toBe(true);
    expect(vm.feed).toBeNull();
    expect(vm.counts).toEqual(counts);
  });

  it('keeps feed and counts errors separate, and reloads each on its own', async () => {
    const feed = vi.fn().mockRejectedValueOnce(new Error('Feed timed out')).mockResolvedValue(feedOf('e2'));
    const feedCounts = vi.fn().mockRejectedValueOnce(new Error('Counts timed out')).mockResolvedValue(counts);
    const vm = new ActivityFeedViewModel(repository({ feed, feedCounts }));
    vm.load();
    await settle();
    expect(vm.feedError).toBe('Feed timed out');
    expect(vm.countsError).toBe('Counts timed out');
    vm.reloadFeed();
    await settle();
    expect(vm.feedError).toBe('');
    expect(vm.feed?.items.map(item => item.id)).toEqual(['e2']);
    expect(vm.countsError).toBe('Counts timed out');
    expect(feedCounts).toHaveBeenCalledTimes(1);
  });

  it('marks an event handled, then reloads the feed and the counts', async () => {
    const calls: string[] = [];
    const repo = repository({
      feed: vi.fn(async () => { calls.push('feed'); return feedOf('e1'); }),
      feedCounts: vi.fn(async () => { calls.push('counts'); return counts; }),
      acknowledge: vi.fn(async () => { calls.push('acknowledge'); return {}; }),
    });
    const vm = new ActivityFeedViewModel(repo);
    vm.load();
    await settle();
    calls.length = 0;
    await vm.acknowledge('e1');
    expect(repo.acknowledge).toHaveBeenCalledWith('e1');
    expect(calls).toEqual(['acknowledge', 'feed', 'counts']);
    expect(vm.acknowledging).toBe(false);
  });

  it('shows a failed acknowledgement without reloading, with a generic fallback message', async () => {
    const acknowledge = vi.fn().mockRejectedValueOnce(new Error('Already handled')).mockRejectedValueOnce('nope');
    const repo = repository({ acknowledge });
    const vm = new ActivityFeedViewModel(repo);
    vm.load();
    await settle();
    await vm.acknowledge('e1');
    expect(vm.acknowledgeError).toBe('Already handled');
    expect(repo.feed).toHaveBeenCalledTimes(1);
    const next = vm.acknowledge('e1');
    expect(vm.acknowledgeError).toBe('');
    await next;
    expect(vm.acknowledgeError).toBe('The request could not be completed.');
  });

  it('handles one event at a time', async () => {
    let release!: () => void;
    const acknowledge = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const vm = new ActivityFeedViewModel(repository({ acknowledge }));
    const first = vm.acknowledge('e1');
    expect(vm.acknowledging).toBe(true);
    await vm.acknowledge('e2');
    expect(acknowledge).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(vm.acknowledging).toBe(false);
  });

  it('ignores a stale feed answer and cancels its request', async () => {
    const pending: { query: FeedQuery; signal?: AbortSignal; resolve: (value: OpsFeed) => void }[] = [];
    const feed = vi.fn((query: FeedQuery, signal?: AbortSignal) => new Promise<OpsFeed>(resolve => { pending.push({ query, signal, resolve }); }));
    const vm = new ActivityFeedViewModel(repository({ feed }));
    vm.load();
    vm.setOutstanding(false);
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve(feedOf('everything'));
    await settle();
    pending[0].resolve(feedOf('outstanding'));
    await settle();
    expect(vm.feed?.items.map(item => item.id)).toEqual(['everything']);
    expect(vm.feedLoading).toBe(false);
  });

  it('changes nothing after dispose, and a later load works again', async () => {
    let release!: () => void;
    const acknowledge = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const pending: { signal?: AbortSignal; resolve: (value: OpsFeedCounts) => void }[] = [];
    const feedCounts = vi.fn((signal?: AbortSignal) => new Promise<OpsFeedCounts>(resolve => { pending.push({ signal, resolve }); }));
    const repo = repository({ acknowledge, feedCounts });
    const vm = new ActivityFeedViewModel(repo);
    vm.load();
    const acknowledging = vm.acknowledge('e1');
    vm.dispose();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[0].resolve(counts);
    release();
    await acknowledging;
    await settle();
    expect(vm.counts).toBeNull();
    expect(repo.feed).toHaveBeenCalledTimes(1);
    vm.load();
    expect(repo.feed).toHaveBeenCalledTimes(2);
  });
});
