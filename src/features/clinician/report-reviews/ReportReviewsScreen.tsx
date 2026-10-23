import React, { useEffect, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Drawer, FormField, SkButton, SkSkeleton as Skeleton, StatRow, StatusPill, Tabs, SkToast as Toast, useOnline } from '@/design-system';
import type { Stat } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import { OfflineNote } from '../shared/OfflineNote';
import { dateOnly, waitedFor } from '../shared/clinicalData';
import type { T } from '../shared/clinicalData';
import { REVIEW_LIMITS, reviewBody, reviewProblems, reviewsApiSource, sharedReportUrl } from './reviewsModel';
import type { Decision, QueueReview, ReviewDraft, ReviewInvalid, ReviewsData, ReviewsSource } from './reviewsModel';
import './report-reviews.css';

export type ReviewsTab = 'awaiting' | 'reviewed' | 'unread';

const blankDraft = (): ReviewDraft => ({ decision: 'APPROVED', summary: '', questions: '', nextSteps: '', sources: [{ title: '', url: '' }] });

/** "3F2A9C1B" — enough of the document id to tell two reports apart. */
export const shortRef = (id: string): string => id.replace(/-/g, '').slice(0, 8).toUpperCase();

/**
 * ReportReviews (design page 5). Tier 1, approved by Krishna Chintakayala on
 * 2026-10-21. The loop is requested, assigned, reviewed, read by student;
 * there is no read receipt yet, so the fourth step is shown as unknown, never
 * as "unread".
 */
export class ReportReviewsViewModel extends LoadableViewModel<ReviewsData> {
  tab: ReviewsTab = 'awaiting';
  openId: string | null = null;
  draft: ReviewDraft = blankDraft();
  busy = false;
  online = true;

  constructor(private readonly source: ReviewsSource, private readonly t: T) {
    super(source);
    makeObservable(this, {
      tab: observable, openId: observable, draft: observable, busy: observable, online: observable,
      visible: computed, open: computed, problems: computed, canSubmit: computed,
      setTab: actionBound, openReview: actionBound, close: actionBound, setDecision: actionBound, setField: actionBound,
      setSource: actionBound, addSource: actionBound, removeSource: actionBound, setOnline: actionBound,
    });
  }

  protected isEmpty(data: ReviewsData): boolean {
    return data.reviews.length === 0;
  }

  /** Oldest request first, as the server orders them. Only "Awaiting me" has a source. */
  get visible(): QueueReview[] {
    return this.tab === 'awaiting' ? this.data?.reviews ?? [] : [];
  }

  get open(): QueueReview | null {
    return this.data?.reviews.find((r) => r.id === this.openId) ?? null;
  }

  get problems(): ReviewInvalid[] {
    return reviewProblems(this.draft);
  }

  /** A review is words from you: nothing is sent until every required part is there. */
  get canSubmit(): boolean {
    return !!this.open && this.problems.length === 0 && !this.busy && this.online && typeof this.source.submit === 'function';
  }

  setOnline(online: boolean): void { this.online = online; }
  setTab(tab: ReviewsTab): void { this.tab = tab; }

  openReview(id: string): void {
    this.openId = id;
    this.draft = blankDraft();
  }

  close(): void {
    if (!this.busy) this.openId = null;
  }

  setDecision(decision: Decision): void { this.draft = { ...this.draft, decision }; }
  setField(field: 'summary' | 'questions' | 'nextSteps', value: string): void { this.draft = { ...this.draft, [field]: value }; }
  setSource(index: number, field: 'title' | 'url', value: string): void {
    this.draft = { ...this.draft, sources: this.draft.sources.map((s, i) => (i === index ? { ...s, [field]: value } : s)) };
  }
  addSource(): void {
    if (this.draft.sources.length < REVIEW_LIMITS.sources) this.draft = { ...this.draft, sources: [...this.draft.sources, { title: '', url: '' }] };
  }
  removeSource(index: number): void {
    if (this.draft.sources.length > 1) this.draft = { ...this.draft, sources: this.draft.sources.filter((_, i) => i !== index) };
  }

  async submit(): Promise<void> {
    const review = this.open;
    const send = this.source.submit;
    if (!review || !send || !this.canSubmit) return;
    const decision = this.draft.decision;
    this.busy = true;
    try {
      const outcome = await send(review, reviewBody(review, this.draft));
      runInAction(() => {
        this.busy = false;
        if (outcome === 'saved') {
          if (this.data) this.data = { reviews: this.data.reviews.filter((r) => r.id !== review.id), total: Math.max(0, this.data.total - 1) };
          this.openId = null;
          this.draft = blankDraft();
          this.say(this.t(decision === 'APPROVED' ? 'clinReviews.toast.sent' : 'clinReviews.toast.declined'));
        } else {
          this.openId = null;
          this.say(this.t('clinReviews.toast.stale'));
        }
      });
      if (outcome === 'stale') await this.load();
    } catch {
      runInAction(() => {
        this.busy = false;
        this.say(this.t('clinReviews.toast.failed'));
      });
    }
  }
}

const STEP_KEYS = ['clinReviews.step.requested', 'clinReviews.step.assigned', 'clinReviews.step.reviewed', 'clinReviews.step.read'] as const;

export const ReportReviewsView = observer(function ReportReviewsView({ viewModel, onNavigate }: { viewModel: ReportReviewsViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const { status, data } = viewModel;
  const tabs: { id: ReviewsTab; label: string }[] = [
    { id: 'awaiting', label: t('clinReviews.tab.awaiting') },
    { id: 'reviewed', label: t('clinReviews.tab.reviewed') },
    { id: 'unread', label: t('clinReviews.tab.unread') },
  ];
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="rr-skeleton" aria-busy="true" aria-label={t('clinReviews.loading')}><Skeleton width={300} height={34} /><Skeleton height={70} />{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={110} />)}</div>;
  } else if (status === 'error') {
    body = <ClinicianErrorState title={t('clinReviews.errorTitle')} reference={t('clinReviews.reference')} onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} />;
  } else if (status === 'unconnected' || status === 'empty' || !data) {
    body = <ClinicianEmptyState title={t('clinReviews.emptyTitle')} body={t('clinReviews.emptyBody')} action={{ label: t('clinShared.backToday'), onSelect: () => onNavigate('clinician') }} />;
  } else {
    const now = Date.now() / 1000;
    const oldest = data.reviews.reduce((min, r) => Math.min(min, r.createdAt), now);
    const stats: Stat[] = [
      { label: t('clinReviews.stat.awaiting'), value: String(data.total), meta: t('clinReviews.stat.oldest', { time: waitedFor(now - oldest, t) }), tone: 'danger' },
      { label: t('clinReviews.stat.median'), value: null, meta: t('clinReviews.stat.notReported') },
      { label: t('clinReviews.stat.unread'), value: null, meta: t('clinReviews.stat.noReceipt') },
      { label: t('clinReviews.stat.closed'), value: null, meta: t('clinReviews.stat.notReported') },
    ];
    body = (
      <div className="rr-page">
        <div className="rr-head sk-fade">
          <div className="rr-head__titles">
            <span className="rr-eyebrow">{t('clinReviews.eyebrow')}</span>
            <h1 className="rr-title">{t('clinReviews.title')}</h1>
          </div>
          <Tabs label={t('clinReviews.tabsLabel')} options={tabs} value={viewModel.tab} onChange={viewModel.setTab} controls="rr-list" />
        </div>
        <OfflineNote online={viewModel.online} loadedAt={viewModel.loadedAt} />
        <StatRow stats={stats} variant="plain" />
        {viewModel.tab === 'awaiting' ? (
          <ul id="rr-list" className="rr-list" aria-label={t('clinReviews.listLabel')}>
            {viewModel.visible.map((review, index) => <ReviewRow key={review.id} review={review} index={index} now={now} onOpen={() => viewModel.openReview(review.id)} />)}
          </ul>
        ) : (
          <p id="rr-list" className="rr-none" role="status">{t(viewModel.tab === 'reviewed' ? 'clinReviews.reviewedUnconnected' : 'clinReviews.unreadUnconnected')}</p>
        )}
        <p className="rr-foot">
          {t('clinReviews.footRequested')}<Icon name="arrow-right" size={12} />{t('clinReviews.footAssigned')}<Icon name="arrow-right" size={12} />{t('clinReviews.footReviewed')}<Icon name="arrow-right" size={12} />{t('clinReviews.footRead')}
        </p>
        <ReviewDrawer viewModel={viewModel} />
      </div>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

function ReviewRow({ review, index, now, onOpen }: { review: QueueReview; index: number; now: number; onOpen: () => void }): React.ReactElement {
  const t = useT();
  const ref = shortRef(review.documentId);
  const stage = 2;
  return (
    <li className="rr-row sk-rise" style={{ '--sk-stagger': index } as React.CSSProperties}>
      <div className="rr-row__main">
        <span className="rr-row__top">
          <span className="rr-row__name">{t('clinReviews.reportRef', { id: ref })}</span>
          <StatusPill small tone="action">{t('clinReviews.new')}</StatusPill>
        </span>
        <span className="rr-row__report">{t('clinReviews.requestedOn', { date: dateOnly(review.createdAt) })}</span>
        <span className="rr-row__ask">{t('clinReviews.asked')}</span>
        <span className="rr-steps" role="img" aria-label={t('clinReviews.stepAria', { n: stage, step: t(STEP_KEYS[stage - 1]) })}>
          {STEP_KEYS.map((key, i) => <span key={key} className={`rr-step${i < stage ? ' is-done rr-step--action' : ''}`} />)}
        </span>
      </div>
      <div className="rr-row__side">
        <span className="rr-row__due">{t('clinReviews.waiting', { time: waitedFor(now - review.createdAt, t) })}</span>
        <SkButton variant="secondary" className="rr-cta" onClick={onOpen}>
          {t('clinReviews.review')}<span className="sk-visually-hidden">{t('clinReviews.reviewFor', { id: ref })}</span>
        </SkButton>
        <span className="rr-row__stage">{t('clinReviews.assignedToYou')}</span>
      </div>
    </li>
  );
}

const PROBLEM_KEYS: Record<ReviewInvalid, 'assist.review.approvalNeeds' | 'clinReviews.problem.nextSteps' | 'clinReviews.problem.questions' | 'assist.review.sourceInvalid'> = {
  summary: 'assist.review.approvalNeeds',
  nextSteps: 'clinReviews.problem.nextSteps',
  questions: 'clinReviews.problem.questions',
  sources: 'assist.review.sourceInvalid',
};

const ReviewDrawer = observer(function ReviewDrawer({ viewModel }: { viewModel: ReportReviewsViewModel }): React.ReactElement | null {
  const t = useT();
  const review = viewModel.open;
  if (!review) return null;
  const d = viewModel.draft;
  const approve = d.decision === 'APPROVED';
  const problems = viewModel.problems;
  const touched = d.summary.trim() !== '' || d.nextSteps.trim() !== '' || d.sources.some((s) => s.title || s.url);
  return (
    <Drawer open busy={viewModel.busy} onClose={viewModel.close} eyebrow={t('clinReviews.reportRef', { id: shortRef(review.documentId) }).toUpperCase()} eyebrowTone="action" title={t('clinReviews.drawerTitle')} subtitle={t('clinReviews.drawerSub', { date: dateOnly(review.createdAt), version: review.version })}>
      <div className="rr-question">
        <span className="rr-question__label">{t('clinReviews.theyAsked')}</span>
        <p>{t('clinReviews.asked')}</p>
        <a className="sk-link rr-open" href={sharedReportUrl(review.shareId)} target="_blank" rel="noopener noreferrer">{t('assist.review.openReport')}</a>
        <small className="rr-small">{t('assist.review.openNote')}</small>
      </div>
      <fieldset className="rr-decision" disabled={viewModel.busy}>
        <legend className="rr-question__label">{t('assist.review.decision')}</legend>
        {(['APPROVED', 'REJECTED'] as const).map((value) => (
          <label key={value} className={`rr-choice${d.decision === value ? ' is-on' : ''}`}>
            <input type="radio" name="rr-decision" checked={d.decision === value} onChange={() => viewModel.setDecision(value)} />
            {t(value === 'APPROVED' ? 'assist.review.approveOption' : 'assist.review.rejectOption')}
          </label>
        ))}
      </fieldset>
      {approve ? (
        <div className="rr-form">
          <FormField label={t('assist.review.summary')} hint={t('assist.review.summaryHint')} status={touched && problems.includes('summary') ? 'invalid' : 'idle'} message={t(PROBLEM_KEYS.summary)}>
            <textarea className="rr-textarea" rows={5} maxLength={REVIEW_LIMITS.summary} value={d.summary} onChange={(e) => viewModel.setField('summary', e.target.value)} data-autofocus />
          </FormField>
          <FormField label={t('assist.review.nextSteps')} hint={t('assist.review.nextStepsHint')} status={touched && problems.includes('nextSteps') ? 'invalid' : 'idle'} message={t(PROBLEM_KEYS.nextSteps, { lines: REVIEW_LIMITS.lines, chars: REVIEW_LIMITS.line })}>
            <textarea className="rr-textarea" rows={4} value={d.nextSteps} onChange={(e) => viewModel.setField('nextSteps', e.target.value)} />
          </FormField>
          <FormField label={t('assist.review.questions')} hint={t('assist.review.questionsHint')} status={problems.includes('questions') ? 'invalid' : 'idle'} message={t(PROBLEM_KEYS.questions, { lines: REVIEW_LIMITS.lines, chars: REVIEW_LIMITS.line })}>
            <textarea className="rr-textarea rr-textarea--short" rows={3} value={d.questions} onChange={(e) => viewModel.setField('questions', e.target.value)} />
          </FormField>
          <fieldset className="rr-sources">
            <legend className="rr-question__label">{t('assist.review.sources')}</legend>
            <small className="rr-small">{t('assist.review.sourcesHint')}</small>
            {d.sources.map((s, i) => (
              <div key={i} className="rr-source">
                <FormField label={t('assist.review.sourceTitle', { n: i + 1 })}><input value={s.title} maxLength={REVIEW_LIMITS.title} onChange={(e) => viewModel.setSource(i, 'title', e.target.value)} /></FormField>
                <FormField label={t('assist.review.sourceUrl', { n: i + 1 })}><input type="url" value={s.url} maxLength={REVIEW_LIMITS.url} onChange={(e) => viewModel.setSource(i, 'url', e.target.value)} /></FormField>
                <SkButton variant="secondary" disabled={d.sources.length === 1} onClick={() => viewModel.removeSource(i)} aria-label={t('assist.review.removeSourceN', { n: i + 1 })}>{t('assist.review.removeSource')}</SkButton>
              </div>
            ))}
            <SkButton variant="secondary" disabled={d.sources.length >= REVIEW_LIMITS.sources} onClick={viewModel.addSource}>{t('assist.review.addSource')}</SkButton>
            {touched && problems.includes('sources') ? <small className="rr-small rr-small--invalid" role="alert">{t(PROBLEM_KEYS.sources)}</small> : null}
          </fieldset>
        </div>
      ) : (
        <p className="rr-small">{t('assist.review.rejectNote')}</p>
      )}
      <small className="rr-small">{t('assist.review.submitNote', { version: review.version })}</small>
      {!viewModel.online ? <small className="rr-small" role="status">{t('clinShared.offlineWrite')}</small> : null}
      <SkButton variant={approve ? 'primary' : 'secondary'} className="rr-send" busy={viewModel.busy} disabled={!viewModel.canSubmit} onClick={() => { void viewModel.submit(); }}>
        {t(approve ? 'clinReviews.send' : 'assist.review.reject')}
      </SkButton>
    </Drawer>
  );
});

export function ReportReviewsScreen({ source }: { source?: ReviewsSource }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const [viewModel] = useState(() => new ReportReviewsViewModel(source ?? reviewsApiSource(), t));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  useEffect(() => { viewModel.setOnline(online); }, [viewModel, online]);
  return (
    <ClinicianConsoleFrame current="report-reviews" context={t('clinReviews.title')}>
      <ReportReviewsView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
