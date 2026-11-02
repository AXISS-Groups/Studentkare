import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DataTable, SkButton } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';
import { Field, FormError } from '@/components/interface/WorkflowUI';
import { BoardNote, BoardToast } from '@/features/admin/views/AdminBoard';
import { BoardFailure, BoardLoading, GovCard, GovPill } from '@/features/admin/views/GovBoard';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { mediaUrl } from '../data/NewsroomRepository';
import type { AdminPost, PrecisionReport } from '../data/NewsroomRepository';
import type { Category, LibraryEntry, Series, ShareChannel, ShareLinkChannel } from '../data/ContentRepository';
import { TEMPLATES, TEMPLATE_ORDER } from '../model/templates';
import { ContentAdminViewModel, splitList } from '../viewmodel/ContentAdminViewModel';
import type { ContentNotice } from '../viewmodel/ContentAdminViewModel';
import type { PostsAdminViewModel } from '../viewmodel/PostsAdminViewModel';
import './posts-admin.css';

type Translate = ReturnType<typeof useT>;

const REASON: Readonly<Record<string, MessageKey>> = {
  NOT_IN_SOURCE: 'cms.reason.NOT_IN_SOURCE', NEW_NUMBER: 'cms.reason.NEW_NUMBER', NEW_NAME: 'cms.reason.NEW_NAME',
  ADVICE: 'cms.reason.ADVICE', UNVERIFIABLE: 'cms.reason.UNVERIFIABLE', SOURCE_NOT_ALLOWED: 'cms.reason.SOURCE_NOT_ALLOWED',
  CRISIS: 'cms.reason.CRISIS', SOURCE_OLD: 'cms.reason.SOURCE_OLD', SOURCE_UNDATED: 'cms.reason.SOURCE_UNDATED', NOTHING_TO_CHECK: 'cms.reason.NOTHING_TO_CHECK',
};
const NOTICE: Readonly<Record<ContentNotice, MessageKey>> = {
  categorySaved: 'cms.notice.categorySaved', categoryArchived: 'cms.notice.categoryArchived', categoryRestored: 'cms.notice.categoryRestored',
  seriesSaved: 'cms.notice.seriesSaved', seriesArchived: 'cms.notice.seriesArchived', seriesRestored: 'cms.notice.seriesRestored',
  captionCopied: 'cms.notice.captionCopied', copyFailed: 'cms.notice.copyFailed',
};
const CHANNEL: Readonly<Record<ShareChannel, MessageKey>> = {
  linkedin: 'cms.share.name.linkedin', whatsapp: 'cms.share.name.whatsapp', x: 'cms.share.name.x', facebook: 'cms.share.name.facebook',
  telegram: 'cms.share.name.telegram', email: 'cms.share.name.email', copy: 'cms.share.name.copy', native: 'cms.share.name.native',
};
const LINK_ICON: Readonly<Record<ShareLinkChannel, SkIconName | null>> = {
  linkedin: 'brand-linkedin', whatsapp: 'message-circle-2', x: 'x-2', facebook: null, telegram: null, email: 'mail',
};
const LINK_ORDER: readonly ShareLinkChannel[] = ['linkedin', 'whatsapp', 'x', 'facebook', 'telegram', 'email'];
const HUE_LABEL: Readonly<Record<ServiceHue, MessageKey>> = {
  indigo: 'cms.hue.indigo', violet: 'cms.hue.violet', blue: 'cms.hue.blue', sky: 'cms.hue.sky', teal: 'cms.hue.teal',
  green: 'cms.hue.green', amber: 'cms.hue.amber', orange: 'cms.hue.orange', rose: 'cms.hue.rose',
};

function reasonText(t: Translate, code: string): string {
  return REASON[code] ? t(REASON[code]) : code;
}

/** The precision gate's report on an auto post: the score, the source checks, and each sentence (failed ones highlighted). */
export function PrecisionCard({ report }: { report: PrecisionReport }): React.ReactElement {
  const t = useT();
  return (
    <GovCard title={t('cms.precision.title')} aside={<GovPill tone={report.passed ? 'positive' : 'attention'}>{t('cms.precision.score', { n: report.score, min: report.threshold })}</GovPill>}>
      <p className="sk-gov-fine"><Icon name="shield-check" size={14} /> {t('cms.precision.rule')}</p>
      {report.source.length ? (
        <BoardNote icon="alert-triangle" tone="attention">{report.source.map((c) => reasonText(t, c)).join(' · ')}</BoardNote>
      ) : null}
      <ol className="sk-cms-sentences" data-testid="precision-sentences">
        {report.sentences.map((s, i) => (
          <li key={`${i}-${s.text}`} className="sk-cms-sentence" data-ok={s.ok ? 'true' : 'false'}>
            <Icon name={s.ok ? 'check-circle' : 'alert-triangle'} size={16} />
            <span>
              <span className="sk-cms-sentence__text">{s.text}</span>
              {s.ok ? null : <span className="sk-cms-sentence__why">{s.reasons.map((r) => reasonText(t, r)).join(' · ')}</span>}
            </span>
          </li>
        ))}
      </ol>
    </GovCard>
  );
}

function holdLabel(post: AdminPost): { label: MessageKey; tone: SkTone } {
  if (post.holdReason === 'PRECISION') return { label: 'cms.review.imprecise', tone: 'attention' };
  if (post.needsReview && !post.review?.current) return { label: 'cms.review.clinician', tone: 'attention' };
  return { label: 'cms.review.editor', tone: 'action' };
}

/** Content, Review: auto drafts held for the super admin (imprecise, or auto-publish off) and posts waiting for a clinician. */
export const ReviewQueue = observer(function ReviewQueue({ vm }: { vm: PostsAdminViewModel }) {
  const t = useT();
  if (vm.phase === 'loading' && !vm.items.length) return <BoardLoading label={t('news.adm.loading')} />;
  return (
    <div className="sk-gov-stack" data-testid="content-review">
      <p className="sk-gov-text">{t('cms.review.intro')}</p>
      {vm.error ? <FormError message={vm.error} /> : null}
      {!vm.items.length ? (
        <BoardNote icon="inbox">{t('cms.review.empty')}</BoardNote>
      ) : vm.items.map((post) => {
        const hold = holdLabel(post);
        const clinician = post.needsReview && !post.review?.current;
        return (
          <GovCard key={post.id} title={post.title} aside={<GovPill tone={hold.tone}>{t(hold.label)}</GovPill>}>
            <p className="sk-gov-fine">
              {t(TEMPLATES[post.template].label)}{post.auto ? ` · ${t('autopilot.auto')}` : ''}
              {post.category ? ` · ${post.category.name}` : ''}{post.source ? ` · ${post.source.name}` : ''}
            </p>
            {post.precisionReport && !post.precisionReport.passed ? <PrecisionCard report={post.precisionReport} /> : null}
            {clinician ? <BoardNote icon="stethoscope" tone="attention">{t('cms.review.clinicianNote')}</BoardNote> : null}
            <div className="sk-gov-toolbar">
              <SkButton variant="secondary" onClick={() => void vm.openPost(post.id)} data-testid={`review-open-${post.id}`}><Icon name="pencil" size={16} />{t('cms.review.open')}</SkButton>
              {!clinician ? (
                <SkButton onClick={() => void vm.publishRow(post.id)} disabled={vm.busy} data-testid={`review-publish-${post.id}`}><Icon name="upload" size={16} />{t('cms.review.publish')}</SkButton>
              ) : null}
              {post.status === 'SCHEDULED' ? (
                <SkButton variant="secondary" onClick={() => void vm.unpublishRow(post.id)} disabled={vm.busy}><Icon name="eye-off" size={16} />{t('news.adm.unpublish')}</SkButton>
              ) : null}
            </div>
          </GovCard>
        );
      })}
    </div>
  );
});

function HueSwatch({ hue }: { hue: string }): React.ReactElement {
  return <span className="sk-cms-swatch" data-hue={hue} aria-hidden="true" />;
}

const CategoryForm = observer(function CategoryForm({ vm }: { vm: ContentAdminViewModel }) {
  const t = useT();
  const d = vm.categoryDraft;
  if (!d) return null;
  const current = vm.categories.find((c) => c.id === vm.editingCategory);
  return (
    <GovCard title={t(vm.editingCategory ? 'cms.cat.edit' : 'cms.cat.new')}>
      <form className="sk-gov-stack" onSubmit={(e) => { e.preventDefault(); void vm.saveCategory(); }} data-testid="category-form">
        <div className="wf-form-grid">
          <Field label={t('cms.cat.name')}><input value={d.name} maxLength={60} onChange={(e) => vm.updateCategory({ name: e.target.value })} data-testid="category-name" /></Field>
          <Field label={t('cms.cat.hue')}>
            <select value={d.hue} onChange={(e) => { const hue = vm.hues.find((h) => h === e.target.value); if (hue) vm.updateCategory({ hue }); }}>
              {vm.hues.map((h) => <option key={h} value={h}>{t(HUE_LABEL[h])}</option>)}
            </select>
          </Field>
        </div>
        <fieldset className="sk-cms-icons">
          <legend className="sk-gov-fine">{t('cms.cat.icon')}</legend>
          {vm.icons.map((icon) => (
            <label key={icon} className="sk-cms-icon" data-checked={d.icon === icon ? 'true' : undefined}>
              <input type="radio" name="category-icon" checked={d.icon === icon} onChange={() => vm.updateCategory({ icon })} aria-label={icon} />
              <Icon name={icon} size={20} />
            </label>
          ))}
        </fieldset>
        <Field label={t('cms.cat.hashtags')} hint={t('cms.cat.hashtagsHint')}><input value={d.hashtags.join(', ')} onChange={(e) => vm.updateCategory({ hashtags: splitList(e.target.value) })} /></Field>
        <Field label={t('cms.cat.keywords')} hint={t('cms.cat.keywordsHint')}><input value={d.keywords.join(', ')} onChange={(e) => vm.updateCategory({ keywords: splitList(e.target.value) })} /></Field>
        <Field label={t('cms.cat.topics')} hint={t('cms.cat.topicsHint')}><input value={d.topics.join(', ')} onChange={(e) => vm.updateCategory({ topics: splitList(e.target.value) })} /></Field>
        <label className="sk-posts-check"><input type="checkbox" checked={d.clinical} disabled={current?.protected} onChange={(e) => vm.updateCategory({ clinical: e.target.checked })} />{t('cms.cat.clinical')}</label>
        <label className="sk-posts-check"><input type="checkbox" checked={d.crisisLines} disabled={current?.protected} onChange={(e) => vm.updateCategory({ crisisLines: e.target.checked })} />{t('cms.cat.crisis')}</label>
        {current?.protected ? <p className="sk-gov-fine"><Icon name="lock" size={14} /> {t('cms.cat.protected')}</p> : null}
        <div className="sk-gov-toolbar">
          <SkButton type="submit" busy={vm.busy} disabled={vm.busy || d.name.trim().length < 2} data-testid="category-save"><Icon name="check" size={16} />{t('cms.save')}</SkButton>
          <SkButton variant="secondary" onClick={vm.closeCategory}>{t('cms.cancel')}</SkButton>
        </div>
      </form>
    </GovCard>
  );
});

function categoryRows(t: Translate, vm: ContentAdminViewModel): DataTableRow[] {
  return vm.categories.map((c: Category) => ({
    id: c.id,
    muted: c.archived,
    cells: [
      { node: <span className="sk-cms-name"><HueSwatch hue={c.hue} /><Icon name={c.icon} size={18} /><strong>{c.name}</strong><span className="sk-gov-fine">{c.id}</span></span> },
      { text: [c.clinical ? t('cms.cat.clinicalShort') : '', c.crisisLines ? t('cms.cat.crisisShort') : ''].filter(Boolean).join(' · ') || '—' },
      { text: c.hashtags.map((h) => `#${h}`).join(' ') || '—', weight: 'muted' },
      { text: String(c.posts), mono: true },
      { pill: { label: t(c.archived ? 'cms.archived' : 'cms.active'), tone: c.archived ? 'neutral' : 'positive' } },
    ],
    actions: [
      { label: t('cms.edit'), icon: 'pencil', onSelect: () => vm.editCategory(c), accessibleLabel: t('cms.editSpoken', { name: c.name }) },
      ...(c.protected ? [] : [{ label: t(c.archived ? 'cms.restore' : 'cms.archive'), icon: (c.archived ? 'rotate-ccw' : 'eye-off') as SkIconName,
        onSelect: () => void vm.archiveCategory(c.id, !c.archived), accessibleLabel: t(c.archived ? 'cms.restoreSpoken' : 'cms.archiveSpoken', { name: c.name }), disabled: vm.busy }]),
    ],
  }));
}

/** Content, Categories: create, rename, colour, icon, hashtags, the aggregator's keywords, archive. */
export const CategoriesView = observer(function CategoriesView({ onChanged }: { onChanged?: () => void }) {
  const t = useT();
  const [vm] = useState(() => new ContentAdminViewModel());
  useEffect(() => { void vm.loadCategories(); return () => vm.dispose(); }, [vm]);
  useEffect(() => { if (vm.notice) onChanged?.(); }, [vm.notice, onChanged]);
  if (vm.phase === 'loading' && !vm.categories.length) return <BoardLoading label={t('cms.loading')} />;
  if (vm.phase === 'error') return <BoardFailure t={t} what={t('cms.cat.what')} screen="AdminPosts" onRetry={() => void vm.loadCategories()} />;
  return (
    <div className="sk-gov-stack" data-testid="content-categories">
      <div className="sk-gov-toolbar">
        <p className="sk-gov-text">{t('cms.cat.intro')}</p>
        <span className="sk-psite-spacer" />
        <SkButton onClick={vm.newCategory} data-testid="category-new"><Icon name="plus" size={16} />{t('cms.cat.new')}</SkButton>
      </div>
      {vm.error !== null ? <FormError message={vm.error || t('cms.failed')} /> : null}
      <CategoryForm vm={vm} />
      <DataTable variant="plain" caption={t('cms.tab.categories')} title={t('cms.tab.categories')} actionsLabel={t('news.adm.col.actions')}
        columns={[{ label: t('cms.cat.name') }, { label: t('cms.cat.rules'), width: '170px' }, { label: t('cms.cat.hashtags'), width: '200px' },
          { label: t('cms.cat.posts'), width: '80px', align: 'end' }, { label: t('news.adm.col.status'), width: '120px' }]}
        rows={categoryRows(t, vm)} emptyMessage={{ title: t('cms.cat.empty'), body: t('cms.cat.intro') }} />
      <BoardToast message={vm.notice ? t(NOTICE[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});

const LibraryEditor = observer(function LibraryEditor({ vm }: { vm: ContentAdminViewModel }) {
  const t = useT();
  const lines = vm.seriesDraft?.library ?? [];
  return (
    <fieldset className="sk-posts-block">
      <legend className="sk-posts-block__legend"><Icon name="sun" size={16} />{t('cms.series.library')}</legend>
      <p className="sk-gov-fine"><Icon name="shield-check" size={14} /> {t('cms.series.libraryRule')}</p>
      {lines.map((line: LibraryEntry, index) => (
        <div key={`line-${index}`} className="sk-cms-line" data-testid={`library-line-${index}`}>
          <Field label={t('cms.series.lineKind')}>
            <select value={line.kind} onChange={(e) => vm.updateLine(index, { kind: e.target.value === 'quote' ? 'quote' : 'own' })}>
              <option value="own">{t('cms.series.own')}</option>
              <option value="quote">{t('cms.series.quote')}</option>
            </select>
          </Field>
          <Field label={t('cms.series.lineText')}><textarea rows={2} maxLength={300} value={line.text} onChange={(e) => vm.updateLine(index, { text: e.target.value })} /></Field>
          {line.kind === 'quote' ? (
            <>
              <div className="wf-form-grid">
                <Field label={t('cms.series.cite')}><input value={line.cite} maxLength={120} onChange={(e) => vm.updateLine(index, { cite: e.target.value })} /></Field>
                <Field label={t('cms.series.sourceUrl')} hint={t('cms.series.sourceUrlHint')}><input type="url" value={line.sourceUrl} maxLength={500} onChange={(e) => vm.updateLine(index, { sourceUrl: e.target.value })} /></Field>
              </div>
              <label className="sk-posts-check"><input type="checkbox" checked={line.publicDomain} onChange={(e) => vm.updateLine(index, { publicDomain: e.target.checked })} />{t('cms.series.publicDomain')}</label>
            </>
          ) : null}
          <div className="sk-posts-block__tools">
            <SkButton variant="secondary" onClick={() => vm.removeLine(index)} aria-label={t('cms.series.removeLine')}><Icon name="trash" size={16} /></SkButton>
          </div>
        </div>
      ))}
      <SkButton variant="secondary" onClick={vm.addLine} data-testid="library-add"><Icon name="plus" size={16} />{t('cms.series.addLine')}</SkButton>
    </fieldset>
  );
});

const SeriesForm = observer(function SeriesForm({ vm }: { vm: ContentAdminViewModel }) {
  const t = useT();
  const d = vm.seriesDraft;
  if (!d) return null;
  const current = vm.series.find((s) => s.id === vm.editingSeries);
  return (
    <GovCard title={t(vm.editingSeries ? 'cms.series.edit' : 'cms.series.new')}>
      <form className="sk-gov-stack" onSubmit={(e) => { e.preventDefault(); void vm.saveSeries(); }} data-testid="series-form">
        <div className="wf-form-grid">
          <Field label={t('cms.series.name')}><input value={d.name} maxLength={80} onChange={(e) => vm.updateSeries({ name: e.target.value })} data-testid="series-name" /></Field>
          <Field label={t('cms.series.category')}>
            <select value={d.categoryId} onChange={(e) => vm.updateSeries({ categoryId: e.target.value })}>
              <option value="">{t('cms.none')}</option>
              {vm.categories.filter((c) => !c.archived || c.id === d.categoryId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t('cms.series.template')}>
            <select value={d.template} onChange={(e) => { const tpl = TEMPLATE_ORDER.find((x) => x === e.target.value); if (tpl) vm.setSeriesTemplate(tpl); }}>
              {TEMPLATE_ORDER.map((tpl) => <option key={tpl} value={tpl}>{t(TEMPLATES[tpl].label)}</option>)}
            </select>
          </Field>
          <Field label={t('cms.series.hue')}>
            <select value={d.hue} onChange={(e) => { const hue = vm.hues.find((h) => h === e.target.value); if (hue) vm.updateSeries({ hue }); }}>
              {vm.hues.map((h) => <option key={h} value={h}>{t(HUE_LABEL[h])}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t('cms.series.summary')}><textarea rows={2} maxLength={300} value={d.summary} onChange={(e) => vm.updateSeries({ summary: e.target.value })} /></Field>
        {current?.autopilotKey ? <p className="sk-gov-fine"><Icon name="calendar" size={14} /> {t('cms.series.scheduleInSettings')}</p> : null}
        {d.template === 'MOTIVATION' || current?.autopilotKey === 'motivation' ? <LibraryEditor vm={vm} /> : null}
        <div className="sk-gov-toolbar">
          <SkButton type="submit" busy={vm.busy} disabled={vm.busy || d.name.trim().length < 2} data-testid="series-save"><Icon name="check" size={16} />{t('cms.save')}</SkButton>
          <SkButton variant="secondary" onClick={vm.closeSeries}>{t('cms.cancel')}</SkButton>
        </div>
      </form>
    </GovCard>
  );
});

function seriesRows(t: Translate, vm: ContentAdminViewModel): DataTableRow[] {
  return vm.series.map((s: Series) => ({
    id: s.id,
    muted: s.archived,
    cells: [
      { node: <span className="sk-cms-name"><HueSwatch hue={s.hue} /><Icon name="repeat" size={18} /><strong>{s.name}</strong><span className="sk-gov-fine">{s.path}</span></span> },
      { text: s.category?.name ?? '—' },
      { text: s.autopilotKey ? t(s.autopilotKey === 'motivation' ? 'cms.series.autoMotivation' : 'cms.series.autoHealth') : t('cms.series.manual') },
      { text: String(s.episodeCount), mono: true },
      { pill: { label: t(s.archived ? 'cms.archived' : 'cms.active'), tone: s.archived ? 'neutral' : 'positive' } },
    ],
    actions: [
      { label: t('cms.edit'), icon: 'pencil', onSelect: () => vm.editSeries(s), accessibleLabel: t('cms.editSpoken', { name: s.name }) },
      { label: t(s.archived ? 'cms.restore' : 'cms.archive'), icon: s.archived ? 'rotate-ccw' : 'eye-off', onSelect: () => void vm.archiveSeries(s.id, !s.archived),
        accessibleLabel: t(s.archived ? 'cms.restoreSpoken' : 'cms.archiveSpoken', { name: s.name }), disabled: vm.busy },
    ],
  }));
}

/** Content, Series: Monday Motivation, the health series and any series the team makes; each has its page at /series/{slug}. */
export const SeriesAdminView = observer(function SeriesAdminView({ onChanged }: { onChanged?: () => void }) {
  const t = useT();
  const [vm] = useState(() => new ContentAdminViewModel());
  useEffect(() => { void vm.loadSeries(); return () => vm.dispose(); }, [vm]);
  useEffect(() => { if (vm.notice) onChanged?.(); }, [vm.notice, onChanged]);
  if (vm.phase === 'loading' && !vm.series.length) return <BoardLoading label={t('cms.loading')} />;
  if (vm.phase === 'error') return <BoardFailure t={t} what={t('cms.series.what')} screen="AdminPosts" onRetry={() => void vm.loadSeries()} />;
  return (
    <div className="sk-gov-stack" data-testid="content-series">
      <div className="sk-gov-toolbar">
        <p className="sk-gov-text">{t('cms.series.intro')}</p>
        <span className="sk-psite-spacer" />
        <SkButton onClick={vm.newSeries} data-testid="series-new"><Icon name="plus" size={16} />{t('cms.series.new')}</SkButton>
      </div>
      <BoardNote icon="stethoscope" tone="attention">{t('cms.series.healthRule')}</BoardNote>
      {vm.error !== null ? <FormError message={vm.error || t('cms.failed')} /> : null}
      <SeriesForm vm={vm} />
      <DataTable variant="plain" caption={t('cms.tab.series')} title={t('cms.tab.series')} actionsLabel={t('news.adm.col.actions')}
        columns={[{ label: t('cms.series.name') }, { label: t('cms.series.category'), width: '160px' }, { label: t('cms.series.schedule'), width: '200px' },
          { label: t('cms.series.episodesShort'), width: '90px', align: 'end' }, { label: t('news.adm.col.status'), width: '120px' }]}
        rows={seriesRows(t, vm)} emptyMessage={{ title: t('cms.series.none'), body: t('cms.series.intro') }} />
      <BoardToast message={vm.notice ? t(NOTICE[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});

/** Content, Share kit: links per network (with UTM tags), the LinkedIn caption, and the two share cards to download. */
export const ShareKitView = observer(function ShareKitView({ postId }: { postId?: string }) {
  const t = useT();
  const [vm] = useState(() => new ContentAdminViewModel());
  useEffect(() => { void vm.loadShareKit(postId ?? ''); return () => vm.dispose(); }, [vm, postId]);
  if (vm.phase === 'loading' && !vm.kit) return <BoardLoading label={t('cms.loading')} />;
  if (vm.phase === 'error') return <BoardFailure t={t} what={t('cms.kit.what')} screen="AdminPosts" onRetry={() => void vm.loadShareKit()} />;
  const kit = vm.kit;
  return (
    <div className="sk-gov-stack" data-testid="content-share-kit">
      <p className="sk-gov-text">{t('cms.kit.intro')}</p>
      <Field label={t('cms.kit.post')}>
        <select value={vm.kitPostId} onChange={(e) => vm.pickPost(e.target.value)} data-testid="kit-post">
          {vm.posts.map((p) => <option key={p.id} value={p.id}>{p.live ? p.title : `${p.title} (${t('news.adm.notLive')})`}</option>)}
        </select>
      </Field>
      {!kit ? <BoardNote icon="info">{t('cms.kit.none')}</BoardNote> : (
        <>
          {!kit.live ? <BoardNote icon="eye-off" tone="attention">{t('cms.kit.notLive')}</BoardNote> : null}
          <div className="sk-gov-grid sk-gov-grid--halves">
            <GovCard title={t('cms.kit.caption')} aside={<Icon name="brand-linkedin" size={18} />}>
              <pre className="sk-cms-caption" data-testid="kit-caption">{kit.caption}</pre>
              <SkButton onClick={() => void vm.copyCaption()} data-testid="kit-copy-caption"><Icon name="copy" size={16} />{t('cms.kit.copyCaption')}</SkButton>
            </GovCard>
            <GovCard title={t('cms.kit.links')} aside={<Icon name="share" size={18} />}>
              <ul className="sk-cms-links">
                {LINK_ORDER.map((channel) => (
                  <li key={channel}>
                    <a href={kit.links[channel]} target={channel === 'email' ? undefined : '_blank'} rel="noopener noreferrer" data-testid={`kit-link-${channel}`}>
                      {LINK_ICON[channel] ? <Icon name={LINK_ICON[channel] ?? 'share'} size={16} /> : null}{t(CHANNEL[channel])}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="sk-gov-fine"><Icon name="lock" size={14} /> {t('cms.kit.plainLinks')}</p>
            </GovCard>
          </div>
          <GovCard title={t('cms.kit.cards')} aside={<Icon name="download" size={18} />}>
            <div className="sk-cms-cards">
              {(['landscape', 'portrait'] as const).map((fmt) => (
                <figure key={fmt} className={`sk-cms-card sk-cms-card--${fmt}`}>
                  <img src={mediaUrl(kit.cards[fmt])} alt={t(fmt === 'landscape' ? 'cms.kit.landscapeAlt' : 'cms.kit.portraitAlt')} loading="lazy" />
                  <figcaption>
                    <a className="sk-gov-link" href={mediaUrl(kit.cards[fmt])} download data-testid={`kit-download-${fmt}`}>
                      <Icon name="download" size={14} />{t(fmt === 'landscape' ? 'cms.kit.downloadLandscape' : 'cms.kit.downloadPortrait')}
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>
          </GovCard>
        </>
      )}
      <BoardToast message={vm.notice ? t(NOTICE[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});

/** Content, Analytics: views and shares per post, counts only (no reader, address or device is kept). */
export const AnalyticsView = observer(function AnalyticsView() {
  const t = useT();
  const [vm] = useState(() => new ContentAdminViewModel());
  useEffect(() => { void vm.loadStats(); return () => vm.dispose(); }, [vm]);
  if (vm.phase === 'loading' && !vm.stats.length) return <BoardLoading label={t('cms.loading')} />;
  if (vm.phase === 'error') return <BoardFailure t={t} what={t('cms.stats.what')} screen="AdminPosts" onRetry={() => void vm.loadStats()} />;
  const rows: DataTableRow[] = vm.stats.map((s) => ({
    id: s.postId,
    muted: s.status === 'UNPUBLISHED',
    cells: [
      { text: s.title, weight: 'strong', sub: s.path },
      { text: s.auto ? `${t(TEMPLATES[s.template].label)} · ${t('autopilot.auto')}` : t(TEMPLATES[s.template].label) },
      { text: String(s.views), mono: true },
      { text: String(s.sharesTotal), mono: true },
      { text: vm.channels.filter((c) => s.shares[c]).map((c) => `${t(CHANNEL[c])} ${s.shares[c] ?? 0}`).join(' · ') || '—', weight: 'muted' },
    ],
  }));
  return (
    <div className="sk-gov-stack" data-testid="content-analytics">
      <p className="sk-gov-fine"><Icon name="lock" size={14} /> {t('cms.stats.privacy')}</p>
      {!vm.statsEnabled ? <BoardNote icon="pause" tone="attention">{t('cms.stats.off')}</BoardNote> : null}
      <DataTable variant="plain" caption={t('cms.tab.analytics')} title={t('cms.tab.analytics')}
        columns={[{ label: t('news.adm.col.post') }, { label: t('news.adm.col.template'), width: '170px' }, { label: t('cms.stats.views'), width: '90px', align: 'end' },
          { label: t('cms.stats.shares'), width: '90px', align: 'end' }, { label: t('cms.stats.byNetwork'), width: '260px' }]}
        rows={rows} emptyMessage={{ title: t('cms.stats.empty'), body: t('cms.stats.emptyBody') }} />
    </div>
  );
});
