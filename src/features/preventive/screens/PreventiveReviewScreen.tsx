import React, { useState } from 'react';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../../components/interface/WorkflowUI';
import { apiBaseUrl } from '../../../core/env';
import { apiRequest } from '../../../data/http';
import { displayDate } from '../../../data/workflowTypes';
import { useApiResource } from '../../../hooks/useApiResource';
import './preventive-staff.css';

type ReviewWork = { id: string; documentId: string; shareId: string; status: 'ASSIGNED'; version: number; assignedClinicianId: string; createdAt: number; updatedAt: number };
type ReviewPage = { items: ReviewWork[]; total: number; offset: number; limit: number };
type SourceRef = { title: string; url: string };
const PAGE_SIZE = 20;

function guidanceLines(value: string, label: string) {
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 10 || lines.some(line => line.length > 1000)) throw new Error(`${label} allows up to 10 nonblank lines, each at most 1,000 characters.`);
  return lines;
}

function ReviewForm({ review, saved }: { review: ReviewWork; saved: (decision: string) => void }) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [sources, setSources] = useState<SourceRef[]>([{ title: '', url: '' }]);
  const mutation = useMutation();
  const updateSource = (index: number, key: keyof SourceRef, value: string) => setSources(previous => previous.map((source, i) => i === index ? { ...source, [key]: value } : source));

  return <article className="wf-card preventive-staff-review">
    <h3>Report {review.documentId}</h3>
    <p>Requested {displayDate(review.createdAt)} · Version {review.version}</p>
    <a className="health-button" href={`${apiBaseUrl()}/records/shares/${encodeURIComponent(review.shareId)}/document`} target="_blank" rel="noopener noreferrer">Open shared report</a>
    <p>The report opens in a new tab. Access is checked again when opened; a revoked or expired share may no longer open even if this page is still visible.</p>
    <form className="wf-form" onSubmit={event => {
      event.preventDefault();
      mutation.run(async () => {
        const base = { expectedVersion: review.version, decision };
        // A rejection never transmits an unfinished guidance draft.
        let body: object = base;
        if (decision === 'APPROVED') {
          const trimmedSummary = summary.trim();
          const steps = guidanceLines(nextSteps, 'Next steps');
          if (!trimmedSummary || trimmedSummary.length > 4000 || !steps.length) throw new Error('Approval requires a summary of up to 4,000 characters and at least one next step.');
          const sourceRefs = sources.map(source => {
            const title = source.title.trim();
            const url = source.url.trim();
            let validUrl = false;
            try { const parsed = new URL(url); validUrl = parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { /* Validated below. */ }
            if (title.length < 2 || title.length > 160 || !validUrl || url.length > 2000) throw new Error('Every source needs a title of 2–160 characters and an HTTPS URL without credentials.');
            return { title, url };
          });
          body = { ...base, summary: trimmedSummary, questions: guidanceLines(questions, 'Questions'), nextSteps: steps, sourceRefs };
        }
        return apiRequest(`/preventive/work/report-reviews/${encodeURIComponent(review.id)}/review`, { method: 'POST', body: JSON.stringify(body) });
      }, () => saved(decision));
    }}>
      <fieldset className="preventive-staff-fields" disabled={mutation.busy}>
        <Field label="Decision"><select value={decision} onChange={event => setDecision(event.target.value as typeof decision)}><option value="APPROVED">Approve clinician-authored guidance</option><option value="REJECTED">Reject review without guidance</option></select></Field>
        {decision === 'APPROVED' ? <>
          <Field label="Summary" hint="Write your own follow-up guidance after reading the shared report. Maximum 4,000 characters."><textarea required maxLength={4000} rows={5} value={summary} onChange={event => setSummary(event.target.value)} /></Field>
          <Field label="Questions" hint="Optional. One question per line; up to 10, each at most 1,000 characters."><textarea rows={3} maxLength={10009} value={questions} onChange={event => setQuestions(event.target.value)} /></Field>
          <Field label="Next steps" hint="Required. One step per line; up to 10, each at most 1,000 characters."><textarea required rows={4} maxLength={10009} value={nextSteps} onChange={event => setNextSteps(event.target.value)} /></Field>
          <fieldset className="preventive-staff-sources"><legend>Supporting sources</legend><p>At least one source is required. Add up to 10 references supporting your guidance.</p>
            {sources.map((source, index) => <div className="preventive-staff-source" key={index}>
              <Field label={`Source title ${index + 1}`}><input required minLength={2} maxLength={160} value={source.title} onChange={event => updateSource(index, 'title', event.target.value)} /></Field>
              <Field label={`Source URL ${index + 1}`}><input required type="url" maxLength={2000} value={source.url} onChange={event => updateSource(index, 'url', event.target.value)} /></Field>
              <button type="button" className="health-button" disabled={sources.length === 1} aria-label={`Remove source ${index + 1}`} onClick={() => setSources(previous => previous.filter((_, i) => i !== index))}>Remove source</button>
            </div>)}
            <button type="button" className="health-button" disabled={sources.length >= 10} onClick={() => setSources(previous => [...previous, { title: '', url: '' }])}>Add source</button>
          </fieldset>
        </> : <p>Rejection closes this review without publishing guidance. Draft summary, questions, next steps and sources will not be sent.</p>}
      </fieldset>
      <p>Submitting records your final decision for version {review.version}. Final decisions cannot be edited. The server rechecks assignment, current sharing permission and unchanged report evidence.</p>
      <FormError message={mutation.error} />
      {mutation.error && <p>For changed work or lost access, use “Refresh reviews” to load your current permissions and version. Refreshing discards unsaved drafts.</p>}
      <SubmitButton busy={mutation.busy}>{decision === 'APPROVED' ? 'Approve guidance' : 'Reject review'}</SubmitButton>
    </form>
  </article>;
}

export function PreventiveReviewScreen() {
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState('');
  const resource = useApiResource<ReviewPage>(`/preventive/work/report-reviews?offset=${offset}&limit=${PAGE_SIZE}`);
  return <div className="preventive-staff-screen">
    <header className="wf-panel-heading"><div><span className="care-eyebrow">NMC CLINICIAN WORKSPACE</span><h2>Report follow-up reviews.</h2><p>Only reports assigned to your NMC doctor account with a current owner-granted share appear here. Admin or general staff access does not grant clinical review permission.</p></div><button className="health-button" disabled={resource.loading} onClick={resource.reload}>Refresh reviews</button></header>
    <section className="wf-card"><h3>Your current permission</h3><p>You may read the shared report and author follow-up guidance while both the assignment and share remain valid. Withdrawn requests, revoked or expired shares and completed decisions are removed from this queue.</p><p>Guidance is written by you; this workflow does not generate diagnoses, interpretations or prescriptions. Approval requires your summary, next steps and supporting HTTPS sources.</p><p>Refreshing or changing pages discards unsaved drafts. Final decisions are immutable.</p></section>
    <div role="status" aria-live="polite">{notice}</div>
    <DataState {...resource} retry={resource.reload}>
      {resource.data?.items.length ? <div className="preventive-staff-section">{resource.data.items.map(review => <ReviewForm key={`${review.id}-${review.version}`} review={review} saved={decision => { setNotice(decision === 'APPROVED' ? 'Guidance approved and saved.' : 'Review rejected without guidance.'); resource.reload(); }} />)}</div> : <EmptyState title="No reports ready for review." description="Your queue contains only assigned requests with a current share. Ask the owner or administrator to check sharing and assignment if an expected report is missing." />}
    </DataState>
    <nav className="preventive-staff-pagination" aria-label="Report review pages">
      <button className="health-button" disabled={resource.loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous reviews</button>
      <span>{resource.data ? resource.data.items.length ? `${resource.data.offset + 1}–${Math.min(resource.data.offset + resource.data.items.length, resource.data.total)} of ${resource.data.total}` : `No entries on this page (${resource.data.total} total)` : 'Page unavailable'}</span>
      <button className="health-button" disabled={resource.loading || !resource.data || offset + PAGE_SIZE >= resource.data.total || offset + PAGE_SIZE > 10000} onClick={() => setOffset(offset + PAGE_SIZE)}>Next reviews</button>
    </nav>
  </div>;
}
