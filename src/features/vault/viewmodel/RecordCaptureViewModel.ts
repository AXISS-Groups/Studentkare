import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** The categories POST /api/health/documents accepts; anything else is a 422. */
export const RECORD_CATEGORIES = ['PRESCRIPTION', 'LAB', 'VACCINE', 'DISCHARGE_SUMMARY', 'CAMP_REPORT', 'OTHER'] as const;
export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

/** A photo the camera wrote to the app's own storage. */
export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface RecordDraft {
  title: string;
  category: RecordCategory;
  photo: CapturedPhoto;
}

/** Sends one record to the server. The platform builds the multipart body. */
export type RecordUploader = (draft: RecordDraft) => Promise<void>;

export type CaptureProblem = 'title' | 'category' | 'tooLarge' | 'failed';

/**
 * Photograph a document and add it to the student's records.
 *
 * Fail closed: the record counts as saved only when the server accepted it.
 * A failed upload keeps the photo and the answers so the student can retry,
 * and nothing is kept anywhere but the server once it is saved.
 */
export class RecordCaptureViewModel implements ViewModel {
  photo: CapturedPhoto | null = null;
  title = '';
  category: RecordCategory | null = null;
  saving = false;
  saved = false;
  problem: CaptureProblem | null = null;

  constructor(private readonly upload: RecordUploader) {
    makeAutoObservable<RecordCaptureViewModel, 'upload'>(this, { upload: false }, { autoBind: true });
  }

  setPhoto(photo: CapturedPhoto): void {
    this.photo = photo;
    this.saved = false;
    this.problem = null;
  }

  setTitle(title: string): void {
    this.title = title;
    if (this.problem === 'title') this.problem = null;
  }

  setCategory(category: RecordCategory): void {
    this.category = category;
    if (this.problem === 'category') this.problem = null;
  }

  retake(): void {
    this.photo = null;
    this.problem = null;
  }

  /** Clears everything for the next document. */
  reset(): void {
    this.photo = null;
    this.title = '';
    this.category = null;
    this.saving = false;
    this.saved = false;
    this.problem = null;
  }

  async save(): Promise<void> {
    if (this.saving || !this.photo) return;
    const title = this.title.trim();
    if (!title) {
      this.problem = 'title';
      return;
    }
    if (!this.category) {
      this.problem = 'category';
      return;
    }
    this.saving = true;
    this.problem = null;
    try {
      await this.upload({ title: title.slice(0, 160), category: this.category, photo: this.photo });
      runInAction(() => {
        this.saving = false;
        this.saved = true;
        this.photo = null;
      });
    } catch (error) {
      runInAction(() => {
        this.saving = false;
        this.problem = error instanceof ApiError && error.status === 413 ? 'tooLarge' : 'failed';
      });
    }
  }

  dispose(): void {}
}
