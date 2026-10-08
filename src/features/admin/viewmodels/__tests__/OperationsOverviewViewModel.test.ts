import { describe, expect, it, vi } from 'vitest';
import type { AccountRole, IntegrationCheck, IntegrationHealth, OpsFeed, OpsFeedEvent, OpsSummary } from '@/data/workflowTypes';
import type { BillingPlan, PlanCatalog } from '@/data/datasets/billing';
import type { AccountPage, AuditPage, OpsFeedCounts } from '../../model/types';
import { describeServices, metricFrom, servicesTone } from '../../model/format';
import { OperationsOverviewViewModel, type OverviewRepositories, type OverviewSource } from '../OperationsOverviewViewModel';

const summary: OpsSummary = { accounts: 1240, catalogItems: 58, orderRequests: 312, openSupport: 4, statuses: {} };
const auditPage: AuditPage = { items: [{ id: 'a1', actorId: 'x', action: 'ACCOUNT_CREATED', resourceId: 'r', createdAt: 1790000000 }], total: 1204 };
const check = (name: string, configured: boolean, status: IntegrationCheck['status']): IntegrationCheck => ({ name, configured, reachable: null, status, detail: '', checked_at: 1790000000 });
const health = (...checks: IntegrationCheck[]): IntegrationHealth => ({ summary: { checked_at: 1790000000, interval_seconds: 300, checks, overall: 'operational' } });
const event = (id: string): OpsFeedEvent => ({ id, kind: 'ORDER_PLACED', domain: 'MARKETPLACE', severity: 'INFO', actorId: '', actorRole: '', subjectId: '', providerId: '', resourceType: '', resourceId: id, summary: id, createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '' });
const feedOf = (...ids: string[]): OpsFeed => ({ items: ids.map(event), total: ids.length, critical: 0, scope: 'all' });
const page = (total: number): AccountPage => ({ items: [], total });
const PLAN_IDS: BillingPlan['id'][] = ['FREE', 'STUDENT_PLUS', 'CAMPUS', 'ENTERPRISE'];
const plan = (id: BillingPlan['id']): BillingPlan => ({ id, name: id, price: 0, period: 'month', audience: 'students', benefits: [], description: '' });
const plans = (n: number): PlanCatalog => ({ plans: PLAN_IDS.slice(0, n).map(plan), checkoutAvailable: false, publicKey: '' });
const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

const ROLE_TOTALS: Partial<Record<AccountRole, number>> = { STUDENT: 980, NMC_DOCTOR: 14, VENDOR: 9 };

function repositories(overrides: { ops?: Partial<OverviewRepositories['ops']>; audit?: Partial<OverviewRepositories['audit']>; accounts?: Partial<OverviewRepositories['accounts']>; billing?: Partial<OverviewRepositories['billing']> } = {}): OverviewRepositories {
  return {
    ops: {
      summary: vi.fn().mockResolvedValue(summary),
      integrationHealth: vi.fn().mockResolvedValue(health(check('openwa', true, 'online'))),
      feed: vi.fn().mockResolvedValue(feedOf('e1', 'e2')),
      feedCounts: vi.fn().mockResolvedValue({ domains: { SAFETY: 2 } }),
      ...overrides.ops,
    },
    audit: { listEvents: vi.fn().mockResolvedValue(auditPage), ...overrides.audit },
    accounts: { countByRole: vi.fn((role: AccountRole) => Promise.resolve(page(ROLE_TOTALS[role] ?? 0))), ...overrides.accounts },
    billing: { plans: vi.fn().mockResolvedValue(plans(2)), ...overrides.billing },
  };
}

/** A repository call that waits until the test settles it, keeping the signal it was given. */
function deferred<T>() {
  const calls: { resolve: (value: T) => void; reject: (reason: Error) => void; signal?: AbortSignal }[] = [];
  const fn = (signal?: AbortSignal) => new Promise<T>((resolve, reject) => { calls.push({ resolve, reject, signal }); });
  return { calls, fn };
}

const ALL: OverviewSource[] = ['summary', 'audit', 'health', 'feed', 'counts', 'students', 'clinicians', 'partners', 'plans'];

describe('OperationsOverviewViewModel', () => {
  it('is loading everywhere before the first load, with no figure shown as a number', () => {
    const vm = new OperationsOverviewViewModel(repositories());
    ALL.forEach(source => expect(vm.sources[source], source).toEqual({ data: null, loading: true, error: '' }));
    expect(vm.pageLoading).toBe(true);
    expect(vm.summary).toBeNull();
    expect(vm.studentAccounts).toEqual({ state: 'loading' });
    expect(vm.catalogueEntries).toEqual({ state: 'loading' });
    expect(vm.auditLedger).toEqual({ status: 'Checking…', tone: 'neutral' });
    expect(vm.services).toBe('checking services…');
  });

  it('asks each repository exactly once, with the same arguments the screen used before', () => {
    const repos = repositories();
    new OperationsOverviewViewModel(repos).load();
    expect(repos.ops.summary).toHaveBeenCalledTimes(1);
    expect(repos.ops.integrationHealth).toHaveBeenCalledTimes(1);
    expect(repos.ops.feed).toHaveBeenCalledTimes(1);
    expect(repos.ops.feed).toHaveBeenCalledWith({ limit: 5 }, expect.any(AbortSignal));
    expect(repos.ops.feedCounts).toHaveBeenCalledTimes(1);
    expect(repos.audit.listEvents).toHaveBeenCalledTimes(1);
    expect(repos.audit.listEvents).toHaveBeenCalledWith(0, 1, expect.any(AbortSignal));
    expect(vi.mocked(repos.accounts.countByRole).mock.calls.map(([role]) => role)).toEqual(['STUDENT', 'NMC_DOCTOR', 'VENDOR']);
    expect(repos.billing.plans).toHaveBeenCalledTimes(1);
  });

  it('loads the summary and leaves the page loading state', async () => {
    const vm = new OperationsOverviewViewModel(repositories());
    vm.load();
    await settle();
    expect(vm.pageLoading).toBe(false);
    expect(vm.pageError).toBe('');
    expect(vm.summary).toEqual(summary);
    expect(vm.catalogueEntries).toEqual({ state: 'ready', value: 58 });
  });

  it('loads the audit preview into the ledger status', async () => {
    const vm = new OperationsOverviewViewModel(repositories());
    vm.load();
    await settle();
    expect(vm.sources.audit.data).toEqual(auditPage);
    expect(vm.auditLedger).toEqual({ status: '1,204 events recorded', tone: 'positive' });
  });

  it('loads integration health into the services line and the integrations status', async () => {
    const vm = new OperationsOverviewViewModel(repositories({ ops: { integrationHealth: vi.fn().mockResolvedValue(health(check('a', true, 'online'), check('b', true, 'degraded'))) } }));
    vm.load();
    await settle();
    expect(vm.services).toBe('1 service degraded');
    expect(vm.integrations).toEqual({ status: '1 service degraded', tone: 'attention' });
  });

  it('loads the recent-activity feed', async () => {
    const vm = new OperationsOverviewViewModel(repositories());
    vm.load();
    expect(vm.feedLoading).toBe(true);
    await settle();
    expect(vm.feedLoading).toBe(false);
    expect(vm.events.map(item => item.id)).toEqual(['e1', 'e2']);
  });

  it('loads the feed counts into the open-safety status, including none open', async () => {
    const open = new OperationsOverviewViewModel(repositories());
    const none = new OperationsOverviewViewModel(repositories({ ops: { feedCounts: vi.fn().mockResolvedValue({ domains: {} } satisfies OpsFeedCounts) } }));
    const one = new OperationsOverviewViewModel(repositories({ ops: { feedCounts: vi.fn().mockResolvedValue({ domains: { SAFETY: 1 } }) } }));
    [open, none, one].forEach(vm => vm.load());
    await settle();
    expect(open.openSafety).toEqual({ status: '2 open safety events', tone: 'danger' });
    expect(none.openSafety).toEqual({ status: 'No open safety events', tone: 'positive' });
    expect(one.openSafety).toEqual({ status: '1 open safety event', tone: 'danger' });
  });

  it('loads the student, clinician and partner counts', async () => {
    const vm = new OperationsOverviewViewModel(repositories());
    vm.load();
    await settle();
    expect(vm.studentAccounts).toEqual({ state: 'ready', value: 980 });
    expect(vm.clinicianAccounts).toEqual({ state: 'ready', value: 14 });
    expect(vm.partnerAccounts).toEqual({ state: 'ready', value: 9 });
  });

  it('loads the published plans', async () => {
    const vm = new OperationsOverviewViewModel(repositories());
    vm.load();
    await settle();
    expect(vm.publishedPlans).toEqual({ state: 'ready', value: 2 });
  });

  it('keeps a real 0 as 0, but never invents one for a figure it does not have', async () => {
    const zero = new OperationsOverviewViewModel(repositories({ accounts: { countByRole: vi.fn().mockResolvedValue(page(0)) }, billing: { plans: vi.fn().mockResolvedValue(plans(0)) } }));
    zero.load();
    await settle();
    expect(zero.studentAccounts).toEqual({ state: 'ready', value: 0 });
    expect(zero.publishedPlans).toEqual({ state: 'ready', value: 0 });

    const failing = new OperationsOverviewViewModel(repositories({ accounts: { countByRole: vi.fn().mockRejectedValue(new Error('down')) }, billing: { plans: vi.fn().mockRejectedValue(new Error('down')) } }));
    failing.load();
    await settle();
    [failing.studentAccounts, failing.clinicianAccounts, failing.partnerAccounts, failing.publishedPlans].forEach(metric => expect(metric).toEqual({ state: 'error' }));
  });

  it('keeps every part independent when some fail', async () => {
    const vm = new OperationsOverviewViewModel(repositories({
      ops: { feed: vi.fn().mockRejectedValue(new Error('Feed down')), integrationHealth: vi.fn().mockRejectedValue(new Error('Probe down')) },
      audit: { listEvents: vi.fn().mockRejectedValue(new Error('Audit down')) },
    }));
    vm.load();
    await settle();
    expect(vm.feedError).toBe('Feed down');
    expect(vm.events).toEqual([]);
    expect(vm.auditLedger).toEqual({ status: 'Couldn’t check', tone: 'attention' });
    expect(vm.integrations).toEqual({ status: 'Couldn’t check', tone: 'attention' });
    expect(vm.services).toBe('service status unavailable');
    // The rest loaded.
    expect(vm.summary).toEqual(summary);
    expect(vm.studentAccounts).toEqual({ state: 'ready', value: 980 });
    expect(vm.openSafety.tone).toBe('danger');
  });

  it('reports a page error when the summary fails', async () => {
    const vm = new OperationsOverviewViewModel(repositories({ ops: { summary: vi.fn().mockRejectedValue(new Error('Super-admin access is required.')) } }));
    vm.load();
    await settle();
    expect(vm.pageLoading).toBe(false);
    expect(vm.pageError).toBe('Super-admin access is required.');
    expect(vm.summary).toBeNull();
  });

  it('retries one part, or everything from the page error', async () => {
    const feed = vi.fn().mockRejectedValueOnce(new Error('Feed down')).mockResolvedValue(feedOf('e9'));
    const repos = repositories({ ops: { feed } });
    const vm = new OperationsOverviewViewModel(repos);
    vm.load();
    await settle();
    vm.reloadFeed();
    expect(vm.feedLoading).toBe(true);
    expect(vm.feedError).toBe('');
    await settle();
    expect(vm.events.map(item => item.id)).toEqual(['e9']);
    expect(repos.ops.summary).toHaveBeenCalledTimes(1);

    vm.retryAll();
    await settle();
    expect(repos.ops.summary).toHaveBeenCalledTimes(2);
    expect(repos.ops.integrationHealth).toHaveBeenCalledTimes(2);
    expect(repos.ops.feedCounts).toHaveBeenCalledTimes(2);
    expect(repos.audit.listEvents).toHaveBeenCalledTimes(2);
    expect(repos.accounts.countByRole).toHaveBeenCalledTimes(6);
    expect(repos.billing.plans).toHaveBeenCalledTimes(2);
    expect(feed).toHaveBeenCalledTimes(3);
  });

  it('cancels a source’s previous request when it is reloaded', () => {
    const feed = deferred<OpsFeed>();
    const vm = new OperationsOverviewViewModel(repositories({ ops: { feed: (_query, signal) => feed.fn(signal) } }));
    vm.load();
    vm.reloadFeed();
    expect(feed.calls[0].signal?.aborted).toBe(true);
    expect(feed.calls[1].signal?.aborted).toBe(false);
  });

  it('ignores a stale answer: only the latest request of a source counts', async () => {
    const summaries = deferred<OpsSummary>();
    const vm = new OperationsOverviewViewModel(repositories({ ops: { summary: summaries.fn } }));
    vm.load();
    vm.reload('summary');
    summaries.calls[1].resolve({ ...summary, accounts: 2 });
    await settle();
    summaries.calls[0].resolve({ ...summary, accounts: 999 });
    summaries.calls[0].reject(new Error('late'));
    await settle();
    expect(vm.summary?.accounts).toBe(2);
    expect(vm.pageError).toBe('');
  });

  it('dispose cancels every request in flight and ignores their late answers', async () => {
    const pending = ALL.map(() => deferred<never>());
    const [summaryCall, auditCall, healthCall, feedCall, countsCall, accountsCall, , , plansCall] = pending;
    const vm = new OperationsOverviewViewModel({
      ops: { summary: summaryCall.fn, integrationHealth: healthCall.fn, feed: (_q, signal) => feedCall.fn(signal), feedCounts: countsCall.fn },
      audit: { listEvents: (_offset, _limit, signal) => auditCall.fn(signal) },
      accounts: { countByRole: (_role, signal) => accountsCall.fn(signal) },
      billing: { plans: plansCall.fn },
    });
    vm.load();
    const signals = [summaryCall, auditCall, healthCall, feedCall, countsCall, plansCall].flatMap(item => item.calls.map(call => call.signal)).concat(accountsCall.calls.map(call => call.signal));
    expect(signals).toHaveLength(9);
    vm.dispose();
    expect(signals.every(signal => signal?.aborted)).toBe(true);
    [summaryCall, auditCall, healthCall, feedCall, countsCall, accountsCall, plansCall].forEach(item => item.calls.forEach(call => call.resolve(summary as never)));
    await settle();
    ALL.forEach(source => expect(vm.sources[source], source).toEqual({ data: null, loading: true, error: '' }));
  });

  it('makes no state change after dispose, even when requests fail late', async () => {
    const summaries = deferred<OpsSummary>();
    const counts = deferred<OpsFeedCounts>();
    const vm = new OperationsOverviewViewModel(repositories({ ops: { summary: summaries.fn, feedCounts: counts.fn } }));
    vm.load();
    vm.dispose();
    summaries.calls[0].reject(new Error('late'));
    counts.calls[0].reject(new Error('late'));
    await settle();
    expect(vm.pageError).toBe('');
    expect(vm.sources.counts.error).toBe('');
    expect(vm.pageLoading).toBe(true);
  });

  it('works again after dispose when loaded once more', async () => {
    const vm = new OperationsOverviewViewModel(repositories());
    vm.load();
    vm.dispose();
    vm.load();
    await settle();
    expect(vm.summary).toEqual(summary);
    expect(vm.studentAccounts).toEqual({ state: 'ready', value: 980 });
  });
});

describe('Overview rules (format.ts)', () => {
  it('works the services line out from the probes', () => {
    expect(describeServices([check('a', true, 'online'), check('b', true, 'online')])).toBe('all configured services online');
    expect(describeServices([check('a', true, 'online'), check('b', true, 'degraded')])).toBe('1 service degraded');
    // A configured service with no probe is unverified, not online.
    expect(describeServices([check('a', true, 'online'), check('b', true, 'unknown')])).toBe('1 of 2 configured services verified online');
    expect(describeServices([check('a', false, 'unavailable')])).toBe('no integrations configured');
  });

  it('colours services: degraded is attention, all online is positive, otherwise neutral', () => {
    expect(servicesTone([check('a', true, 'degraded')])).toBe('attention');
    expect(servicesTone([check('a', true, 'online')])).toBe('positive');
    expect(servicesTone([check('a', true, 'unknown')])).toBe('neutral');
    expect(servicesTone([])).toBe('neutral');
  });

  it('turns a source into a figure: loading, error and missing data are never 0', () => {
    expect(metricFrom({ data: null, loading: true, error: '' }, (n: number) => n)).toEqual({ state: 'loading' });
    expect(metricFrom({ data: null, loading: false, error: 'down' }, (n: number) => n)).toEqual({ state: 'error' });
    expect(metricFrom({ data: null, loading: false, error: '' }, (n: number) => n)).toEqual({ state: 'error' });
    expect(metricFrom({ data: 0, loading: false, error: '' }, (n: number) => n)).toEqual({ state: 'error' });
    expect(metricFrom({ data: { total: 0 }, loading: false, error: '' }, data => data.total)).toEqual({ state: 'ready', value: 0 });
  });
});
