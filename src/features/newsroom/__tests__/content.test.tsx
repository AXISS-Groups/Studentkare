import React from 'react';
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
import { axeViolations, describeViolations } from '@/test/axe';
import type { AdminPostDetail, PostDetail, PostTeaser } from '../data/NewsroomRepository';
import type { Category, ShareKit } from '../data/ContentRepository';
import { SHARE_TARGETS, shareUrl, taggedUrl, zonedToUnix } from '../model/share';
import { a11yChecks, wordCount } from '../model/composer';
import { TEMPLATES } from '../model/templates';
import { ShareBar } from '../views/ShareBar';
import { PostArticle } from '../views/PostPage';
import { PostsAdminView } from '../admin/PostsAdminView';

const UTM = { enabled: true, medium: 'social', campaign: 'newsroom' };

const teaser = (over: Partial<PostTeaser> = {}): PostTeaser => ({
  id: 'p1', slug: 'exam-stress', section: 'blog', template: 'SERIES_EPISODE', title: 'Exam stress', summary: 'Small steps that help.',
  tags: ['series'], coverAlt: 'Health series cover', coverArt: null, author: { name: 'StudentKare' }, publishedAt: '2026-10-05T11:30:00Z',
  updatedAt: '2026-10-05T11:30:00Z', featured: false, readingMinutes: 1, reviewed: { by: 'Dr. Meera Rao', on: '2026-10-04T08:00:00Z' }, sample: false,
  path: '/blog/exam-stress', ogImage: '/api/posts/blog/exam-stress/og.png', auto: true, source: null,
  category: { id: 'mental-health', name: 'Mental health', hue: 'violet', icon: 'brain', crisisLines: true },
  series: { slug: 'health-series', name: 'Health series', hue: 'teal', episode: 4 }, crisisLines: true, healthNote: true, ...over,
});

const detail = (over: Partial<PostDetail> = {}): PostDetail => ({
  ...teaser(), seoTitle: 'Exam stress', seoDescription: 'Small steps that help.', related: [],
  body: [{ type: 'paragraph', text: 'Regular routines help many students.' }], ...over,
});

const category = (over: Partial<Category> = {}): Category => ({
  id: 'mental-health', name: 'Mental health', hue: 'violet', icon: 'brain', clinical: true, crisisLines: true, hashtags: ['MentalHealth'],
  keywords: ['stress'], topics: ['exam stress'], archived: false, sort: 0, protected: true, posts: 3, ...over,
});

const adminPost = (over: Partial<AdminPostDetail> = {}): AdminPostDetail => ({
  id: 'p9', template: 'CAMPUS_NEWS', section: 'news', slug: 'heat-guidance', title: 'WHO publishes heat guidance', summary: 'Cities should open cooling centres.',
  body: [{ type: 'paragraph', text: 'Cities should open cooling centres. About 99 cases were seen.' }], tags: ['auto'], coverAlt: 'Campus news cover', coverArt: '',
  seoTitle: '', seoDescription: '', featured: false, authorId: '', authorName: 'StudentKare', status: 'DRAFT', publishAt: null, live: false, needsReview: false,
  review: null, contentHash: 'a'.repeat(64), blockedBy: null, sample: false, path: '/news/heat-guidance', readingMinutes: 1, createdAt: 1, updatedAt: 1, auto: true,
  source: { name: 'World Health Organization', url: 'https://www.who.int/news/item/x', publishedAt: '2026-10-01T03:30:00Z' }, categoryId: 'policy-news', seriesId: '',
  episode: 0, category: { id: 'policy-news', name: 'Policy and news', hue: 'blue', icon: 'building-columns', crisisLines: false }, series: null, precision: 50,
  precisionReport: { score: 50, threshold: 100, passed: false, source: [], sentences: [
    { text: 'Cities should open cooling centres.', ok: true, reasons: [] },
    { text: 'About 99 cases were seen.', ok: false, reasons: ['NEW_NUMBER', 'NOT_IN_SOURCE'] },
  ] }, holdReason: 'PRECISION', healthContent: false, history: [], ...over,
});

function at(url: string, ui: React.ReactElement, pattern = '*') {
  window.history.pushState(null, '', url);
  return render(
    <LanguageProvider>
      <BrowserRouter><Routes><Route path={pattern} element={ui} /></Routes></BrowserRouter>
    </LanguageProvider>,
  );
}

beforeEach(() => { api.routes = { '/config/public': {} }; api.calls = []; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('share links', () => {
  it('are plain share addresses for every network, with the UTM tags from the settings', () => {
    const url = taggedUrl('https://studentkare.co/blog/a', 'linkedin', UTM);
    expect(url).toBe('https://studentkare.co/blog/a?utm_source=linkedin&utm_medium=social&utm_campaign=newsroom');
    expect(taggedUrl('https://studentkare.co/blog/a', 'x', UTM, 'health-series')).toContain('utm_campaign=newsroom-health-series');
    expect(taggedUrl('https://studentkare.co/blog/a', 'x', { ...UTM, enabled: false })).toBe('https://studentkare.co/blog/a');
    expect(shareUrl('linkedin', url, 'A')).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
    expect(shareUrl('facebook', 'https://s.co/a', 'A')).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fs.co%2Fa');
    expect(shareUrl('telegram', 'https://s.co/a', 'A & B')).toBe('https://t.me/share/url?url=https%3A%2F%2Fs.co%2Fa&text=A%20%26%20B');
    expect(shareUrl('whatsapp', 'https://s.co/a', 'Hi')).toBe('https://wa.me/?text=Hi%20https%3A%2F%2Fs.co%2Fa');
    expect(shareUrl('email', 'https://s.co/a', 'Hi', 'Read')).toBe('mailto:?subject=Hi&body=Read%0A%0Ahttps%3A%2F%2Fs.co%2Fa');
    for (const target of SHARE_TARGETS) expect(shareUrl(target, 'https://s.co/a', 'T')).toMatch(/^(https:\/\/|mailto:)/);
  });

  it('the share bar offers copy, the phone\'s share sheet and every network, and counts a share', async () => {
    const shared = vi.fn();
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
    const { container } = render(<LanguageProvider><main className="sk-news"><ShareBar post={teaser()} onShared={shared} /></main></LanguageProvider>);
    for (const target of SHARE_TARGETS) {
      const link = screen.getByTestId(`news-share-${target}`);
      expect(link.getAttribute('href')).toContain(target === 'email' ? 'mailto:' : 'https://');
      expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(`utm_source=${target}`);
    }
    // No icon in the manifest for these two: the button names the network instead of a look-alike icon.
    expect(screen.getByTestId('news-share-facebook').textContent).toBe('Facebook');
    expect(screen.getByTestId('news-share-telegram').textContent).toBe('Telegram');
    fireEvent.click(screen.getByTestId('news-share-native'));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Exam stress', url: expect.stringContaining('utm_source=native') })));
    await waitFor(() => expect(shared).toHaveBeenCalledWith('native'));
    fireEvent.click(screen.getByTestId('news-share-linkedin'));
    expect(shared).toHaveBeenCalledWith('linkedin');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('a card has one Share button that opens the same set', () => {
    render(<LanguageProvider><ShareBar post={teaser()} variant="compact" onShared={vi.fn()} /></LanguageProvider>);
    expect(screen.queryByTestId('news-share-linkedin')).toBeNull();
    fireEvent.click(screen.getByTestId('news-share-toggle'));
    expect(screen.getByTestId('news-share-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('news-share-linkedin')).toBeTruthy();
  });
});

describe('the composer', () => {
  it('reads a publish-later time in IST whatever the computer\'s zone', () => {
    expect(zonedToUnix('2026-10-05T17:00', 'Asia/Kolkata')).toBe(Date.UTC(2026, 9, 5, 11, 30) / 1000);
    expect(zonedToUnix('2026-10-05T17:00', 'UTC')).toBe(Date.UTC(2026, 9, 5, 17, 0) / 1000);
    expect(zonedToUnix('not a date', 'Asia/Kolkata')).toBeNull();
  });

  it('counts words against the template and checks alt text, headings and link labels', () => {
    const draft = { title: 'Sleep', summary: '', coverAlt: '', body: [
      { type: 'heading' as const, text: 'One' }, { type: 'heading' as const, text: '' },
      { type: 'image' as const, imageId: 'i', alt: '', caption: '' }, { type: 'cta' as const, label: 'Click here', route: '/find-care' as const },
    ] };
    expect(wordCount(draft)).toBe(4);
    const checks = Object.fromEntries(a11yChecks(draft).map((c) => [c.id, c.ok]));
    expect(checks).toEqual({ 'cover-alt': false, 'image-alt': false, headings: false, links: false, summary: false });
    const fixed = a11yChecks({ coverAlt: 'Teal series cover', summary: 'Why it helps', body: [{ type: 'heading', text: 'One' }, { type: 'paragraph', text: 'Text' },
      { type: 'cta', label: 'Find care near you', route: '/find-care' }] });
    expect(fixed.every((c) => c.ok)).toBe(true);
    expect(TEMPLATES.QUICK_CARD.words[1]).toBeLessThan(TEMPLATES.EXPLAINER.words[1]);
  });
});

describe('a post on the site', () => {
  it('shows Tele-MANAS 14416 and 112 on a Mental health post, its series episode, a myth and a figure', async () => {
    const post = detail({ template: 'MYTH_FACT', body: [
      { type: 'mythfact', myth: 'Stress is always bad.', fact: 'Some stress is normal.' },
    ] });
    const { container } = at('/blog/exam-stress', <main className="sk-news"><PostArticle post={post} onOpen={vi.fn()} /></main>);
    const crisis = screen.getByTestId('news-crisis-lines');
    expect(within(crisis).getByText(/Tele-MANAS 14416/).getAttribute('href')).toBe('tel:14416');
    expect(within(crisis).getByText(/Emergency 112/).getAttribute('href')).toBe('tel:112');
    expect(screen.getByTestId('news-series-line').textContent).toContain('Episode 4 of Health series');
    expect(screen.getByText('Some stress is normal.')).toBeTruthy();
    expect(screen.getByTestId('news-category-chip').textContent).toContain('Mental health');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    cleanup();
    render(<LanguageProvider><main className="sk-news"><PostArticle post={detail({ template: 'QUICK_CARD', crisisLines: false, category: null,
      body: [{ type: 'stat', value: '7–9 h', label: 'of sleep most students need' }] })} onOpen={vi.fn()} /></main></LanguageProvider>);
    expect(screen.queryByTestId('news-crisis-lines')).toBeNull();
    expect(screen.getByText('7–9 h')).toBeTruthy();
  });
});

describe('Super admin → Content', () => {
  beforeEach(() => {
    api.routes['/ops/posts/authors'] = { items: [] };
    api.routes['/ops/post-categories'] = { items: [category(), category({ id: 'campus-life', name: 'Campus life', hue: 'sky', icon: 'graduation-cap', clinical: false, crisisLines: false, protected: false, posts: 0 })], hues: ['violet', 'sky'], icons: ['brain', 'graduation-cap', 'moon'] };
    api.routes['/ops/post-series'] = { items: [], hues: ['teal'] };
  });

  it('lists every post with filters and unpublishes in one click', async () => {
    const live = adminPost({ id: 'p1', status: 'PUBLISHED', live: true, holdReason: '', precision: 100 });
    api.routes['/ops/posts'] = (path: string) => ({ items: path.includes('origin=AUTO') ? [live] : [live], total: 1 });
    api.routes['/ops/posts/p1/unpublish'] = { ...live, status: 'UNPUBLISHED', live: false };
    at('/admin/posts', <PostsAdminView console="admin" />);
    expect(await screen.findByText('WHO publishes heat guidance')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Content' })).toBeTruthy();
    fireEvent.change(screen.getByTestId('filter-origin'), { target: { value: 'AUTO' } });
    await waitFor(() => expect(api.calls.some((c) => c.path.includes('origin=AUTO'))).toBe(true));
    fireEvent.change(screen.getByTestId('filter-category'), { target: { value: 'campus-life' } });
    await waitFor(() => expect(api.calls.some((c) => c.path.includes('category=campus-life'))).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish WHO publishes heat guidance' }));
    await waitFor(() => expect(api.calls.some((c) => c.path === '/ops/posts/p1/unpublish')).toBe(true));
  });

  it('Review shows which sentences failed the precision gate and why', async () => {
    api.routes['/ops/posts'] = (path: string) => ({ items: path.includes('queue=review') ? [adminPost()] : [], total: 1 });
    const { container } = at('/admin/posts', <PostsAdminView console="admin" />);
    fireEvent.click(await screen.findByTestId('posts-tab-review'));
    const review = await screen.findByTestId('content-review');
    expect(within(review).getByText('Not precise enough')).toBeTruthy();
    const sentences = within(review).getByTestId('precision-sentences');
    const failed = within(sentences).getByText('About 99 cases were seen.').closest('li');
    expect(failed?.getAttribute('data-ok')).toBe('false');
    expect(failed?.textContent).toContain('A number or date the source does not have');
    expect(within(review).getByText('50% (needs 100%)')).toBeTruthy();
    api.routes['/ops/posts/p9/publish'] = { ...adminPost(), status: 'PUBLISHED' };
    fireEvent.click(within(review).getByTestId('review-publish-p9'));
    await waitFor(() => expect(api.calls.some((c) => c.path === '/ops/posts/p9/publish')).toBe(true));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('manages categories: Mental health is protected, a new one is saved with its colour and icon', async () => {
    api.routes['/ops/posts'] = { items: [], total: 0 };
    at('/admin/posts', <PostsAdminView console="admin" />);
    fireEvent.click(await screen.findByTestId('posts-tab-categories'));
    await screen.findByTestId('content-categories');
    expect(screen.queryByRole('button', { name: 'Archive Mental health' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Archive Campus life' })).toBeTruthy();
    api.routes['/ops/post-categories'] = (_: string, init?: RequestInit) => ({ items: [category()], hues: ['violet', 'sky'], icons: ['brain', 'moon'], init });
    fireEvent.click(screen.getByTestId('category-new'));
    fireEvent.change(screen.getByTestId('category-name'), { target: { value: 'Sleep health' } });
    fireEvent.click(screen.getByRole('radio', { name: 'moon' }));
    fireEvent.click(screen.getByTestId('category-save'));
    await waitFor(() => {
      const post = api.calls.find((c) => c.path === '/ops/post-categories' && c.init?.method === 'POST');
      expect(JSON.parse(String(post?.init?.body))).toMatchObject({ name: 'Sleep health', icon: 'moon', hue: 'violet' });
    });
  });

  it('the share kit copies the LinkedIn caption and offers both cards', async () => {
    const kit: ShareKit = {
      postId: 'p1', url: 'https://studentkare.co/blog/exam-stress', live: true,
      links: { linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=x', whatsapp: 'https://wa.me/?text=x', x: 'https://x.com/intent/post?url=x',
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=x', telegram: 'https://t.me/share/url?url=x', email: 'mailto:?subject=x' },
      urls: { linkedin: 'a', whatsapp: 'a', x: 'a', facebook: 'a', telegram: 'a', email: 'a', copy: 'a', native: 'a' },
      caption: 'Exam stress\n\nSmall steps.\n\nIf you are struggling, call Tele-MANAS 14416 (free, 24x7). In an emergency, call 112.\n\n#MentalHealth #StudentKare',
      cards: { landscape: '/api/ops/posts/p1/card.png?format=landscape', portrait: '/api/ops/posts/p1/card.png?format=portrait' },
    };
    api.routes['/ops/posts'] = { items: [adminPost({ id: 'p1', status: 'PUBLISHED', live: true })], total: 1 };
    api.routes['/ops/posts/p1/share-kit'] = kit;
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    at('/admin/posts', <PostsAdminView console="admin" />);
    fireEvent.click(await screen.findByTestId('posts-tab-share'));
    expect((await screen.findByTestId('kit-caption')).textContent).toContain('Tele-MANAS 14416');
    expect(screen.getByTestId('kit-download-portrait').getAttribute('href')).toContain('format=portrait');
    expect(screen.getByTestId('kit-link-telegram').getAttribute('href')).toBe(kit.links.telegram);
    await act(async () => { fireEvent.click(screen.getByTestId('kit-copy-caption')); });
    expect(writeText).toHaveBeenCalledWith(kit.caption);
  });

  it('Analytics shows views and shares as counts only', async () => {
    api.routes['/ops/posts'] = { items: [], total: 0 };
    api.routes['/ops/post-stats'] = { items: [{ postId: 'p1', title: 'Exam stress', path: '/blog/exam-stress', status: 'PUBLISHED', template: 'SERIES_EPISODE',
      auto: true, views: 12, shares: { linkedin: 3 }, sharesTotal: 3 }], channels: ['linkedin', 'whatsapp'], enabled: true };
    at('/admin/posts', <PostsAdminView console="admin" />);
    fireEvent.click(await screen.findByTestId('posts-tab-analytics'));
    const table = await screen.findByTestId('content-analytics');
    expect(within(table).getByText('12')).toBeTruthy();
    expect(within(table).getByText('LinkedIn 3')).toBeTruthy();
    expect(within(table).getByText(/no reader, address or device is kept/)).toBeTruthy();
  });
});
