import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { AiGovernanceRepository } from '../model/aiGovernanceRepository';
import { outcomeLabel } from '../model/format';
import type { AyushQuality } from '../model/types';

export interface PipelineOutcome { outcome: string; label: string; count: number }

/**
 * AI governance: Agent Ayush usage. Loading mirrors useApiResource, which this
 * replaced, the same way AuditExplorerViewModel does.
 */
export class AiGovernanceViewModel {
  quality: AyushQuality | null = null;
  // True before the first load, so the first render shows loading rather than "no usage".
  loading = true;
  error = '';
  private version = 0;
  private controller: AbortController | null = null;

  constructor(private readonly repository: AiGovernanceRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller'>(
      this,
      { repository: false, version: false, controller: false, quality: observableRef },
      { autoBind: true },
    );
  }

  /** No turns recorded. The rates then come back as 0, which would read as a failing agent. */
  get isEmpty(): boolean { return !this.quality || this.quality.turns === 0; }

  /** Where the pipeline stops, in the order the server reported it. */
  get outcomes(): PipelineOutcome[] {
    return Object.entries(this.quality?.refusalBreakdown ?? {}).map(([outcome, value]) => ({ outcome, label: outcomeLabel(outcome), count: value }));
  }

  reload() { void this.load(); }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.quality = null;
    try {
      const result = await this.repository.ayushQuality(controller.signal);
      if (version === this.version) runInAction(() => { this.quality = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the request in flight and ignores its answer. A later load works again. */
  dispose() {
    this.version += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
