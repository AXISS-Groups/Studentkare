import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowRight, ExternalLink, FileCheck2, Leaf, Search, ShieldCheck, Syringe } from 'lucide-react';
import { apiRequest } from '@/data/http';
import { displayDate, money, type LiveDocument } from '@/data/workflowTypes';
import { useApiResource } from '@/hooks/useApiResource';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '@/components/interface/WorkflowUI';
import { navigate } from '@/lib/workflowRouting';
import { VaccineDirectoryViewModel } from '../VaccineDirectoryViewModel';
import type { Page, PreventivePreferences, ProviderListing, ReportReview, Topic, VaccineOffering } from '../models';
import { influenzaSource } from '../providerResources';
import { ProviderResources } from './ProviderResources';
import './preventive.css';

const sections = ['vaccines', 'reports', 'preferences'] as const;
type Section = typeof sections[number];
const titles: Record<Section, string> = { vaccines: 'Vaccines & providers', reports: 'Report follow-up', preferences: 'Seasonal care & preferences' };
const topicLabels: Record<Topic, string> = { vaccines: 'Vaccines', 'seasonal-health': 'Seasonal health', 'health-camps': 'Health camps', wellbeing: 'Movement & wellbeing' };

export const VaccineDirectory = observer(function VaccineDirectory() {
  const providers = useApiResource<Page<ProviderListing>>('/preventive/providers?limit=100');
  const [vm] = useState(() => new VaccineDirectoryViewModel(filters => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== '') params.set(key, String(value));
    return apiRequest<Page<VaccineOffering>>(`/preventive/vaccines?${params}`);
  }));
  useEffect(() => { void vm.search(); return vm.dispose; }, [vm]);

  return <section aria-labelledby="vaccine-title">
    <div className="wf-panel-heading"><div><h3 id="vaccine-title">Find a vaccine provider.</h3><p>Compare sourced listings. Availability is a dated directory statement, not a booking or confirmation that a vaccine is right for you.</p></div></div>
    <form className="wf-card preventive-filter" onSubmit={event => { event.preventDefault(); void vm.search(); }}>
      <Field label="Vaccine or provider"><input type="search" maxLength={160} value={vm.query} onChange={event => vm.setQuery(event.target.value)} placeholder="e.g. influenza" /></Field>
      <Field label="Pincode (optional)"><input inputMode="numeric" maxLength={6} value={vm.pincode} onChange={event => vm.setPincode(event.target.value)} placeholder="6 digits" /></Field>
      <Field label="Provider"><select value={vm.provider} onChange={event => vm.setProvider(event.target.value)}><option value="">All providers</option>{providers.data?.items.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
      <button type="submit" className="health-button health-button-primary" disabled={vm.loading}><Search size={16} />Search listings</button>
    </form>
    {providers.error && <div className="wf-notice">Provider filters could not be loaded. Vaccine search is still available.<button className="health-text-button" onClick={providers.reload}>Retry filters</button></div>}
    <DataState loading={vm.loading} error={vm.error} retry={() => void vm.search(vm.offset)}>
      <p role="status" className="preventive-result-count">{vm.total} listing{vm.total === 1 ? '' : 's'} found</p>
      {vm.items.length ? <div className="preventive-resource-grid">{vm.items.map(item => <article key={item.id} className="wf-card preventive-offering">
        <span className="wf-status">{item.availability === 'CONFIRMED' ? 'Provider-confirmed listing' : 'Availability unknown'}</span>
        <h3>{item.vaccineName}</h3><p>{item.providerName} · {item.region || item.pincode}</p>
        <strong>{item.pricePaise === null ? 'Ask provider for price' : money(item.pricePaise)}</strong>
        <dl><dt>Listing verification</dt><dd>{item.verificationStatus.toLowerCase()}</dd><dt>Last checked</dt><dd>{item.lastVerifiedAt ? displayDate(item.lastVerifiedAt) : 'Not verified'}</dd><dt>Valid until</dt><dd>{item.expiresAt ? displayDate(item.expiresAt) : 'Not supplied'}</dd></dl>
        <div className="wf-row-actions"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="health-button">View source<ExternalLink size={14} /></a>{item.bookingUrl && <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="health-button">Contact provider<ExternalLink size={14} /></a>}</div>
      </article>)}</div> : <EmptyState title="No provider listings match yet." description="Try another vaccine name or pincode. Listings appear only after a provider source is entered; we do not invent stock, vaccine eligibility or discounts." />}
      {vm.total > vm.limit && <div className="wf-row-actions preventive-pagination"><button className="health-button" disabled={vm.offset === 0} onClick={() => void vm.search(vm.offset - vm.limit)}>Previous listings</button><span>{vm.offset + 1}–{Math.min(vm.offset + vm.limit, vm.total)} of {vm.total}</span><button className="health-button" disabled={vm.offset + vm.limit >= vm.total} onClick={() => void vm.search(vm.offset + vm.limit)}>Next listings</button></div>}
    </DataState>
    <div className="wf-notice preventive-section"><ShieldCheck size={20} /><p>A missing vaccination record does not mean a dose is due. Discuss your age, previous doses, allergies, medical history and local recommendations with a clinician.</p></div>
    <ProviderResources />
  </section>;
});

function ReportFollowUps() {
  const documents = useApiResource<{ items: LiveDocument[] }>('/health/documents');
  const [offset, setOffset] = useState(0);
  const reviews = useApiResource<Page<ReportReview>>(`/preventive/report-reviews?offset=${offset}&limit=20`);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const eligible = documents.data?.items.filter(doc => ['LAB', 'CAMP_REPORT', 'DISCHARGE_SUMMARY'].includes(doc.category)) || [];
  const titleFor = (id: string) => documents.data?.items.find(doc => doc.id === id)?.title || 'Uploaded report';
  return <section aria-labelledby="report-review-title">
    <div className="wf-panel-heading"><div><h3 id="report-review-title">Turn your report into a reviewed next step.</h3><p>Ask for a clinician review of a saved report. Any test, medication or exercise advice appears here only after approval. This is not an emergency service.</p></div><button className="health-button" onClick={() => navigate('records')}>Manage records & sharing<ArrowRight size={16} /></button></div>
    <div className="wf-notice">For severe symptoms such as difficulty breathing or chest pain, seek urgent medical care rather than waiting for a report review.</div>
    <DataState loading={documents.loading} error={documents.error} retry={documents.reload}>
      {eligible.length ? <form className="wf-card wf-form preventive-section" onSubmit={event => { event.preventDefault(); setNotice(''); mutation.run(() => apiRequest<ReportReview>('/preventive/report-reviews', { method: 'POST', body: JSON.stringify({ documentId: selected }) }), response => { setNotice(`Review ${response.status.toLowerCase().replace(/_/g, ' ')}. No diagnosis or prescription has been generated.`); reviews.reload(); }); }}>
        <Field label="Report to review"><select value={selected} required onChange={event => setSelected(event.target.value)}><option value="">Choose an uploaded report</option>{eligible.map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></Field>
        <p>First grant your clinician time-limited access in Health records → Share. The care team can then assign the review to that clinician. You can withdraw the request at any time.</p>
        <SubmitButton busy={mutation.busy} disabled={!selected}>Request clinician review</SubmitButton>
      </form> : <EmptyState title="Upload a report to get started." description="Lab reports, camp reports and discharge summaries can be submitted for review. We do not infer findings from filenames." action="Open health records" onAction={() => navigate('records')} />}
    </DataState>
    <FormError message={mutation.error} />{notice && <p role="status" className="wf-notice">{notice}</p>}
    <div className="wf-panel-heading preventive-section"><h3>Your review requests</h3><button className="health-button" onClick={reviews.reload}>Refresh reviews</button></div>
    <DataState loading={reviews.loading} error={reviews.error} retry={reviews.reload}>
      {reviews.data?.items.length ? <div className="preventive-stack">{reviews.data.items.map(review => <article key={review.id} className="wf-card">
        <div className="wf-panel-heading"><h3>{titleFor(review.documentId)}</h3><span className="wf-status">{review.status.replace(/_/g, ' ')}</span></div>
        {review.status === 'APPROVED' && review.guidance ? <><p className="preventive-summary">{review.guidance.summary}</p><h4>Next steps discussed with your clinician</h4><ul>{review.guidance.nextSteps.map((step, i) => <li key={i}>{step}</li>)}</ul>{review.guidance.questions.length > 0 && <><h4>Questions to discuss</h4><ul>{review.guidance.questions.map((question, i) => <li key={i}>{question}</li>)}</ul></>}<div className="wf-row-actions">{review.guidance.sourceRefs.map((source, i) => <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.title}<ExternalLink size={13} /></a>)}</div><p className="wf-fineprint">Clinician-reviewed {review.reviewedAt ? displayDate(review.reviewedAt) : ''}. Follow up with your clinician before changing treatment.</p></> : <p>{review.status === 'WITHDRAWN' ? 'You withdrew this request. No further review will be performed.' : review.status === 'REJECTED' ? 'This review was declined. Contact the care team for clarification.' : 'Awaiting clinician review. Automated medication or test recommendations are not published.'}</p>}
        {review.status !== 'WITHDRAWN' && <button className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/preventive/report-reviews/${encodeURIComponent(review.id)}/withdraw`, { method: 'POST' }), () => { setNotice('Review request withdrawn. Manage any separate document-sharing grant in Health records.'); reviews.reload(); })}>Withdraw review request</button>}
      </article>)}</div> : <EmptyState title="No report reviews yet." description="Submitted reviews appear here with their current status and any clinician-approved guidance." />}
      {reviews.data && reviews.data.total > 20 && <div className="wf-row-actions preventive-pagination"><button className="health-button" disabled={!offset} onClick={() => setOffset(offset - 20)}>Previous reviews</button><span>{offset + 1}–{Math.min(offset + 20, reviews.data.total)} of {reviews.data.total}</span><button className="health-button" disabled={offset + 20 >= reviews.data.total} onClick={() => setOffset(offset + 20)}>Next reviews</button></div>}
    </DataState>
  </section>;
}

function PreferenceForm({ initial }: { initial: PreventivePreferences }) {
  const [form, setForm] = useState(initial);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const toggleTopic = (topic: Topic) => setForm(previous => ({ ...previous, topics: previous.topics.includes(topic) ? previous.topics.filter(value => value !== topic) : [...previous.topics, topic] }));
  return <form className="wf-card wf-form" onSubmit={event => { event.preventDefault(); setNotice(''); mutation.run(() => apiRequest<PreventivePreferences>('/preventive/preferences', { method: 'PUT', body: JSON.stringify({ seasonalEducationEnabled: form.seasonalEducationEnabled, promotionsEnabled: form.promotionsEnabled, region: form.region, topics: form.topics }) }), result => { setForm(result); setNotice('Preferences saved. You can switch either option off and save to withdraw consent.'); }); }}>
    <h3>You choose what reaches you.</h3>
    <label className="preventive-check"><input type="checkbox" checked={form.seasonalEducationEnabled} onChange={event => setForm({ ...form, seasonalEducationEnabled: event.target.checked })} /><span><strong>Seasonal health education</strong><small>Opt in to source-reviewed seasonal health and vaccination information.</small></span></label>
    <label className="preventive-check"><input type="checkbox" checked={form.promotionsEnabled} onChange={event => setForm({ ...form, promotionsEnabled: event.target.checked })} /><span><strong>Provider promotions</strong><small>Separate, optional consent for relevant provider offers. Your report findings are not used to select adverts.</small></span></label>
    <Field label="Region (optional)"><input value={form.region} maxLength={100} placeholder="Your city or region" onChange={event => setForm({ ...form, region: event.target.value })} /></Field>
    <fieldset className="preventive-topic-set"><legend>Topics you want to hear about</legend>{(Object.keys(topicLabels) as Topic[]).map(topic => <label key={topic}><input type="checkbox" checked={form.topics.includes(topic)} onChange={() => toggleTopic(topic)} />{topicLabels[topic]}</label>)}</fieldset>
    <p className="wf-fineprint">Preferences are saved to your account. Seasonal campaigns and external push delivery are not active yet. These choices do not change appointment or medication reminders.</p>
    <FormError message={mutation.error} />{notice && <p className="wf-notice" role="status">{notice}</p>}<SubmitButton busy={mutation.busy}>Save preventive preferences</SubmitButton>
  </form>;
}

function SeasonalPreferences() {
  const preferences = useApiResource<PreventivePreferences>('/preventive/preferences');
  return <section><div className="preventive-resource-grid preventive-section">
    <article className="wf-card"><Leaf size={24} /><h3>Plan for seasonal flu.</h3><p>WHO recommends annual influenza vaccination, particularly for people at higher risk. In tropical regions, flu can circulate throughout the year. Ask your clinician about local timing and which vaccine is suitable for you.</p><a href={influenzaSource} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Read WHO guidance<ExternalLink size={14} /></a><small className="preventive-source-date">General education · WHO fact sheet, 28 February 2025 · checked 14 September 2026. Not a local outbreak alert.</small></article>
    <article className="wf-card"><h3>Movement that fits your day.</h3><p>Explore the exercise library and record your sessions. If you are unwell or recovering, discuss suitable activity with your clinician; a lab result alone cannot set your exercise plan.</p><button className="health-button" onClick={() => navigate('movement')}>Open exercise library<ArrowRight size={16} /></button></article>
  </div><DataState loading={preferences.loading} error={preferences.error} retry={preferences.reload}>{preferences.data && <PreferenceForm initial={preferences.data} />}</DataState></section>;
}

export function PreventiveCareScreen() {
  const [section, setSection] = useState<Section>('vaccines');
  const icons = { vaccines: Syringe, reports: FileCheck2, preferences: Leaf };
  return <div className="preventive-care">
    <header className="preventive-hero"><span className="care-eyebrow">PREVENTIVE CARE</span><h2>A little planning. More informed care.</h2><p>Find vaccine providers, follow up on your reports, and choose the health updates that matter to you.</p></header>
    <nav className="preventive-sections" aria-label="Preventive care sections">{sections.map(value => { const Icon = icons[value]; return <button key={value} className="health-button" aria-current={section === value ? 'page' : undefined} onClick={() => setSection(value)}><Icon size={18} />{titles[value]}</button>; })}</nav>
    {section === 'vaccines' ? <VaccineDirectory /> : section === 'reports' ? <ReportFollowUps /> : <SeasonalPreferences />}
  </div>;
}
