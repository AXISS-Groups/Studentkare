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
import type { AutopilotItem, AutopilotStatus } from '../data/AutopilotRepository';
import type { PostDetail } from '../data/NewsroomRepository';
import { PostsAdminView } from '../admin/PostsAdminView';
import { PostPage } from '../views/PostPage';

const AT = 1790829000;   // 1 Oct 2026, 10:00 IST

const item = (over: Partial<AutopilotItem> = {}): AutopilotItem => ({
  id: 'i1', lane: 'NEWS', state: 'POSTED', reason: '', title: 'New guidance on student mental health', topic: '', sourceId: 'who_news',
  sourceName: 'World Health Organization', sourceUrl: 'https://www.who.int/news/item/x', sourcePublishedAt: AT - 3600, relevance: 6,
  generator: 'source', slotAt: null, createdAt: AT, updatedAt: AT,
  post: { id: 'p1', status: 'PUBLISHED', live: true, path: '/news/new-guidance-abc123', template: 'CAMPUS_NEWS', needsReview: false, reviewCurrent: false, publishAt: AT, sample: false, precision: 100, holdReason: '' },
  categoryId: 'policy-news', seriesName: '', precision: 100,
  ...over,
});

const status = (over: Partial<AutopilotStatus> = {}): AutopilotStatus => ({
  killSwitch: false, production: true, timezone: 'Asia/Kolkata', model: { configured: false, use: true, aiKillSwitch: false },
  news: { enabled: true, autoPublish: true, perDay: 3, today: 1, windowStart: 7, windowEnd: 21, candidates: 4 },
  blog: { enabled: false, autoPublish: false, perWeek: 2, days: ['MON', 'THU'], hour: 10, topics: ['sleep', 'exam stress'], upcoming: [AT + 86400] },
  sources: [
    { id: 'who_news', publisher: 'World Health Organization', url: 'https://www.who.int/rss-feeds/news-english.xml', enabled: true,
      verified: '2026-10-23: RSS 2.0', lastFetchAt: AT, lastOkAt: AT, lastError: '', lastItems: 20, failures: 0 },
    { id: 'icmr', publisher: 'Indian Council of Medical Research', url: '', enabled: false, verified: '', lastFetchAt: null, lastOkAt: null,
      lastError: '', lastItems: 0, failures: 0 },
  ],
  queue: [item({ id: 'i2', lane: 'BLOG', state: 'HELD', title: 'Sleep in exam week', topic: 'sleep', reason: 'Waiting for a clinician\'s approval',
    generator: 'extractive', slotAt: AT + 86400, sourceName: '', sourceUrl: '',
    post: { id: 'p2', status: 'SCHEDULED', live: false, path: '/blog/sleep-abc', template: 'HEALTH_TIP', needsReview: true, reviewCurrent: false, publishAt: AT + 86400, sample: false, precision: 100, holdReason: '' } })],
  log: [item(), item({ id: 'i3', state: 'SKIPPED', reason: 'Block word: patient', title: 'A patient story', post: null })],
  job: { lastRunAt: AT, lastStatus: 'SUCCESS', lastError: '', nextRunAt: AT + 900 },
  fetchIntervalMinutes: 30, precision: { threshold: 100, healthRequiresClinician: true },
  series: [{ key: 'health', enabled: false, name: 'Health series', slug: 'health-series', id: 's1', days: ['MON', 'WED', 'FRI'], hour: 17,
    rota: ['mental-health', 'womens-health', 'common-health'], library: 0, episodes: 0, upcoming: [] }],
  ...over,
});

function at(url: string, ui: React.ReactElement, pattern = '*') {
  window.history.pushState(null, '', url);
  return render(
    <LanguageProvider>
      <BrowserRouter><Routes><Route path={pattern} element={ui} /></Routes></BrowserRouter>
    </LanguageProvider>,
  );
}

async function openTab() {
  api.routes['/ops/posts/authors'] = { items: [] };
  api.routes['/ops/posts'] = { items: [], total: 0 };
  api.routes['/ops/autopilot'] = status();
  const view = at('/admin/posts', <PostsAdminView console="admin" />);
  fireEvent.click(await screen.findByTestId('posts-tab-autopilot'));
  await screen.findByTestId('autopilot');
  return view;
}

beforeEach(() => { api.routes = { '/config/public': {} }; api.calls = []; });
afterEach(() => { cleanup(); });

describe('Super admin, Posts, Autopilot', () => {
  it('shows both lanes, the clinician rule, sources with health, the queue and the log', async () => {
    const { container } = await openTab();
    expect(screen.queryByTestId('post-new')).toBeNull();
    expect(screen.getByText(/Health tips always wait for a clinician's approval/)).toBeTruthy();
    expect(screen.getByText('Waiting for a clinician')).toBeTruthy();
    // The health series and the precision gate, each a setting changed with a reason.
    expect(within(screen.getByTestId('autopilot-series')).getByText('Health series')).toBeTruthy();
    expect(screen.getByText(/Each episode waits for a clinician's approval, however precise/)).toBeTruthy();
    expect(screen.getByTestId('autopilot-clinician-switch')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText(/Block word: patient/)).toBeTruthy();
    // A source with no feed address cannot be switched on.
    expect(screen.queryByRole('button', { name: 'Read it: Indian Council of Medical Research' })).toBeNull();
    // A health tip waiting for a clinician has no Publish button here.
    expect(screen.queryByRole('button', { name: 'Publish: Sleep in exam week' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Unpublish: Sleep in exam week' })).toBeTruthy();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    // The sources have their own tab in Content.
    fireEvent.click(screen.getByTestId('posts-tab-sources'));
    await screen.findByTestId('content-sources');
    expect(screen.getByText('Working · 20 items')).toBeTruthy();
    expect(screen.getByText('To verify: no feed yet')).toBeTruthy();
  });

  it('changes a setting only with a reason, through the settings registry', async () => {
    await openTab();
    api.routes['/ops/settings/autopilot.blog_enabled'] = { key: 'autopilot.blog_enabled' };
    api.routes['/ops/autopilot'] = status({ blog: { ...status().blog, enabled: true } });
    fireEvent.click(screen.getByTestId('autopilot-blog-toggle'));
    const form = await screen.findByTestId('autopilot-change');
    expect(within(form).getByText('Blog lane')).toBeTruthy();
    expect((screen.getByTestId('autopilot-change-save') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('autopilot-change-reason'), { target: { value: 'Start the weekly plan' } });
    await act(async () => { fireEvent.click(screen.getByTestId('autopilot-change-save')); });
    const call = api.calls.find((c) => c.path === '/ops/settings/autopilot.blog_enabled');
    expect(call?.init?.method).toBe('PATCH');
    expect(JSON.parse(String(call?.init?.body))).toEqual({ value: true, reason: 'Start the weekly plan' });
    await waitFor(() => expect(screen.queryByTestId('autopilot-change')).toBeNull());
  });

  it('turns instant news on with one switch (and a reason)', async () => {
    api.routes['/ops/posts/authors'] = { items: [] };
    api.routes['/ops/posts'] = { items: [], total: 0 };
    api.routes['/ops/autopilot'] = status({ news: { ...status().news, autoPublish: false } });
    at('/admin/posts', <PostsAdminView console="admin" />);
    fireEvent.click(await screen.findByTestId('posts-tab-autopilot'));
    api.routes['/ops/settings/autopilot.news_auto_publish'] = {};
    fireEvent.click(await screen.findByTestId('autopilot-news-autopublish'));
    fireEvent.change(screen.getByTestId('autopilot-change-reason'), { target: { value: 'Instant news' } });
    await act(async () => { fireEvent.click(screen.getByTestId('autopilot-change-save')); });
    const call = api.calls.find((c) => c.path === '/ops/settings/autopilot.news_auto_publish');
    expect(JSON.parse(String(call?.init?.body))).toEqual({ value: true, reason: 'Instant news' });
  });

  it('stops everything with the kill switch, and can take auto posts down', async () => {
    await openTab();
    api.routes['/ops/autopilot/kill-switch'] = { ...status({ killSwitch: true }), takenDown: 1 };
    fireEvent.click(screen.getByTestId('autopilot-stop'));
    fireEvent.change(screen.getByTestId('autopilot-stop-reason'), { target: { value: 'A summary looks wrong' } });
    fireEvent.click(screen.getByTestId('autopilot-stop-takedown'));
    await act(async () => { fireEvent.click(screen.getByTestId('autopilot-stop-confirm')); });
    const call = api.calls.find((c) => c.path === '/ops/autopilot/kill-switch');
    expect(JSON.parse(String(call?.init?.body))).toEqual({ active: true, reason: 'A summary looks wrong', takeDown: true });
    expect(await screen.findByText(/The kill switch is on/)).toBeTruthy();
    expect((screen.getByTestId('autopilot-run') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('autopilot-resume')).toBeTruthy();
  });

  it('runs now through the server and unpublishes in one click', async () => {
    await openTab();
    api.routes['/ops/autopilot/run'] = { ...status(), run: { status: 'SUCCESS', summary: {} } };
    await act(async () => { fireEvent.click(screen.getByTestId('autopilot-run')); });
    expect(api.calls.some((c) => c.path === '/ops/autopilot/run' && c.init?.method === 'POST')).toBe(true);
    api.routes['/ops/posts/p1/unpublish'] = {};
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unpublish: New guidance on student mental health' })); });
    expect(api.calls.some((c) => c.path === '/ops/posts/p1/unpublish')).toBe(true);
  });

  it('says when a build is not production', async () => {
    api.routes['/ops/posts/authors'] = { items: [] };
    api.routes['/ops/posts'] = { items: [], total: 0 };
    api.routes['/ops/autopilot'] = status({ production: false });
    at('/admin/posts', <PostsAdminView console="admin" />);
    fireEvent.click(await screen.findByTestId('posts-tab-autopilot'));
    expect(await screen.findByText(/everything the autopilot drafts here is a sample/)).toBeTruthy();
  });
});

describe('an auto post on the site', () => {
  it('names and links its source, says who summarised it and that it is not advice', async () => {
    const post: PostDetail = {
      id: 'p1', slug: 'new-guidance-abc123', section: 'news', template: 'CAMPUS_NEWS', title: 'New guidance on student mental health',
      summary: 'WHO published guidance for universities.', tags: ['auto', 'health news'], coverAlt: 'Campus news cover', coverArt: 'calendar-alt--p4',
      author: { name: 'StudentKare' }, publishedAt: '2026-10-01T04:30:00Z', updatedAt: '2026-10-01T04:30:00Z', featured: false, readingMinutes: 1,
      reviewed: null, sample: false, path: '/news/new-guidance-abc123', ogImage: '/api/posts/news/new-guidance-abc123/og.png', auto: true,
      source: { name: 'World Health Organization', url: 'https://www.who.int/news/item/x', publishedAt: '2026-10-01T03:30:00Z' },
      body: [{ type: 'paragraph', text: 'WHO published guidance for universities.' }], seoTitle: 'New guidance', seoDescription: 'WHO guidance', related: [],
      category: null, series: null, crisisLines: false, healthNote: false,
    };
    api.routes['/posts/news/new-guidance-abc123'] = post;
    const { container } = at('/news/new-guidance-abc123', <PostPage section="news" />, '/news/:slug');
    const box = await screen.findByTestId('news-source');
    expect(box.textContent).toContain('Summary by StudentKare from World Health Organization.');
    expect(box.textContent).toContain('not medical advice');
    const link = within(box).getByRole('link', { name: /World Health Organization/ });
    expect(link.getAttribute('href')).toBe('https://www.who.int/news/item/x');
    expect(link.getAttribute('rel')).toContain('noopener');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
