import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import { NewsroomRepository } from '../data/NewsroomRepository';
import type { PostCategoryRef, PostList, PostTeaser } from '../data/NewsroomRepository';
import { ContentRepository } from '../data/ContentRepository';
import { TEMPLATES } from '../model/templates';
import type { PostTemplate, SectionPath } from '../model/templates';

/** What the list shows, read from and written to the URL (`?category=&topic=&q=&page=`): a type, a category, a search. */
export interface ListState {
  category: PostTemplate | null;
  topic: string | null;
  q: string;
  page: number;
}

const TOPIC = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function readListState(params: URLSearchParams, section: SectionPath): ListState {
  const raw = params.get('category');
  const category = raw && raw in TEMPLATES && TEMPLATES[raw as PostTemplate].section === section ? (raw as PostTemplate) : null;
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const topic = params.get('topic');
  return { category, topic: topic && TOPIC.test(topic) && topic.length <= 40 ? topic : null, q: (params.get('q') ?? '').slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1 };
}

export function writeListState(state: ListState): Record<string, string> {
  const out: Record<string, string> = {};
  if (state.category) out.category = state.category;
  if (state.topic) out.topic = state.topic;
  if (state.q.trim()) out.q = state.q.trim();
  if (state.page > 1) out.page = String(state.page);
  return out;
}

/**
 * The Blog or News list: published posts only (the server never returns a
 * draft), the section's featured post on an unfiltered first page, category
 * filters, search and pages. Empty says "No posts yet"; nothing is invented.
 */
export class NewsroomListViewModel implements ViewModel {
  phase: 'loading' | 'ready' | 'error' = 'loading';
  items: PostTeaser[] = [];
  featured: PostTeaser | null = null;
  total = 0;
  pageSize = 1;
  state: ListState = { category: null, topic: null, q: '', page: 1 };
  /** The categories a reader can filter by (empty until loaded, or when none exist). */
  categories: PostCategoryRef[] = [];
  private controller: AbortController | null = null;

  constructor(readonly section: SectionPath, private readonly repo: NewsroomRepository = new NewsroomRepository(),
    private readonly content: ContentRepository = new ContentRepository()) {
    makeAutoObservable<NewsroomListViewModel, 'repo' | 'controller' | 'content'>(this, { repo: false, controller: false, section: false, content: false }, { autoBind: true });
  }

  /** The category filters. A failure leaves them out; the list still works. */
  async loadCategories(): Promise<void> {
    try {
      const res = await this.content.categories();
      runInAction(() => { this.categories = res.items; });
    } catch {
      runInAction(() => { this.categories = []; });
    }
  }

  get pages(): number {
    return Math.max(1, Math.ceil(this.total / Math.max(1, this.pageSize)));
  }

  get filtered(): boolean {
    return Boolean(this.state.category || this.state.topic || this.state.q.trim());
  }

  async load(state: ListState): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.state = state;
    this.phase = 'loading';
    try {
      const res: PostList = await this.repo.list({ section: this.section, template: state.category, category: state.topic, q: state.q, page: state.page }, controller.signal);
      if (controller.signal.aborted) return;
      runInAction(() => {
        this.items = res.items;
        this.featured = res.featured;
        this.total = res.total;
        this.pageSize = res.pageSize;
        this.phase = 'ready';
      });
    } catch {
      if (!controller.signal.aborted) runInAction(() => { this.phase = 'error'; });
    }
  }

  retry(): void {
    void this.load(this.state);
  }

  reset(): void {
    this.items = [];
    this.featured = null;
    this.total = 0;
    this.phase = 'loading';
  }

  dispose(): void {
    this.controller?.abort();
    this.controller = null;
  }
}
