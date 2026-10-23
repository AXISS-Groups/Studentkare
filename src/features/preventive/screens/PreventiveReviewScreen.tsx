import React, { useState } from 'react';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../../components/interface/WorkflowUI';
import { apiBaseUrl } from '../../../core/env';
import { apiRequest } from '../../../data/services/http';
import { displayDate } from '../../../data/types/workflowTypes';
import { useApiResource } from '../../../hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import './preventive-staff.css';

type Translate = (key: MessageKey, vars?: Vars) => string;

type ReviewWork = { id: string; documentId: string; shareId: string; status: 'ASSIGNED'; version: number; assignedClinicianId: string; createdAt: number; updatedAt: number };
type ReviewPage = { items: ReviewWork[]; total: number; offset: number; limit: number };
type SourceRef = { title: string; url: string };
const PAGE_SIZE = 20;

function guidanceLines(value: string, label: string, t: Translate) {
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 10 || lines.some(line => line.length > 1000)) throw new Error(t('assist.review.linesLimit', { label }));
  return lines;
}

function ReviewForm({ review, saved }: { review: ReviewWork; saved: (decision: string) => void }) {
  const t = useT();
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [sources, setSources] = useState<SourceRef[]>([{ title: '', url: '' }]);
  const mutation = useMutation();
  const updateSource = (index: number, key: keyof SourceRef, value: string) => setSources(previous => previous.map((source, i) => i === index ? { ...source, [key]: value } : source));

  return <article className="wf-card preventive-staff-review">
    <h3>{t('assist.review.report', { id: review.documentId })}</h3>
    <p>{t('assist.review.requestedMeta', { date: displayDate(review.createdAt), version: review.version })}</p>
    <a className="health-button" href={`${apiBaseUrl()}/records/shares/${encodeURIComponent(review.shareId)}/document`} target="_blank" rel="noopener noreferrer">{t('assist.review.openReport')}</a>
    <p>{t('assist.review.openNote')}</p>
    <form className="wf-form" onSubmit={event => {
      event.preventDefault();
      mutation.run(async () => {
        const base = { expectedVersion: review.version, decision };
        // A rejection never transmits an unfinished guidance draft.
        let body: object = base;
        if (decision === 'APPROVED') {
          const trimmedSummary = summary.trim();
          const steps = guidanceLines(nextSteps, t('assist.review.nextSteps'), t);
          if (!trimmedSummary || trimmedSummary.length > 4000 || !steps.length) throw new Error(t('assist.review.approvalNeeds'));
          const sourceRefs = sources.map(source => {
            const title = source.title.trim();
            const url = source.url.trim();
            let validUrl = false;
            try { const parsed = new URL(url); validUrl = parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { /* Validated below. */ }
            if (title.length < 2 || title.length > 160 || !validUrl || url.length > 2000) throw new Error(t('assist.review.sourceInvalid'));
            return { title, url };
          });
          body = { ...base, summary: trimmedSummary, questions: guidanceLines(questions, t('assist.review.questions'), t), nextSteps: steps, sourceRefs };
        }
        return apiRequest(`/preventive/work/report-reviews/${encodeURIComponent(review.id)}/review`, { method: 'POST', body: JSON.stringify(body) });
      }, () => saved(decision));
    }}>
      <fieldset className="preventive-staff-fields" disabled={mutation.busy}>
        <Field label={t('assist.review.decision')}><select value={decision} onChange={event => setDecision(event.target.value === 'REJECTED' ? 'REJECTED' : 'APPROVED')}><option value="APPROVED">{t('assist.review.approveOption')}</option><option value="REJECTED">{t('assist.review.rejectOption')}</option></select></Field>
        {decision === 'APPROVED' ? <>
          <Field label={t('assist.review.summary')} hint={t('assist.review.summaryHint')}><textarea required maxLength={4000} rows={5} value={summary} onChange={event => setSummary(event.target.value)} /></Field>
          <Field label={t('assist.review.questions')} hint={t('assist.review.questionsHint')}><textarea rows={3} maxLength={10009} value={questions} onChange={event => setQuestions(event.target.value)} /></Field>
          <Field label={t('assist.review.nextSteps')} hint={t('assist.review.nextStepsHint')}><textarea required rows={4} maxLength={10009} value={nextSteps} onChange={event => setNextSteps(event.target.value)} /></Field>
          <fieldset className="preventive-staff-sources"><legend>{t('assist.review.sources')}</legend><p>{t('assist.review.sourcesHint')}</p>
            {sources.map((source, index) => <div className="preventive-staff-source" key={index}>
              <Field label={t('assist.review.sourceTitle', { n: index + 1 })}><input required minLength={2} maxLength={160} value={source.title} onChange={event => updateSource(index, 'title', event.target.value)} /></Field>
              <Field label={t('assist.review.sourceUrl', { n: index + 1 })}><input required type="url" maxLength={2000} value={source.url} onChange={event => updateSource(index, 'url', event.target.value)} /></Field>
              <button type="button" className="health-button" disabled={sources.length === 1} aria-label={t('assist.review.removeSourceN', { n: index + 1 })} onClick={() => setSources(previous => previous.filter((_, i) => i !== index))}>{t('assist.review.removeSource')}</button>
            </div>)}
            <button type="button" className="health-button" disabled={sources.length >= 10} onClick={() => setSources(previous => [...previous, { title: '', url: '' }])}>{t('assist.review.addSource')}</button>
          </fieldset>
        </> : <p>{t('assist.review.rejectNote')}</p>}
      </fieldset>
      <p>{t('assist.review.submitNote', { version: review.version })}</p>
      <FormError message={mutation.error} />
      {mutation.error && <p>{t('assist.review.errorHelp')}</p>}
      <SubmitButton busy={mutation.busy}>{decision === 'APPROVED' ? t('assist.review.approve') : t('assist.review.reject')}</SubmitButton>
    </form>
  </article>;
}

export function PreventiveReviewScreen() {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState('');
  const resource = useApiResource<ReviewPage>(`/preventive/work/report-reviews?offset=${offset}&limit=${PAGE_SIZE}`);
  return <div className="preventive-staff-screen">
    <header className="wf-panel-heading"><div><span className="care-eyebrow">{t('assist.review.eyebrow')}</span><h2>{t('assist.review.title')}</h2><p>{t('assist.review.intro')}</p></div><button type="button" className="health-button" disabled={resource.loading} onClick={resource.reload}>{t('assist.prev.refreshReviews')}</button></header>
    <section className="wf-card"><h3>{t('assist.review.permTitle')}</h3><p>{t('assist.review.perm1')}</p><p>{t('assist.review.perm2')}</p><p>{t('assist.review.perm3')}</p></section>
    <div role="status" aria-live="polite">{notice}</div>
    <DataState {...resource} retry={resource.reload}>
      {resource.data?.items.length ? <div className="preventive-staff-section">{resource.data.items.map(review => <ReviewForm key={`${review.id}-${review.version}`} review={review} saved={decision => { setNotice(decision === 'APPROVED' ? t('assist.review.approvedNotice') : t('assist.review.rejectedNotice')); resource.reload(); }} />)}</div> : <EmptyState title={t('assist.review.emptyTitle')} description={t('assist.review.emptyBody')} />}
    </DataState>
    <nav className="preventive-staff-pagination" aria-label={t('assist.review.pages')}>
      <button type="button" className="health-button" disabled={resource.loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>{t('assist.prev.prevReviews')}</button>
      <span>{resource.data ? resource.data.items.length ? t('assist.prev.range', { from: resource.data.offset + 1, to: Math.min(resource.data.offset + resource.data.items.length, resource.data.total), total: resource.data.total }) : t('assist.ops.emptyPage', { total: resource.data.total }) : t('assist.ops.pageUnavailable')}</span>
      <button type="button" className="health-button" disabled={resource.loading || !resource.data || offset + PAGE_SIZE >= resource.data.total || offset + PAGE_SIZE > 10000} onClick={() => setOffset(offset + PAGE_SIZE)}>{t('assist.prev.nextReviews')}</button>
    </nav>
  </div>;
}
