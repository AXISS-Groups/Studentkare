import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import { NewsroomRepository } from '../data/NewsroomRepository';
import type { PostList, PostTeaser } from '../data/NewsroomRepository';
import { TEMPLATES } from '../model/templates';
import type { PostTemplate, SectionPath } from '../model/templates';

/** What the list shows, read from and written to the URL (`?category=&q=&page=`). */
export interface ListState {
  category: PostTemplate | null;
  q: string;
  page: number;
}

export function readListState(params: URLSearchParams, section: SectionPath): ListState {
  const raw = params.get('category');
  const category = raw && raw in TEMPLATES && TEMPLATES[raw as PostTemplate].section === section ? (raw as PostTemplate) : null;
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return { category, q: (params.get('q') ?? '').slice(0, 80), page: Number.isFinite(page) && page > 0 ? page : 1 };
}

export function writeListState(state: ListState): Record<string, string> {
  const out: Record<string, string> = {};
  if (state.category) out.category = state.category;
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
  state: ListState = { category: null, q: '', page: 1 };
  private controller: AbortController | null = null;

  constructor(readonly section: SectionPath, private readonly repo: NewsroomRepository = new NewsroomRepository()) {
    makeAutoObservable<NewsroomListViewModel, 'repo' | 'controller'>(this, { repo: false, controller: false, section: false }, { autoBind: true });
  }

  get pages(): number {
    return Math.max(1, Math.ceil(this.total / Math.max(1, this.pageSize)));
  }

  get filtered(): boolean {
    return Boolean(this.state.category || this.state.q.trim());
  }

  async load(state: ListState): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.state = state;
    this.phase = 'loading';
    try {
      const res: PostList = await this.repo.list({ section: this.section, template: state.category, q: state.q, page: state.page }, controller.signal);
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
