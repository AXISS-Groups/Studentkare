import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { IntakeRepository } from '../model/intakeRepository';
import type { IntakeQueue, ReviewItem } from '../model/types';

/** The queue's fields for one uploaded document. */
export interface IntakeDocument { intakeId: string; documentId: string; fields: ReviewItem[]; lowest: number }

/**
 * Intake & OCR: the fields waiting for a person, grouped by document, and the
 * confirm/reject decision for the selected document.
 *
 * The queue loads the way useApiResource did (see AuditExplorerViewModel). A
 * decision behaves as useMutation did: one at a time, its error kept until the
 * next attempt, and no state change after the screen has gone.
 */
export class IntakeViewModel {
  queue: IntakeQueue | null = null;
  // True before the first load, so the first render shows loading rather than an empty queue.
  loading = true;
  error = '';
  selectedId: string | null = null;
  edits: Record<string, string> = {};
  deciding = false;
  decisionError = '';
  private version = 0;
  private controller: AbortController | null = null;
  // Bumped on dispose only, so a decision finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: IntakeRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, generation: false, queue: observableRef },
      { autoBind: true },
    );
  }

  get items(): ReviewItem[] { return this.queue?.items ?? []; }

  /** Fields grouped by document, in queue order, with each document's lowest confidence. */
  get documents(): IntakeDocument[] {
    const groups = new Map<string, ReviewItem[]>();
    this.items.forEach(item => groups.set(item.intakeId, [...(groups.get(item.intakeId) ?? []), item]));
    return Array.from(groups.entries()).map(([intakeId, fields]) => ({ intakeId, documentId: fields[0].documentId, fields, lowest: Math.min(...fields.map(field => field.confidence)) }));
  }

  /** The chosen document, or the first one when none is chosen. */
  get selected(): IntakeDocument | undefined {
    return this.documents.find(document => document.intakeId === this.selectedId) ?? this.documents[0];
  }

  /** What the field's input shows: the person's edit, or the value the reader found. */
  fieldValue(field: ReviewItem): string { return this.edits[field.id] ?? field.value; }

  /** Choosing another document discards edits made to the previous one. */
  selectDocument(intakeId: string) {
    this.selectedId = intakeId;
    this.edits = {};
  }

  edit(fieldId: string, value: string) { this.edits = { ...this.edits, [fieldId]: value }; }

  /**
   * Confirm (with any corrections) or reject every field of the selected document,
   * one request per field. On success the edits and selection reset and the queue
   * reloads; on failure they are kept and the error is shown.
   */
  async decide(approved: boolean) {
    const document = this.selected;
    if (!document || this.deciding) return;
    const generation = this.generation;
    const decisions = document.fields.map(field => ({ fieldId: field.id, decision: { approved, correctedValue: approved ? this.fieldValue(field) : '' } }));
    this.deciding = true;
    this.decisionError = '';
    try {
      for (const { fieldId, decision } of decisions) await this.repository.decideField(fieldId, decision);
      if (generation === this.generation) runInAction(() => { this.edits = {}; this.selectedId = null; });
      if (generation === this.generation) this.reload();
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.decisionError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
    } finally {
      if (generation === this.generation) runInAction(() => { this.deciding = false; });
    }
  }

  reload() { void this.load(); }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.queue = null;
    try {
      const result = await this.repository.reviewQueue(controller.signal);
      if (version === this.version) runInAction(() => { this.queue = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the queue request in flight and ignores late answers. A later load works again. */
  dispose() {
    this.version += 1;
    this.generation += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
