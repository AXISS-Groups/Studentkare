import { makeAutoObservable, observableShallow, runInAction } from 'mobx';
import type { AccountRole, IntegrationHealth, OpsFeed, OpsFeedEvent, OpsSummary } from '@/data/workflowTypes';
import type { PlanCatalog } from '@/data/datasets/billing';
import type { AccountsRepository } from '../model/accountsRepository';
import type { AuditRepository } from '../model/auditRepository';
import type { PlansRepository } from '../model/contractsRepository';
import type { OpsRepository, OpsStatusRepository } from '../model/opsRepository';
import type { AccountPage, AuditPage, MetricValue, OpsFeedCounts, SourceState, StatusReading } from '../model/types';
import { auditLedgerStatus, integrationsStatus, metricFrom, openSafetyStatus, servicesLine } from '../model/format';

const FEED_LIMIT = 5;
const AUDIT_PREVIEW = 1;

/** The repositories the Overview reads from — existing ones, narrowed to what it uses. */
export interface OverviewRepositories {
  ops: Pick<OpsRepository, 'feed' | 'feedCounts'> & OpsStatusRepository;
  audit: Pick<AuditRepository, 'listEvents'>;
  accounts: Pick<AccountsRepository, 'countByRole'>;
  billing: PlansRepository;
}

/** Every source the Overview summarises, and what each returns. */
interface OverviewSources {
  summary: OpsSummary;
  audit: AuditPage;
  health: IntegrationHealth;
  feed: OpsFeed;
  counts: OpsFeedCounts;
  students: AccountPage;
  clinicians: AccountPage;
  partners: AccountPage;
  plans: PlanCatalog;
}
export type OverviewSource = keyof OverviewSources;
type SourceTable = { [K in OverviewSource]: SourceState<OverviewSources[K]> };

const SOURCES: OverviewSource[] = ['summary', 'audit', 'health', 'feed', 'counts', 'students', 'clinicians', 'partners', 'plans'];
const loadingState = <T>(): SourceState<T> => ({ data: null, loading: true, error: '' });

/**
 * Super Admin → Overview: the platform command center. It summarises what other screens
 * already load — nine sources, each loading on its own the way useApiResource did, with
 * its own error and retry. Nothing missing is turned into a number: a source that is
 * loading or failed yields a blank (see metricFrom), and figures with no source at all
 * stay unreported in the View. Read-only.
 */
export class OperationsOverviewViewModel {
  sources: SourceTable = {
    summary: loadingState(), audit: loadingState(), health: loadingState(), feed: loadingState(), counts: loadingState(),
    students: loadingState(), clinicians: loadingState(), partners: loadingState(), plans: loadingState(),
  };
  private versions: Record<OverviewSource, number> = { summary: 0, audit: 0, health: 0, feed: 0, counts: 0, students: 0, clinicians: 0, partners: 0, plans: 0 };
  private controllers: Partial<Record<OverviewSource, AbortController>> = {};

  constructor(private readonly repositories: OverviewRepositories) {
    makeAutoObservable<this, 'repositories' | 'versions' | 'controllers'>(
      this,
      // Each source's state is replaced whole; the response objects inside it are not made observable.
      { repositories: false, versions: false, controllers: false, sources: observableShallow },
      { autoBind: true },
    );
  }

  // ── Page state ─────────────────────────────────────────────────────────────
  /** The page waits for the summary; every other source fills in on its own. */
  get pageLoading(): boolean { return this.sources.summary.loading; }
  get pageError(): string { return this.sources.summary.error; }
  get summary(): OpsSummary | null { return this.sources.summary.loading ? null : this.sources.summary.data; }

  // ── Figures ────────────────────────────────────────────────────────────────
  get studentAccounts(): MetricValue { return metricFrom(this.sources.students, page => page.total); }
  get clinicianAccounts(): MetricValue { return metricFrom(this.sources.clinicians, page => page.total); }
  get partnerAccounts(): MetricValue { return metricFrom(this.sources.partners, page => page.total); }
  get publishedPlans(): MetricValue { return metricFrom(this.sources.plans, catalog => catalog.plans.length); }
  get catalogueEntries(): MetricValue { return metricFrom(this.sources.summary, summary => summary.catalogItems); }

  // ── Recent activity ────────────────────────────────────────────────────────
  get feedLoading(): boolean { return this.sources.feed.loading; }
  get feedError(): string { return this.sources.feed.error; }
  get events(): OpsFeedEvent[] { return this.sources.feed.data?.items ?? []; }

  // ── Status ─────────────────────────────────────────────────────────────────
  get services(): string { return servicesLine(this.sources.health); }
  get auditLedger(): StatusReading { return auditLedgerStatus(this.sources.audit); }
  get integrations(): StatusReading { return integrationsStatus(this.sources.health); }
  get openSafety(): StatusReading { return openSafetyStatus(this.sources.counts); }

  // ── Loading ────────────────────────────────────────────────────────────────
  /** Every source, each independently. */
  load() { SOURCES.forEach(source => { void this.loadSource(source); }); }

  /** The page error's Try again: every source again. */
  retryAll() { this.load(); }

  reload(source: OverviewSource) { void this.loadSource(source); }
  reloadFeed() { this.reload('feed'); }

  private fetch<K extends OverviewSource>(source: K, signal: AbortSignal): Promise<OverviewSources[K]>;
  private fetch(source: OverviewSource, signal: AbortSignal): Promise<OverviewSources[OverviewSource]> {
    const { ops, audit, accounts, billing } = this.repositories;
    const countOf = (role: AccountRole) => accounts.countByRole(role, signal);
    switch (source) {
      case 'summary': return ops.summary(signal);
      case 'audit': return audit.listEvents(0, AUDIT_PREVIEW, signal);
      case 'health': return ops.integrationHealth(signal);
      case 'feed': return ops.feed({ limit: FEED_LIMIT }, signal);
      case 'counts': return ops.feedCounts(signal);
      case 'students': return countOf('STUDENT');
      case 'clinicians': return countOf('NMC_DOCTOR');
      case 'partners': return countOf('VENDOR');
      case 'plans': return billing.plans(signal);
    }
  }

  private setSource<K extends OverviewSource>(source: K, state: SourceState<OverviewSources[K]>) {
    this.sources[source] = state as SourceTable[K];
  }

  /** One source: cancels its previous request, and ignores any answer but the latest. */
  async loadSource<K extends OverviewSource>(source: K) {
    const version = ++this.versions[source];
    this.controllers[source]?.abort();
    const controller = new AbortController();
    this.controllers[source] = controller;
    this.setSource(source, loadingState());
    try {
      const data = await this.fetch(source, controller.signal);
      if (version === this.versions[source]) runInAction(() => this.setSource(source, { data, loading: false, error: '' }));
    } catch (reason) {
      if (version === this.versions[source]) runInAction(() => this.setSource(source, { data: null, loading: false, error: reason instanceof Error ? reason.message : '' }));
    }
  }

  /** Stops every request in flight and ignores late answers. A later load works again. */
  dispose() {
    SOURCES.forEach(source => {
      this.versions[source] += 1;
      this.controllers[source]?.abort();
    });
    this.controllers = {};
  }
}
