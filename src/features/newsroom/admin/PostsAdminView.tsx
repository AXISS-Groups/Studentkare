import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, DataTable, SkButton, StatusPill } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIcon3dName, SkIconName } from '@/design-system/icons';
import { Field, FormError } from '@/components/interface/WorkflowUI';
import { BoardNote, BoardToast } from '@/features/admin/views/AdminBoard';
import { BoardFailure, BoardLoading, GovCard } from '@/features/admin/views/GovBoard';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { AdminPost, PostBlock, PostDetail, PostStatus } from '../data/NewsroomRepository';
import { BLOCK_ICON, BLOCK_LABEL, CTA_ROUTES, TEMPLATES, TEMPLATE_ORDER } from '../model/templates';
import type { CtaRoute, PostTemplate } from '../model/templates';
import { formatDate } from '../model/share';
import { PostsAdminViewModel } from '../viewmodel/PostsAdminViewModel';
import type { Console, Notice, Origin, PreviewMode, ReviewFilter } from '../viewmodel/PostsAdminViewModel';
import { PostArticle } from '../views/PostPage';
import { PostCover } from '../views/PostCover';
import { ClinicianConsoleFrame } from '@/features/clinician/shared/ClinicianConsoleFrame';
import { getSetting } from '@/data/services/config';
import { AutopilotView } from './AutopilotView';
import { AnalyticsView, CategoriesView, PrecisionCard, ReviewQueue, SeriesAdminView, ShareKitView } from './ContentTabs';
import '@/features/admin/views/gov-board.css';
import '@/theme/workflows.css';
import '../views/newsroom.css';
import './posts-admin.css';

const STATUS: Readonly<Record<PostStatus, { label: MessageKey; tone: SkTone }>> = {
  DRAFT: { label: 'news.adm.status.DRAFT', tone: 'neutral' },
  SCHEDULED: { label: 'news.adm.status.SCHEDULED', tone: 'action' },
  PUBLISHED: { label: 'news.adm.status.PUBLISHED', tone: 'positive' },
  UNPUBLISHED: { label: 'news.adm.status.UNPUBLISHED', tone: 'neutral' },
};
const STATUS_FILTERS: readonly (PostStatus | null)[] = [null, 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED'];
const REVIEW_FILTERS: readonly { id: ReviewFilter; label: MessageKey }[] = [
  { id: 'TO_REVIEW', label: 'news.adm.rev.toReview' }, { id: 'REVIEWED', label: 'news.adm.rev.reviewed' }, { id: 'ALL', label: 'news.adm.rev.all' },
];
const NOTICE: Readonly<Record<Notice, MessageKey>> = {
  saved: 'news.adm.notice.saved', created: 'news.adm.notice.created', published: 'news.adm.notice.published', scheduled: 'news.adm.notice.scheduled',
  unpublished: 'news.adm.notice.unpublished', deleted: 'news.adm.notice.deleted', approved: 'news.adm.notice.approved', withdrawn: 'news.adm.notice.withdrawn',
  uploaded: 'news.adm.notice.uploaded',
};
const ACTIONS: Readonly<Record<string, MessageKey>> = {
  CREATED: 'news.adm.h.CREATED', EDITED: 'news.adm.h.EDITED', REVIEW_VOIDED: 'news.adm.h.REVIEW_VOIDED', PUBLISHED: 'news.adm.h.PUBLISHED',
  SCHEDULED: 'news.adm.h.SCHEDULED', UNPUBLISHED: 'news.adm.h.UNPUBLISHED', DELETED: 'news.adm.h.DELETED', IMAGE_ADDED: 'news.adm.h.IMAGE_ADDED',
  REVIEWED: 'news.adm.h.REVIEWED', REVIEW_WITHDRAWN: 'news.adm.h.REVIEW_WITHDRAWN',
  AUTO_CREATED: 'autopilot.h.AUTO_CREATED', AUTO_PUBLISHED: 'autopilot.h.AUTO_PUBLISHED', AUTO_SCHEDULED: 'autopilot.h.AUTO_SCHEDULED',
};
type AdminTab = 'posts' | 'review' | 'series' | 'categories' | 'sources' | 'autopilot' | 'share' | 'analytics';
const ADMIN_TABS: readonly { id: AdminTab; label: MessageKey; icon: SkIconName }[] = [
  { id: 'posts', label: 'cms.tab.posts', icon: 'file-text' }, { id: 'review', label: 'cms.tab.review', icon: 'inbox' },
  { id: 'series', label: 'cms.tab.series', icon: 'repeat' }, { id: 'categories', label: 'cms.tab.categories', icon: 'filter' },
  { id: 'sources', label: 'cms.tab.sources', icon: 'activity' }, { id: 'autopilot', label: 'autopilot.tab', icon: 'zap' },
  { id: 'share', label: 'cms.tab.share', icon: 'share' }, { id: 'analytics', label: 'cms.tab.analytics', icon: 'bar-chart' },
];
const ORIGINS: readonly { id: Origin | null; label: MessageKey }[] = [
  { id: null, label: 'cms.origin.all' }, { id: 'AUTO', label: 'cms.origin.AUTO' }, { id: 'MANUAL', label: 'cms.origin.MANUAL' },
];
const PREVIEWS: readonly { id: PreviewMode; label: MessageKey; icon: SkIconName }[] = [
  { id: 'desktop', label: 'cms.preview.desktop', icon: 'monitor' }, { id: 'phone', label: 'cms.preview.phone', icon: 'phone' },
  { id: 'linkedin', label: 'cms.preview.linkedin', icon: 'brand-linkedin' },
];
const CTA_LABEL: Readonly<Record<CtaRoute, MessageKey>> = {
  '/blog': 'news.nav.blog', '/consult': 'news.route.consult', '/crisis': 'news.route.crisis', '/find-care': 'news.route.findCare',
  '/lab-tests': 'news.route.labTests', '/medicine-info': 'news.route.medicineInfo', '/news': 'news.nav.news', '/plans': 'news.route.plans',
  '/preventive-care': 'news.route.preventive', '/records': 'news.route.records', '/shop': 'news.route.shop', '/signup': 'news.route.signup',
  '/support': 'news.route.support',
};

function when(at: number): string {
  return new Date(at * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

function rowPill(post: AdminPost): { label: MessageKey; tone: SkTone } {
  if (post.needsReview && !post.review?.current && post.status !== 'UNPUBLISHED') return { label: 'news.adm.needsReview', tone: 'attention' };
  return STATUS[post.status];
}

/** The draft as the public page will draw it. */
function previewPost(vm: PostsAdminViewModel, authorName: string): PostDetail {
  const d = vm.draft;
  const spec = TEMPLATES[d.template];
  const category = vm.categories.find((c) => c.id === d.categoryId);
  const series = vm.series.find((x) => x.id === d.seriesId);
  const words = [d.title, d.summary, ...vm.draft.body.map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : ''))].join(' ').split(/\s+/).filter(Boolean).length;
  return {
    id: vm.open?.id ?? 'preview', slug: d.slug, section: spec.section, template: d.template, title: d.title, summary: d.summary, tags: d.tags.filter(Boolean),
    coverAlt: d.coverAlt, coverArt: d.coverArt || null, author: { name: authorName }, publishedAt: new Date().toISOString(), updatedAt: null,
    featured: d.featured, readingMinutes: Math.max(1, Math.ceil(words / 200)), reviewed: vm.open?.review?.current ? { by: vm.open.review.by, on: new Date(vm.open.review.at * 1000).toISOString() } : null,
    sample: vm.open?.sample ?? false, path: `/${spec.section}/${d.slug}`, ogImage: '', body: vm.previewBody, seoTitle: d.seoTitle || d.title,
    seoDescription: d.seoDescription || d.summary, related: [], auto: vm.open?.auto ?? false, source: vm.open?.source ?? null,
    category: category ? { id: category.id, name: category.name, hue: category.hue, icon: category.icon, crisisLines: category.crisisLines } : null,
    series: series ? { slug: series.slug, name: series.name, hue: series.hue, episode: vm.open?.seriesId === series.id ? vm.open.episode : series.episodeCount + 1 } : null,
    crisisLines: Boolean(category?.crisisLines),
    healthNote: spec.review || (spec.advice && Boolean(category?.clinical)),
  };
}

const BlockEditor = observer(function BlockEditor({ vm, block, index }: { vm: PostsAdminViewModel; block: PostBlock; index: number }) {
  const t = useT();
  const set = (next: PostBlock) => vm.updateBlock(index, next);
  const lines = (items: string[]) => items.join('\n');
  const toLines = (text: string) => text.split('\n');
  const count = vm.draft.body.length;
  return (
    <fieldset className="sk-posts-block" data-testid={`post-block-${index}`}>
      <legend className="sk-posts-block__legend"><Icon name={BLOCK_ICON[block.type]} size={16} />{t(BLOCK_LABEL[block.type])}</legend>
      {block.type === 'heading' || block.type === 'paragraph' ? (
        <Field label={t('news.adm.f.text')}>
          {block.type === 'heading'
            ? <input value={block.text} maxLength={120} onChange={(e) => set({ ...block, text: e.target.value })} />
            : <textarea rows={4} value={block.text} maxLength={2000} onChange={(e) => set({ ...block, text: e.target.value })} />}
        </Field>
      ) : null}
      {block.type === 'list' ? (
        <>
          <Field label={t('news.adm.f.items')} hint={t('news.adm.f.itemsHint')}>
            <textarea rows={4} value={lines(block.items)} onChange={(e) => set({ ...block, items: toLines(e.target.value) })} />
          </Field>
          <label className="sk-posts-check"><input type="checkbox" checked={block.ordered} onChange={(e) => set({ ...block, ordered: e.target.checked })} />{t('news.adm.f.ordered')}</label>
        </>
      ) : null}
      {block.type === 'quote' ? (
        <>
          <Field label={t('news.adm.f.quote')}><textarea rows={3} value={block.text} maxLength={500} onChange={(e) => set({ ...block, text: e.target.value })} /></Field>
          <Field label={t('news.adm.f.cite')}><input value={block.cite} maxLength={120} onChange={(e) => set({ ...block, cite: e.target.value })} /></Field>
        </>
      ) : null}
      {block.type === 'callout' ? (
        <>
          <Field label={t('news.adm.f.tone')}>
            <select value={block.tone} onChange={(e) => set({ ...block, tone: e.target.value === 'attention' ? 'attention' : 'info' })}>
              <option value="info">{t('news.callout.info')}</option>
              <option value="attention">{t('news.callout.attention')}</option>
            </select>
          </Field>
          <Field label={t('news.adm.f.text')}><textarea rows={3} value={block.text} maxLength={500} onChange={(e) => set({ ...block, text: e.target.value })} /></Field>
        </>
      ) : null}
      {block.type === 'image' ? (
        <>
          {vm.open ? (
            <Field label={t('news.adm.f.image')} hint={t('news.adm.f.imageHint')}>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void vm.uploadImage(index, file); }} />
            </Field>
          ) : <p className="sk-gov-fine">{t('news.adm.f.imageSaveFirst')}</p>}
          <Field label={t('news.adm.f.alt')} hint={t('news.adm.f.altHint')}><input value={block.alt} maxLength={200} onChange={(e) => set({ ...block, alt: e.target.value })} /></Field>
          <Field label={t('news.adm.f.caption')}><input value={block.caption} maxLength={200} onChange={(e) => set({ ...block, caption: e.target.value })} /></Field>
        </>
      ) : null}
      {block.type === 'facts' ? (
        <>
          <Field label={t('news.adm.f.factsTitle')}><input value={block.title} maxLength={80} placeholder={t('news.factsDefault')} onChange={(e) => set({ ...block, title: e.target.value })} /></Field>
          <Field label={t('news.adm.f.items')} hint={t('news.adm.f.itemsHint')}><textarea rows={4} value={lines(block.items)} onChange={(e) => set({ ...block, items: toLines(e.target.value) })} /></Field>
        </>
      ) : null}
      {block.type === 'mythfact' ? (
        <>
          <Field label={t('cms.block.myth')}><textarea rows={2} value={block.myth} maxLength={300} onChange={(e) => set({ ...block, myth: e.target.value })} /></Field>
          <Field label={t('cms.block.fact')}><textarea rows={3} value={block.fact} maxLength={500} onChange={(e) => set({ ...block, fact: e.target.value })} /></Field>
        </>
      ) : null}
      {block.type === 'stat' ? (
        <div className="wf-form-grid">
          <Field label={t('cms.block.statValue')} hint={t('cms.block.statValueHint')}><input value={block.value} maxLength={12} onChange={(e) => set({ ...block, value: e.target.value })} /></Field>
          <Field label={t('cms.block.statLabel')}><input value={block.label} maxLength={120} onChange={(e) => set({ ...block, label: e.target.value })} /></Field>
        </div>
      ) : null}
      {block.type === 'cta' ? (
        <div className="wf-form-grid">
          <Field label={t('news.adm.f.ctaLabel')}><input value={block.label} maxLength={40} onChange={(e) => set({ ...block, label: e.target.value })} /></Field>
          <Field label={t('news.adm.f.ctaRoute')} hint={t('news.adm.f.ctaHint')}>
            <select value={block.route} onChange={(e) => { const route = CTA_ROUTES.find((r) => r === e.target.value); if (route) set({ ...block, route }); }}>
              {CTA_ROUTES.map((route) => <option key={route} value={route}>{`${t(CTA_LABEL[route])} (${route})`}</option>)}
            </select>
          </Field>
        </div>
      ) : null}
      <div className="sk-posts-block__tools">
        <SkButton variant="secondary" onClick={() => vm.moveBlock(index, -1)} disabled={index === 0} aria-label={t('news.adm.moveUp')}><Icon name="arrow-up" size={16} /></SkButton>
        <SkButton variant="secondary" onClick={() => vm.moveBlock(index, 1)} disabled={index === count - 1} aria-label={t('news.adm.moveDown')}><Icon name="chevron-down" size={16} /></SkButton>
        <SkButton variant="secondary" onClick={() => vm.removeBlock(index)} aria-label={t('news.adm.removeBlock')}><Icon name="trash" size={16} /></SkButton>
      </div>
    </fieldset>
  );
});

const TemplatePicker = observer(function TemplatePicker({ vm }: { vm: PostsAdminViewModel }) {
  const t = useT();
  return (
    <div className="sk-posts-templates" role="radiogroup" aria-label={t('news.adm.f.template')}>
      {TEMPLATE_ORDER.map((tpl: PostTemplate) => (
        <label key={tpl} className="sk-posts-template" data-checked={vm.draft.template === tpl ? 'true' : undefined}>
          <input type="radio" name="post-template" value={tpl} checked={vm.draft.template === tpl} onChange={() => vm.update({ template: tpl })} data-testid={`post-template-${tpl}`} />
          <PostCover template={tpl} art={TEMPLATES[tpl].art[0] ?? null} alt="" size="mini" />
          <span className="sk-posts-template__name">{t(TEMPLATES[tpl].label)}</span>
          <span className="sk-posts-template__about">{t(TEMPLATES[tpl].about)}</span>
        </label>
      ))}
    </div>
  );
});

const PublishCard = observer(function PublishCard({ vm, onShareKit }: { vm: PostsAdminViewModel; onShareKit?: (id: string) => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const post = vm.open;
  if (!post) return <BoardNote icon="info">{t('news.adm.saveFirst')}</BoardNote>;
  const pill = STATUS[post.status];
  return (
    <GovCard title={t('news.adm.publishTitle')} aside={<span data-testid="post-status"><StatusPill tone={pill.tone}>{t(pill.label)}</StatusPill></span>}>
      <p className="sk-gov-text">
        <Icon name={post.live ? 'eye' : 'eye-off'} size={16} /> {t(post.live ? 'news.adm.live' : 'news.adm.notLive')}
        {post.live ? <> · <a href={post.path} target="_blank" rel="noopener noreferrer">{post.path}</a></> : null}
      </p>
      {post.status === 'SCHEDULED' && post.publishAt ? <p className="sk-gov-fine">{t('news.adm.scheduledFor', { at: when(post.publishAt) })}</p> : null}
      {post.needsReview ? (
        post.review?.current
          ? <BoardNote icon="shield-check">{t('news.adm.reviewCurrent', { name: post.review.by, date: formatDate(new Date(post.review.at * 1000).toISOString(), lang) })}</BoardNote>
          : post.review
            ? <BoardNote icon="alert-triangle" tone="attention">{t('news.adm.reviewStale', { name: post.review.by })}</BoardNote>
            : <BoardNote icon="stethoscope" tone="attention">{t('news.adm.reviewNeeded')}</BoardNote>
      ) : null}
      {post.blockedBy ? <p className="sk-gov-fine" data-testid="post-blocked"><Icon name="info" size={14} /> {t('news.adm.blocked', { reason: post.blockedBy })}</p> : null}
      {vm.dirty ? <p className="sk-gov-fine"><Icon name="pencil" size={14} /> {t('news.adm.unsaved')}</p> : null}
      <Field label={t('cms.scheduleAt', { zone: getSetting('platform.default_timezone') })} hint={t('news.adm.scheduleHint')}>
        <input type="datetime-local" value={vm.scheduleAt} onChange={(e) => vm.setScheduleAt(e.target.value)} data-testid="post-schedule" />
      </Field>
      <div className="sk-gov-toolbar">
        <SkButton onClick={() => void vm.publish()} disabled={vm.busy || vm.dirty || Boolean(post.blockedBy)} data-testid="post-publish">
          <Icon name={vm.scheduleAt ? 'calendar' : 'upload'} size={16} />{t(vm.scheduleAt ? 'news.adm.schedule' : 'news.adm.publish')}
        </SkButton>
        {post.status === 'PUBLISHED' || post.status === 'SCHEDULED' ? (
          <SkButton variant="secondary" onClick={() => void vm.unpublish()} disabled={vm.busy} data-testid="post-unpublish"><Icon name="eye-off" size={16} />{t('news.adm.unpublish')}</SkButton>
        ) : null}
        {post.status === 'DRAFT' ? (
          <SkButton variant="danger" onClick={() => void vm.remove()} disabled={vm.busy} data-testid="post-delete"><Icon name="trash" size={16} />{t('news.adm.delete')}</SkButton>
        ) : null}
        {onShareKit ? (
          <SkButton variant="secondary" onClick={() => onShareKit(post.id)} data-testid="post-share-kit"><Icon name="share" size={16} />{t('cms.tab.share')}</SkButton>
        ) : null}
      </div>
    </GovCard>
  );
});

const History = observer(function History({ vm }: { vm: PostsAdminViewModel }) {
  const t = useT();
  const history = vm.open?.history ?? [];
  return (
    <GovCard title={t('news.adm.history')} aside={<Icon name="file-text" size={18} />}>
      {history.length ? (
        <ul className="sk-gov-history" data-testid="post-history">
          {history.map((h) => (
            <li key={h.id}>
              <span className="sk-gov-dot" aria-hidden="true" />
              <strong>{ACTIONS[h.action] ? t(ACTIONS[h.action] as MessageKey) : h.action}</strong>
              <span>{t('news.adm.historyLine', { who: h.byYou ? t('news.adm.you') : h.actorName || h.actorRole, at: when(h.at) })}</span>
            </li>
          ))}
        </ul>
      ) : <p className="sk-gov-text">{t('news.adm.historyEmpty')}</p>}
    </GovCard>
  );
});

/** The link card LinkedIn (and WhatsApp) draw from the post's share image, title and address. */
function LinkedInCard({ post }: { post: PostDetail }): React.ReactElement {
  const t = useT();
  return (
    <figure className="sk-cms-linkcard" data-testid="preview-linkedin">
      <PostCover template={post.template} art={post.coverArt} alt={post.coverAlt} size="card" hue={post.series?.hue}>
        <p className="sk-cms-linkcard__cover-title">{post.title}</p>
      </PostCover>
      <figcaption className="sk-cms-linkcard__meta">
        <strong>{post.seoTitle || post.title}</strong>
        <span>{t('cms.preview.domain', { domain: typeof window !== 'undefined' ? window.location.host : '' })}</span>
      </figcaption>
    </figure>
  );
}

const Preview = observer(function Preview({ vm, authorName }: { vm: PostsAdminViewModel; authorName: string }) {
  const t = useT();
  const post = previewPost(vm, authorName);
  return (
    <section className="sk-posts-preview" aria-label={t('news.adm.preview')} data-testid="post-preview">
      <div className="sk-posts-preview__bar">
        <Icon name="eye" size={16} />{t('news.adm.preview')}<span>{t('news.adm.previewNote')}</span>
        {vm.console === 'admin' ? (
          <div role="tablist" aria-label={t('cms.preview.aria')} className="sk-cms-preview-modes">
            {PREVIEWS.map((mode) => (
              <button key={mode.id} type="button" role="tab" aria-selected={vm.previewMode === mode.id} className="sk-cms-preview-mode"
                onClick={() => vm.setPreviewMode(mode.id)} data-testid={`preview-${mode.id}`}>
                <Icon name={mode.icon} size={14} />{t(mode.label)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {vm.previewMode === 'linkedin' && vm.console === 'admin' ? (
        <div className="sk-posts-preview__page"><LinkedInCard post={post} /></div>
      ) : (
        <div className={`sk-news sk-posts-preview__page${vm.previewMode === 'phone' && vm.console === 'admin' ? ' sk-cms-phone' : ''}`}>
          <PostArticle post={post} onOpen={() => undefined} />
        </div>
      )}
    </section>
  );
});

/** Word count against the template's guide, the accessibility checks, and a recent post on the same topic. */
const ComposerHelp = observer(function ComposerHelp({ vm }: { vm: PostsAdminViewModel }) {
  const t = useT();
  const words = vm.words;
  return (
    <GovCard title={t('cms.help.title')} aside={<Icon name="check-circle" size={18} />}>
      <p className="sk-gov-text" data-testid="composer-words" data-state={words.state}>
        <Icon name={words.state === 'ok' ? 'check-circle' : 'info'} size={16} />{' '}
        {t('cms.help.words', { n: words.count, min: words.min, max: words.max })}
        {words.state !== 'ok' ? ` · ${t(words.state === 'short' ? 'cms.help.short' : 'cms.help.long')}` : ''}
      </p>
      <ul className="sk-cms-checks" aria-label={t('cms.help.checksAria')} data-testid="composer-checks">
        {vm.checks.map((c) => (
          <li key={c.id} data-ok={c.ok ? 'true' : 'false'}><Icon name={c.ok ? 'check-circle' : 'alert-triangle'} size={16} />{t(c.label)}</li>
        ))}
      </ul>
      {vm.similar.length ? (
        <BoardNote icon="alert-triangle" tone="attention">
          {t('cms.help.similar')}{' '}
          {vm.similar.map((p, i) => <React.Fragment key={p.id}>{i ? ' · ' : ''}<a href={p.path} target="_blank" rel="noopener noreferrer">{p.title}</a></React.Fragment>)}
        </BoardNote>
      ) : null}
    </GovCard>
  );
});

const Editor = observer(function Editor({ vm, onShareKit }: { vm: PostsAdminViewModel; onShareKit?: (id: string) => void }) {
  const t = useT();
  const d = vm.draft;
  const spec = TEMPLATES[d.template];
  const authorName = vm.authors.find((a) => a.id === d.authorId)?.name ?? vm.open?.authorName ?? '';
  return (
    <div className="sk-posts-editor" data-testid="post-editor">
      <form className="sk-posts-form" onSubmit={(e) => { e.preventDefault(); void vm.save(); }}>
        <div className="sk-gov-toolbar">
          <SkButton variant="secondary" onClick={vm.close}><Icon name="arrow-left" size={16} />{t('news.adm.back')}</SkButton>
          <span className="sk-psite-spacer" />
          <SkButton type="submit" busy={vm.busy} disabled={vm.busy || !vm.slugValid || d.title.trim().length < 3} data-testid="post-save"><Icon name="check" size={16} />{t(vm.open ? 'news.adm.save' : 'news.adm.create')}</SkButton>
        </div>
        <FormError message={vm.error ?? ''} />
        <BoardNote icon="alert-triangle" tone="attention">{t('news.adm.noAi')} {t('news.adm.neverStudent')}</BoardNote>

        <GovCard title={t('news.adm.f.template')}>
          <TemplatePicker vm={vm} />
          {spec.review ? <p className="sk-gov-fine"><Icon name="stethoscope" size={14} /> {t('news.adm.reviewRule')}</p> : null}
        </GovCard>

        <GovCard title={t('news.adm.basics')}>
          <Field label={t('news.adm.f.title')}><input value={d.title} maxLength={160} onChange={(e) => vm.update({ title: e.target.value })} data-testid="post-title" /></Field>
          <Field label={t('news.adm.f.slug')} hint={t('news.adm.f.slugHint', { path: `/${spec.section}/${d.slug || '…'}` })}>
            <input value={d.slug} maxLength={80} aria-invalid={d.slug.length > 0 && !vm.slugValid ? true : undefined} onChange={(e) => vm.update({ slug: e.target.value.toLowerCase() })} data-testid="post-slug" />
          </Field>
          <Field label={t('news.adm.f.summary')} hint={t('news.adm.f.summaryHint')}><textarea rows={2} value={d.summary} maxLength={300} onChange={(e) => vm.update({ summary: e.target.value })} /></Field>
          <div className="wf-form-grid">
            <Field label={t('news.adm.f.author')}>
              <select value={d.authorId} onChange={(e) => vm.update({ authorId: e.target.value })} data-testid="post-author">
                <option value="">{t('news.adm.f.authorPick')}</option>
                {vm.authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label={t('news.adm.f.tags')} hint={t('news.adm.f.tagsHint')}><input value={d.tags.join(', ')} onChange={(e) => vm.setTags(e.target.value)} /></Field>
          </div>
          <div className="wf-form-grid">
            <Field label={t('cms.f.category')} hint={t('cms.f.categoryHint')}>
              <select value={d.categoryId} onChange={(e) => vm.update({ categoryId: e.target.value })} data-testid="post-category">
                <option value="">{t('cms.none')}</option>
                {vm.liveCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('cms.f.series')} hint={t('cms.f.seriesHint')}>
              <select value={d.seriesId} onChange={(e) => vm.update({ seriesId: e.target.value })} data-testid="post-series">
                <option value="">{t('cms.none')}</option>
                {vm.liveSeries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
          </div>
          {vm.categories.find((c) => c.id === d.categoryId)?.crisisLines ? <p className="sk-gov-fine"><Icon name="phone-call" size={14} /> {t('cms.f.crisisNote')}</p> : null}
          {spec.advice && vm.categories.find((c) => c.id === d.categoryId)?.clinical ? <p className="sk-gov-fine"><Icon name="stethoscope" size={14} /> {t('cms.f.clinicalNote')}</p> : null}
          <label className="sk-posts-check"><input type="checkbox" checked={d.featured} onChange={(e) => vm.update({ featured: e.target.checked })} />{t('news.adm.f.featured')}</label>
        </GovCard>
        <ComposerHelp vm={vm} />
        {vm.open?.precisionReport ? <PrecisionCard report={vm.open.precisionReport} /> : null}

        <GovCard title={t('news.adm.cover')}>
          <div className="sk-posts-art" role="radiogroup" aria-label={t('news.adm.f.art')}>
            {spec.art.map((art: SkIcon3dName) => (
              <label key={art} className="sk-posts-art__option" data-checked={d.coverArt === art ? 'true' : undefined}>
                <input type="radio" name="post-art" checked={d.coverArt === art} onChange={() => vm.update({ coverArt: art })} aria-label={t('news.adm.f.artOption', { name: art })} />
                <Icon3d name={art} size={52} />
              </label>
            ))}
            <label className="sk-posts-art__option" data-checked={d.coverArt === '' ? 'true' : undefined}>
              <input type="radio" name="post-art" checked={d.coverArt === ''} onChange={() => vm.update({ coverArt: '' })} />
              <span className="sk-posts-art__none">{t('news.adm.f.artNone')}</span>
            </label>
          </div>
          <Field label={t('news.adm.f.coverAlt')} hint={t('news.adm.f.coverAltHint')}><input value={d.coverAlt} maxLength={200} onChange={(e) => vm.update({ coverAlt: e.target.value })} data-testid="post-cover-alt" /></Field>
          <p className="sk-gov-fine"><Icon name="lock" size={14} /> {t('news.adm.tokensOnly')}</p>
        </GovCard>

        <GovCard title={t('news.adm.body')}>
          {d.body.map((block, index) => <BlockEditor key={`${index}-${block.type}`} vm={vm} block={block} index={index} />)}
          <div className="sk-posts-add" role="group" aria-label={t('news.adm.addBlockAria')}>
            {spec.blocks.map((type) => (
              <SkButton key={type} variant="secondary" onClick={() => vm.addBlock(type)} data-testid={`post-add-${type}`}>
                <Icon name="plus" size={16} />{t(BLOCK_LABEL[type])}
              </SkButton>
            ))}
          </div>
        </GovCard>

        <GovCard title={t('news.adm.seo')}>
          <Field label={t('news.adm.f.seoTitle')} hint={t('news.adm.f.count', { n: d.seoTitle.length, max: 70 })}><input value={d.seoTitle} maxLength={70} placeholder={d.title} onChange={(e) => vm.update({ seoTitle: e.target.value })} /></Field>
          <Field label={t('news.adm.f.seoDescription')} hint={t('news.adm.f.count', { n: d.seoDescription.length, max: 160 })}><textarea rows={2} value={d.seoDescription} maxLength={160} placeholder={d.summary} onChange={(e) => vm.update({ seoDescription: e.target.value })} /></Field>
        </GovCard>

        <PublishCard vm={vm} onShareKit={onShareKit} />
        {vm.open ? <History vm={vm} /> : null}
      </form>
      <Preview vm={vm} authorName={authorName} />
    </div>
  );
});

const ReviewPanel = observer(function ReviewPanel({ vm }: { vm: PostsAdminViewModel }) {
  const t = useT();
  const { lang } = useLanguage();
  const post = vm.open;
  if (!post) return null;
  return (
    <div className="sk-posts-editor sk-posts-editor--review" data-testid="post-review">
      <div className="sk-posts-form">
        <div className="sk-gov-toolbar"><SkButton variant="secondary" onClick={vm.close}><Icon name="arrow-left" size={16} />{t('news.adm.back')}</SkButton></div>
        <FormError message={vm.error ?? ''} />
        <GovCard title={t('news.adm.rev.card')}>
          <BoardNote icon="shield-check">{t('news.adm.rev.rule')}</BoardNote>
          {post.review?.current
            ? <p className="sk-gov-text"><Icon name="check-circle" size={16} /> {t('news.adm.reviewCurrent', { name: post.review.byYou ? t('news.adm.you') : post.review.by, date: formatDate(new Date(post.review.at * 1000).toISOString(), lang) })}</p>
            : post.review ? <BoardNote icon="alert-triangle" tone="attention">{t('news.adm.reviewStale', { name: post.review.by })}</BoardNote> : null}
          <div className="sk-gov-toolbar">
            {!post.review?.current ? (
              <SkButton onClick={() => void vm.approve()} disabled={vm.busy} data-testid="post-approve"><Icon name="check-circle" size={16} />{t('news.adm.rev.approve')}</SkButton>
            ) : null}
            {post.review ? (
              <SkButton variant="secondary" onClick={() => void vm.withdraw()} disabled={vm.busy} data-testid="post-withdraw"><Icon name="rotate-ccw" size={16} />{t('news.adm.rev.withdraw')}</SkButton>
            ) : null}
          </div>
        </GovCard>
        <History vm={vm} />
      </div>
      <Preview vm={vm} authorName={post.authorName} />
    </div>
  );
});

/**
 * Super admin, Content (`admin/posts`) and the clinician's Health post reviews
 * (`clinician/post-reviews`): the AdminPosts screen. Content gathers every post
 * (typed or Auto) with its filters and one-click unpublish, the Review queue,
 * Series, Categories, Sources, the Autopilot, the Share kit and Analytics.
 * Every change is audited by the server and listed under History.
 */
export const PostsAdminView = observer(function PostsAdminView({ console: where }: { console: Console }) {
  const t = useT();
  const [vm] = useState(() => new PostsAdminViewModel(where));
  const [tab, setTab] = useState<AdminTab>('posts');
  const [kitPost, setKitPost] = useState<string | undefined>(undefined);
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  const review = where === 'review';
  const listTab = tab === 'posts' || tab === 'review';
  useEffect(() => { if (!review) vm.setQueueMode(tab === 'review'); }, [vm, tab, review]);
  const openKit = (id: string) => { setKitPost(id); vm.close(); setTab('share'); };

  if (listTab && vm.phase === 'loading' && !vm.items.length && !vm.editing && !vm.queueMode) return <BoardLoading label={t('news.adm.loading')} />;
  if (listTab && vm.phase === 'error' && !vm.editing) return <BoardFailure t={t} what={t('news.adm.what')} screen="AdminPosts" onRetry={() => void vm.load()} />;

  const rows: DataTableRow[] = vm.items.map((post) => {
    const pill = rowPill(post);
    const live = post.status === 'PUBLISHED' || post.status === 'SCHEDULED';
    return {
      id: post.id,
      muted: post.status === 'UNPUBLISHED',
      cells: [
        { text: post.title, weight: 'strong', sub: [post.path, post.category?.name, post.series ? t('cms.series.episodeOf', { n: post.series.episode, name: post.series.name }) : '', post.source?.name].filter(Boolean).join(' · ') },
        { text: post.auto ? `${t(TEMPLATES[post.template].label)} · ${t('autopilot.auto')}` : t(TEMPLATES[post.template].label) },
        { pill: { label: t(pill.label), tone: pill.tone } },
        { text: when(post.updatedAt), weight: 'muted', mono: true },
      ],
      actions: review
        ? [{ label: t('news.adm.rev.open'), icon: 'stethoscope', onSelect: () => void vm.openPost(post.id), accessibleLabel: t('news.adm.openSpoken', { title: post.title }) }]
        : [
          { label: t('news.adm.open'), icon: 'pencil', onSelect: () => void vm.openPost(post.id), accessibleLabel: t('news.adm.openSpoken', { title: post.title }) },
          ...(live ? [{ label: t('news.adm.unpublish'), icon: 'eye-off' as SkIconName, onSelect: () => void vm.unpublishRow(post.id),
            accessibleLabel: t('cms.unpublishSpoken', { title: post.title }), disabled: vm.busy }] : []),
          { label: t('cms.tab.share'), icon: 'share', onSelect: () => openKit(post.id), accessibleLabel: t('cms.shareSpoken', { title: post.title }) },
        ],
    };
  });

  const body = (() => {
    if (vm.editing) return review ? <ReviewPanel vm={vm} /> : <Editor vm={vm} onShareKit={openKit} />;
    if (review) {
      return (
        <div className="sk-gov-stack">
          {vm.error ? <FormError message={vm.error} /> : null}
          <div role="tablist" aria-label={t('news.adm.filterAria')} className="sk-gov-toolbar">
            {REVIEW_FILTERS.map((f) => (
              <SkButton key={f.id} role="tab" aria-selected={vm.reviewFilter === f.id} variant={vm.reviewFilter === f.id ? 'primary' : 'secondary'} onClick={() => vm.setReviewFilter(f.id)}>{t(f.label)}</SkButton>
            ))}
          </div>
          <DataTable variant="plain" caption={t('news.adm.rev.title')} title={t('news.adm.rev.queue')} actionsLabel={t('news.adm.col.actions')}
            columns={[{ label: t('news.adm.col.post') }, { label: t('news.adm.col.template'), width: '150px' }, { label: t('news.adm.col.status'), width: '170px' }, { label: t('news.adm.col.updated'), width: '160px', align: 'end' }]}
            rows={rows} emptyMessage={{ title: t('news.empty'), body: t('news.adm.rev.emptyBody') }} />
        </div>
      );
    }
    switch (tab) {
      case 'review': return <ReviewQueue vm={vm} />;
      case 'series': return <SeriesAdminView onChanged={vm.forgetTaxonomy} />;
      case 'categories': return <CategoriesView onChanged={vm.forgetTaxonomy} />;
      case 'sources': return <AutopilotView part="sources" />;
      case 'autopilot': return <AutopilotView part="autopilot" />;
      case 'share': return <ShareKitView postId={kitPost} />;
      case 'analytics': return <AnalyticsView />;
      default: return (
        <div className="sk-gov-stack">
          {vm.error ? <FormError message={vm.error} /> : null}
          <div role="tablist" aria-label={t('news.adm.filterAria')} className="sk-gov-toolbar">
            {STATUS_FILTERS.map((st) => (
              <SkButton key={st ?? 'all'} role="tab" aria-selected={vm.statusFilter === st} variant={vm.statusFilter === st ? 'primary' : 'secondary'} onClick={() => vm.setStatusFilter(st)} data-testid={`posts-filter-${st ?? 'ALL'}`}>
                {t(st ? STATUS[st].label : 'news.filter.all')}
              </SkButton>
            ))}
          </div>
          <form className="sk-gov-toolbar sk-cms-filters" role="search" onSubmit={(e) => { e.preventDefault(); void vm.load(); }}>
            <Field label={t('news.adm.f.templateFilter')}>
              <select value={vm.templateFilter ?? ''} onChange={(e) => vm.setTemplateFilter(TEMPLATE_ORDER.find((tpl) => tpl === e.target.value) ?? null)} data-testid="filter-type">
                <option value="">{t('news.filter.all')}</option>
                {TEMPLATE_ORDER.map((tpl) => <option key={tpl} value={tpl}>{t(TEMPLATES[tpl].label)}</option>)}
              </select>
            </Field>
            <Field label={t('cms.f.category')}>
              <select value={vm.categoryFilter ?? ''} onChange={(e) => vm.setCategoryFilter(e.target.value || null)} data-testid="filter-category">
                <option value="">{t('news.filter.all')}</option>
                {vm.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('cms.f.series')}>
              <select value={vm.seriesFilter ?? ''} onChange={(e) => vm.setSeriesFilter(e.target.value || null)} data-testid="filter-series">
                <option value="">{t('news.filter.all')}</option>
                {vm.series.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label={t('cms.f.source')}>
              <select value={vm.sourceFilter ?? ''} onChange={(e) => vm.setSourceFilter(e.target.value || null)} data-testid="filter-source">
                <option value="">{t('news.filter.all')}</option>
                {[...new Set([...vm.sources, ...(vm.sourceFilter ? [vm.sourceFilter] : [])])].map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </Field>
            <Field label={t('cms.f.origin')}>
              <select value={vm.originFilter ?? ''} onChange={(e) => vm.setOriginFilter(ORIGINS.find((o) => o.id === e.target.value)?.id ?? null)} data-testid="filter-origin">
                {ORIGINS.map((o) => <option key={o.id ?? 'all'} value={o.id ?? ''}>{t(o.label)}</option>)}
              </select>
            </Field>
            <Field label={t('news.searchLabel')}><input value={vm.query} maxLength={80} onChange={(e) => vm.setQuery(e.target.value)} /></Field>
            <SkButton type="submit" variant="secondary"><Icon name="search" size={16} />{t('news.search')}</SkButton>
          </form>
          <DataTable variant="plain" caption={t('news.adm.title')} title={t('news.adm.queue')} actionsLabel={t('news.adm.col.actions')}
            columns={[{ label: t('news.adm.col.post') }, { label: t('news.adm.col.template'), width: '170px' }, { label: t('news.adm.col.status'), width: '170px' }, { label: t('news.adm.col.updated'), width: '150px', align: 'end' }]}
            rows={rows} emptyMessage={{ title: t('news.empty'), body: t('news.adm.emptyBody') }} />
          <p className="sk-gov-fine"><Icon name="alert-triangle" size={16} /> {t('news.adm.noAi')}</p>
        </div>
      );
    }
  })();

  return (
    <div className="sk-ds sk-admin-page sk-gov sk-posts" data-testid="posts-admin">
      <ConsolePageHeader eyebrow={t(review ? 'news.adm.rev.eyebrow' : 'news.adm.eyebrow')} title={t(review ? 'news.adm.rev.title' : 'news.adm.title')}
        subtitle={t(review ? 'news.adm.rev.subtitle' : 'news.adm.subtitle')}
        actions={!review && !vm.editing && tab === 'posts' ? <SkButton onClick={() => vm.startNew()} data-testid="post-new"><Icon name="plus" size={16} />{t('news.adm.new')}</SkButton> : undefined} />
      {!review && !vm.editing ? (
        <div role="tablist" aria-label={t('autopilot.tabsAria')} className="sk-gov-toolbar sk-posts-tabs">
          {ADMIN_TABS.map((item) => (
            <SkButton key={item.id} role="tab" aria-selected={tab === item.id} variant={tab === item.id ? 'primary' : 'secondary'} onClick={() => setTab(item.id)} data-testid={`posts-tab-${item.id}`}>
              <Icon name={item.icon} size={16} />{t(item.label)}
            </SkButton>
          ))}
        </div>
      ) : null}
      {body}
      <BoardToast message={vm.notice ? t(NOTICE[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});

/** Super admin console (`admin/posts`). */
export function AdminPostsScreen(): React.ReactElement {
  return <PostsAdminView console="admin" />;
}

/** Clinician console (`clinician/post-reviews`). */
export function ClinicianPostReviewsScreen(): React.ReactElement {
  const t = useT();
  return (
    <ClinicianConsoleFrame current="post-reviews" context={t('news.adm.rev.title')}>
      <PostsAdminView console="review" />
    </ClinicianConsoleFrame>
  );
}
