import type { Lang } from '@/i18n';
import type { PostDetail, PostTeaser } from '../data/NewsroomRepository';
import type { PostTemplate } from './templates';

/**
 * Share links: plain URLs that open each service's own share page. No
 * third-party script, pixel or SDK is loaded, and nothing about the reader is sent.
 */
export const SHARE_ENDPOINTS = {
  whatsapp: 'https://wa.me/',
  linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
  x: 'https://x.com/intent/post',
} as const;

export type ShareTarget = keyof typeof SHARE_ENDPOINTS;

export function shareUrl(target: ShareTarget, url: string, title: string): string {
  if (target === 'whatsapp') return `${SHARE_ENDPOINTS.whatsapp}?text=${encodeURIComponent(`${title} ${url}`)}`;
  if (target === 'linkedin') return `${SHARE_ENDPOINTS.linkedin}?url=${encodeURIComponent(url)}`;
  return `${SHARE_ENDPOINTS.x}?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
}

/** BCP 47 tags for dates: Indian English, Telugu, Hindi. */
const DATE_LOCALES: Readonly<Record<Lang, string>> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

export function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** Press releases and campus news are news articles to a search engine; the rest are articles. */
const NEWS_ARTICLE: ReadonlySet<PostTemplate> = new Set<PostTemplate>(['CAMPUS_NEWS', 'PRESS_RELEASE', 'PRODUCT_UPDATE']);

/** schema.org JSON-LD for a post page (Article or NewsArticle), from the published post only. */
export function postJsonLd(post: PostDetail, origin: string, publisher: string): Record<string, unknown> {
  const url = `${origin}${post.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': NEWS_ARTICLE.has(post.template) ? 'NewsArticle' : 'Article',
    headline: post.title,
    description: post.seoDescription || post.summary,
    image: [`${origin}${post.ogImage}`],
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
    author: post.author.name ? { '@type': 'Person', name: post.author.name } : { '@type': 'Organization', name: publisher },
    publisher: { '@type': 'Organization', name: publisher, logo: { '@type': 'ImageObject', url: `${origin}/logo.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags.length ? post.tags.join(', ') : undefined,
    ...(post.reviewed?.by ? { reviewedBy: { '@type': 'Person', name: post.reviewed.by } } : {}),
  };
}

export function teaserKey(post: PostTeaser): string {
  return `${post.section}/${post.slug}`;
}
