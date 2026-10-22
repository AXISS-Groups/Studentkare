import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { KnowledgeRepository } from '../model/knowledgeRepository';
import { indexTone, sourceState } from '../model/format';
import type { AyushHealth, IndexStatus, KnowledgeSource, KnowledgeSources } from '../model/types';

const FAILED = 'The request could not be completed.';
const UNREADABLE = 'The health report could not be read.';

/** A health report the card can draw: anything else is shown as an error, never half-drawn. */
function isAyushHealth(value: unknown): value is AyushHealth {
  if (!value || typeof value !== 'object') return false;
  const report = value as Partial<AyushHealth>;
  return typeof report.status === 'string' && typeof report.published === 'number' && typeof report.indexed === 'number'
    && !!report.retrieval && typeof report.retrieval.mode === 'string' && !!report.answers && typeof report.answers.mode === 'string'
    && !!report.helpPack && !!report.answers.recent;
}

/**
 * Knowledge base: the sources Ayush may quote and the search index over them.
 * Each loads independently, the way useApiResource did (see AuditExplorerViewModel);
 * Rebuild index behaves as useMutation did: one at a time, its error kept until
 * the next attempt, and no state change after the screen has gone.
 */
export class KnowledgeViewModel {
  sources: KnowledgeSources | null = null;
  sourcesLoading = true;
  sourcesError = '';
  index: IndexStatus | null = null;
  indexLoading = true;
  indexError = '';
  reindexing = false;
  reindexError = '';
  health: AyushHealth | null = null;
  healthLoading = true;
  healthError = '';
  private sourcesVersion = 0;
  private indexVersion = 0;
  private healthVersion = 0;
  private sourcesController: AbortController | null = null;
  private indexController: AbortController | null = null;
  private healthController: AbortController | null = null;
  // Bumped on dispose only, so a rebuild finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: KnowledgeRepository) {
    makeAutoObservable<this, 'repository' | 'sourcesVersion' | 'indexVersion' | 'healthVersion' | 'sourcesController' | 'indexController' | 'healthController' | 'generation'>(
      this,
      {
        repository: false, sourcesVersion: false, indexVersion: false, healthVersion: false, sourcesController: false, indexController: false,
        healthController: false, generation: false, sources: observableRef, index: observableRef, health: observableRef,
      },
      { autoBind: true },
    );
  }

  get list(): KnowledgeSource[] { return this.sources?.items ?? []; }
  get missing(): Set<string> { return new Set(this.index?.missing ?? []); }
  get indexTone(): 'neutral' | 'attention' | 'positive' | null { return this.index ? indexTone(this.index) : null; }

  /** Each source with its state at `now`: expiry depends on the time the list is shown. */
  sourceRows(now: number = Date.now()): { source: KnowledgeSource; state: { label: string; tone: string } }[] {
    const missing = this.missing;
    return this.list.map(source => ({ source, state: sourceState(source, missing, now) }));
  }

  load() {
    void this.loadSources();
    void this.loadIndex();
    void this.loadHealth();
  }

  reloadSources() { void this.loadSources(); }
  reloadIndex() { void this.loadIndex(); }
  reloadHealth() { void this.loadHealth(); }

  /** After a source is published (the server indexes it in the same request): the list, the index, then health. */
  published() {
    this.reloadSources();
    this.reloadIndex();
    this.reloadHealth();
  }

  /** Rebuild the search index; afterwards the index is checked again, then the list. */
  async reindex() {
    if (this.reindexing) return;
    const generation = this.generation;
    this.reindexing = true;
    this.reindexError = '';
    try {
      await this.repository.reindex();
      if (generation === this.generation) {
        this.reloadIndex();
        this.reloadSources();
        this.reloadHealth();
      }
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.reindexError = reason instanceof Error ? reason.message : FAILED; });
    } finally {
      if (generation === this.generation) runInAction(() => { this.reindexing = false; });
    }
  }

  async loadSources() {
    const version = ++this.sourcesVersion;
    this.sourcesController?.abort();
    const controller = new AbortController();
    this.sourcesController = controller;
    this.sourcesLoading = true;
    this.sourcesError = '';
    this.sources = null;
    try {
      const result = await this.repository.sources(controller.signal);
      if (version === this.sourcesVersion) runInAction(() => { this.sources = result; });
    } catch (reason) {
      if (version === this.sourcesVersion) runInAction(() => { this.sourcesError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.sourcesVersion) runInAction(() => { this.sourcesLoading = false; });
    }
  }

  async loadIndex() {
    const version = ++this.indexVersion;
    this.indexController?.abort();
    const controller = new AbortController();
    this.indexController = controller;
    this.indexLoading = true;
    this.indexError = '';
    this.index = null;
    try {
      const result = await this.repository.indexStatus(controller.signal);
      if (version === this.indexVersion) runInAction(() => { this.index = result; });
    } catch (reason) {
      if (version === this.indexVersion) runInAction(() => { this.indexError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.indexVersion) runInAction(() => { this.indexLoading = false; });
    }
  }

  async loadHealth() {
    const version = ++this.healthVersion;
    this.healthController?.abort();
    const controller = new AbortController();
    this.healthController = controller;
    this.healthLoading = true;
    this.healthError = '';
    this.health = null;
    try {
      const result: unknown = await this.repository.health(controller.signal);
      if (version === this.healthVersion) {
        runInAction(() => {
          if (isAyushHealth(result)) this.health = result;
          else this.healthError = UNREADABLE;
        });
      }
    } catch (reason) {
      if (version === this.healthVersion) runInAction(() => { this.healthError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.healthVersion) runInAction(() => { this.healthLoading = false; });
    }
  }

  /** Stops every request in flight and ignores late answers. A later load works again. */
  dispose() {
    this.sourcesVersion += 1;
    this.indexVersion += 1;
    this.healthVersion += 1;
    this.generation += 1;
    this.sourcesController?.abort();
    this.indexController?.abort();
    this.healthController?.abort();
    this.sourcesController = null;
    this.indexController = null;
    this.healthController = null;
  }
}
