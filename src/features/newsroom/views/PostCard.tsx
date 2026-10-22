import React from 'react';
import { useLanguage, useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { PostTeaser } from '../data/NewsroomRepository';
import { TEMPLATES } from '../model/templates';
import { formatDate } from '../model/share';
import { PostCover } from './PostCover';
import './newsroom.css';

/** The chips every teaser shows: its category, and "Sample post" in a development build. */
export function PostChips({ post }: { post: PostTeaser }): React.ReactElement {
  const t = useT();
  return (
    <span className="sk-news-chips">
      <span className="sk-news-chip" data-hue={TEMPLATES[post.template].hue}>{t(TEMPLATES[post.template].label)}</span>
      {post.sample ? <span className="sk-news-chip sk-news-chip--sample">{t('news.sample')}</span> : null}
    </span>
  );
}

/** Date · reading time · author. */
export function PostMeta({ post }: { post: PostTeaser }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <p className="sk-news-meta">
      <span className="sk-news-meta__item"><Icon name="calendar" size={14} />{formatDate(post.publishedAt, lang)}</span>
      <span className="sk-news-meta__item"><Icon name="clock" size={14} />{t('news.minRead', { n: post.readingMinutes })}</span>
      {post.author.name ? <span className="sk-news-meta__item"><Icon name="user" size={14} />{t('news.by', { name: post.author.name })}</span> : null}
    </p>
  );
}

/**
 * A post in a list: its template's cover, chips, title, summary and meta. The
 * whole card is one link (the title), so a screen reader hears it once.
 */
export function PostCard({ post, featured = false, onOpen, headingLevel = 3 }: {
  post: PostTeaser; featured?: boolean; onOpen?: (post: PostTeaser) => void; headingLevel?: 2 | 3;
}): React.ReactElement {
  const t = useT();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className={`sk-news-card${featured ? ' sk-news-card--featured' : ''}`} data-testid={`news-card-${post.slug}`}>
      <PostCover template={post.template} art={post.coverArt} alt={post.coverAlt} size="card" />
      <div className="sk-news-card__text">
        {featured ? <span className="sk-news-card__eyebrow"><Icon name="star" size={14} />{t('news.featured')}</span> : null}
        <PostChips post={post} />
        <Heading className="sk-news-card__title">
          <a className="sk-news-card__link" href={post.path} onClick={onOpen ? (e) => { e.preventDefault(); onOpen(post); } : undefined}>
            {post.title}
          </a>
        </Heading>
        {post.summary ? <p className="sk-news-card__summary">{post.summary}</p> : null}
        <PostMeta post={post} />
        {post.reviewed ? (
          <p className="sk-news-card__reviewed"><Icon name="shield-check" size={14} />{t('news.reviewedShort', { name: post.reviewed.by })}</p>
        ) : null}
      </div>
    </article>
  );
}
