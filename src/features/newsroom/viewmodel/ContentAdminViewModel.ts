import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import { ApiError } from '@/data/services/http';
import type { SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';
import { ContentRepository } from '../data/ContentRepository';
import type { Category, CategoryInput, LibraryEntry, PostStatRow, Series, SeriesInput, ShareChannel, ShareKit } from '../data/ContentRepository';
import { NewsroomRepository } from '../data/NewsroomRepository';
import type { AdminPost } from '../data/NewsroomRepository';
import type { PostTemplate } from '../model/templates';

/**
 * Super admin, Content: the Categories, Series, Share kit and Analytics tabs
 * (AdminPosts). Every change goes through the server, which audits it; the
 * share kit only prepares links, a caption and cards for a person to post.
 */
export type ContentNotice = 'categorySaved' | 'categoryArchived' | 'categoryRestored' | 'seriesSaved' | 'seriesArchived' | 'seriesRestored'
  | 'captionCopied' | 'copyFailed';

export function splitList(text: string): string[] {
  return text.split(',').map((v) => v.trim()).filter(Boolean);
}

export function blankCategory(hue: ServiceHue = 'indigo', icon: SkIconName = 'file-text'): CategoryInput {
  return { name: '', hue, icon, clinical: false, crisisLines: false, hashtags: [], keywords: [], topics: [] };
}

export function blankSeries(hue: ServiceHue = 'teal'): SeriesInput {
  return { name: '', summary: '', categoryId: '', template: 'SERIES_EPISODE', hue, library: [] };
}

export function blankLine(): LibraryEntry {
  return { kind: 'own', text: '', cite: '', sourceUrl: '', publicDomain: false };
}

function categoryInput(c: Category): CategoryInput {
  return { name: c.name, hue: c.hue, icon: c.icon, clinical: c.clinical, crisisLines: c.crisisLines, hashtags: c.hashtags, keywords: c.keywords, topics: c.topics };
}

function seriesInput(s: Series): SeriesInput {
  return { name: s.name, summary: s.summary, categoryId: s.categoryId, template: s.template, hue: s.hue, library: s.library.map((l) => ({ ...l })) };
}

export class ContentAdminViewModel implements ViewModel {
  phase: 'loading' | 'ready' | 'error' = 'loading';
  busy = false;
  error: string | null = null;
  notice: ContentNotice | null = null;

  categories: Category[] = [];
  hues: ServiceHue[] = [];
  icons: SkIconName[] = [];
  /** The category form: null closed; `editingCategory` null for a new one. */
  categoryDraft: CategoryInput | null = null;
  editingCategory: string | null = null;

  series: Series[] = [];
  seriesDraft: SeriesInput | null = null;
  editingSeries: string | null = null;

  /** Share kit: posts to pick from and the open kit. */
  posts: AdminPost[] = [];
  kitPostId = '';
  kit: ShareKit | null = null;

  stats: PostStatRow[] = [];
  channels: ShareChannel[] = [];
  statsEnabled = true;

  private disposed = false;

  constructor(private readonly repo: ContentRepository = new ContentRepository(), private readonly posts$: NewsroomRepository = new NewsroomRepository()) {
    makeAutoObservable<ContentAdminViewModel, 'repo' | 'posts$' | 'disposed'>(this, { repo: false, posts$: false, disposed: false }, { autoBind: true });
  }

  private async guard(work: () => Promise<void>, notice?: ContentNotice): Promise<boolean> {
    this.busy = true;
    this.error = null;
    try {
      await work();
      runInAction(() => { if (notice) this.notice = notice; });
      return true;
    } catch (e) {
      runInAction(() => { this.error = e instanceof ApiError ? e.message : ''; });
      return false;
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  async loadCategories(): Promise<void> {
    this.disposed = false;   // a remount (React strict mode) disposes first, then loads again
    this.phase = 'loading';
    try {
      const res = await this.repo.adminCategories();
      if (this.disposed) return;
      runInAction(() => { this.categories = res.items; this.hues = res.hues; this.icons = res.icons; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  newCategory(): void {
    this.editingCategory = null;
    this.categoryDraft = blankCategory(this.hues[0], this.icons[0]);
  }

  editCategory(c: Category): void {
    this.editingCategory = c.id;
    this.categoryDraft = categoryInput(c);
  }

  updateCategory(patch: Partial<CategoryInput>): void {
    if (this.categoryDraft) this.categoryDraft = { ...this.categoryDraft, ...patch };
  }

  closeCategory(): void { this.categoryDraft = null; this.editingCategory = null; }

  async saveCategory(): Promise<void> {
    const draft = this.categoryDraft;
    if (!draft) return;
    const id = this.editingCategory;
    const ok = await this.guard(async () => {
      const res = id ? await this.repo.saveCategory(id, draft) : await this.repo.createCategory(draft);
      runInAction(() => { this.categories = res.items; });
    }, 'categorySaved');
    if (ok) this.closeCategory();
  }

  async archiveCategory(id: string, archived: boolean): Promise<void> {
    await this.guard(async () => {
      const res = await this.repo.archiveCategory(id, archived);
      runInAction(() => { this.categories = res.items; });
    }, archived ? 'categoryArchived' : 'categoryRestored');
  }

  async loadSeries(): Promise<void> {
    this.disposed = false;   // a remount (React strict mode) disposes first, then loads again
    this.phase = 'loading';
    try {
      const [series, categories] = await Promise.all([this.repo.adminSeries(), this.repo.adminCategories()]);
      if (this.disposed) return;
      runInAction(() => { this.series = series.items; this.hues = series.hues; this.categories = categories.items; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  newSeries(): void {
    this.editingSeries = null;
    this.seriesDraft = blankSeries(this.hues[0]);
  }

  editSeries(s: Series): void {
    this.editingSeries = s.id;
    this.seriesDraft = seriesInput(s);
  }

  updateSeries(patch: Partial<SeriesInput>): void {
    if (this.seriesDraft) this.seriesDraft = { ...this.seriesDraft, ...patch };
  }

  setSeriesTemplate(template: PostTemplate): void { this.updateSeries({ template }); }

  addLine(): void {
    if (this.seriesDraft) this.seriesDraft = { ...this.seriesDraft, library: [...this.seriesDraft.library, blankLine()] };
  }

  updateLine(index: number, patch: Partial<LibraryEntry>): void {
    if (!this.seriesDraft) return;
    this.seriesDraft = { ...this.seriesDraft, library: this.seriesDraft.library.map((l, i) => (i === index ? { ...l, ...patch } : l)) };
  }

  removeLine(index: number): void {
    if (this.seriesDraft) this.seriesDraft = { ...this.seriesDraft, library: this.seriesDraft.library.filter((_, i) => i !== index) };
  }

  closeSeries(): void { this.seriesDraft = null; this.editingSeries = null; }

  async saveSeries(): Promise<void> {
    const draft = this.seriesDraft;
    if (!draft) return;
    const id = this.editingSeries;
    const body: SeriesInput = { ...draft, library: draft.library.filter((l) => l.text.trim()) };
    const ok = await this.guard(async () => {
      const res = id ? await this.repo.saveSeries(id, body) : await this.repo.createSeries(body);
      runInAction(() => { this.series = res.items; });
    }, 'seriesSaved');
    if (ok) this.closeSeries();
  }

  async archiveSeries(id: string, archived: boolean): Promise<void> {
    await this.guard(async () => {
      const res = await this.repo.archiveSeries(id, archived);
      runInAction(() => { this.series = res.items; });
    }, archived ? 'seriesArchived' : 'seriesRestored');
  }

  async loadShareKit(postId = this.kitPostId): Promise<void> {
    this.disposed = false;   // a remount (React strict mode) disposes first, then loads again
    this.phase = 'loading';
    try {
      const posts = this.posts.length ? this.posts : (await this.posts$.adminList({})).items.filter((p) => p.status !== 'UNPUBLISHED');
      const chosen = postId || posts.find((p) => p.live)?.id || posts[0]?.id || '';
      const kit = chosen ? await this.repo.shareKit(chosen) : null;
      if (this.disposed) return;
      runInAction(() => { this.posts = posts; this.kitPostId = chosen; this.kit = kit; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  pickPost(postId: string): void {
    this.kitPostId = postId;
    void this.loadShareKit(postId);
  }

  async copyCaption(): Promise<void> {
    const caption = this.kit?.caption;
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      runInAction(() => { this.notice = 'captionCopied'; });
    } catch {
      runInAction(() => { this.notice = 'copyFailed'; });
    }
  }

  async loadStats(): Promise<void> {
    this.disposed = false;   // a remount (React strict mode) disposes first, then loads again
    this.phase = 'loading';
    try {
      const res = await this.repo.stats();
      if (this.disposed) return;
      runInAction(() => { this.stats = res.items; this.channels = res.channels; this.statsEnabled = res.enabled; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  clearNotice(): void { this.notice = null; }

  reset(): void {
    this.closeCategory();
    this.closeSeries();
    this.kit = null;
  }

  dispose(): void { this.disposed = true; }
}
