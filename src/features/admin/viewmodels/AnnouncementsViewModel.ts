import { makeAutoObservable, runInAction } from 'mobx';
import { getSetting } from '@/data/services/config';
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementKind,
  AnnouncementList,
  AnnouncementPreview,
  AnnouncementsRepository,
} from '../model/announcementsRepository';

export type When = 'now' | 'later';

/**
 * Super Admin → Content & AI → Announcements.
 *
 * The check (no health, no codes, no links) and the audience count run on the
 * server; the page only shows their verdict. Sending needs a fresh preview of
 * exactly what will be sent, then a confirmation. Any edit clears the preview.
 */
export class AnnouncementsViewModel {
  data: AnnouncementList | null = null;
  loading = false;
  error = '';

  kind: AnnouncementKind = 'ANNOUNCEMENT';
  title = '';
  body = '';
  campus = '';
  when: When = 'now';
  /** `datetime-local` value (local time), used when `when` is later. */
  at = '';

  preview: AnnouncementPreview | null = null;
  previewing = false;
  previewFailed = false;
  confirming = false;
  creating = false;
  createFailed = false;
  created = false;

  cancelTarget: Announcement | null = null;
  cancelling = false;
  cancelFailed = false;

  private disposed = false;

  constructor(private readonly repository: AnnouncementsRepository) {
    makeAutoObservable<AnnouncementsViewModel, 'repository' | 'disposed'>(this, { repository: false, disposed: false }, { autoBind: true });
  }

  get titleMax(): number {
    return this.data?.limits.titleMax ?? getSetting('push.announcement_title_max');
  }

  get bodyMax(): number {
    return this.data?.limits.bodyMax ?? getSetting('push.announcement_body_max');
  }

  /** Epoch seconds for a scheduled send, or undefined for now / an unreadable time. */
  get scheduledAt(): number | undefined {
    if (this.when !== 'later' || !this.at) return undefined;
    const ms = new Date(this.at).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
  }

  get draft(): AnnouncementDraft {
    const scheduledAt = this.scheduledAt;
    return { kind: this.kind, title: this.title.trim(), body: this.body.trim(), campus: this.campus, ...(scheduledAt ? { scheduledAt } : {}) };
  }

  get canPreview(): boolean {
    return !this.previewing && this.title.trim() !== '' && this.body.trim() !== '' && (this.when === 'now' || this.scheduledAt !== undefined);
  }

  get canSend(): boolean {
    return Boolean(this.preview && this.preview.problems.length === 0) && !this.creating;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loading = true;
    this.error = '';
    try {
      const data = await this.repository.list();
      if (!this.disposed) runInAction(() => { this.data = data; });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.error = error instanceof Error ? error.message : ''; });
    } finally {
      if (!this.disposed) runInAction(() => { this.loading = false; });
    }
  }

  private edited(): void {
    this.preview = null;
    this.previewFailed = false;
    this.created = false;
    this.createFailed = false;
  }

  setKind(kind: AnnouncementKind): void { this.kind = kind; this.edited(); }
  setTitle(value: string): void { this.title = value; this.edited(); }
  setBody(value: string): void { this.body = value; this.edited(); }
  setCampus(value: string): void { this.campus = value; this.edited(); }
  setWhen(value: When): void { this.when = value; this.edited(); }
  setAt(value: string): void { this.at = value; this.edited(); }

  async runPreview(): Promise<void> {
    if (!this.canPreview) return;
    this.previewing = true;
    this.previewFailed = false;
    try {
      const result = await this.repository.preview(this.draft);
      if (!this.disposed) runInAction(() => { this.preview = result; });
    } catch {
      if (!this.disposed) runInAction(() => { this.previewFailed = true; });
    } finally {
      if (!this.disposed) runInAction(() => { this.previewing = false; });
    }
  }

  askSend(): void {
    if (this.canSend) this.confirming = true;
  }

  cancelSend(): void {
    this.confirming = false;
  }

  async send(): Promise<void> {
    if (!this.canSend) return;
    this.creating = true;
    this.createFailed = false;
    try {
      const row = await this.repository.create(this.draft);
      if (this.disposed) return;
      runInAction(() => {
        this.confirming = false;
        this.created = true;
        this.title = '';
        this.body = '';
        this.preview = null;
        if (this.data) this.data = { ...this.data, items: [row, ...this.data.items] };
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.createFailed = true; this.confirming = false; });
    } finally {
      if (!this.disposed) runInAction(() => { this.creating = false; });
    }
  }

  askCancel(row: Announcement): void {
    this.cancelTarget = row;
    this.cancelFailed = false;
  }

  keep(): void {
    this.cancelTarget = null;
  }

  async confirmCancel(): Promise<void> {
    const target = this.cancelTarget;
    if (!target) return;
    this.cancelling = true;
    try {
      const row = await this.repository.cancel(target.id);
      if (this.disposed) return;
      runInAction(() => {
        if (this.data) this.data = { ...this.data, items: this.data.items.map((item) => (item.id === row.id ? row : item)) };
        this.cancelTarget = null;
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.cancelFailed = true; });
    } finally {
      if (!this.disposed) runInAction(() => { this.cancelling = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }
}
