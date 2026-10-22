import { apiRequest } from '@/data/services/http';
import { apiBaseUrl } from '@/core/env';
import type { BlockType, CtaRoute, PostTemplate, SectionPath } from '../model/templates';

/**
 * The newsroom API (backend services/newsroom.py). Public reads return published
 * posts only; the editor's calls are the super admin's; review calls are a
 * clinician's. Nothing here sends or receives anything about a student.
 */

export type PostBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string; cite: string }
  | { type: 'callout'; tone: 'info' | 'attention'; text: string }
  | { type: 'image'; imageId: string; alt: string; caption: string; src?: string }
  | { type: 'facts'; title: string; items: string[] }
  | { type: 'cta'; label: string; route: CtaRoute };

export type BlockOf<T extends BlockType> = Extract<PostBlock, { type: T }>;

export interface PostTeaser {
  id: string;
  slug: string;
  section: SectionPath;
  template: PostTemplate;
  title: string;
  summary: string;
  tags: string[];
  coverAlt: string;
  coverArt: string | null;
  author: { name: string };
  publishedAt: string | null;
  updatedAt: string | null;
  featured: boolean;
  readingMinutes: number;
  /** Health tips: who approved this content and when. */
  reviewed: { by: string; on: string | null } | null;
  /** Development and test builds only. */
  sample: boolean;
  path: string;
  ogImage: string;
}

export interface PostDetail extends PostTeaser {
  body: PostBlock[];
  seoTitle: string;
  seoDescription: string;
  related: PostTeaser[];
}

export interface PostList {
  items: PostTeaser[];
  total: number;
  page: number;
  pageSize: number;
  featured: PostTeaser | null;
}

export interface ListQuery {
  section?: SectionPath;
  template?: PostTemplate | null;
  q?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED';

export interface PostInput {
  template: PostTemplate;
  slug: string;
  title: string;
  summary: string;
  body: PostBlock[];
  tags: string[];
  coverAlt: string;
  coverArt: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  authorId: string;
}

export interface AdminPost extends Omit<PostInput, 'body'> {
  id: string;
  section: SectionPath;
  body: PostBlock[];
  authorName: string;
  status: PostStatus;
  publishAt: number | null;
  live: boolean;
  needsReview: boolean;
  review: { by: string; at: number; current: boolean; byYou: boolean } | null;
  contentHash: string;
  blockedBy: string | null;
  sample: boolean;
  path: string;
  readingMinutes: number;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  actorRole: string;
  actorName: string;
  byYou: boolean;
  at: number;
}

export interface AdminPostDetail extends AdminPost { history: HistoryEntry[] }
export interface TeamMember { id: string; name: string; role: string }

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export class NewsroomRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  // --- public ---
  list(q: ListQuery, signal?: AbortSignal): Promise<PostList> {
    return this.request<PostList>(`/posts${query({ section: q.section, template: q.template, q: q.q?.trim(), tag: q.tag, page: q.page, pageSize: q.pageSize })}`, { signal });
  }

  post(section: SectionPath, slug: string): Promise<PostDetail> {
    return this.request<PostDetail>(`/posts/${section}/${encodeURIComponent(slug)}`);
  }

  // --- editor (super admin) ---
  adminList(filters: { status?: PostStatus | null; template?: PostTemplate | null; q?: string }): Promise<{ items: AdminPost[]; total: number }> {
    return this.request(`/ops/posts${query({ status: filters.status, template: filters.template, q: filters.q?.trim() })}`);
  }

  authors(): Promise<{ items: TeamMember[] }> {
    return this.request('/ops/posts/authors');
  }

  adminRead(id: string): Promise<AdminPostDetail> {
    return this.request(`/ops/posts/${encodeURIComponent(id)}`);
  }

  create(body: PostInput): Promise<AdminPost> {
    return this.request('/ops/posts', { method: 'POST', body: JSON.stringify(body) });
  }

  save(id: string, body: PostInput): Promise<AdminPostDetail> {
    return this.request(`/ops/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  publish(id: string, publishAt: number | null): Promise<AdminPostDetail> {
    return this.request(`/ops/posts/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({ publishAt }) });
  }

  unpublish(id: string): Promise<AdminPostDetail> {
    return this.request(`/ops/posts/${encodeURIComponent(id)}/unpublish`, { method: 'POST' });
  }

  remove(id: string): Promise<{ success: boolean }> {
    return this.request(`/ops/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  uploadImage(id: string, file: Blob, name: string): Promise<{ id: string; src: string }> {
    const form = new FormData();
    form.append('file', file, name);
    return this.request(`/ops/posts/${encodeURIComponent(id)}/images`, { method: 'POST', body: form });
  }

  // --- clinical review ---
  reviewQueue(state: 'TO_REVIEW' | 'REVIEWED' | 'ALL'): Promise<{ items: AdminPost[]; total: number }> {
    return this.request(`/work/post-reviews${query({ state })}`);
  }

  reviewRead(id: string): Promise<AdminPostDetail> {
    return this.request(`/work/post-reviews/${encodeURIComponent(id)}`);
  }

  approve(id: string, contentHash: string): Promise<AdminPostDetail> {
    return this.request(`/work/post-reviews/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ contentHash }) });
  }

  withdraw(id: string): Promise<AdminPostDetail> {
    return this.request(`/work/post-reviews/${encodeURIComponent(id)}/withdraw`, { method: 'POST' });
  }
}

/** A server path (`/api/...`, as the API returns image and share-image paths) on the configured API host. */
export function mediaUrl(path: string): string {
  return path.startsWith('/api/') ? `${apiBaseUrl()}${path.slice('/api'.length)}` : path;
}

/** The absolute URL of a server path, for share images and feeds. */
export function absoluteUrl(path: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  const url = mediaUrl(path);
  return /^https?:\/\//.test(url) ? url : `${origin}${url}`;
}
