import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ routes: {} as Record<string, unknown>, calls: [] as { path: string; init?: RequestInit }[] }));
vi.mock('@/data/services/http', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/services/http')>();
  return {
    ...real,
    apiRequest: vi.fn((path: string, init?: RequestInit) => {
      api.calls.push({ path, init });
      const key = Object.keys(api.routes).filter((k) => path.startsWith(k)).sort((a, b) => b.length - a.length)[0];
      const value = key === undefined ? undefined : api.routes[key];
      if (value instanceof Error) return Promise.reject(value);
      return value === undefined ? Promise.reject(new real.ApiError('Not found', 404)) : Promise.resolve(typeof value === 'function' ? (value as (p: string, i?: RequestInit) => unknown)(path, init) : value);
    }),
  };
});

import { LanguageProvider } from '@/i18n';
import { BrowserRouter, Route, Routes } from '@/core/navigation';
import { ApiError } from '@/data/services/http';
import { color } from '@/design-system/theme';
import { SERVICE_HUES } from '@/design-system/m2';
import { PUBLIC_NAV, FOOTER_COLUMNS } from '@/design-system/public-site/publicSiteNav';
import { pathMatches } from '@/core/routing/registry';
import { axeViolations, describeViolations } from '@/test/axe';
import type { AdminPostDetail, PostDetail, PostList, PostTeaser } from '../data/NewsroomRepository';
import { CTA_ROUTES, TEMPLATES, TEMPLATE_ORDER, templatesIn } from '../model/templates';
import { postJsonLd, shareUrl } from '../model/share';
import { NewsroomListPage } from '../views/NewsroomListPage';
import { PostPage } from '../views/PostPage';
import { PostCover } from '../views/PostCover';
import { M2BlogCard } from '../views/M2PostParts';
import { PostsAdminView } from '../admin/PostsAdminView';
import { cleanInput, slugify } from '../viewmodel/PostsAdminViewModel';

const ROOT = process.cwd();
const css = readFileSync(join(ROOT, 'src/features/newsroom/views/newsroom.css'), 'utf8');

const teaser = (over: Partial<PostTeaser> = {}): PostTeaser => ({
  id: 'p1', slug: 'exam-week-sleep', section: 'blog', template: 'HEALTH_TIP', title: 'Sleep in exam week', summary: 'Small habits that help.',
  tags: ['sleep'], coverAlt: 'Green health tip cover', coverArt: 'heart--p1', author: { name: 'Asha Editor' }, publishedAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-10-20T08:00:00Z', featured: false, readingMinutes: 3, reviewed: { by: 'Dr. Meera Rao', on: '2026-10-19T08:00:00Z' }, sample: false,
  path: '/blog/exam-week-sleep', ogImage: '/api/posts/blog/exam-week-sleep/og.png', auto: false, source: null, category: null, series: null,
  crisisLines: false, healthNote: true, ...over,
});

const detail = (over: Partial<PostDetail> = {}): PostDetail => ({
  ...teaser(), seoTitle: 'Sleep in exam week', seoDescription: 'Small habits that help.', related: [teaser({ id: 'p2', slug: 'water', title: 'Water on hot days', path: '/blog/water' })],
  body: [
    { type: 'heading', text: 'Before you start' },
    { type: 'paragraph', text: 'Keep a regular bedtime.' },
    { type: 'list', ordered: false, items: ['Dim the lights', 'Park the phone'] },
    { type: 'callout', tone: 'attention', text: 'Talk to a doctor if sleep stays hard.' },
    { type: 'facts', title: '', items: ['7–9 hours'] },
    { type: 'cta', label: 'Find care', route: '/find-care' },
  ],
  ...over,
});

const list = (over: Partial<PostList> = {}): PostList => ({ items: [], total: 0, page: 1, pageSize: 9, featured: null, ...over });

function at(url: string, ui: React.ReactElement, pattern = '*') {
  window.history.pushState(null, '', url);
  return render(
    <LanguageProvider>
      <BrowserRouter><Routes><Route path={pattern} element={ui} /></Routes></BrowserRouter>
    </LanguageProvider>,
  );
}

beforeEach(() => { api.routes = { '/config/public': {} }; api.calls = []; });
afterEach(() => { cleanup(); document.getElementById('sk-news-jsonld')?.remove(); });

describe('SK templates: fixed layouts and covers from tokens', () => {
  it('gives every template a section, a service-palette hue, its own art and its own blocks', () => {
    expect(TEMPLATE_ORDER).toHaveLength(12);
    expect(templatesIn('blog')).toEqual(['HEALTH_TIP', 'SERIES_EPISODE', 'EXPLAINER', 'MYTH_FACT', 'QUICK_CARD', 'MOTIVATION', 'STORY']);
    expect(templatesIn('news')).toEqual(['CAMPUS_NEWS', 'EVENT', 'CAMPUS_SPOTLIGHT', 'PRODUCT_UPDATE', 'PRESS_RELEASE']);
    for (const tpl of TEMPLATE_ORDER) {
      const spec = TEMPLATES[tpl];
      expect(SERVICE_HUES[spec.hue], tpl).toBeDefined();
      expect(spec.art.length, tpl).toBeGreaterThan(0);
      expect(spec.blocks, tpl).toContain('paragraph');
    }
    expect(TEMPLATES.HEALTH_TIP.review).toBe(true);
    expect(TEMPLATE_ORDER.filter((tpl) => TEMPLATES[tpl].review)).toEqual(['HEALTH_TIP']);
    expect(TEMPLATES.PRESS_RELEASE.blocks).not.toContain('cta');
  });

  it('draws covers from token variables only: deep to shade per hue, no hex, white text on the deep end', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    for (const tpl of TEMPLATE_ORDER) {
      const hue = TEMPLATES[tpl].hue;
      if (hue === 'indigo') continue;   // the cover's default: brand-navy-light to brand-navy
      const rule = css.match(new RegExp(`\\.sk-news-cover\\[data-hue='${hue}'\\] \\{([^}]*)\\}`));
      expect(rule, hue).not.toBeNull();
      expect(rule?.[1]).toContain(`--sk-news-from: var(--sk-color-service-${hue}-deep)`);
      expect(rule?.[1]).not.toMatch(new RegExp(`--sk-news-from: var\\(--sk-color-service-${hue}\\)`));
    }
    expect(css).toMatch(/\.sk-news-cover \{[^}]*color: var\(--sk-color-on-hero\)/);
    expect(color.serviceGreenDeep).toBe('var(--sk-color-service-green-deep)');
  });

  it('renders each template cover with its hue, label, shield and the author\'s alt text', () => {
    for (const tpl of TEMPLATE_ORDER) {
      const { container, unmount } = render(<LanguageProvider><PostCover template={tpl} art={TEMPLATES[tpl].art[0] ?? null} alt={`${tpl} cover`} size="card" /></LanguageProvider>);
      const cover = container.querySelector('.sk-news-cover');
      expect(cover?.getAttribute('data-hue')).toBe(TEMPLATES[tpl].hue);
      expect(screen.getByRole('img', { name: `${tpl} cover` })).toBeTruthy();
      expect(container.querySelector('[data-sk-icon="studentkare-logo"], .sk-news-cover__shield')).not.toBeNull();
      unmount();
    }
  });

  it('ignores art from another template (authors cannot bring their own)', () => {
    const { container } = render(<LanguageProvider><PostCover template="PRESS_RELEASE" art="heart--p1" alt="Press cover" size="card" /></LanguageProvider>);
    expect(container.querySelector('.sk-news-cover__art')).toBeNull();
  });

  it('rests every animation under reduced motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.sk-news-cover__art, \.sk-news-skeleton \{ animation: none; \}/);
    expect(reduced).toMatch(/transition: none/);
  });
});

describe('the public list pages', () => {
  it('says "No posts yet" when nothing is published', async () => {
    api.routes['/posts?section=blog'] = list();
    at('/blog', <NewsroomListPage section="blog" />);
    expect(await screen.findByTestId('news-empty')).toBeTruthy();
    expect(screen.getByText('No posts yet')).toBeTruthy();
  });

  it('shows the featured post and the grid, filters by category and searches through the URL', async () => {
    api.routes['/posts'] = list({ featured: teaser({ featured: true }), items: [teaser({ id: 'p2', slug: 'water', title: 'Water on hot days', path: '/blog/water', reviewed: null, template: 'STORY' })], total: 1 });
    const { container } = at('/blog', <NewsroomListPage section="blog" />);
    expect(await screen.findByTestId('news-card-exam-week-sleep')).toBeTruthy();
    expect(screen.getByText('Reviewed by Dr. Meera Rao')).toBeTruthy();
    expect(within(screen.getByTestId('news-grid')).getByRole('link', { name: 'Water on hot days' }).getAttribute('href')).toBe('/blog/water');
    fireEvent.click(screen.getByTestId('news-filter-HEALTH_TIP'));
    await waitFor(() => expect(api.calls.some((c) => c.path.includes('template=HEALTH_TIP'))).toBe(true));
    expect(window.location.search).toContain('category=HEALTH_TIP');
    fireEvent.change(screen.getByTestId('news-search'), { target: { value: 'sleep' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(api.calls.some((c) => c.path.includes('q=sleep'))).toBe(true));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('offers only the section\'s own categories and says when loading failed', async () => {
    api.routes['/posts'] = new ApiError('down', 500);
    at('/news', <NewsroomListPage section="news" />);
    expect(await screen.findByText('Posts could not be loaded')).toBeTruthy();
    expect(screen.queryByTestId('news-filter-HEALTH_TIP')).toBeNull();
    expect(screen.getByTestId('news-filter-PRESS_RELEASE')).toBeTruthy();
  });

  it('puts Blog and News in the public header and footer', () => {
    expect(PUBLIC_NAV.map((n) => n.href)).toEqual(expect.arrayContaining(['/blog', '/news']));
    expect(FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href))).toEqual(expect.arrayContaining(['/blog', '/news']));
  });
});

describe('the post page', () => {
  it('renders the post in its template with reviewer, share links, JSON-LD and related posts', async () => {
    api.routes['/posts/blog/exam-week-sleep'] = detail();
    const { container } = at('/blog/exam-week-sleep', <PostPage section="blog" />, '/blog/:slug');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sleep in exam week' })).toBeTruthy();
    expect(screen.getByTestId('news-reviewed').textContent).toContain('Dr. Meera Rao');
    expect(screen.getByText(/In an emergency, call 112/)).toBeTruthy();
    expect(within(screen.getByTestId('news-post')).getByRole('link', { name: /^Find care/ }).getAttribute('href')).toBe('/find-care');
    const wa = screen.getByTestId('news-share-whatsapp').getAttribute('href') ?? '';
    expect(wa.startsWith('https://wa.me/?text=')).toBe(true);
    expect(screen.getByTestId('news-share-linkedin').getAttribute('href')).toContain('linkedin.com/sharing/share-offsite/?url=');
    expect(screen.getByTestId('news-share-x').getAttribute('href')).toContain('x.com/intent/post?url=');
    // No third-party script: the only script added is our own JSON-LD.
    const scripts = [...document.querySelectorAll('script')].filter((s) => s.src);
    expect(scripts).toEqual([]);
    const ld = JSON.parse(document.getElementById('sk-news-jsonld')?.textContent ?? '{}') as Record<string, unknown>;
    expect(ld['@type']).toBe('Article');
    expect(ld.headline).toBe('Sleep in exam week');
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toContain('/api/posts/blog/exam-week-sleep/og.png');
    expect(screen.getByRole('heading', { name: 'Related posts' })).toBeTruthy();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('says a draft or wrong address is not published', async () => {
    at('/news/a-draft', <PostPage section="news" />, '/news/:slug');
    expect(await screen.findByTestId('news-missing')).toBeTruthy();
    expect(screen.getByText("This post isn't published")).toBeTruthy();
  });

  it('marks news templates as NewsArticle for search engines', () => {
    const ld = postJsonLd(detail({ template: 'PRESS_RELEASE', section: 'news', reviewed: null }), 'https://studentkare.co', 'StudentKare');
    expect(ld['@type']).toBe('NewsArticle');
    expect(ld.reviewedBy).toBeUndefined();
  });

  it('builds share links as plain URLs', () => {
    expect(shareUrl('x', 'https://studentkare.co/blog/a', 'A & B')).toBe('https://x.com/intent/post?url=https%3A%2F%2Fstudentkare.co%2Fblog%2Fa&text=A%20%26%20B');
  });
});

describe('in the app', () => {
  it('Home\'s blog card says "No posts yet" and lists reviewed tips', () => {
    const open = vi.fn();
    const { rerender } = render(<LanguageProvider><M2BlogCard state={{ phase: 'ready', posts: [] }} onOpen={open} onAll={vi.fn()} onRetry={vi.fn()} /></LanguageProvider>);
    expect(screen.getByTestId('m2-home-blog-empty').textContent).toContain('No posts yet');
    rerender(<LanguageProvider><M2BlogCard state={{ phase: 'ready', posts: [teaser()] }} onOpen={open} onAll={vi.fn()} onRetry={vi.fn()} /></LanguageProvider>);
    expect(screen.getByText('From the StudentKare blog')).toBeTruthy();
    expect(screen.getByText('Reviewed by Dr. Meera Rao')).toBeTruthy();
  });
});

const adminPost = (over: Partial<AdminPostDetail> = {}): AdminPostDetail => ({
  id: 'p1', template: 'HEALTH_TIP', section: 'blog', slug: 'exam-week-sleep', title: 'Sleep in exam week', summary: 'Small habits.', body: [{ type: 'paragraph', text: 'Keep a regular bedtime.' }],
  tags: [], coverAlt: 'Green cover', coverArt: 'heart--p1', seoTitle: '', seoDescription: '', featured: false, authorId: 'admin', authorName: 'Asha Editor',
  status: 'DRAFT', publishAt: null, live: false, needsReview: true, review: null, contentHash: 'a'.repeat(64),
  blockedBy: 'A clinician must review this health tip as it stands before it is published.', sample: false, path: '/blog/exam-week-sleep',
  readingMinutes: 1, createdAt: 1, updatedAt: 1, auto: false, source: null, categoryId: '', seriesId: '', episode: 0, category: null, series: null,
  precision: -1, precisionReport: null, holdReason: '', healthContent: true, history: [{ id: 'e1', action: 'CREATED', actorRole: 'SUPER_ADMIN', actorName: 'Asha Editor', byYou: true, at: 1 }], ...over,
});

describe('Super admin, Posts and the clinician review', () => {
  it('cannot publish a health tip without a clinician\'s approval, and shows the live preview in its template', async () => {
    api.routes['/ops/posts/authors'] = { items: [{ id: 'admin', name: 'Asha Editor', role: 'SUPER_ADMIN' }] };
    api.routes['/ops/posts/p1'] = adminPost();
    api.routes['/ops/posts'] = { items: [adminPost()], total: 1 };
    at('/admin/posts', <PostsAdminView console="admin" />);
    expect(await screen.findByText('Needs clinical review')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Sleep in exam week' }));
    expect(await screen.findByTestId('post-editor')).toBeTruthy();
    expect((screen.getByTestId('post-publish') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('post-blocked').textContent).toContain('clinician');
    const preview = screen.getByTestId('post-preview');
    expect(within(preview).getByRole('heading', { level: 1, name: 'Sleep in exam week' })).toBeTruthy();
    expect(preview.querySelector('.sk-news-cover')?.getAttribute('data-hue')).toBe('green');
    fireEvent.change(screen.getByTestId('post-title'), { target: { value: 'Sleep well in exam week' } });
    expect(within(preview).getByRole('heading', { level: 1, name: 'Sleep well in exam week' })).toBeTruthy();
    expect(screen.getByText(/never writes them with AI/)).toBeTruthy();
  });

  it('lets a clinician approve exactly the version they read', async () => {
    api.routes['/work/post-reviews/p1'] = adminPost();
    api.routes['/work/post-reviews?state=TO_REVIEW'] = { items: [adminPost()], total: 1 };
    api.routes['/work/post-reviews/p1/approve'] = adminPost({ review: { by: 'Dr. Meera Rao', at: 2, current: true, byYou: true } });
    at('/clinician/post-reviews', <PostsAdminView console="review" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Sleep in exam week' }));
    await screen.findByTestId('post-review', {}, { timeout: 3000 });
    await act(async () => { fireEvent.click(await screen.findByTestId('post-approve')); });
    const call = api.calls.find((c) => c.path.endsWith('/approve'));
    expect(JSON.parse(String(call?.init?.body))).toEqual({ contentHash: 'a'.repeat(64) });
    expect(screen.queryByTestId('post-new')).toBeNull();   // clinicians do not write posts
  });

  it('turns a title into a web address and sends clean blocks', () => {
    expect(slugify('Sleep in exam week: 7 habits!')).toBe('sleep-in-exam-week-7-habits');
    const input = cleanInput({ template: 'CAMPUS_NEWS', slug: ' camp ', title: 'Camp', summary: '', tags: [' Camp', ''], coverAlt: '', coverArt: '', seoTitle: '', seoDescription: '', featured: false, authorId: '', categoryId: '', seriesId: '',
      body: [{ type: 'list', ordered: false, items: ['a', ' ', 'b'] }, { type: 'image', imageId: 'i1', alt: 'Map', caption: '', src: '/api/ops/post-images/i1' }] });
    expect(input.slug).toBe('camp');
    expect(input.tags).toEqual(['camp']);
    expect(input.body).toEqual([{ type: 'list', ordered: false, items: ['a', 'b'] }, { type: 'image', imageId: 'i1', alt: 'Map', caption: '' }]);
  });

  it('keeps button targets to the app\'s own pages', () => {
    expect(CTA_ROUTES.every((r) => r.startsWith('/') && !r.startsWith('//'))).toBe(true);
  });
});

describe('routing', () => {
  it('matches post addresses by parameter, never an empty or deeper path', () => {
    expect(pathMatches('/blog/:slug', '/blog/sleep')).toBe(true);
    expect(pathMatches('/blog/:slug', '/blog')).toBe(false);
    expect(pathMatches('/blog/:slug', '/blog/')).toBe(false);
    expect(pathMatches('/blog/:slug', '/blog/a/b')).toBe(false);
    expect(pathMatches('/news', '/news')).toBe(true);
  });
});
