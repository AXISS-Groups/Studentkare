import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import { ApiError } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import { NewsroomRepository } from '../data/NewsroomRepository';
import type { AdminPost, AdminPostDetail, PostBlock, PostInput, PostStatus, TeamMember } from '../data/NewsroomRepository';
import { ContentRepository } from '../data/ContentRepository';
import type { Category, Series, SimilarPost } from '../data/ContentRepository';
import { TEMPLATES } from '../model/templates';
import type { BlockType, PostTemplate } from '../model/templates';
import { zonedToUnix } from '../model/share';
import { a11yChecks, wordCount } from '../model/composer';
import type { A11yCheck } from '../model/composer';

/**
 * Super admin, Posts, and the clinician's Health tip reviews (AdminPosts).
 *
 * - `admin`: the editor. Create and edit in a template with a live preview,
 *   then publish now, schedule, unpublish, or delete a never-published draft.
 *   A health tip can't be published until a clinician approves exactly its
 *   current content; the server refuses it otherwise.
 * - `review`: a clinician reads a health tip in its template and approves that
 *   exact version (its content hash goes with the approval, so a change made
 *   meanwhile is refused), or withdraws an approval.
 * Never an AI: every word is typed by the team.
 */
export type Console = 'admin' | 'review';
export type ReviewFilter = 'TO_REVIEW' | 'REVIEWED' | 'ALL';
export type Notice = 'saved' | 'created' | 'published' | 'scheduled' | 'unpublished' | 'deleted' | 'approved' | 'withdrawn' | 'uploaded';
export type Origin = 'AUTO' | 'MANUAL';
export type PreviewMode = 'desktop' | 'phone' | 'linkedin';
/** How long the composer waits after the title stops changing before it looks for a similar post. */
export const SIMILAR_DEBOUNCE_MS = 600;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A web address from a title: lowercase Latin letters and numbers joined by single hyphens. */
export function slugify(title: string): string {
  return title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
}

export function blankBlock(type: BlockType): PostBlock {
  switch (type) {
    case 'heading': return { type, text: '' };
    case 'paragraph': return { type, text: '' };
    case 'list': return { type, ordered: false, items: [''] };
    case 'quote': return { type, text: '', cite: '' };
    case 'callout': return { type, tone: 'info', text: '' };
    case 'image': return { type, imageId: '', alt: '', caption: '' };
    case 'facts': return { type, title: '', items: [''] };
    case 'cta': return { type, label: '', route: '/find-care' };
    case 'mythfact': return { type, myth: '', fact: '' };
    case 'stat': return { type, value: '', label: '' };
  }
}

export function blankDraft(template: PostTemplate = 'HEALTH_TIP'): PostInput {
  const first = TEMPLATES[template].blocks.includes('paragraph') ? 'paragraph' : TEMPLATES[template].blocks[0] ?? 'paragraph';
  return { template, slug: '', title: '', summary: '', body: [blankBlock(first)], tags: [], coverAlt: '', coverArt: TEMPLATES[template].art[0] ?? '',
    seoTitle: '', seoDescription: '', featured: false, authorId: '', categoryId: '', seriesId: '' };
}

function toInput(post: AdminPost): PostInput {
  return { template: post.template, slug: post.slug, title: post.title, summary: post.summary, body: post.body, tags: post.tags, coverAlt: post.coverAlt,
    coverArt: post.coverArt, seoTitle: post.seoTitle, seoDescription: post.seoDescription, featured: post.featured, authorId: post.authorId,
    categoryId: post.categoryId ?? '', seriesId: post.seriesId ?? '' };
}

/** What the server is sent: empty list lines dropped, image `src` (a preview URL) left out. */
export function cleanInput(draft: PostInput): PostInput {
  const body = draft.body.map((block): PostBlock => {
    if (block.type === 'list' || block.type === 'facts') return { ...block, items: block.items.map((i) => i.trim()).filter(Boolean) };
    if (block.type === 'image') return { type: 'image', imageId: block.imageId, alt: block.alt, caption: block.caption };
    return block;
  });
  return { ...draft, slug: draft.slug.trim(), tags: draft.tags.map((t) => t.trim().toLowerCase()).filter(Boolean), body };
}

export class PostsAdminViewModel implements ViewModel {
  phase: 'loading' | 'ready' | 'error' = 'loading';
  items: AdminPost[] = [];
  statusFilter: PostStatus | null = null;
  templateFilter: PostTemplate | null = null;
  reviewFilter: ReviewFilter = 'TO_REVIEW';
  query = '';
  categoryFilter: string | null = null;
  seriesFilter: string | null = null;
  originFilter: Origin | null = null;
  sourceFilter: string | null = null;
  /** The Review tab: auto drafts held for the super admin and posts waiting for a clinician. */
  queueMode = false;
  authors: TeamMember[] = [];
  categories: Category[] = [];
  series: Series[] = [];
  similar: SimilarPost[] = [];
  previewMode: PreviewMode = 'desktop';

  /** The post open in the editor (null for a new one not saved yet). */
  open: AdminPostDetail | null = null;
  editing = false;
  draft: PostInput = blankDraft();
  slugTouched = false;
  busy = false;
  error: string | null = null;
  notice: Notice | null = null;
  scheduleAt = '';
  /** Image previews uploaded in this session, by id (the server's preview URL). */
  imageSrc: Record<string, string> = {};

  private disposed = false;
  private similarTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly console: Console, private readonly repo: NewsroomRepository = new NewsroomRepository(),
    private readonly content: ContentRepository = new ContentRepository()) {
    makeAutoObservable<PostsAdminViewModel, 'repo' | 'disposed' | 'content' | 'similarTimer'>(this,
      { repo: false, disposed: false, console: false, content: false, similarTimer: false }, { autoBind: true });
  }

  /** Words in the draft, and the template's guide. */
  get words(): { count: number; min: number; max: number; state: 'short' | 'ok' | 'long' } {
    const [min, max] = TEMPLATES[this.draft.template].words;
    const count = wordCount(this.draft);
    return { count, min, max, state: count < min ? 'short' : count > max ? 'long' : 'ok' };
  }

  /** The composer's accessibility checks (alt text, headings, link labels). */
  get checks(): A11yCheck[] {
    return a11yChecks(this.draft);
  }

  /** Publishing sources seen on posts (the Source filter). */
  get sources(): string[] {
    return [...new Set(this.items.map((p) => p.source?.name ?? '').filter(Boolean))].sort();
  }

  get liveCategories(): Category[] {
    return this.categories.filter((c) => !c.archived || c.id === this.draft.categoryId);
  }

  get liveSeries(): Series[] {
    return this.series.filter((s) => !s.archived || s.id === this.draft.seriesId);
  }

  get dirty(): boolean {
    if (!this.editing) return false;
    const saved = this.open ? JSON.stringify(cleanInput(toInput(this.open))) : JSON.stringify(cleanInput(blankDraft(this.draft.template)));
    return JSON.stringify(cleanInput(this.draft)) !== saved;
  }

  get slugValid(): boolean {
    return this.draft.slug.length >= 3 && SLUG_PATTERN.test(this.draft.slug);
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const res = this.console === 'admin'
        ? await this.repo.adminList(this.queueMode ? { queue: 'review' } : { status: this.statusFilter, template: this.templateFilter, q: this.query,
          category: this.categoryFilter, series: this.seriesFilter, origin: this.originFilter, source: this.sourceFilter })
        : await this.repo.reviewQueue(this.reviewFilter);
      const team = this.console === 'admin' && !this.authors.length ? (await this.repo.authors()).items : this.authors;
      // The filters and pickers: if they can't be read, the list still works without them.
      const [categories, series] = this.console === 'admin' && !this.categories.length
        ? await Promise.all([this.content.adminCategories().then((r) => r.items, () => []), this.content.adminSeries().then((r) => r.items, () => [])])
        : [this.categories, this.series];
      if (this.disposed) return;
      runInAction(() => {
        this.items = res.items;
        this.authors = team;
        this.categories = categories;
        this.series = series;
        this.phase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  setStatusFilter(status: PostStatus | null): void { this.statusFilter = status; void this.load(); }
  setTemplateFilter(template: PostTemplate | null): void { this.templateFilter = template; void this.load(); }
  setReviewFilter(filter: ReviewFilter): void { this.reviewFilter = filter; void this.load(); }
  setQuery(q: string): void { this.query = q; }
  setCategoryFilter(id: string | null): void { this.categoryFilter = id; void this.load(); }
  setSeriesFilter(id: string | null): void { this.seriesFilter = id; void this.load(); }
  setOriginFilter(origin: Origin | null): void { this.originFilter = origin; void this.load(); }
  setSourceFilter(name: string | null): void { this.sourceFilter = name; void this.load(); }
  setQueueMode(on: boolean): void {
    if (this.queueMode === on) return;
    this.queueMode = on;
    void this.load();
  }
  setPreviewMode(mode: PreviewMode): void { this.previewMode = mode; }

  /** Taxonomy changed in another tab: read categories and series again on the next load. */
  forgetTaxonomy(): void { this.categories = []; this.series = []; }

  /** One click from the list: take a live or scheduled post off the site. */
  async unpublishRow(id: string): Promise<void> {
    this.busy = true;
    this.error = null;
    try {
      await this.repo.unpublish(id);
      runInAction(() => { this.notice = 'unpublished'; });
      await this.load();
    } catch (e) {
      runInAction(() => { this.error = e instanceof ApiError ? e.message : null; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** One click from the Review tab: publish a held auto draft (the server still refuses health content without a clinician). */
  async publishRow(id: string): Promise<void> {
    this.busy = true;
    this.error = null;
    try {
      await this.repo.publish(id, null);
      runInAction(() => { this.notice = 'published'; });
      await this.load();
    } catch (e) {
      runInAction(() => { this.error = e instanceof ApiError ? e.message : null; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** Look for a recent post on the same topic once the title settles (the duplicate-topic warning). */
  private watchTitle(): void {
    if (this.similarTimer) clearTimeout(this.similarTimer);
    const title = this.draft.title.trim();
    if (title.length < 3 || this.console !== 'admin') {
      this.similar = [];
      return;
    }
    this.similarTimer = setTimeout(() => {
      this.content.similar(title, this.open?.id ?? '').then(
        (res) => runInAction(() => { if (this.draft.title.trim() === title) this.similar = res.items; }),
        () => runInAction(() => { this.similar = []; }),
      );
    }, SIMILAR_DEBOUNCE_MS);
  }

  startNew(template: PostTemplate = 'HEALTH_TIP'): void {
    this.open = null;
    this.draft = blankDraft(template);
    this.slugTouched = false;
    this.editing = true;
    this.error = null;
    this.scheduleAt = '';
  }

  async openPost(id: string): Promise<void> {
    this.error = null;
    this.busy = true;
    try {
      const post = this.console === 'admin' ? await this.repo.adminRead(id) : await this.repo.reviewRead(id);
      runInAction(() => {
        this.open = post;
        this.draft = toInput(post);
        this.slugTouched = true;
        this.editing = true;
        this.scheduleAt = '';
      });
    } catch (e) {
      runInAction(() => { this.error = e instanceof ApiError ? e.message : null; this.notice = null; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  close(): void {
    this.editing = false;
    this.open = null;
    this.error = null;
    this.similar = [];
    void this.load();
  }

  update(patch: Partial<PostInput>): void {
    const next = { ...this.draft, ...patch };
    if (patch.template && patch.template !== this.draft.template) {
      // A template's body blocks and art are its own: keep what still fits.
      const allowed = TEMPLATES[patch.template].blocks;
      next.body = this.draft.body.filter((b) => allowed.includes(b.type));
      if (!next.body.length) next.body = [blankBlock('paragraph')];
      next.coverArt = (TEMPLATES[patch.template].art as readonly string[]).includes(this.draft.coverArt) ? this.draft.coverArt : TEMPLATES[patch.template].art[0] ?? '';
    }
    if (patch.title !== undefined && !this.slugTouched) next.slug = slugify(patch.title);
    if (patch.slug !== undefined) this.slugTouched = true;
    this.draft = next;
    if (patch.title !== undefined) this.watchTitle();
  }

  setTags(text: string): void {
    this.draft = { ...this.draft, tags: text.split(',').map((t) => t.trimStart()) };
  }

  addBlock(type: BlockType): void { this.draft = { ...this.draft, body: [...this.draft.body, blankBlock(type)] }; }

  updateBlock(index: number, block: PostBlock): void {
    this.draft = { ...this.draft, body: this.draft.body.map((b, i) => (i === index ? block : b)) };
  }

  moveBlock(index: number, by: -1 | 1): void {
    const body = [...this.draft.body];
    const target = index + by;
    if (target < 0 || target >= body.length) return;
    const [moved] = body.splice(index, 1);
    if (moved) body.splice(target, 0, moved);
    this.draft = { ...this.draft, body };
  }

  removeBlock(index: number): void { this.draft = { ...this.draft, body: this.draft.body.filter((_, i) => i !== index) }; }

  setScheduleAt(value: string): void { this.scheduleAt = value; }

  private async run(action: () => Promise<AdminPostDetail | AdminPost | null>, notice: Notice): Promise<void> {
    this.busy = true;
    this.error = null;
    try {
      const post = await action();
      runInAction(() => {
        if (post) {
          this.open = { history: [], ...(this.open ?? {}), ...post } as AdminPostDetail;
          this.draft = toInput(post);
        }
        this.notice = notice;
      });
    } catch (e) {
      runInAction(() => { this.error = e instanceof ApiError ? e.message : null; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  async save(): Promise<void> {
    const input = cleanInput(this.draft);
    const id = this.open?.id;
    if (id) {
      await this.run(() => this.repo.save(id, input), 'saved');
    } else {
      await this.run(async () => {
        const created = await this.repo.create(input);
        return this.repo.adminRead(created.id);
      }, 'created');
    }
  }

  async publish(): Promise<void> {
    const id = this.open?.id;
    if (!id) return;
    const at = this.scheduleAt ? zonedToUnix(this.scheduleAt, getSetting('platform.default_timezone')) : null;
    await this.run(() => this.repo.publish(id, at && Number.isFinite(at) ? at : null), at && at * 1000 > Date.now() ? 'scheduled' : 'published');
  }

  async unpublish(): Promise<void> {
    const id = this.open?.id;
    if (id) await this.run(() => this.repo.unpublish(id), 'unpublished');
  }

  async remove(): Promise<void> {
    const id = this.open?.id;
    if (!id) return;
    await this.run(async () => { await this.repo.remove(id); return null; }, 'deleted');
    if (!this.error) this.close();
  }

  async uploadImage(index: number, file: File): Promise<void> {
    const id = this.open?.id;
    const block = this.draft.body[index];
    if (!id || !block || block.type !== 'image') return;
    this.busy = true;
    this.error = null;
    try {
      const image = await this.repo.uploadImage(id, file, file.name);
      runInAction(() => {
        this.imageSrc = { ...this.imageSrc, [image.id]: image.src };
        this.updateBlock(index, { ...block, imageId: image.id, src: image.src });
        this.notice = 'uploaded';
      });
    } catch (e) {
      runInAction(() => { this.error = e instanceof ApiError ? e.message : null; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  async approve(): Promise<void> {
    const post = this.open;
    if (post) await this.run(() => this.repo.approve(post.id, post.contentHash), 'approved');
  }

  async withdraw(): Promise<void> {
    const id = this.open?.id;
    if (id) await this.run(() => this.repo.withdraw(id), 'withdrawn');
  }

  /** The body as the preview draws it: an image block shows its uploaded preview. */
  get previewBody(): PostBlock[] {
    return this.draft.body.map((b) => (b.type === 'image' && b.imageId ? { ...b, src: b.src ?? this.imageSrc[b.imageId] ?? `/api/ops/post-images/${b.imageId}` } : b));
  }

  clearNotice(): void { this.notice = null; }

  reset(): void {
    this.editing = false;
    this.open = null;
    this.draft = blankDraft();
    this.error = null;
    this.notice = null;
  }

  dispose(): void {
    this.disposed = true;
    if (this.similarTimer) clearTimeout(this.similarTimer);
  }
}
