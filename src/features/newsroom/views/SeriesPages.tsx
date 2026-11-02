import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/core/navigation';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { ContentRepository } from '../data/ContentRepository';
import type { PublicSeries, SeriesPage as SeriesPageData } from '../data/ContentRepository';
import { TEMPLATES } from '../model/templates';
import { PostCover } from './PostCover';
import { PostCard } from './PostCard';
import { Pagination } from './NewsroomListPage';
import './newsroom.css';

type Phase = 'loading' | 'ready' | 'missing' | 'error';

function SeriesCard({ series, onOpen }: { series: PublicSeries; onOpen: (path: string) => void }): React.ReactElement {
  const t = useT();
  return (
    <article className="sk-news-card" data-testid={`series-card-${series.slug}`}>
      <PostCover template={series.template} art={TEMPLATES[series.template].art[0] ?? null} alt={t('cms.series.coverAlt', { name: series.name })} size="card" hue={series.hue} />
      <div className="sk-news-card__text">
        <span className="sk-news-chips">
          <span className="sk-news-chip" data-hue={series.hue}><Icon name="repeat" size={12} strokeWidth={2.2} />{t('cms.series.label')}</span>
          {series.category ? <span className="sk-news-chip" data-hue={series.category.hue}>{series.category.name}</span> : null}
        </span>
        <h2 className="sk-news-card__title">
          <a className="sk-news-card__link" href={series.path} onClick={(e) => { e.preventDefault(); onOpen(series.path); }}>{series.name}</a>
        </h2>
        {series.summary ? <p className="sk-news-card__summary">{series.summary}</p> : null}
        <p className="sk-news-meta"><span className="sk-news-meta__item"><Icon name="file-text" size={14} />{t('cms.series.episodes', { n: series.episodes })}</span></p>
      </div>
    </article>
  );
}

/** /series (WebSeries): every series with a published episode. */
export function SeriesListPage(): React.ReactElement {
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState<{ phase: Phase; items: PublicSeries[] }>({ phase: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ phase: 'loading', items: [] });
    new ContentRepository().seriesList().then(
      (res) => { if (live) setState({ phase: 'ready', items: res.items }); },
      () => { if (live) setState({ phase: 'error', items: [] }); },
    );
    return () => { live = false; };
  }, [attempt]);
  useEffect(() => {
    const previous = document.title;
    document.title = `${t('cms.series.all')} · ${t('news.publisher')}`;
    return () => { document.title = previous; };
  }, [t]);

  return (
    <PublicSitePage header={<PublicSiteHeader current="blog" variant="compact" />}>
      <div className="sk-news" data-testid="series-list">
        <header className="sk-news-hero">
          <span className="sk-news-hero__eyebrow">{t('cms.series.eyebrow')}</span>
          <h1 className="sk-news-hero__title">{t('cms.series.all')}</h1>
          <p className="sk-news-hero__body">{t('cms.series.allBody')}</p>
        </header>
        {state.phase === 'loading' ? <div className="sk-news-skeleton sk-news-skeleton--hero" role="status" aria-label={t('cms.series.loading')} /> : null}
        {state.phase === 'error' ? (
          <div className="sk-news-state" role="alert">
            <Icon name="alert-circle" size={28} />
            <h2>{t('news.error')}</h2>
            <p>{t('news.errorBody')}</p>
            <button type="button" className="sk-news-btn" onClick={() => setAttempt((n) => n + 1)}><Icon name="refresh" size={16} />{t('news.retry')}</button>
          </div>
        ) : null}
        {state.phase === 'ready' && !state.items.length ? (
          <div className="sk-news-state" role="status" data-testid="series-empty">
            <Icon name="repeat" size={28} />
            <h2>{t('cms.series.none')}</h2>
            <p>{t('cms.series.noneBody')}</p>
            <a className="sk-news-btn" href="/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>{t('news.nav.blog')}</a>
          </div>
        ) : null}
        {state.items.length ? (
          <div className="sk-news-grid">{state.items.map((s) => <SeriesCard key={s.id} series={s} onOpen={(p) => navigate(p)} />)}</div>
        ) : null}
      </div>
    </PublicSitePage>
  );
}

/** /series/:slug (WebSeries): one series' cover, what it is, and its published episodes, newest first. */
export function SeriesPage(): React.ReactElement {
  const t = useT();
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const [state, setState] = useState<{ phase: Phase; data: SeriesPageData | null }>({ phase: 'loading', data: null });
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ phase: 'loading', data: null });
    new ContentRepository().seriesPage(slug, page).then(
      (data) => { if (live) setState({ phase: 'ready', data }); },
      (error: { status?: number }) => { if (live) setState({ phase: error.status === 404 ? 'missing' : 'error', data: null }); },
    );
    return () => { live = false; };
  }, [slug, page, attempt]);
  useEffect(() => {
    if (!state.data) return undefined;
    const previous = document.title;
    document.title = `${state.data.series.name} · ${t('news.publisher')}`;
    return () => { document.title = previous; };
  }, [state.data, t]);

  const data = state.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / Math.max(1, data.pageSize))) : 1;
  return (
    <PublicSitePage header={<PublicSiteHeader current="blog" variant="compact" />}>
      <div className="sk-news" data-testid="series-page">
        <nav className="sk-news-crumbs" aria-label={t('news.crumbAria')}>
          <a href="/series" onClick={(e) => { e.preventDefault(); navigate('/series'); }}><Icon name="arrow-left" size={16} />{t('cms.series.all')}</a>
        </nav>
        {state.phase === 'loading' ? <div className="sk-news-skeleton sk-news-skeleton--hero" role="status" aria-label={t('cms.series.loading')} /> : null}
        {state.phase === 'missing' || state.phase === 'error' ? (
          <div className="sk-news-state" role="alert">
            <Icon name={state.phase === 'missing' ? 'file-text' : 'alert-circle'} size={28} />
            <h1>{t(state.phase === 'missing' ? 'cms.series.missing' : 'news.error')}</h1>
            <p>{t(state.phase === 'missing' ? 'cms.series.missingBody' : 'news.errorBody')}</p>
            {state.phase === 'error' ? <button type="button" className="sk-news-btn" onClick={() => setAttempt((n) => n + 1)}>{t('news.retry')}</button> : null}
          </div>
        ) : null}
        {data ? (
          <>
            <PostCover template={data.series.template} art={TEMPLATES[data.series.template].art[0] ?? null} alt={t('cms.series.coverAlt', { name: data.series.name })} size="hero" hue={data.series.hue}>
              <span className="sk-news-chips">
                <span className="sk-news-chip"><Icon name="repeat" size={12} strokeWidth={2.2} />{t('cms.series.label')}</span>
                {data.series.category ? <span className="sk-news-chip">{data.series.category.name}</span> : null}
                {data.series.sample ? <span className="sk-news-chip sk-news-chip--sample">{t('news.sample')}</span> : null}
              </span>
              <h1 className="sk-news-post__title">{data.series.name}</h1>
              {data.series.summary ? <p className="sk-news-post__summary">{data.series.summary}</p> : null}
              <p className="sk-news-meta"><span className="sk-news-meta__item"><Icon name="file-text" size={14} />{t('cms.series.episodes', { n: data.total })}</span></p>
            </PostCover>
            <section aria-label={t('cms.series.episodesAria')}>
              <h2 className="sk-news-section-title">{t('cms.series.latest')}</h2>
              <div className="sk-news-grid">{data.items.map((post) => <PostCard key={post.id} post={post} onOpen={(p) => navigate(p.path)} />)}</div>
            </section>
            <Pagination page={page} pages={pages} go={setPage} />
          </>
        ) : null}
      </div>
    </PublicSitePage>
  );
}
