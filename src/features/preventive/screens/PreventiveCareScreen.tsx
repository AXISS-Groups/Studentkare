import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowRight, ExternalLink, FileCheck2, Leaf, Search, ShieldCheck, Syringe } from 'lucide-react';
import { apiRequest } from '@/data/services/http';
import { displayDate, money, type LiveDocument } from '@/data/types/workflowTypes';
import { useApiResource } from '@/hooks/api/useApiResource';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '@/components/interface/WorkflowUI';
import { navigate } from '@/lib/utils/workflowRouting';
import { VaccineDirectoryViewModel } from '../VaccineDirectoryViewModel';
import type { Page, PreventivePreferences, ProviderListing, ReportReview, Topic, VaccineOffering } from '../models';
import { influenzaSource } from '../providerResources';
import { ProviderResources } from './ProviderResources';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './preventive.css';

const sections = ['vaccines', 'reports', 'preferences'] as const;
type Section = typeof sections[number];
const titles: Record<Section, MessageKey> = { vaccines: 'assist.prev.section.vaccines', reports: 'assist.prev.section.reports', preferences: 'assist.prev.section.preferences' };
const topicLabels: Record<Topic, MessageKey> = { vaccines: 'assist.prev.topic.vaccines', 'seasonal-health': 'assist.prev.topic.seasonal', 'health-camps': 'assist.prev.topic.camps', wellbeing: 'assist.prev.topic.wellbeing' };
/** The view model's own messages; anything else (a server message) is shown as sent. */
const VM_ERRORS: Record<string, MessageKey> = {
  'Enter a valid six-digit Indian pincode.': 'assist.prev.pincodeInvalid',
  'Unable to load vaccine listings.': 'assist.prev.listingsFailed',
};
const REVIEW_STATUS: Record<string, MessageKey> = {
  REQUESTED: 'assist.prev.status.REQUESTED',
  ASSIGNED: 'assist.prev.status.ASSIGNED',
  APPROVED: 'assist.prev.status.APPROVED',
  REJECTED: 'assist.prev.status.REJECTED',
  WITHDRAWN: 'assist.prev.status.WITHDRAWN',
};

export const VaccineDirectory = observer(function VaccineDirectory() {
  const t = useT();
  const providers = useApiResource<Page<ProviderListing>>('/preventive/providers?limit=100');
  const [vm] = useState(() => new VaccineDirectoryViewModel(filters => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== '') params.set(key, String(value));
    return apiRequest<Page<VaccineOffering>>(`/preventive/vaccines?${params}`);
  }));
  useEffect(() => { void vm.search(); return vm.dispose; }, [vm]);

  return <section aria-labelledby="vaccine-title">
    <div className="wf-panel-heading"><div><h3 id="vaccine-title">{t('assist.prev.vaccineTitle')}</h3><p>{t('assist.prev.vaccineIntro')}</p></div></div>
    <form className="wf-card preventive-filter" onSubmit={event => { event.preventDefault(); void vm.search(); }}>
      <Field label={t('assist.prev.queryLabel')}><input type="search" maxLength={160} value={vm.query} onChange={event => vm.setQuery(event.target.value)} placeholder={t('assist.prev.queryPlaceholder')} /></Field>
      <Field label={t('assist.prev.pincodeLabel')}><input inputMode="numeric" maxLength={6} value={vm.pincode} onChange={event => vm.setPincode(event.target.value)} placeholder={t('assist.prev.pincodePlaceholder')} /></Field>
      <Field label={t('assist.prev.providerLabel')}><select value={vm.provider} onChange={event => vm.setProvider(event.target.value)}><option value="">{t('assist.prev.allProviders')}</option>{providers.data?.items.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
      <button type="submit" className="health-button health-button-primary" disabled={vm.loading}><Search size={16} aria-hidden="true" />{t('assist.prev.search')}</button>
    </form>
    {providers.error && <div className="wf-notice">{t('assist.prev.filtersFailed')}<button type="button" className="health-text-button" onClick={providers.reload}>{t('assist.prev.retryFilters')}</button></div>}
    <DataState loading={vm.loading} error={VM_ERRORS[vm.error] ? t(VM_ERRORS[vm.error]) : vm.error} retry={() => void vm.search(vm.offset)}>
      <p role="status" className="preventive-result-count">{t('assist.prev.found', { count: vm.total })}</p>
      {vm.items.length ? <div className="preventive-resource-grid">{vm.items.map(item => <article key={item.id} className="wf-card preventive-offering">
        <span className="wf-status">{item.availability === 'CONFIRMED' ? t('assist.prev.confirmed') : t('assist.prev.availabilityUnknown')}</span>
        <h3>{item.vaccineName}</h3><p>{item.providerName} · {item.region || item.pincode}</p>
        <strong>{item.pricePaise === null ? t('assist.prev.askPrice') : money(item.pricePaise)}</strong>
        <dl><dt>{t('assist.prev.verification')}</dt><dd>{t(`assist.prev.verify.${item.verificationStatus}` as MessageKey)}</dd><dt>{t('assist.prev.lastChecked')}</dt><dd>{item.lastVerifiedAt ? displayDate(item.lastVerifiedAt) : t('assist.prev.notVerified')}</dd><dt>{t('assist.prev.validUntil')}</dt><dd>{item.expiresAt ? displayDate(item.expiresAt) : t('assist.prev.notSupplied')}</dd></dl>
        <div className="wf-row-actions"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="health-button">{t('assist.prev.viewSource')}<ExternalLink size={14} aria-hidden="true" /></a>{item.bookingUrl && <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="health-button">{t('assist.prev.contactProvider')}<ExternalLink size={14} aria-hidden="true" /></a>}</div>
      </article>)}</div> : <EmptyState title={t('assist.prev.emptyTitle')} description={t('assist.prev.emptyBody')} />}
      {vm.total > vm.limit && <div className="wf-row-actions preventive-pagination"><button type="button" className="health-button" disabled={vm.offset === 0} onClick={() => void vm.search(vm.offset - vm.limit)}>{t('assist.prev.prevListings')}</button><span>{t('assist.prev.range', { from: vm.offset + 1, to: Math.min(vm.offset + vm.limit, vm.total), total: vm.total })}</span><button type="button" className="health-button" disabled={vm.offset + vm.limit >= vm.total} onClick={() => void vm.search(vm.offset + vm.limit)}>{t('assist.prev.nextListings')}</button></div>}
    </DataState>
    <div className="wf-notice preventive-section"><ShieldCheck size={20} aria-hidden="true" /><p>{t('assist.prev.missingRecordNote')}</p></div>
    <ProviderResources />
  </section>;
});

function ReportFollowUps() {
  const t = useT();
  const documents = useApiResource<{ items: LiveDocument[] }>('/health/documents');
  const [offset, setOffset] = useState(0);
  const reviews = useApiResource<Page<ReportReview>>(`/preventive/report-reviews?offset=${offset}&limit=20`);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const eligible = documents.data?.items.filter(doc => ['LAB', 'CAMP_REPORT', 'DISCHARGE_SUMMARY'].includes(doc.category)) || [];
  const titleFor = (id: string) => documents.data?.items.find(doc => doc.id === id)?.title || t('assist.prev.uploadedReport');
  return <section aria-labelledby="report-review-title">
    <div className="wf-panel-heading"><div><h3 id="report-review-title">{t('assist.prev.reportTitle')}</h3><p>{t('assist.prev.reportIntro')}</p></div><button type="button" className="health-button" onClick={() => navigate('records')}>{t('assist.prev.manageRecords')}<ArrowRight size={16} aria-hidden="true" /></button></div>
    <div className="wf-notice">{t('assist.prev.urgentNote')}</div>
    <DataState loading={documents.loading} error={documents.error} retry={documents.reload}>
      {eligible.length ? <form className="wf-card wf-form preventive-section" onSubmit={event => { event.preventDefault(); setNotice(''); mutation.run(() => apiRequest<ReportReview>('/preventive/report-reviews', { method: 'POST', body: JSON.stringify({ documentId: selected }) }), response => { setNotice(t('assist.prev.reviewRequested', { status: REVIEW_STATUS[response.status] ? t(REVIEW_STATUS[response.status]) : response.status })); reviews.reload(); }); }}>
        <Field label={t('assist.prev.reportLabel')}><select value={selected} required onChange={event => setSelected(event.target.value)}><option value="">{t('assist.prev.chooseReport')}</option>{eligible.map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></Field>
        <p>{t('assist.prev.shareFirst')}</p>
        <SubmitButton busy={mutation.busy} disabled={!selected}>{t('assist.prev.requestReview')}</SubmitButton>
      </form> : <EmptyState title={t('assist.prev.uploadTitle')} description={t('assist.prev.uploadBody')} action={t('assist.prev.openRecords')} onAction={() => navigate('records')} />}
    </DataState>
    <FormError message={mutation.error} />{notice && <p role="status" className="wf-notice">{notice}</p>}
    <div className="wf-panel-heading preventive-section"><h3>{t('assist.prev.yourRequests')}</h3><button type="button" className="health-button" onClick={reviews.reload}>{t('assist.prev.refreshReviews')}</button></div>
    <DataState loading={reviews.loading} error={reviews.error} retry={reviews.reload}>
      {reviews.data?.items.length ? <div className="preventive-stack">{reviews.data.items.map(review => <article key={review.id} className="wf-card">
        <div className="wf-panel-heading"><h3>{titleFor(review.documentId)}</h3><span className="wf-status">{REVIEW_STATUS[review.status] ? t(REVIEW_STATUS[review.status]) : review.status}</span></div>
        {review.status === 'APPROVED' && review.guidance ? <><p className="preventive-summary">{review.guidance.summary}</p><h4>{t('assist.prev.nextSteps')}</h4><ul>{review.guidance.nextSteps.map((step, i) => <li key={i}>{step}</li>)}</ul>{review.guidance.questions.length > 0 && <><h4>{t('assist.prev.questions')}</h4><ul>{review.guidance.questions.map((question, i) => <li key={i}>{question}</li>)}</ul></>}<div className="wf-row-actions">{review.guidance.sourceRefs.map((source, i) => <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.title}<ExternalLink size={13} aria-hidden="true" /></a>)}</div><p className="wf-fineprint">{t('assist.prev.reviewedOn', { date: review.reviewedAt ? displayDate(review.reviewedAt) : '' })}</p></> : <p>{review.status === 'WITHDRAWN' ? t('assist.prev.withdrawnBody') : review.status === 'REJECTED' ? t('assist.prev.rejectedBody') : t('assist.prev.awaitingBody')}</p>}
        {review.status !== 'WITHDRAWN' && <button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/preventive/report-reviews/${encodeURIComponent(review.id)}/withdraw`, { method: 'POST' }), () => { setNotice(t('assist.prev.withdrawn')); reviews.reload(); })}>{t('assist.prev.withdraw')}</button>}
      </article>)}</div> : <EmptyState title={t('assist.prev.noReviewsTitle')} description={t('assist.prev.noReviewsBody')} />}
      {reviews.data && reviews.data.total > 20 && <div className="wf-row-actions preventive-pagination"><button type="button" className="health-button" disabled={!offset} onClick={() => setOffset(offset - 20)}>{t('assist.prev.prevReviews')}</button><span>{t('assist.prev.range', { from: offset + 1, to: Math.min(offset + 20, reviews.data.total), total: reviews.data.total })}</span><button type="button" className="health-button" disabled={offset + 20 >= reviews.data.total} onClick={() => setOffset(offset + 20)}>{t('assist.prev.nextReviews')}</button></div>}
    </DataState>
  </section>;
}

function PreferenceForm({ initial }: { initial: PreventivePreferences }) {
  const t = useT();
  const [form, setForm] = useState(initial);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const toggleTopic = (topic: Topic) => setForm(previous => ({ ...previous, topics: previous.topics.includes(topic) ? previous.topics.filter(value => value !== topic) : [...previous.topics, topic] }));
  return <form className="wf-card wf-form" onSubmit={event => { event.preventDefault(); setNotice(''); mutation.run(() => apiRequest<PreventivePreferences>('/preventive/preferences', { method: 'PUT', body: JSON.stringify({ seasonalEducationEnabled: form.seasonalEducationEnabled, promotionsEnabled: form.promotionsEnabled, region: form.region, topics: form.topics }) }), result => { setForm(result); setNotice(t('assist.prev.prefsSaved')); }); }}>
    <h3>{t('assist.prev.prefsTitle')}</h3>
    <label className="preventive-check"><input type="checkbox" checked={form.seasonalEducationEnabled} onChange={event => setForm({ ...form, seasonalEducationEnabled: event.target.checked })} /><span><strong>{t('assist.prev.seasonalTitle')}</strong><small>{t('assist.prev.seasonalBody')}</small></span></label>
    <label className="preventive-check"><input type="checkbox" checked={form.promotionsEnabled} onChange={event => setForm({ ...form, promotionsEnabled: event.target.checked })} /><span><strong>{t('assist.prev.promoTitle')}</strong><small>{t('assist.prev.promoBody')}</small></span></label>
    <Field label={t('assist.prev.regionLabel')}><input value={form.region} maxLength={100} placeholder={t('assist.prev.regionPlaceholder')} onChange={event => setForm({ ...form, region: event.target.value })} /></Field>
    <fieldset className="preventive-topic-set"><legend>{t('assist.prev.topicsLegend')}</legend>{(Object.keys(topicLabels) as Topic[]).map(topic => <label key={topic}><input type="checkbox" checked={form.topics.includes(topic)} onChange={() => toggleTopic(topic)} />{t(topicLabels[topic])}</label>)}</fieldset>
    <p className="wf-fineprint">{t('assist.prev.prefsNote')}</p>
    <FormError message={mutation.error} />{notice && <p className="wf-notice" role="status">{notice}</p>}<SubmitButton busy={mutation.busy}>{t('assist.prev.savePrefs')}</SubmitButton>
  </form>;
}

function SeasonalPreferences() {
  const t = useT();
  const preferences = useApiResource<PreventivePreferences>('/preventive/preferences');
  return <section><div className="preventive-resource-grid preventive-section">
    <article className="wf-card"><Leaf size={24} aria-hidden="true" /><h3>{t('assist.prev.fluTitle')}</h3><p>{t('assist.prev.fluBody')}</p><a href={influenzaSource} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t('assist.prev.fluLink')}<ExternalLink size={14} aria-hidden="true" /></a><small className="preventive-source-date">{t('assist.prev.fluSource')}</small></article>
    <article className="wf-card"><h3>{t('assist.prev.moveTitle')}</h3><p>{t('assist.prev.moveBody')}</p><button type="button" className="health-button" onClick={() => navigate('movement')}>{t('assist.prev.openExercise')}<ArrowRight size={16} aria-hidden="true" /></button></article>
  </div><DataState loading={preferences.loading} error={preferences.error} retry={preferences.reload}>{preferences.data && <PreferenceForm initial={preferences.data} />}</DataState></section>;
}

export function PreventiveCareScreen() {
  const t = useT();
  const [section, setSection] = useState<Section>('vaccines');
  const icons = { vaccines: Syringe, reports: FileCheck2, preferences: Leaf };
  return <div className="preventive-care">
    <header className="preventive-hero"><span className="care-eyebrow">{t('assist.prev.eyebrow')}</span><h2>{t('assist.prev.title')}</h2><p>{t('assist.prev.intro')}</p></header>
    <nav className="preventive-sections" aria-label={t('assist.prev.sectionsLabel')}>{sections.map(value => { const Icon = icons[value]; return <button type="button" key={value} className="health-button" aria-current={section === value ? 'page' : undefined} onClick={() => setSection(value)}><Icon size={18} aria-hidden="true" />{t(titles[value])}</button>; })}</nav>
    {section === 'vaccines' ? <VaccineDirectory /> : section === 'reports' ? <ReportFollowUps /> : <SeasonalPreferences />}
  </div>;
}
