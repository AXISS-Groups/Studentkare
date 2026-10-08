import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { OpsFeed } from '@/data/workflowTypes';
import type { OpsRepository } from '../model/opsRepository';
import { FEED_DOMAINS, type FeedQuery, type OpsFeedCounts } from '../model/types';

const FEED_LIMIT = 50;

/**
 * Activity: the operations feed, filtered by domain and by whether events still need
 * attention, with outstanding counts per domain. The feed and the counts load
 * independently, the way useApiResource did (see AuditExplorerViewModel); changing a
 * filter reloads the feed only when the filter actually changes. Mark handled behaves
 * as useMutation did: one at a time, its error kept until the next attempt, and no
 * state change after the screen has gone.
 */
export class ActivityFeedViewModel {
  domain = '';
  outstanding = true;
  feed: OpsFeed | null = null;
  feedLoading = true;
  feedError = '';
  counts: OpsFeedCounts | null = null;
  countsLoading = true;
  countsError = '';
  acknowledging = false;
  acknowledgeError = '';
  private feedVersion = 0;
  private countsVersion = 0;
  private feedController: AbortController | null = null;
  private countsController: AbortController | null = null;
  // Bumped on dispose only, so an acknowledgement finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: OpsRepository) {
    makeAutoObservable<this, 'repository' | 'feedVersion' | 'countsVersion' | 'feedController' | 'countsController' | 'generation'>(
      this,
      { repository: false, feedVersion: false, countsVersion: false, feedController: false, countsController: false, generation: false, feed: observableRef, counts: observableRef },
      { autoBind: true },
    );
  }

  /** The feed slice the filters ask for. */
  get query(): FeedQuery {
    return { limit: FEED_LIMIT, domain: this.domain || undefined, unacknowledgedOnly: this.outstanding };
  }

  /** Domains with outstanding events, plus the selected one even when it has none. */
  get visibleDomains(): string[] {
    return FEED_DOMAINS.filter(name => this.countOf(name) > 0 || this.domain === name);
  }

  countOf(domain: string): number { return this.counts?.domains[domain] ?? 0; }

  setDomain(domain: string) {
    if (domain === this.domain) return;
    this.domain = domain;
    this.reloadFeed();
  }

  /** A domain card selects its domain, or clears it when it is already selected. */
  toggleDomain(domain: string) { this.setDomain(this.domain === domain ? '' : domain); }

  setOutstanding(outstanding: boolean) {
    if (outstanding === this.outstanding) return;
    this.outstanding = outstanding;
    this.reloadFeed();
  }

  load() {
    this.reloadFeed();
    this.reloadCounts();
  }

  reloadFeed() { void this.loadFeed(); }
  reloadCounts() { void this.loadCounts(); }

  /** Marks an event handled, then reloads the feed and the counts. */
  async acknowledge(eventId: string) {
    if (this.acknowledging) return;
    const generation = this.generation;
    this.acknowledging = true;
    this.acknowledgeError = '';
    try {
      await this.repository.acknowledge(eventId);
      if (generation === this.generation) {
        this.reloadFeed();
        this.reloadCounts();
      }
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.acknowledgeError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
    } finally {
      if (generation === this.generation) runInAction(() => { this.acknowledging = false; });
    }
  }

  async loadFeed() {
    const version = ++this.feedVersion;
    this.feedController?.abort();
    const controller = new AbortController();
    this.feedController = controller;
    this.feedLoading = true;
    this.feedError = '';
    this.feed = null;
    try {
      const result = await this.repository.feed(this.query, controller.signal);
      if (version === this.feedVersion) runInAction(() => { this.feed = result; });
    } catch (reason) {
      if (version === this.feedVersion) runInAction(() => { this.feedError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.feedVersion) runInAction(() => { this.feedLoading = false; });
    }
  }

  async loadCounts() {
    const version = ++this.countsVersion;
    this.countsController?.abort();
    const controller = new AbortController();
    this.countsController = controller;
    this.countsLoading = true;
    this.countsError = '';
    this.counts = null;
    try {
      const result = await this.repository.feedCounts(controller.signal);
      if (version === this.countsVersion) runInAction(() => { this.counts = result; });
    } catch (reason) {
      if (version === this.countsVersion) runInAction(() => { this.countsError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.countsVersion) runInAction(() => { this.countsLoading = false; });
    }
  }

  /** Stops both requests in flight and ignores late answers. A later load works again. */
  dispose() {
    this.feedVersion += 1;
    this.countsVersion += 1;
    this.generation += 1;
    this.feedController?.abort();
    this.countsController?.abort();
    this.feedController = null;
    this.countsController = null;
  }
}
