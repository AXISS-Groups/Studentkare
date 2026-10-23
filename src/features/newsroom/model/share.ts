import type { Lang } from '@/i18n';
import type { PostDetail, PostTeaser } from '../data/NewsroomRepository';
import type { PostTemplate } from './templates';

/**
 * Share links: plain URLs that open each service's own share page. No
 * third-party script, pixel or SDK is loaded, and nothing about the reader is sent.
 * The server's share kit (backend services/newsroom_content.py) builds the same.
 */
export const SHARE_ENDPOINTS = {
  linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
  whatsapp: 'https://wa.me/',
  x: 'https://x.com/intent/post',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  telegram: 'https://t.me/share/url',
  email: 'mailto:',
} as const;

export type ShareTarget = keyof typeof SHARE_ENDPOINTS;
export const SHARE_TARGETS: readonly ShareTarget[] = ['linkedin', 'whatsapp', 'x', 'facebook', 'telegram', 'email'];

export function shareUrl(target: ShareTarget, url: string, title: string, summary = ''): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (target) {
    case 'linkedin': return `${SHARE_ENDPOINTS.linkedin}?url=${u}`;
    case 'whatsapp': return `${SHARE_ENDPOINTS.whatsapp}?text=${encodeURIComponent(`${title} ${url}`)}`;
    case 'x': return `${SHARE_ENDPOINTS.x}?url=${u}&text=${t}`;
    case 'facebook': return `${SHARE_ENDPOINTS.facebook}?u=${u}`;
    case 'telegram': return `${SHARE_ENDPOINTS.telegram}?url=${u}&text=${t}`;
    case 'email': return `${SHARE_ENDPOINTS.email}?subject=${t}&body=${encodeURIComponent(summary ? `${summary}\n\n${url}` : url)}`;
  }
}

export interface UtmSettings { enabled: boolean; medium: string; campaign: string }

/** The post's address with utm_source (the network), utm_medium and utm_campaign (a series adds its slug). */
export function taggedUrl(url: string, channel: string, utm: UtmSettings, seriesSlug = ''): string {
  if (!utm.enabled) return url;
  const campaign = seriesSlug ? `${utm.campaign}-${seriesSlug}` : utm.campaign;
  const params = new URLSearchParams({ utm_source: channel, utm_medium: utm.medium, utm_campaign: campaign });
  return `${url}?${params.toString()}`;
}

/**
 * Unix seconds for a `datetime-local` value read in a time zone (the platform's, IST by default),
 * whatever zone the editor's own computer is in. Null when the value is not a date and time.
 */
export function zonedToUnix(value: string, timeZone: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y ?? 0, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
  let offset = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(asUtc));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    offset = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - asUtc;
  } catch {
    return null;
  }
  return (asUtc - offset) / 1000;
}

/** BCP 47 tags for dates: Indian English, Telugu, Hindi. */
const DATE_LOCALES: Readonly<Record<Lang, string>> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

export function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** A date and time (Unix seconds) in a given zone, e.g. "1 Oct, 10:00 am" for the autopilot's IST schedule. */
export function formatDateTime(at: number | null, lang: Lang, timeZone: string): string {
  if (!at) return '';
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[lang], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(at * 1000));
  } catch {
    return new Intl.DateTimeFormat(DATE_LOCALES[lang], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(at * 1000));
  }
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
