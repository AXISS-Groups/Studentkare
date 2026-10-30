import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DataTable, SkButton } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Field, FormError } from '@/components/interface/WorkflowUI';
import { BoardNote, BoardToast } from '@/features/admin/views/AdminBoard';
import { BoardFailure, BoardLoading, GovCard, GovPill } from '@/features/admin/views/GovBoard';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { AutopilotItem, AutopilotSource, AutopilotStatus } from '../data/AutopilotRepository';
import { formatDateTime } from '../model/share';
import { AutopilotViewModel } from '../viewmodel/AutopilotViewModel';
import type { AutopilotNotice, PendingChange, SettingValue } from '../viewmodel/AutopilotViewModel';
import './posts-admin.css';

type Translate = ReturnType<typeof useT>;

const NOTICE: Readonly<Record<AutopilotNotice, MessageKey>> = {
  saved: 'autopilot.notice.saved', ran: 'autopilot.notice.ran', checked: 'autopilot.notice.checked', stopped: 'autopilot.notice.stopped',
  resumed: 'autopilot.notice.resumed', published: 'autopilot.notice.published', unpublished: 'autopilot.notice.unpublished',
};
/** The settings this tab changes, and how each reads. A source's switch uses `autopilot.key.source`. */
const KEY_LABEL: Readonly<Record<string, MessageKey>> = {
  'autopilot.news_enabled': 'autopilot.key.autopilot.news_enabled',
  'autopilot.blog_enabled': 'autopilot.key.autopilot.blog_enabled',
  'autopilot.news_auto_publish': 'autopilot.key.autopilot.news_auto_publish',
  'autopilot.blog_auto_publish': 'autopilot.key.autopilot.blog_auto_publish',
  'autopilot.news_per_day': 'autopilot.key.autopilot.news_per_day',
  'autopilot.news_window_start_hour': 'autopilot.key.autopilot.news_window_start_hour',
  'autopilot.news_window_end_hour': 'autopilot.key.autopilot.news_window_end_hour',
  'autopilot.blog_posts_per_week': 'autopilot.key.autopilot.blog_posts_per_week',
  'autopilot.blog_days': 'autopilot.key.autopilot.blog_days',
  'autopilot.blog_hour': 'autopilot.key.autopilot.blog_hour',
  'autopilot.blog_topics': 'autopilot.key.autopilot.blog_topics',
  'autopilot.fetch_interval_minutes': 'cms.key.fetch_interval_minutes',
  'content.health_requires_clinician': 'cms.key.health_requires_clinician',
  'content.precision_threshold': 'cms.key.precision_threshold',
  'series.auto_publish': 'cms.key.series_auto_publish',
  'series.motivation.enabled': 'cms.key.motivation_enabled',
  'series.motivation.days': 'cms.key.motivation_days',
  'series.motivation.hour': 'cms.key.motivation_hour',
  'series.health.enabled': 'cms.key.health_enabled',
  'series.health.days': 'cms.key.health_days',
  'series.health.hour': 'cms.key.health_hour',
  'series.health.rota': 'cms.key.health_rota',
};
const SOURCE_KEY = /^autopilot\.source\.([a-z_]+)\.enabled$/;

function keyLabel(t: Translate, key: string, sources: readonly AutopilotSource[]): string {
  const source = SOURCE_KEY.exec(key)?.[1];
  if (source) return t('autopilot.key.source', { source: sources.find((s) => s.id === source)?.publisher ?? source });
  return KEY_LABEL[key] ? t(KEY_LABEL[key]) : key;
}

/** What an item's row says about it: posted and live, waiting (for whom), scheduled, taken down, skipped, failed. */
function itemState(item: AutopilotItem): { label: MessageKey; tone: SkTone } {
  const post = item.post;
  if (item.state === 'SKIPPED') return { label: 'autopilot.state.SKIPPED', tone: 'neutral' };
  if (item.state === 'FAILED') return { label: 'autopilot.state.FAILED', tone: 'attention' };
  if (!post) return { label: 'autopilot.state.SEEN', tone: 'neutral' };
  if (post.status === 'UNPUBLISHED') return { label: 'autopilot.state.UNPUBLISHED', tone: 'neutral' };
  if (post.live) return { label: 'autopilot.state.LIVE', tone: 'positive' };
  if (post.needsReview && !post.reviewCurrent) return { label: 'autopilot.state.CLINICIAN', tone: 'attention' };
  if (post.holdReason === 'PRECISION') return { label: 'cms.state.IMPRECISE', tone: 'attention' };
  if (post.status === 'SCHEDULED') return { label: 'autopilot.state.SCHEDULED', tone: 'action' };
  return { label: 'autopilot.state.HELD', tone: 'attention' };
}

function generatorLabel(generator: string): MessageKey | null {
  if (generator === 'rephrased') return 'autopilot.by.rephrased';
  if (generator === 'source') return 'autopilot.by.source';
  if (generator === 'extractive') return 'autopilot.by.extractive';
  if (generator.startsWith('fallback')) return 'autopilot.by.fallback';
  return null;
}

/** A labelled value with a Change button that opens the reasoned change form. */
function Line({ t, label, value, onEdit, words = false }: { t: Translate; label: string; value: string; onEdit?: () => void; words?: boolean }): React.ReactElement {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="sk-gov-setting sk-autopilot-line">
        <span className={words ? 'sk-autopilot-line__words' : 'sk-mono'}>{value}</span>
        {onEdit ? <button type="button" className="sk-gov-link" onClick={onEdit} aria-label={t('autopilot.editAria', { label })}><Icon name="pencil" size={14} />{t('autopilot.edit')}</button> : null}
      </dd>
    </div>
  );
}

/** On/off for one switch: the pill says what is in force, the button proposes the change. */
function Switch({ t, on, onToggle, testId }: { t: Translate; on: boolean; onToggle: () => void; testId: string }): React.ReactElement {
  return (
    <span className="sk-autopilot-switch">
      <GovPill tone={on ? 'positive' : 'neutral'} dot>{t(on ? 'autopilot.on' : 'autopilot.off')}</GovPill>
      <SkButton variant="secondary" onClick={onToggle} data-testid={testId}>
        <Icon name={on ? 'pause' : 'play'} size={16} />{t(on ? 'autopilot.turnOff' : 'autopilot.turnOn')}
      </SkButton>
    </span>
  );
}

const ChangeForm = observer(function ChangeForm({ vm, change, sources }: { vm: AutopilotViewModel; change: PendingChange; sources: readonly AutopilotSource[] }) {
  const t = useT();
  const label = keyLabel(t, change.key, sources);
  return (
    <GovCard title={t('autopilot.change.title')} aside={<Icon name="settings" size={18} />}>
      <form className="sk-gov-form" onSubmit={(e) => { e.preventDefault(); void vm.save(); }} data-testid="autopilot-change">
        <p className="sk-gov-text"><strong>{label}</strong></p>
        {change.kind === 'bool' ? (
          <p className="sk-gov-text"><GovPill tone={change.value ? 'positive' : 'neutral'}>{t(change.value ? 'autopilot.on' : 'autopilot.off')}</GovPill></p>
        ) : (
          <Field label={t('autopilot.change.value')}>
            <input type={change.kind === 'int' ? 'number' : 'text'} inputMode={change.kind === 'int' ? 'numeric' : undefined} step={1}
              value={String(change.value)} onChange={(e) => vm.setPendingValue(e.target.value)} data-testid="autopilot-change-value" />
          </Field>
        )}
        <Field label={t('autopilot.change.reason')}>
          <textarea required rows={2} maxLength={500} value={vm.reason} onChange={(e) => vm.setReason(e.target.value)} data-testid="autopilot-change-reason" />
        </Field>
        <div className="sk-gov-toolbar">
          <SkButton type="submit" busy={vm.busy} disabled={!vm.canSave} data-testid="autopilot-change-save"><Icon name="check" size={16} />{t('autopilot.change.save')}</SkButton>
          <SkButton variant="secondary" onClick={vm.cancel}>{t('autopilot.change.cancel')}</SkButton>
        </div>
      </form>
    </GovCard>
  );
});

const StopForm = observer(function StopForm({ vm }: { vm: AutopilotViewModel }) {
  const t = useT();
  return (
    <GovCard title={t('autopilot.stopTitle')} tone="danger" aside={<Icon name="shield-alert" size={18} />}>
      <form className="sk-gov-form" onSubmit={(e) => { e.preventDefault(); void vm.stop(); }} data-testid="autopilot-stop-form">
        <Field label={t('autopilot.stopReason')}>
          <textarea required rows={2} maxLength={500} value={vm.stopReason} onChange={(e) => vm.setStopReason(e.target.value)} data-testid="autopilot-stop-reason" />
        </Field>
        <label className="sk-posts-check"><input type="checkbox" checked={vm.takeDown} onChange={(e) => vm.setTakeDown(e.target.checked)} data-testid="autopilot-stop-takedown" />{t('autopilot.stopTakeDown')}</label>
        <div className="sk-gov-toolbar">
          <SkButton type="submit" variant="danger" busy={vm.busy} disabled={vm.busy || vm.stopReason.trim().length < 3} data-testid="autopilot-stop-confirm">
            <Icon name="shield-alert" size={16} />{t('autopilot.stopConfirm')}
          </SkButton>
          <SkButton variant="secondary" onClick={vm.closeStop}>{t('autopilot.change.cancel')}</SkButton>
        </div>
      </form>
    </GovCard>
  );
});

function Lanes({ vm, status }: { vm: AutopilotViewModel; status: AutopilotStatus }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const zone = status.timezone;
  const propose = (key: string, value: SettingValue, kind: PendingChange['kind']) => () => vm.propose(key, value, kind);
  return (
    <div className="sk-gov-grid sk-gov-grid--halves sk-autopilot-lanes">
      <GovCard title={t('autopilot.news.title')} aside={<Icon name="zap" size={18} />}>
        <Switch t={t} on={status.news.enabled} onToggle={propose('autopilot.news_enabled', !status.news.enabled, 'bool')} testId="autopilot-news-toggle" />
        <p className="sk-gov-text"><Icon name="clock" size={16} /> {t('autopilot.news.body', { n: status.news.perDay, start: status.news.windowStart, end: status.news.windowEnd, zone })}</p>
        <dl className="sk-gov-lines">
          <div>
            <dt>{t('autopilot.autoPublish')}<span className="sk-gov-fine"> · {t(status.news.autoPublish ? 'autopilot.news.autoOn' : 'autopilot.news.autoOff')}</span></dt>
            <dd><Switch t={t} on={status.news.autoPublish} onToggle={propose('autopilot.news_auto_publish', !status.news.autoPublish, 'bool')} testId="autopilot-news-autopublish" /></dd>
          </div>
          <Line t={t} label={t('autopilot.key.autopilot.news_per_day')} value={String(status.news.perDay)} onEdit={propose('autopilot.news_per_day', status.news.perDay, 'int')} />
          <Line t={t} label={t('autopilot.key.autopilot.news_window_start_hour')} value={`${status.news.windowStart}:00`} onEdit={propose('autopilot.news_window_start_hour', status.news.windowStart, 'int')} />
          <Line t={t} label={t('autopilot.key.autopilot.news_window_end_hour')} value={`${status.news.windowEnd}:00`} onEdit={propose('autopilot.news_window_end_hour', status.news.windowEnd, 'int')} />
        </dl>
        <p className="sk-gov-fine">{t('autopilot.news.today', { n: status.news.today, max: status.news.perDay })} · {t('autopilot.news.candidates', { n: status.news.candidates })}</p>
      </GovCard>
      <GovCard title={t('autopilot.blog.title')} aside={<Icon name="calendar" size={18} />}>
        <Switch t={t} on={status.blog.enabled} onToggle={propose('autopilot.blog_enabled', !status.blog.enabled, 'bool')} testId="autopilot-blog-toggle" />
        <p className="sk-gov-text"><Icon name="clock" size={16} /> {t('autopilot.blog.body', { n: status.blog.perWeek, days: status.blog.days.join(', '), hour: status.blog.hour, zone })}</p>
        <BoardNote icon="stethoscope" tone="attention">{t(status.precision?.healthRequiresClinician === false ? 'cms.lane.tipPrecise' : 'autopilot.blog.tipRule')}</BoardNote>
        <dl className="sk-gov-lines">
          <div>
            <dt>{t('autopilot.autoPublish')}<span className="sk-gov-fine"> · {t(status.blog.autoPublish ? 'autopilot.blog.autoOn' : 'autopilot.blog.autoOff')}</span></dt>
            <dd><Switch t={t} on={status.blog.autoPublish} onToggle={propose('autopilot.blog_auto_publish', !status.blog.autoPublish, 'bool')} testId="autopilot-blog-autopublish" /></dd>
          </div>
          <Line t={t} label={t('autopilot.key.autopilot.blog_posts_per_week')} value={String(status.blog.perWeek)} onEdit={propose('autopilot.blog_posts_per_week', status.blog.perWeek, 'int')} />
          <Line t={t} label={t('autopilot.key.autopilot.blog_days')} value={status.blog.days.join(',')} onEdit={propose('autopilot.blog_days', status.blog.days.join(','), 'text')} />
          <Line t={t} label={t('autopilot.key.autopilot.blog_hour')} value={`${status.blog.hour}:00`} onEdit={propose('autopilot.blog_hour', status.blog.hour, 'int')} />
          <Line t={t} words label={t('autopilot.blog.topics')} value={status.blog.topics.join(', ')} onEdit={propose('autopilot.blog_topics', status.blog.topics.join(','), 'text')} />
        </dl>
        <p className="sk-gov-fine">{t('autopilot.blog.topicsNote')}</p>
        {status.blog.upcoming.length ? (
          <p className="sk-gov-fine"><Icon name="calendar" size={14} /> {t('autopilot.blog.next', { list: status.blog.upcoming.map((at) => formatDateTime(at, lang, zone)).join(' · ') })}</p>
        ) : null}
      </GovCard>
    </div>
  );
}

const SERIES_KEYS: Readonly<Record<'motivation' | 'health', { days: MessageKey; hour: MessageKey; name: MessageKey }>> = {
  motivation: { days: 'cms.key.motivation_days', hour: 'cms.key.motivation_hour', name: 'cms.series.autoMotivation' },
  health: { days: 'cms.key.health_days', hour: 'cms.key.health_hour', name: 'cms.series.autoHealth' },
};

/** Monday Motivation and the health series (settings series.*), and the gate every auto post passes. */
function SeriesLanes({ vm, status }: { vm: AutopilotViewModel; status: AutopilotStatus }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const zone = status.timezone;
  const propose = (key: string, value: SettingValue, kind: PendingChange['kind']) => () => vm.propose(key, value, kind);
  return (
    <div className="sk-gov-grid sk-gov-grid--halves sk-autopilot-lanes" data-testid="autopilot-series">
      {status.series.map((s) => (
        <GovCard key={s.key} title={s.name || t(SERIES_KEYS[s.key].name)} aside={<Icon name={s.key === 'motivation' ? 'sun' : 'repeat'} size={18} />}>
          <Switch t={t} on={s.enabled} onToggle={propose(`series.${s.key}.enabled`, !s.enabled, 'bool')} testId={`autopilot-series-${s.key}`} />
          <p className="sk-gov-text"><Icon name="clock" size={16} /> {t('cms.lane.when', { days: s.days.join(', '), hour: s.hour, zone })}</p>
          <dl className="sk-gov-lines">
            <Line t={t} label={t(SERIES_KEYS[s.key].days)} value={s.days.join(',')} onEdit={propose(`series.${s.key}.days`, s.days.join(','), 'text')} />
            <Line t={t} label={t(SERIES_KEYS[s.key].hour)} value={`${s.hour}:00`} onEdit={propose(`series.${s.key}.hour`, s.hour, 'int')} />
            {s.key === 'health' ? <Line t={t} words label={t('cms.key.health_rota')} value={s.rota.join(', ')} onEdit={propose('series.health.rota', s.rota.join(','), 'text')} /> : null}
          </dl>
          {s.key === 'motivation'
            ? <p className="sk-gov-fine"><Icon name="shield-check" size={14} /> {t('cms.lane.library', { n: s.library })}</p>
            : <BoardNote icon="stethoscope" tone="attention">{t(status.precision.healthRequiresClinician ? 'cms.lane.healthClinician' : 'cms.lane.healthPrecise')}</BoardNote>}
          <p className="sk-gov-fine">{t('cms.lane.episodes', { n: s.episodes })}</p>
          {s.upcoming.length ? <p className="sk-gov-fine"><Icon name="calendar" size={14} /> {t('autopilot.blog.next', { list: s.upcoming.map((at) => formatDateTime(at, lang, zone)).join(' · ') })}</p> : null}
        </GovCard>
      ))}
      <GovCard title={t('cms.precision.gate')} aside={<Icon name="shield-check" size={18} />}>
        <p className="sk-gov-text">{t('cms.precision.gateBody')}</p>
        <dl className="sk-gov-lines">
          <Line t={t} label={t('cms.key.precision_threshold')} value={`${status.precision.threshold}%`} onEdit={propose('content.precision_threshold', status.precision.threshold, 'int')} />
          <div>
            <dt>{t('cms.key.health_requires_clinician')}</dt>
            <dd><Switch t={t} on={status.precision.healthRequiresClinician} onToggle={propose('content.health_requires_clinician', !status.precision.healthRequiresClinician, 'bool')} testId="autopilot-clinician-switch" /></dd>
          </div>
          <Line t={t} label={t('cms.key.fetch_interval_minutes')} value={String(status.fetchIntervalMinutes)} onEdit={propose('autopilot.fetch_interval_minutes', status.fetchIntervalMinutes, 'int')} />
        </dl>
        <p className="sk-gov-fine"><Icon name="phone-call" size={14} /> {t('cms.precision.crisis')}</p>
      </GovCard>
    </div>
  );
}

function sourceRows(t: Translate, vm: AutopilotViewModel, sources: readonly AutopilotSource[], lang: Parameters<typeof formatDateTime>[1], zone: string): DataTableRow[] {
  return sources.map((source) => {
    const health: { icon: SkIconName; text: string } = source.failures
      ? { icon: 'wifi-off', text: t('autopilot.health.failing', { error: source.lastError, n: source.failures }) }
      : source.lastOkAt ? { icon: 'check-circle', text: t('autopilot.health.ok', { n: source.lastItems }) }
        : { icon: 'activity', text: t('autopilot.health.never') };
    const action = t(source.enabled ? 'autopilot.disableSource' : 'autopilot.enableSource');
    return {
      id: source.id,
      muted: !source.url,
      cells: [
        { text: source.publisher, weight: 'strong', sub: source.url || source.id },
        { pill: { label: t(source.verified ? 'autopilot.verified' : 'autopilot.toVerify'), tone: source.verified ? 'positive' : 'attention' } },
        { pill: { label: t(source.enabled && source.url ? 'autopilot.on' : 'autopilot.off'), tone: source.enabled && source.url ? 'action' : 'neutral' } },
        { node: <span className="sk-autopilot-health" data-failing={source.failures ? 'true' : undefined}><Icon name={health.icon} size={14} />{health.text}</span> },
        { text: formatDateTime(source.lastFetchAt, lang, zone) || '—', weight: 'muted', mono: true },
      ],
      actions: source.url ? [{
        label: action, icon: source.enabled ? 'pause' : 'play', accessibleLabel: t('autopilot.sourceAria', { action, source: source.publisher }),
        onSelect: () => vm.propose(`autopilot.source.${source.id}.enabled`, !source.enabled, 'bool'), disabled: vm.busy,
      }] : [],
    };
  });
}

function itemRows(t: Translate, vm: AutopilotViewModel, rows: readonly AutopilotItem[], lang: Parameters<typeof formatDateTime>[1], zone: string): DataTableRow[] {
  return rows.map((item) => {
    const state = itemState(item);
    const by = generatorLabel(item.generator);
    const post = item.post;
    const title = item.title || item.topic;
    const actions: DataTableRow['actions'] = [];
    if (post && !post.live && post.status === 'DRAFT' && !post.needsReview) {
      actions.push({ label: t('autopilot.publish'), icon: 'upload', variant: 'primary', onSelect: () => void vm.publish(post.id), disabled: vm.busy,
        accessibleLabel: t('autopilot.rowAria', { action: t('autopilot.publish'), title }) });
    }
    if (post && (post.status === 'PUBLISHED' || post.status === 'SCHEDULED')) {
      actions.push({ label: t('autopilot.unpublish'), icon: 'eye-off', onSelect: () => void vm.unpublish(post.id), disabled: vm.busy,
        accessibleLabel: t('autopilot.rowAria', { action: t('autopilot.unpublish'), title }) });
    }
    if (post?.live) {
      actions.push({ label: t('autopilot.openPost'), icon: 'arrow-up-right', onSelect: () => { window.open(post.path, '_blank', 'noopener'); },
        accessibleLabel: t('autopilot.rowAria', { action: t('autopilot.openPost'), title }) });
    }
    const sub = [item.sourceName, item.reason, by ? t(by) : ''].filter(Boolean).join(' · ');
    return {
      id: item.id,
      muted: item.state === 'SKIPPED' || post?.status === 'UNPUBLISHED',
      cells: [
        { text: title, weight: 'strong', sub },
        { text: `${t(item.lane === 'NEWS' ? 'autopilot.lane.NEWS' : 'autopilot.lane.BLOG')} · ${t('autopilot.auto')}` },
        { pill: { label: t(state.label), tone: state.tone } },
        { text: formatDateTime(post?.publishAt ?? item.slotAt ?? item.updatedAt, lang, zone), weight: 'muted', mono: true },
      ],
      actions,
    };
  });
}

/**
 * Super admin, Posts, Autopilot (AdminPosts). News from official feeds and the
 * week's blog plan, every switch a setting changed with a reason. Health tips are
 * never published here: they wait for a clinician.
 */
/** `all` (default), `autopilot` (everything but the sources table) or `sources` (Content, Sources). */
export const AutopilotView = observer(function AutopilotView({ part = 'all' }: { part?: 'all' | 'autopilot' | 'sources' }) {
  const t = useT();
  const { lang } = useLanguage();
  const [vm] = useState(() => new AutopilotViewModel());
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);

  if (vm.phase === 'loading' && !vm.status) return <BoardLoading label={t('autopilot.loading')} />;
  if (vm.phase === 'error' || !vm.status) return <BoardFailure t={t} what={t('autopilot.what')} screen="AdminPosts" onRetry={() => void vm.load()} />;
  const status = vm.status;
  const zone = status.timezone;
  const model: MessageKey = status.model.aiKillSwitch ? 'autopilot.model.killed' : status.model.configured && status.model.use ? 'autopilot.model.on' : 'autopilot.model.off';
  const job = status.job?.lastRunAt ? t('autopilot.job', { at: formatDateTime(status.job.lastRunAt, lang, zone), status: status.job.lastStatus }) : t('autopilot.jobNever');

  const sourcesTable = (
    <>
      <DataTable variant="plain" caption={t('autopilot.sources')} title={t('autopilot.sources')} actionsLabel={t('autopilot.col.actions')}
        columns={[{ label: t('autopilot.col.source') }, { label: t('autopilot.verified'), width: '170px' }, { label: t('autopilot.col.reads'), width: '90px' },
          { label: t('autopilot.col.health'), width: '200px' }, { label: t('autopilot.col.checked'), width: '140px', align: 'end' }]}
        rows={sourceRows(t, vm, status.sources, lang, zone)} emptyMessage={{ title: t('autopilot.sources'), body: t('autopilot.sourcesNote') }} />
      <p className="sk-gov-fine"><Icon name="lock" size={14} /> {t('autopilot.sourcesNote')}</p>
    </>
  );
  if (part === 'sources') {
    return (
      <div className="sk-gov-stack sk-autopilot" data-testid="content-sources">
        <div className="sk-gov-toolbar">
          <p className="sk-gov-text">{t('cms.sources.intro', { n: status.fetchIntervalMinutes })}</p>
          <span className="sk-psite-spacer" />
          <SkButton variant="secondary" onClick={() => void vm.checkSources()} disabled={vm.busy} data-testid="autopilot-check"><Icon name="activity" size={16} />{t('autopilot.checkSources')}</SkButton>
        </div>
        {vm.error !== null ? <FormError message={vm.error || t('autopilot.failed')} /> : null}
        {vm.pending ? <ChangeForm vm={vm} change={vm.pending} sources={status.sources} /> : null}
        {sourcesTable}
        <BoardToast message={vm.notice ? t(NOTICE[vm.notice]) : null} onDone={vm.clearNotice} />
      </div>
    );
  }
  return (
    <div className="sk-gov-stack sk-autopilot" data-testid="autopilot">
      <div className="sk-gov-toolbar">
        <SkButton onClick={() => void vm.runNow()} disabled={vm.busy || status.killSwitch} data-testid="autopilot-run"><Icon name="refresh" size={16} />{t('autopilot.runNow')}</SkButton>
        <SkButton variant="secondary" onClick={() => void vm.checkSources()} disabled={vm.busy} data-testid="autopilot-check"><Icon name="activity" size={16} />{t('autopilot.checkSources')}</SkButton>
        <span className="sk-psite-spacer" />
        {status.killSwitch ? (
          <SkButton variant="secondary" onClick={() => void vm.resume(t('autopilot.resumeReason'))} disabled={vm.busy} data-testid="autopilot-resume"><Icon name="play" size={16} />{t('autopilot.resume')}</SkButton>
        ) : (
          <SkButton variant="danger" onClick={vm.openStop} disabled={vm.busy || vm.stopping} data-testid="autopilot-stop"><Icon name="shield-alert" size={16} />{t('autopilot.stop')}</SkButton>
        )}
      </div>
      {vm.error !== null ? <FormError message={vm.error || t('autopilot.failed')} /> : null}
      {status.killSwitch ? <BoardNote icon="shield-alert" tone="attention">{t('autopilot.stoppedNote')}</BoardNote> : null}
      {!status.production ? <BoardNote icon="info">{t('autopilot.sampleNote')}</BoardNote> : null}
      <p className="sk-gov-text">{t('autopilot.intro')} <span className="sk-gov-fine">{job}{vm.lastRun ? ` · ${t('autopilot.lastRun', { status: vm.lastRun })}` : ''}</span></p>
      {vm.stopping ? <StopForm vm={vm} /> : null}
      {vm.pending ? <ChangeForm vm={vm} change={vm.pending} sources={status.sources} /> : null}
      <Lanes vm={vm} status={status} />
      {status.series ? <SeriesLanes vm={vm} status={status} /> : null}
      <GovCard title={t('autopilot.model.title')} aside={<Icon name="sparkles" size={18} />}>
        <p className="sk-gov-text">{t(model)}</p>
        <p className="sk-gov-fine"><Icon name="shield-check" size={14} /> {t('autopilot.model.rule')}</p>
      </GovCard>
      {part === 'all' ? sourcesTable : null}
      <p className="sk-gov-fine"><Icon name="inbox" size={14} /> {t('autopilot.queueEmptyBody')}</p>
      <DataTable variant="plain" caption={t('autopilot.queue')} title={t('autopilot.queue')} actionsLabel={t('autopilot.col.actions')}
        columns={[{ label: t('autopilot.col.item') }, { label: t('autopilot.col.lane'), width: '120px' }, { label: t('autopilot.col.state'), width: '190px' }, { label: t('autopilot.col.when'), width: '140px', align: 'end' }]}
        rows={itemRows(t, vm, status.queue, lang, zone)} emptyMessage={{ title: t('autopilot.queueEmpty'), body: t('autopilot.queueEmptyBody') }} />
      <p className="sk-gov-fine"><Icon name="file-text" size={14} /> {t('autopilot.logEmptyBody')}</p>
      <DataTable variant="plain" caption={t('autopilot.log')} title={t('autopilot.log')} actionsLabel={t('autopilot.col.actions')}
        columns={[{ label: t('autopilot.col.item') }, { label: t('autopilot.col.lane'), width: '120px' }, { label: t('autopilot.col.state'), width: '190px' }, { label: t('autopilot.col.when'), width: '140px', align: 'end' }]}
        rows={itemRows(t, vm, status.log, lang, zone)} emptyMessage={{ title: t('autopilot.logEmpty'), body: t('autopilot.logEmptyBody') }} />
      <BoardToast message={vm.notice ? t(NOTICE[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});
