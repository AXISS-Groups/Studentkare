import { apiRequest } from '@/data/services/http';
import type { SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';
import type { PostCategoryRef, PostTeaser } from './NewsroomRepository';
import type { PostTemplate, SectionPath } from '../model/templates';

/**
 * The content module's API (backend services/newsroom_content.py): categories,
 * series and their pages, the share kit, share and view counts, and the
 * composer's duplicate-topic check. Counts carry nothing about the reader.
 */

export interface Category {
  id: string;
  name: string;
  hue: ServiceHue;
  icon: SkIconName;
  clinical: boolean;
  crisisLines: boolean;
  hashtags: string[];
  keywords: string[];
  topics: string[];
  archived: boolean;
  sort: number;
  /** Mental health: always clinical, always the crisis lines, never archived. */
  protected: boolean;
  posts: number;
}

export interface CategoryInput {
  id?: string;
  name: string;
  hue: ServiceHue;
  icon: SkIconName;
  clinical: boolean;
  crisisLines: boolean;
  hashtags: string[];
  keywords: string[];
  topics: string[];
}

export interface CategoryList { items: Category[]; hues: ServiceHue[]; icons: SkIconName[] }

/** One Monday Motivation line: the team's own words, or a quote with who said it and its public-domain source. */
export interface LibraryEntry { kind: 'own' | 'quote'; text: string; cite: string; sourceUrl: string; publicDomain: boolean }

export interface Series {
  id: string;
  slug: string;
  name: string;
  summary: string;
  template: PostTemplate;
  hue: ServiceHue;
  category: PostCategoryRef | null;
  categoryId: string;
  autopilotKey: '' | 'motivation' | 'health';
  episodeCount: number;
  library: LibraryEntry[];
  archived: boolean;
  sample: boolean;
  path: string;
}

export interface SeriesInput {
  slug?: string;
  name: string;
  summary: string;
  categoryId: string;
  template: PostTemplate;
  hue: ServiceHue;
  library: LibraryEntry[];
}

export interface PublicSeries {
  id: string;
  slug: string;
  name: string;
  summary: string;
  template: PostTemplate;
  hue: ServiceHue;
  category: PostCategoryRef | null;
  episodes: number;
  path: string;
  sample: boolean;
}

export interface SeriesPage { series: PublicSeries; items: PostTeaser[]; total: number; page: number; pageSize: number }

export type ShareChannel = 'linkedin' | 'whatsapp' | 'x' | 'facebook' | 'telegram' | 'email' | 'copy' | 'native';
export type ShareLinkChannel = Exclude<ShareChannel, 'copy' | 'native'>;

export interface ShareKit {
  postId: string;
  url: string;
  live: boolean;
  links: Record<ShareLinkChannel, string>;
  urls: Record<ShareChannel, string>;
  caption: string;
  cards: { landscape: string; portrait: string };
}

export interface PostStatRow {
  postId: string;
  title: string;
  path: string;
  status: string;
  template: PostTemplate;
  auto: boolean;
  views: number;
  shares: Partial<Record<ShareChannel, number>>;
  sharesTotal: number;
}

export interface SimilarPost { id: string; title: string; path: string; status: string; similarity: number }

export class ContentRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  // --- public ---
  categories(): Promise<{ items: PostCategoryRef[] }> {
    return this.request('/post-categories');
  }

  seriesList(): Promise<{ items: PublicSeries[] }> {
    return this.request('/series');
  }

  seriesPage(slug: string, page = 1): Promise<SeriesPage> {
    return this.request(`/series/${encodeURIComponent(slug)}?page=${page}`);
  }

  /** Count a view or a share. Nothing about the reader is sent or kept. */
  hit(section: SectionPath, slug: string, kind: 'view' | 'share', channel?: ShareChannel): Promise<void> {
    return this.request(`/posts/${section}/${encodeURIComponent(slug)}/hit`, { method: 'POST', body: JSON.stringify({ kind, channel: channel ?? '' }) });
  }

  // --- super admin ---
  adminCategories(): Promise<CategoryList> {
    return this.request('/ops/post-categories');
  }

  createCategory(body: CategoryInput): Promise<CategoryList> {
    return this.request('/ops/post-categories', { method: 'POST', body: JSON.stringify(body) });
  }

  saveCategory(id: string, body: CategoryInput): Promise<CategoryList> {
    return this.request(`/ops/post-categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  archiveCategory(id: string, archived: boolean): Promise<CategoryList> {
    return this.request(`/ops/post-categories/${encodeURIComponent(id)}/archive`, { method: 'POST', body: JSON.stringify({ archived }) });
  }

  adminSeries(): Promise<{ items: Series[]; hues: ServiceHue[] }> {
    return this.request('/ops/post-series');
  }

  createSeries(body: SeriesInput): Promise<{ items: Series[]; hues: ServiceHue[] }> {
    return this.request('/ops/post-series', { method: 'POST', body: JSON.stringify(body) });
  }

  saveSeries(id: string, body: SeriesInput): Promise<{ items: Series[]; hues: ServiceHue[] }> {
    return this.request(`/ops/post-series/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  archiveSeries(id: string, archived: boolean): Promise<{ items: Series[]; hues: ServiceHue[] }> {
    return this.request(`/ops/post-series/${encodeURIComponent(id)}/archive`, { method: 'POST', body: JSON.stringify({ archived }) });
  }

  shareKit(postId: string): Promise<ShareKit> {
    return this.request(`/ops/posts/${encodeURIComponent(postId)}/share-kit`);
  }

  stats(): Promise<{ items: PostStatRow[]; channels: ShareChannel[]; enabled: boolean }> {
    return this.request('/ops/post-stats');
  }

  similar(title: string, exclude: string): Promise<{ items: SimilarPost[] }> {
    return this.request(`/ops/posts-similar?${new URLSearchParams({ title, exclude }).toString()}`);
  }
}
