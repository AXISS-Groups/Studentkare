import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/core/navigation';
import { useLanguage, useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { NewsroomRepository, absoluteUrl } from '../data/NewsroomRepository';
import type { PostDetail } from '../data/NewsroomRepository';
import { TEMPLATES } from '../model/templates';
import type { SectionPath } from '../model/templates';
import { formatDate, postJsonLd } from '../model/share';
import { getSetting } from '@/data/services/config';
import { ContentRepository } from '../data/ContentRepository';
import { ShareBar } from './ShareBar';
import { PostCover } from './PostCover';
import { PostBody } from './PostBody';
import { PostCard, PostChips, PostMeta } from './PostCard';
import './newsroom.css';

const JSON_LD_ID = 'sk-news-jsonld';

/** Title, description, canonical, Open Graph / Twitter and the JSON-LD for this post; removed when the page closes. */
function usePostHead(post: PostDetail | null, publisher: string): void {
  useEffect(() => {
    if (!post) return undefined;
    const origin = window.location.origin;
    const url = `${origin}${post.path}`;
    const image = absoluteUrl(post.ogImage, origin);
    const previous = document.title;
    document.title = `${post.seoTitle} · ${publisher}`;
    const set = (attr: 'name' | 'property', key: string, value: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };
    set('name', 'description', post.seoDescription);
    set('property', 'og:type', 'article');
    set('property', 'og:title', post.seoTitle);
    set('property', 'og:description', post.seoDescription);
    set('property', 'og:url', url);
    set('property', 'og:image', image);
    set('property', 'og:image:width', '1200');
    set('property', 'og:image:height', '630');
    set('property', 'og:image:alt', post.coverAlt);
    set('name', 'twitter:card', 'summary_large_image');
    set('name', 'twitter:title', post.seoTitle);
    set('name', 'twitter:description', post.seoDescription);
    set('name', 'twitter:image', image);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    script.textContent = JSON.stringify(postJsonLd(post, origin, publisher));
    document.getElementById(JSON_LD_ID)?.remove();
    document.head.appendChild(script);
    return () => {
      document.title = previous;
      document.getElementById(JSON_LD_ID)?.remove();
    };
  }, [post, publisher]);
}

/** Tele-MANAS 14416 and 112, always on a Mental health post (template-fixed: an author can't remove it). */
export function CrisisLines({ onOpen }: { onOpen: (path: string) => void }): React.ReactElement {
  const t = useT();
  return (
    <aside className="sk-news-post__crisis" aria-label={t('cms.crisis.aria')} data-testid="news-crisis-lines">
      <p className="sk-news-post__crisis-title"><Icon name="phone-call" size={18} />{t('cms.crisis.title')}</p>
      <p>
        <a className="sk-news-post__crisis-line" href="tel:14416">{t('cms.crisis.telemanas')}</a>
        {' · '}
        <a className="sk-news-post__crisis-line" href="tel:112">{t('cms.crisis.emergency')}</a>
        {' · '}
        <a href="/crisis" onClick={(e) => { e.preventDefault(); onOpen('/crisis'); }}>{t('news.healthNoteCrisis')}</a>
      </p>
    </aside>
  );
}

/** "Episode 3 of Health series", linking to the series page. */
export function SeriesLine({ post, onOpen }: { post: PostDetail; onOpen: (path: string) => void }): React.ReactElement | null {
  const t = useT();
  if (!post.series) return null;
  const path = `/series/${post.series.slug}`;
  return (
    <p className="sk-news-post__series" data-testid="news-series-line">
      <Icon name="repeat" size={16} />
      <a href={path} onClick={(e) => { e.preventDefault(); onOpen(path); }}>
        {t('cms.series.episodeOf', { n: post.series.episode, name: post.series.name })}
      </a>
    </p>
  );
}

export function PostArticle({ post, onOpen }: { post: PostDetail; onOpen: (path: string) => void }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const back = post.section === 'blog' ? 'news.backBlog' : 'news.backNews';
  return (
    <article className="sk-news-post" data-template={post.template} data-testid="news-post">
      <nav className="sk-news-crumbs" aria-label={t('news.crumbAria')}>
        <a href={`/${post.section}`} onClick={(e) => { e.preventDefault(); onOpen(`/${post.section}`); }}>
          <Icon name="arrow-left" size={16} />{t(back)}
        </a>
      </nav>
      <PostCover template={post.template} art={post.coverArt} alt={post.coverAlt} size="hero" hue={post.series?.hue}>
        <PostChips post={post} />
        <h1 className="sk-news-post__title">{post.title}</h1>
        {post.summary ? <p className="sk-news-post__summary">{post.summary}</p> : null}
        <PostMeta post={post} />
      </PostCover>

      <div className="sk-news-post__layout">
        <div className="sk-news-post__main">
          {post.reviewed ? (
            <p className="sk-news-post__reviewed" data-testid="news-reviewed">
              <Icon name="shield-check" size={18} />
              {t('news.reviewedBy', { name: post.reviewed.by, date: formatDate(post.reviewed.on, lang) })}
            </p>
          ) : null}
          {post.sample ? <p className="sk-news-post__sample"><Icon name="info" size={16} />{t('news.sampleNote')}</p> : null}
          <SeriesLine post={post} onOpen={onOpen} />
          {post.crisisLines ? <CrisisLines onOpen={onOpen} /> : null}
          <PostBody template={post.template} blocks={post.body} onOpen={onOpen} />
          {post.healthNote || TEMPLATES[post.template].review ? (
            <aside className="sk-news-post__note" aria-label={t('news.healthNoteAria')}>
              <Icon name="info" size={18} />
              <p>
                {t('news.healthNote')}{' '}
                <a href="/crisis" onClick={(e) => { e.preventDefault(); onOpen('/crisis'); }}>{t('news.healthNoteCrisis')}</a>
              </p>
            </aside>
          ) : null}
          {post.source ? (
            <aside className="sk-news-post__source" aria-label={t('autopilot.post.sourceAria')} data-testid="news-source">
              <p className="sk-news-post__source-line"><Icon name="sparkles" size={16} />{t('autopilot.post.summaryBy', { source: post.source.name })}</p>
              <p className="sk-news-post__source-line">
                <Icon name="arrow-up-right" size={16} />
                <span>
                  {t('autopilot.post.source')}{' '}
                  <a href={post.source.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${post.source.name} ${t('autopilot.post.opensElsewhere')}`}>{post.source.name}</a>
                  {post.source.publishedAt ? ` · ${t('autopilot.post.sourceDate', { date: formatDate(post.source.publishedAt, lang) })}` : ''}
                </span>
              </p>
              <p className="sk-news-post__source-note">{t('autopilot.post.notAdvice')}</p>
            </aside>
          ) : null}
          {post.tags.length ? (
            <ul className="sk-news-tags" aria-label={t('news.tagsAria')}>
              {post.tags.map((tag) => <li key={tag} className="sk-news-tag">{tag}</li>)}
            </ul>
          ) : null}
          {post.updatedAt && post.updatedAt !== post.publishedAt ? (
            <p className="sk-news-post__updated">{t('news.updated', { date: formatDate(post.updatedAt, lang) })}</p>
          ) : null}
        </div>
        <aside className="sk-news-post__side">
          <ShareBar post={post} />
        </aside>
      </div>

      {post.related.length ? (
        <section className="sk-news-related" aria-labelledby="sk-news-related">
          <h2 id="sk-news-related" className="sk-news-section-title">{t('news.related')}</h2>
          <div className="sk-news-grid">
            {post.related.map((item) => <PostCard key={item.id} post={item} onOpen={(p) => onOpen(p.path)} />)}
          </div>
        </section>
      ) : null}
    </article>
  );
}

/** Count one view of a published post (a number only; nothing about the reader). Samples are never counted. */
function useViewCount(post: PostDetail | null): void {
  useEffect(() => {
    if (!post || post.sample || !getSetting('content.stats_enabled')) return;
    new ContentRepository().hit(post.section, post.slug, 'view').catch(() => undefined);
  }, [post]);
}

/**
 * /blog/:slug and /news/:slug (WebPost): one published post in its template,
 * with share links, related posts and the newsletter band. A draft or a wrong
 * address is "not published", never a half-shown post.
 */
export function PostPage({ section }: { section: SectionPath }): React.ReactElement {
  const t = useT();
  const { slug = '' } = useParams();
  const routerNavigate = useNavigate();
  const [state, setState] = useState<{ phase: 'loading' | 'ready' | 'missing' | 'error'; post: PostDetail | null }>({ phase: 'loading', post: null });
  const [attempt, setAttempt] = useState(0);
  usePostHead(state.post, t('news.publisher'));
  useViewCount(state.post);

  useEffect(() => {
    let live = true;
    setState({ phase: 'loading', post: null });
    new NewsroomRepository().post(section, slug).then(
      (post) => { if (live) setState({ phase: 'ready', post }); },
      (error: { status?: number }) => { if (live) setState({ phase: error.status === 404 ? 'missing' : 'error', post: null }); },
    );
    return () => { live = false; };
  }, [section, slug, attempt]);

  return (
    <PublicSitePage header={<PublicSiteHeader current={section} variant="compact" />}>
      <div className="sk-news" data-section={section}>
        {state.phase === 'loading' ? (
          <div className="sk-news-post" aria-busy="true" role="status" aria-label={t('news.loadingPost')}>
            <div className="sk-news-skeleton sk-news-skeleton--hero" />
          </div>
        ) : null}
        {state.phase === 'missing' || state.phase === 'error' ? (
          <div className="sk-news-state" role="alert" data-testid="news-missing">
            <Icon name={state.phase === 'missing' ? 'file-text' : 'alert-circle'} size={28} />
            <h1>{t(state.phase === 'missing' ? 'news.notFound' : 'news.error')}</h1>
            <p>{t(state.phase === 'missing' ? 'news.notFoundBody' : 'news.errorBody')}</p>
            {state.phase === 'error' ? <button type="button" className="sk-news-btn" onClick={() => setAttempt((n) => n + 1)}>{t('news.retry')}</button> : null}
            <a className="sk-news-btn sk-news-btn--ghost" href={`/${section}`}>{t('news.toList')}</a>
          </div>
        ) : null}
        {state.post ? <PostArticle post={state.post} onOpen={(path) => routerNavigate(path)} /> : null}
      </div>
    </PublicSitePage>
  );
}
