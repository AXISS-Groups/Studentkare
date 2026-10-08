import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { OpsFeed } from '@/data/workflowTypes';
import type { OpsRepository } from '../model/opsRepository';
import type { OpsFeedCounts } from '../model/types';

const SAFETY_FEED_LIMIT = 25;

/**
 * Operations & SOS → Safety events: the SAFETY slice of the ops feed, and the counts that
 * fill the open-events tile and the header status. One instance owns the counts for the
 * whole screen, so they are requested once. The feed and the counts load independently,
 * the way useApiResource did (see ActivityFeedViewModel). Read-only: no mutations.
 */
export class SafetyEventsViewModel {
  feed: OpsFeed | null = null;
  feedLoading = true;
  feedError = '';
  counts: OpsFeedCounts | null = null;
  countsLoading = true;
  countsError = '';
  private feedVersion = 0;
  private countsVersion = 0;
  private feedController: AbortController | null = null;
  private countsController: AbortController | null = null;

  constructor(private readonly repository: OpsRepository) {
    makeAutoObservable<this, 'repository' | 'feedVersion' | 'countsVersion' | 'feedController' | 'countsController'>(
      this,
      { repository: false, feedVersion: false, countsVersion: false, feedController: false, countsController: false, feed: observableRef, counts: observableRef },
      { autoBind: true },
    );
  }

  /** Unacknowledged SAFETY events; 0 when the counts leave SAFETY out. */
  get openCount(): number { return this.counts?.domains.SAFETY ?? 0; }

  /** The header status shows only once counts have loaded with at least one open event. */
  get showOpenStatus(): boolean { return this.openCount > 0; }

  /** The whole screen: the feed and the counts. */
  load() {
    this.reloadFeed();
    this.reloadCounts();
  }

  reloadFeed() { void this.loadFeed(); }
  reloadCounts() { void this.loadCounts(); }

  async loadFeed() {
    const version = ++this.feedVersion;
    this.feedController?.abort();
    const controller = new AbortController();
    this.feedController = controller;
    this.feedLoading = true;
    this.feedError = '';
    this.feed = null;
    try {
      const result = await this.repository.domainFeed('SAFETY', SAFETY_FEED_LIMIT, controller.signal);
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
    this.feedController?.abort();
    this.countsController?.abort();
    this.feedController = null;
    this.countsController = null;
  }
}
