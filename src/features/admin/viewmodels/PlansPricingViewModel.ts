import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { BillingPlan, PlanCatalog } from '@/data/datasets/billing';
import type { PlansRepository } from '../model/contractsRepository';

/**
 * Plans & pricing, and its read-only “Change a plan price” screen: the published plan
 * catalogue. Loads the way useApiResource did — loading, then data or an error, with a
 * retry — and cancels the request in flight when reloaded or disposed. Read-only: there
 * is no endpoint to edit a plan or set a price.
 */
export class PlansPricingViewModel {
  catalog: PlanCatalog | null = null;
  loading = true;
  error = '';
  private version = 0;
  private controller: AbortController | null = null;

  constructor(private readonly repository: PlansRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller'>(
      this,
      { repository: false, version: false, controller: false, catalog: observableRef },
      { autoBind: true },
    );
  }

  /** The published plans, in the order the catalogue lists them; empty until loaded. */
  get plans(): BillingPlan[] { return this.catalog?.plans ?? []; }
  get checkoutAvailable(): boolean { return this.catalog?.checkoutAvailable ?? false; }

  load() { void this.fetchPlans(); }
  reload() { void this.fetchPlans(); }

  async fetchPlans() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.catalog = null;
    try {
      const result = await this.repository.plans(controller.signal);
      if (version === this.version) runInAction(() => { this.catalog = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the request in flight and ignores a late answer. A later load works again. */
  dispose() {
    this.version += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
