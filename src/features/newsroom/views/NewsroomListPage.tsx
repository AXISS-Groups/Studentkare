import React, { useEffect, useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useSearchParams } from '@/core/navigation';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { AnimatedIcon, Icon } from '@/design-system/icons';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { NewsroomListViewModel, readListState, writeListState } from '../viewmodel/NewsroomListViewModel';
import type { ListState } from '../viewmodel/NewsroomListViewModel';
import { TEMPLATES, templatesIn } from '../model/templates';
import type { PostTemplate, SectionPath } from '../model/templates';
import type { PostTeaser } from '../data/NewsroomRepository';
import { PostCard } from './PostCard';
import './newsroom.css';

const COPY: Readonly<Record<SectionPath, { eyebrow: MessageKey; title: MessageKey; body: MessageKey; search: MessageKey }>> = {
  blog: { eyebrow: 'news.blog.eyebrow', title: 'news.blog.title', body: 'news.blog.body', search: 'news.blog.search' },
  news: { eyebrow: 'news.news.eyebrow', title: 'news.news.title', body: 'news.news.body', search: 'news.news.search' },
};

/** Blog and News as two tabs of one place, each with its own address and feeds. */
function SectionTabs({ section }: { section: SectionPath }): React.ReactElement {
  const t = useT();
  return (
    <nav className="sk-news-tabs" aria-label={t('news.sectionsAria')}>
      {(['blog', 'news'] as const).map((s) => (
        <a key={s} className="sk-news-tabs__tab" href={`/${s}`} aria-current={s === section ? 'page' : undefined}>
          <Icon name={s === 'blog' ? 'book' : 'megaphone'} size={16} />
          {t(s === 'blog' ? 'news.nav.blog' : 'news.nav.news')}
        </a>
      ))}
    </nav>
  );
}

function Pagination({ page, pages, go }: { page: number; pages: number; go: (page: number) => void }): React.ReactElement | null {
  const t = useT();
  if (pages <= 1) return null;
  return (
    <nav className="sk-news-pages" aria-label={t('news.pagesAria')}>
      <button type="button" className="sk-news-pages__btn" onClick={() => go(page - 1)} disabled={page <= 1}>
        <Icon name="chevron-left" size={18} />{t('news.prev')}
      </button>
      <span className="sk-news-pages__where" aria-live="polite">{t('news.page', { page, pages })}</span>
      <button type="button" className="sk-news-pages__btn" onClick={() => go(page + 1)} disabled={page >= pages}>
        {t('news.next')}<Icon name="chevron-right" size={18} />
      </button>
    </nav>
  );
}

function Skeleton(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-news-grid" aria-busy="true" aria-label={t('news.loading')} role="status">
      {[0, 1, 2].map((n) => <div key={n} className="sk-news-skeleton" />)}
    </div>
  );
}

/**
 * /blog and /news (WebNewsroom): the section's featured post, category
 * filters, search, pages, and the newsletter band in the public footer.
 * Published posts only; nothing about the visitor is read or kept.
 */
export const NewsroomListPage = observer(function NewsroomListPage({ section }: { section: SectionPath }): React.ReactElement {
  const t = useT();
  const searchId = useId();
  const routerNavigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [vm] = useState(() => new NewsroomListViewModel(section));
  const state = readListState(params, section);
  const [query, setQuery] = useState(state.q);
  const key = JSON.stringify(state);

  useEffect(() => {
    void vm.load(state);
    // The URL is the state: reload whenever it changes.
  }, [vm, key]);
  useEffect(() => () => vm.dispose(), [vm]);
  useEffect(() => setQuery(state.q), [state.q]);

  const apply = (next: Partial<ListState>) => setParams(writeListState({ ...state, page: 1, ...next }));
  const open = (post: PostTeaser) => routerNavigate(post.path);
  const copy = COPY[section];
  const categories = templatesIn(section);

  return (
    <PublicSitePage header={<PublicSiteHeader current={section} variant="compact" />}>
      <div className="sk-news" data-section={section} data-testid={`newsroom-${section}`}>
        <header className="sk-news-hero">
          <SectionTabs section={section} />
          <span className="sk-news-hero__eyebrow">{t(copy.eyebrow)}</span>
          <h1 className="sk-news-hero__title">{t(copy.title)}</h1>
          <p className="sk-news-hero__body">{t(copy.body)}</p>
          <p className="sk-news-hero__feeds">
            <Icon name="share-nodes" size={15} />
            <a href={`/api/posts/${section}/rss.xml`}>{t('news.rss')}</a>
            <span aria-hidden="true">·</span>
            <a href={`/api/posts/${section}/atom.xml`}>{t('news.atom')}</a>
          </p>
        </header>

        <div className="sk-news-toolbar">
          <div className="sk-news-filters" role="group" aria-label={t('news.filterAria')}>
            <button type="button" className="sk-news-filter" aria-pressed={state.category === null} onClick={() => apply({ category: null })}>
              {t('news.filter.all')}
            </button>
            {categories.map((tpl: PostTemplate) => (
              <button key={tpl} type="button" className="sk-news-filter" data-hue={TEMPLATES[tpl].hue} aria-pressed={state.category === tpl}
                onClick={() => apply({ category: tpl })} data-testid={`news-filter-${tpl}`}>
                <Icon name={TEMPLATES[tpl].icon} size={16} />
                {t(TEMPLATES[tpl].plural)}
              </button>
            ))}
          </div>
          <form className="sk-news-search" role="search" onSubmit={(e) => { e.preventDefault(); apply({ q: query }); }}>
            <label className="sk-news-search__field" htmlFor={searchId}>
              <Icon name="search" size={18} />
              <span className="sk-news-sr">{t('news.searchLabel')}</span>
              <input id={searchId} type="search" value={query} maxLength={80} placeholder={t(copy.search)}
                onChange={(e) => setQuery(e.target.value)} data-testid="news-search" />
            </label>
            <button type="submit" className="sk-news-search__go">{t('news.search')}</button>
          </form>
        </div>

        {vm.phase === 'loading' && !vm.items.length && !vm.featured ? <Skeleton /> : null}

        {vm.phase === 'error' ? (
          <div className="sk-news-state" role="alert">
            <Icon name="alert-circle" size={28} />
            <h2>{t('news.error')}</h2>
            <p>{t('news.errorBody')}</p>
            <button type="button" className="sk-news-btn" onClick={vm.retry}><Icon name="refresh" size={16} />{t('news.retry')}</button>
          </div>
        ) : null}

        {vm.phase === 'ready' && !vm.featured && !vm.items.length ? (
          <div className="sk-news-state" role="status" data-testid="news-empty">
            {section === 'blog'
              ? <AnimatedIcon name="anim-book-open" size="mark" color="currentColor" poster={<Icon name="book" size={28} />} />
              : <Icon name="megaphone" size={28} />}
            <h2>{vm.filtered ? t('news.emptyFiltered') : t('news.empty')}</h2>
            <p>{vm.filtered ? t('news.emptyFilteredBody') : t('news.emptyBody')}</p>
            {vm.filtered ? <button type="button" className="sk-news-btn" onClick={() => { setQuery(''); apply({ category: null, q: '' }); }}>{t('news.clear')}</button> : null}
          </div>
        ) : null}

        {vm.phase !== 'error' && vm.featured ? (
          <section className="sk-news-featured" aria-label={t('news.featured')}>
            <PostCard post={vm.featured} featured onOpen={open} headingLevel={2} />
          </section>
        ) : null}

        {vm.phase !== 'error' && vm.items.length ? (
          <section aria-label={t(vm.filtered ? 'news.results' : 'news.latest')}>
            <h2 className="sk-news-section-title">{t(vm.filtered ? 'news.results' : 'news.latest')}</h2>
            <div className="sk-news-grid" data-testid="news-grid">
              {vm.items.map((post) => <PostCard key={post.id} post={post} onOpen={open} />)}
            </div>
          </section>
        ) : null}

        {vm.phase === 'ready' ? <Pagination page={state.page} pages={vm.pages} go={(page) => setParams(writeListState({ ...state, page }))} /> : null}
      </div>
    </PublicSitePage>
  );
});
