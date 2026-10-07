import { makeAutoObservable, runInAction } from 'mobx';
import type { KnowledgeRepository } from '../model/knowledgeRepository';

/** The form as typed: expiry stays text until it is sent. */
export interface PublishSourceForm { title: string; category: string; content: string; author: string; expiresInDays: string }
const EMPTY_FORM: PublishSourceForm = { title: '', category: 'appointments', content: '', author: '', expiresInDays: '365' };

/**
 * Publish a knowledge source. One per open dialog, so each opening starts with an
 * empty form and no error. Publishing behaves as useMutation did: one at a time,
 * its error kept until the next attempt, and no state change after the dialog has gone.
 */
export class PublishSourceViewModel {
  form: PublishSourceForm = { ...EMPTY_FORM };
  publishing = false;
  error = '';
  private generation = 0;

  constructor(private readonly repository: KnowledgeRepository) {
    makeAutoObservable<this, 'repository' | 'generation'>(this, { repository: false, generation: false }, { autoBind: true });
  }

  setField(key: keyof PublishSourceForm, value: string) { this.form = { ...this.form, [key]: value }; }

  /** Publishes the form. True when the source was published and the dialog is still open. */
  async publish(): Promise<boolean> {
    if (this.publishing) return false;
    const generation = this.generation;
    const source = { ...this.form, expiresInDays: Number(this.form.expiresInDays) };
    this.publishing = true;
    this.error = '';
    try {
      await this.repository.publish(source);
      if (generation !== this.generation) return false;
      runInAction(() => { this.form = { ...EMPTY_FORM }; });
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.error = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.publishing = false; });
    }
  }

  dispose() { this.generation += 1; }
}
