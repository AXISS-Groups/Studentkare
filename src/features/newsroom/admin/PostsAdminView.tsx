import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, DataTable, SkButton, StatusPill } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIcon3dName } from '@/design-system/icons';
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
import type { Console, Notice, ReviewFilter } from '../viewmodel/PostsAdminViewModel';
import { PostArticle } from '../views/PostPage';
import { PostCover } from '../views/PostCover';
import { ClinicianConsoleFrame } from '@/features/clinician/shared/ClinicianConsoleFrame';
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
};
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
  const words = [d.title, d.summary, ...vm.draft.body.map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : ''))].join(' ').split(/\s+/).filter(Boolean).length;
  return {
    id: vm.open?.id ?? 'preview', slug: d.slug, section: spec.section, template: d.template, title: d.title, summary: d.summary, tags: d.tags.filter(Boolean),
    coverAlt: d.coverAlt, coverArt: d.coverArt || null, author: { name: authorName }, publishedAt: new Date().toISOString(), updatedAt: null,
    featured: d.featured, readingMinutes: Math.max(1, Math.ceil(words / 200)), reviewed: vm.open?.review?.current ? { by: vm.open.review.by, on: new Date(vm.open.review.at * 1000).toISOString() } : null,
    sample: vm.open?.sample ?? false, path: `/${spec.section}/${d.slug}`, ogImage: '', body: vm.previewBody, seoTitle: d.seoTitle || d.title,
    seoDescription: d.seoDescription || d.summary, related: [],
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

const PublishCard = observer(function PublishCard({ vm }: { vm: PostsAdminViewModel }) {
  const t = useT();
  const { lang } = useLanguage();
  const post = vm.open;
  if (!post) return <BoardNote icon="info">{t('news.adm.saveFirst')}</BoardNote>;
  const spec = TEMPLATES[post.template];
  const pill = STATUS[post.status];
  return (
    <GovCard title={t('news.adm.publishTitle')} aside={<span data-testid="post-status"><StatusPill tone={pill.tone}>{t(pill.label)}</StatusPill></span>}>
      <p className="sk-gov-text">
        <Icon name={post.live ? 'eye' : 'eye-off'} size={16} /> {t(post.live ? 'news.adm.live' : 'news.adm.notLive')}
        {post.live ? <> · <a href={post.path} target="_blank" rel="noopener noreferrer">{post.path}</a></> : null}
      </p>
      {post.status === 'SCHEDULED' && post.publishAt ? <p className="sk-gov-fine">{t('news.adm.scheduledFor', { at: when(post.publishAt) })}</p> : null}
      {spec.review ? (
        post.review?.current
          ? <BoardNote icon="shield-check">{t('news.adm.reviewCurrent', { name: post.review.by, date: formatDate(new Date(post.review.at * 1000).toISOString(), lang) })}</BoardNote>
          : post.review
            ? <BoardNote icon="alert-triangle" tone="attention">{t('news.adm.reviewStale', { name: post.review.by })}</BoardNote>
            : <BoardNote icon="stethoscope" tone="attention">{t('news.adm.reviewNeeded')}</BoardNote>
      ) : null}
      {post.blockedBy ? <p className="sk-gov-fine" data-testid="post-blocked"><Icon name="info" size={14} /> {t('news.adm.blocked', { reason: post.blockedBy })}</p> : null}
      {vm.dirty ? <p className="sk-gov-fine"><Icon name="pencil" size={14} /> {t('news.adm.unsaved')}</p> : null}
      <Field label={t('news.adm.scheduleAt')} hint={t('news.adm.scheduleHint')}>
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

const Preview = observer(function Preview({ vm, authorName }: { vm: PostsAdminViewModel; authorName: string }) {
  const t = useT();
  return (
    <section className="sk-posts-preview" aria-label={t('news.adm.preview')} data-testid="post-preview">
      <p className="sk-posts-preview__bar"><Icon name="eye" size={16} />{t('news.adm.preview')}<span>{t('news.adm.previewNote')}</span></p>
      <div className="sk-news sk-posts-preview__page">
        <PostArticle post={previewPost(vm, authorName)} onOpen={() => undefined} />
      </div>
    </section>
  );
});

const Editor = observer(function Editor({ vm }: { vm: PostsAdminViewModel }) {
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
          <label className="sk-posts-check"><input type="checkbox" checked={d.featured} onChange={(e) => vm.update({ featured: e.target.checked })} />{t('news.adm.f.featured')}</label>
        </GovCard>

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

        <PublishCard vm={vm} />
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
 * Super admin, Posts (`admin/posts`) and the clinician's Health tip reviews
 * (`clinician/post-reviews`): the AdminPosts screen. Every change is audited by
 * the server and listed under History. Nothing on this screen is written by AI.
 */
export const PostsAdminView = observer(function PostsAdminView({ console: where }: { console: Console }) {
  const t = useT();
  const [vm] = useState(() => new PostsAdminViewModel(where));
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);

  if (vm.phase === 'loading' && !vm.items.length && !vm.editing) return <BoardLoading label={t('news.adm.loading')} />;
  if (vm.phase === 'error' && !vm.editing) return <BoardFailure t={t} what={t('news.adm.what')} screen="AdminPosts" onRetry={() => void vm.load()} />;

  const review = where === 'review';
  const rows: DataTableRow[] = vm.items.map((post) => {
    const pill = rowPill(post);
    return {
      id: post.id,
      muted: post.status === 'UNPUBLISHED',
      cells: [
        { text: post.title, weight: 'strong', sub: post.path },
        { text: t(TEMPLATES[post.template].label) },
        { pill: { label: t(pill.label), tone: pill.tone } },
        { text: when(post.updatedAt), weight: 'muted', mono: true },
      ],
      actions: [{ label: t(review ? 'news.adm.rev.open' : 'news.adm.open'), icon: review ? 'stethoscope' : 'pencil', onSelect: () => void vm.openPost(post.id), accessibleLabel: t('news.adm.openSpoken', { title: post.title }) }],
    };
  });

  return (
    <div className="sk-ds sk-admin-page sk-gov sk-posts" data-testid="posts-admin">
      <ConsolePageHeader eyebrow={t(review ? 'news.adm.rev.eyebrow' : 'news.adm.eyebrow')} title={t(review ? 'news.adm.rev.title' : 'news.adm.title')}
        subtitle={t(review ? 'news.adm.rev.subtitle' : 'news.adm.subtitle')}
        actions={!review && !vm.editing ? <SkButton onClick={() => vm.startNew()} data-testid="post-new"><Icon name="plus" size={16} />{t('news.adm.new')}</SkButton> : undefined} />
      {vm.editing ? (review ? <ReviewPanel vm={vm} /> : <Editor vm={vm} />) : (
        <div className="sk-gov-stack">
          {vm.error ? <FormError message={vm.error} /> : null}
          {review ? (
            <div role="tablist" aria-label={t('news.adm.filterAria')} className="sk-gov-toolbar">
              {REVIEW_FILTERS.map((f) => (
                <SkButton key={f.id} role="tab" aria-selected={vm.reviewFilter === f.id} variant={vm.reviewFilter === f.id ? 'primary' : 'secondary'} onClick={() => vm.setReviewFilter(f.id)}>{t(f.label)}</SkButton>
              ))}
            </div>
          ) : (
            <>
              <div role="tablist" aria-label={t('news.adm.filterAria')} className="sk-gov-toolbar">
                {STATUS_FILTERS.map((s) => (
                  <SkButton key={s ?? 'all'} role="tab" aria-selected={vm.statusFilter === s} variant={vm.statusFilter === s ? 'primary' : 'secondary'} onClick={() => vm.setStatusFilter(s)} data-testid={`posts-filter-${s ?? 'ALL'}`}>
                    {t(s ? STATUS[s].label : 'news.filter.all')}
                  </SkButton>
                ))}
              </div>
              <form className="sk-gov-toolbar" role="search" onSubmit={(e) => { e.preventDefault(); void vm.load(); }}>
                <Field label={t('news.adm.f.templateFilter')}>
                  <select value={vm.templateFilter ?? ''} onChange={(e) => vm.setTemplateFilter(TEMPLATE_ORDER.find((tpl) => tpl === e.target.value) ?? null)}>
                    <option value="">{t('news.filter.all')}</option>
                    {TEMPLATE_ORDER.map((tpl) => <option key={tpl} value={tpl}>{t(TEMPLATES[tpl].label)}</option>)}
                  </select>
                </Field>
                <Field label={t('news.searchLabel')}><input value={vm.query} maxLength={80} onChange={(e) => vm.setQuery(e.target.value)} /></Field>
                <SkButton type="submit" variant="secondary"><Icon name="search" size={16} />{t('news.search')}</SkButton>
              </form>
            </>
          )}
          <DataTable variant="plain" caption={t(review ? 'news.adm.rev.title' : 'news.adm.title')} title={t(review ? 'news.adm.rev.queue' : 'news.adm.queue')} actionsLabel={t('news.adm.col.actions')}
            columns={[{ label: t('news.adm.col.post') }, { label: t('news.adm.col.template'), width: '150px' }, { label: t('news.adm.col.status'), width: '170px' }, { label: t('news.adm.col.updated'), width: '160px', align: 'end' }]}
            rows={rows} emptyMessage={{ title: t('news.empty'), body: t(review ? 'news.adm.rev.emptyBody' : 'news.adm.emptyBody') }} />
          <p className="sk-gov-fine"><Icon name="alert-triangle" size={16} /> {t('news.adm.noAi')}</p>
        </div>
      )}
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
