import React, { useEffect, useId, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { isDev } from '@/core/env';
import { Drawer, EmptyStateView, ErrorStateView, SkButton, Skeleton, StatRow, StatusPill, Tabs, Toast } from '@/design-system';
import type { SkTone, Stat } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { Loadable } from '../shared/LoadableViewModel';
import './report-reviews.css';

/**
 * ReportReviews (design page 5). Student-requested: a clinician reads, not a
 * model. TIER 1: awaiting a named design reviewer and clinical sign-off.
 *
 * The loop is requested → assigned → reviewed → read by student; the fourth
 * step is the one that usually goes unmeasured, so it has its own tab.
 */

export type ReviewStage = 1 | 2 | 3 | 4;
export type ReviewUrgency = 'urgent' | 'soon' | 'routine';

export interface ReportReview {
  id: string;
  patientName: string;
  /** "Vitamin D Test · released 20 Sep" */
  report: string;
  /** The student's question, verbatim. */
  question: string;
  /** Your review, once written. */
  reply?: string;
  urgency: ReviewUrgency;
  /** "4h left" / "40m left" / "Closed" */
  due: string;
  stage: ReviewStage;
  /** "Read 3 days ago" etc., once read. */
  stageText: string;
}

export interface ReviewsData {
  stats: Stat[];
  reviews: ReportReview[];
}

export interface ReviewsSource extends Loadable<ReviewsData> {
  /** Sends the clinician's review to the student. Absent = cannot. */
  submit?: (id: string, reply: string) => Promise<void>;
}

export function reviewsSample(): ReviewsData {
  return {
    stats: [
      { label: 'Awaiting me', value: '3', meta: 'One inside 40 minutes', tone: 'danger' },
      { label: 'Median to review', value: '5.2 hrs', meta: 'Against a 24-hour promise' },
      { label: 'Reviewed, unread', value: '1', meta: 'The loop is still open', tone: 'danger' },
      { label: 'Closed this week', value: '18', meta: 'Read and acknowledged' },
    ],
    reviews: [
      { id: 'v1', patientName: 'Priya N.', report: 'Vitamin D Test · released 20 Sep', question: '“Is 11 low enough to worry about? I have been tired for weeks.”', urgency: 'soon', due: '4h left', stage: 2, stageText: 'Assigned to you' },
      { id: 'v2', patientName: 'Aarav Sharma', report: 'Renal panel · released today', question: '“The app flagged something red. What does it mean?”', urgency: 'urgent', due: '40m left', stage: 2, stageText: 'Assigned to you' },
      { id: 'v3', patientName: 'Meera Nair', report: 'Complete Blood Count · 18 Aug', question: '“My second sample — is this one usable?”', urgency: 'routine', due: '2d left', stage: 2, stageText: 'Assigned to you' },
      { id: 'v4', patientName: 'Rohan Verma', report: 'Thyroid panel · 14 Sep', question: '“Should I be worried about my thyroid?”', reply: 'Mild subclinical picture, repeat in 8 weeks.', urgency: 'routine', due: 'Closed', stage: 3, stageText: 'Waiting to be read' },
      { id: 'v5', patientName: 'Kavya Iyer', report: 'Lipid profile · 02 Sep', question: '“Is my cholesterol okay?”', reply: 'Within range, no action needed.', urgency: 'routine', due: 'Closed', stage: 4, stageText: 'Read 3 days ago' },
    ],
  };
}

export const sampleReviewsSource: ReviewsSource = { load: async () => reviewsSample(), submit: async () => undefined };
const unconnectedReviewsSource: ReviewsSource = { load: async () => null };

export type ReviewsTab = 'awaiting' | 'reviewed' | 'unread';

export class ReportReviewsViewModel extends LoadableViewModel<ReviewsData> {
  tab: ReviewsTab = 'awaiting';
  openId: string | null = null;
  draft = '';
  busy = false;

  constructor(private readonly source: ReviewsSource) {
    super(source);
    makeObservable(this, {
      tab: observable, openId: observable, draft: observable, busy: observable,
      visible: computed, open: computed, canSubmit: computed,
      setTab: actionBound, openReview: actionBound, close: actionBound, setDraft: actionBound,
    });
  }

  protected isEmpty(data: ReviewsData): boolean {
    return data.reviews.length === 0;
  }

  get visible(): ReportReview[] {
    const all = this.data?.reviews ?? [];
    if (this.tab === 'awaiting') {
      const rank = { urgent: 0, soon: 1, routine: 2 } as const;
      return all.filter((r) => r.stage <= 2).sort((a, b) => rank[a.urgency] - rank[b.urgency]);
    }
    if (this.tab === 'reviewed') return all.filter((r) => r.stage >= 3);
    return all.filter((r) => r.stage === 3);
  }

  get open(): ReportReview | null {
    return this.data?.reviews.find((r) => r.id === this.openId) ?? null;
  }

  /** A review is words from you: nothing is sent without them. */
  get canSubmit(): boolean {
    return !!this.open && this.open.stage <= 2 && this.draft.trim().length >= 10 && !this.busy && typeof this.source.submit === 'function';
  }

  setTab(tab: ReviewsTab): void { this.tab = tab; }
  setDraft(text: string): void { this.draft = text; }

  openReview(id: string): void {
    this.openId = id;
    this.draft = '';
  }

  close(): void {
    if (!this.busy) this.openId = null;
  }

  async submit(): Promise<void> {
    const review = this.open;
    const send = this.source.submit;
    if (!review || !send || !this.canSubmit) return;
    const reply = this.draft.trim();
    this.busy = true;
    try {
      await send(review.id, reply);
      runInAction(() => {
        if (this.data) {
          this.data = { ...this.data, reviews: this.data.reviews.map((r) => (r.id === review.id ? { ...r, reply, stage: 3, due: 'Closed', stageText: 'Waiting to be read' } : r)) };
        }
        this.busy = false;
        this.openId = null;
        this.say(`Review sent. ${review.patientName.split(' ')[0]} sees it in the app — it stays under “Unread by student” until they do.`);
      });
    } catch {
      runInAction(() => {
        this.busy = false;
        this.say('Couldn’t send your review. Nothing was sent and your words are still here.');
      });
    }
  }
}

const TABS: { id: ReviewsTab; label: string }[] = [
  { id: 'awaiting', label: 'Awaiting me' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'unread', label: 'Unread by student' },
];

const URGENCY: Record<ReviewUrgency, { tag: string; tone: SkTone }> = {
  urgent: { tag: 'Urgent', tone: 'danger' },
  soon: { tag: 'New', tone: 'attention' },
  routine: { tag: 'New', tone: 'action' },
};

const STAGES = ['Requested', 'Assigned', 'Reviewed', 'Read by student'];

export const ReportReviewsView = observer(function ReportReviewsView({ viewModel, onNavigate }: { viewModel: ReportReviewsViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="rr-skeleton" aria-busy="true" aria-label="Loading report reviews"><Skeleton width={300} height={34} /><Skeleton height={70} />{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={110} />)}</div>;
  } else if (status === 'error') {
    body = <ErrorStateView title="Couldn’t load report reviews" onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} reference="Ref REVIEWS · ReportReviews" />;
  } else if (status === 'unconnected') {
    body = <EmptyStateView title="Report reviews aren’t connected here yet." body="This new screen is awaiting clinical sign-off. Until then this page shows nothing rather than a guess." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else if (status === 'empty' || !data) {
    body = <EmptyStateView title="No reports waiting for you." body="When a student asks a doctor to read their report, it is assigned here with the time you have to answer." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else {
    body = (
      <>
        <div className="rr-head sk-fade">
          <div className="rr-head__titles">
            <span className="rr-eyebrow">STUDENT-REQUESTED · A CLINICIAN READS, NOT A MODEL</span>
            <h1 className="rr-title">Report reviews</h1>
          </div>
          <Tabs label="Show reviews" options={TABS} value={viewModel.tab} onChange={viewModel.setTab} controls="rr-list" />
        </div>
        <StatRow stats={data.stats} variant="plain" />
        <ul id="rr-list" className="rr-list" aria-label="Report reviews">
          {viewModel.visible.map((review, index) => <ReviewRow key={review.id} review={review} index={index} onOpen={() => viewModel.openReview(review.id)} />)}
        </ul>
        {viewModel.visible.length === 0 ? <p className="rr-none" role="status">Nothing in this list right now.</p> : null}
        <p className="rr-foot">Requested → assigned → reviewed → read by student. The fourth step is the one that usually goes unmeasured.</p>
        <ReviewDrawer viewModel={viewModel} />
      </>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

function ReviewRow({ review, index, onOpen }: { review: ReportReview; index: number; onOpen: () => void }): React.ReactElement {
  const done = review.stage >= 3;
  const u = URGENCY[review.urgency];
  const tone = done ? 'positive' : u.tone;
  return (
    <li className="rr-row sk-rise" style={{ '--sk-stagger': index } as React.CSSProperties}>
      <div className="rr-row__main">
        <span className="rr-row__top">
          <span className="rr-row__name">{review.patientName}</span>
          <StatusPill small tone={tone}>{done ? (review.stage === 4 ? 'Read' : 'Reviewed') : u.tag}</StatusPill>
        </span>
        <span className="rr-row__report">{review.report}</span>
        <span className="rr-row__ask">{done && review.reply ? `Reviewed: ${review.reply}` : review.question}</span>
        <span className="rr-steps" role="img" aria-label={`Step ${review.stage} of 4: ${STAGES[review.stage - 1]}`}>
          {STAGES.map((stage, i) => <span key={stage} className={`rr-step${i < review.stage ? ` is-done rr-step--${tone}` : ''}`} />)}
        </span>
      </div>
      <div className="rr-row__side">
        <span className={`rr-row__due${review.urgency === 'urgent' && !done ? ' is-urgent' : ''}`}>{review.due}</span>
        <SkButton variant={review.urgency === 'urgent' && !done ? 'danger' : 'secondary'} className="rr-cta" onClick={onOpen}>
          {done ? 'Open' : review.urgency === 'urgent' ? 'Review now' : 'Review'}<span className="sk-visually-hidden"> {review.report} for {review.patientName}</span>
        </SkButton>
        <span className="rr-row__stage">{review.stageText}</span>
      </div>
    </li>
  );
}

const ReviewDrawer = observer(function ReviewDrawer({ viewModel }: { viewModel: ReportReviewsViewModel }): React.ReactElement | null {
  const replyId = useId();
  const review = viewModel.open;
  if (!review) return null;
  const pending = review.stage <= 2;
  return (
    <Drawer open busy={viewModel.busy} onClose={viewModel.close} eyebrow={review.report.toUpperCase()} eyebrowTone={review.urgency === 'urgent' ? 'danger' : 'action'} title={review.patientName} subtitle={pending ? `${review.due} · ${review.stageText.toLowerCase()}` : review.stageText}>
      <div className="rr-question">
        <span className="rr-question__label">THEY ASKED</span>
        <p>{review.question}</p>
      </div>
      {pending ? (
        <>
          <label className="rr-reply" htmlFor={replyId}>
            <span className="rr-question__label">YOUR REVIEW — {review.patientName.split(' ')[0].toUpperCase()} READS THIS</span>
          </label>
          <textarea id={replyId} className="rr-textarea" rows={6} value={viewModel.draft} onChange={(e) => viewModel.setDraft(e.target.value)} placeholder="What the result means for them, and what to do next — in plain words." data-autofocus />
          <SkButton className="rr-send" busy={viewModel.busy} disabled={!viewModel.canSubmit} onClick={() => { void viewModel.submit(); }}>Send review</SkButton>
        </>
      ) : (
        <div className="rr-question"><span className="rr-question__label">YOUR REVIEW</span><p>{review.reply}</p></div>
      )}
    </Drawer>
  );
});

export function ReportReviewsScreen({ source }: { source?: ReviewsSource }): React.ReactElement {
  const [viewModel] = useState(() => new ReportReviewsViewModel(source ?? (isDev() ? sampleReviewsSource : unconnectedReviewsSource)));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="report-reviews" context="Report reviews" reviewPending>
      <ReportReviewsView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
