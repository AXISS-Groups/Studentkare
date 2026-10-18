import React, { useState } from 'react';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../../components/interface/WorkflowUI';
import { apiRequest } from '../../../data/services/http';
import { displayDate, money, StaffAccount } from '../../../data/types/workflowTypes';
import { useApiResource } from '../../../hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import './preventive-staff.css';

type Translate = (key: MessageKey, vars?: Vars) => string;

type Page<T> = { items: T[]; total: number; offset: number; limit: number };
type Provenance = { sourceUrl: string; lastVerifiedAt: number | null; expiresAt: number | null; verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'EXPIRED'; active: boolean };
type Provider = Provenance & { id: string; name: string; bookingUrl: string | null };
type Offering = Provenance & { id: string; providerId: string; providerName: string; vaccineName: string; pincode: string; region: string; pricePaise: number | null; availability: 'UNKNOWN' | 'CONFIRMED'; currency: 'INR'; bookingUrl: string | null };
type PendingReview = { id: string; documentId: string; status: 'REQUESTED' | 'ASSIGNED'; version: number; assignedClinicianId: string | null; createdAt: number; updatedAt: number };
type EvidenceForm = { sourceUrl: string; lastVerifiedAt: string; expiresAt: string };
const PAGE_SIZE = 20;

function localDate(value: number | null | undefined) {
  if (value == null) return '';
  const date = new Date(value * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function timestamp(value: string, t: Translate) {
  if (!value) return null;
  const result = Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isFinite(result) || result <= 0) throw new Error(t('assist.ops.dateInvalid'));
  return result;
}

function httpsUrl(value: string, t: Translate) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && !url.username && !url.password && value.trim().length <= 2000) return value.trim();
  } catch { /* Report a field-specific validation message below. */ }
  throw new Error(t('assist.ops.urlInvalid'));
}

function evidenceForm(item?: Provenance): EvidenceForm {
  return { sourceUrl: item?.sourceUrl ?? '', lastVerifiedAt: localDate(item?.lastVerifiedAt), expiresAt: localDate(item?.expiresAt) };
}

function evidencePayload(form: EvidenceForm, t: Translate) {
  const lastVerifiedAt = timestamp(form.lastVerifiedAt, t);
  const expiresAt = timestamp(form.expiresAt, t);
  if (lastVerifiedAt != null && lastVerifiedAt > Date.now() / 1000) throw new Error(t('assist.ops.verifiedFuture'));
  if (lastVerifiedAt != null && expiresAt != null && expiresAt <= lastVerifiedAt) throw new Error(t('assist.ops.expiryOrder'));
  return { sourceUrl: httpsUrl(form.sourceUrl, t), lastVerifiedAt, expiresAt };
}

// Public offering values may be masked by provenance. Only explicitly changed
// fields belong in a PATCH; never write the public response back wholesale.
function changedFields<T extends object>(initial: T, current: T, payload: Record<keyof T, unknown>) {
  return Object.fromEntries((Object.keys(current) as (keyof T)[]).filter(key => current[key] !== initial[key]).map(key => [key, payload[key]]));
}

function EvidenceFields({ form, set }: { form: EvidenceForm; set: (key: keyof EvidenceForm, value: string) => void }) {
  const t = useT();
  return <>
    <Field label={t('assist.ops.sourceUrl')} hint={t('assist.ops.sourceUrlHint')}><input required type="url" maxLength={2000} value={form.sourceUrl} onChange={event => set('sourceUrl', event.target.value)} /></Field>
    <div className="wf-form-grid">
      <Field label={t('assist.ops.lastVerified')} hint={t('assist.ops.lastVerifiedHint')}><input type="datetime-local" value={form.lastVerifiedAt} onChange={event => set('lastVerifiedAt', event.target.value)} /></Field>
      <Field label={t('assist.ops.expires')} hint={t('assist.ops.expiresHint')}><input type="datetime-local" value={form.expiresAt} onChange={event => set('expiresAt', event.target.value)} /></Field>
    </div>
  </>;
}

function PageControls({ page, offset, setOffset, label, disabled = false }: { page: Page<unknown> | null; offset: number; setOffset: (offset: number) => void; label: string; disabled?: boolean }) {
  const t = useT();
  return <nav className="preventive-staff-pagination" aria-label={t('assist.ops.pages', { label })}>
    <button type="button" className="health-button" disabled={disabled || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>{t('assist.ops.previous', { label })}</button>
    <span>{page ? page.items.length ? t('assist.prev.range', { from: page.offset + 1, to: Math.min(page.offset + page.items.length, page.total), total: page.total }) : t('assist.ops.emptyPage', { total: page.total }) : t('assist.ops.pageUnavailable')}</span>
    <button type="button" className="health-button" disabled={disabled || !page || offset + PAGE_SIZE >= page.total || offset + PAGE_SIZE > 10000} onClick={() => setOffset(offset + PAGE_SIZE)}>{t('assist.ops.next', { label })}</button>
  </nav>;
}

function ProviderEditor({ provider, saved, cancel }: { provider?: Provider; saved: () => void; cancel: () => void }) {
  const t = useT();
  const [initial] = useState(() => ({ name: provider?.name ?? '', bookingUrl: provider?.bookingUrl ?? '', ...evidenceForm(provider) }));
  const [form, setForm] = useState(initial);
  const mutation = useMutation();
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  return <section className="wf-card preventive-staff-editor" aria-label={provider ? t('assist.ops.editProvider') : t('assist.ops.newProvider')}>
    <h3>{provider ? t('assist.ops.editNamed', { name: provider.name }) : t('assist.ops.newProvider')}</h3>
    <form className="wf-form" onSubmit={event => {
      event.preventDefault();
      mutation.run(async () => {
        const payload = { name: form.name.trim(), bookingUrl: form.bookingUrl.trim() ? httpsUrl(form.bookingUrl, t) : null, ...evidencePayload(form, t) };
        if (payload.name.length < 2) throw new Error(t('assist.ops.nameShort'));
        const body = provider ? changedFields(initial, form, payload) : payload;
        if (!Object.keys(body).length) throw new Error(t('assist.ops.noChange'));
        return apiRequest(`/preventive/ops/providers${provider ? `/${encodeURIComponent(provider.id)}` : ''}`, { method: provider ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      }, saved);
    }}>
      <fieldset disabled={mutation.busy} className="preventive-staff-fields">
        <Field label={t('assist.ops.providerName')}><input required minLength={2} maxLength={160} value={form.name} onChange={event => set('name', event.target.value)} /></Field>
        <Field label={t('assist.ops.bookingUrl')} hint={t('assist.ops.bookingUrlHint')}><input type="url" maxLength={2000} value={form.bookingUrl} onChange={event => set('bookingUrl', event.target.value)} /></Field>
        <EvidenceFields form={form} set={set} />
      </fieldset>
      <FormError message={mutation.error} />
      <div className="wf-row-actions"><SubmitButton busy={mutation.busy}>{provider ? t('assist.ops.saveProvider') : t('assist.ops.createProvider')}</SubmitButton><button type="button" className="health-button" disabled={mutation.busy} onClick={cancel}>{t('assist.ops.cancel')}</button></div>
    </form>
  </section>;
}

function OfferingEditor({ offering, saved, cancel }: { offering?: Offering; saved: () => void; cancel: () => void }) {
  const t = useT();
  const [providerOffset, setProviderOffset] = useState(0);
  const providers = useApiResource<Page<Provider>>(`/preventive/providers?offset=${providerOffset}&limit=${PAGE_SIZE}`);
  const [initial] = useState(() => ({ providerId: offering?.providerId ?? '', vaccineName: offering?.vaccineName ?? '', pincode: offering?.pincode ?? '', region: offering?.region ?? '', pricePaise: offering?.pricePaise == null ? '' : (offering.pricePaise / 100).toFixed(2), availability: offering?.availability ?? 'UNKNOWN', ...evidenceForm(offering) }));
  const [form, setForm] = useState(initial);
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(offering ? { id: offering.providerId, name: offering.providerName } : null);
  const mutation = useMutation();
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  return <section className="wf-card preventive-staff-editor" aria-label={offering ? t('assist.ops.editOffering') : t('assist.ops.newOffering')}>
    <h3>{offering ? t('assist.ops.editNamed', { name: offering.vaccineName }) : t('assist.ops.newOffering')}</h3>
    <p>{t('assist.ops.availabilityNote')}</p>
    {offering && <p>{t('assist.ops.expiryNote')}</p>}
    <form className="wf-form" onSubmit={event => {
      event.preventDefault();
      mutation.run(async () => {
        if (form.pricePaise && !/^\d+(\.\d{1,2})?$/.test(form.pricePaise)) throw new Error(t('assist.ops.priceInvalid'));
        const payload = { ...evidencePayload(form, t), providerId: form.providerId, vaccineName: form.vaccineName.trim(), pincode: form.pincode, region: form.region.trim(), pricePaise: form.pricePaise === '' ? null : Math.round(Number(form.pricePaise) * 100), availability: form.availability };
        if (!payload.providerId || payload.vaccineName.length < 2) throw new Error(t('assist.ops.offeringIncomplete'));
        if (payload.pricePaise != null && payload.pricePaise > 100000000) throw new Error(t('assist.ops.priceMax'));
        const body = offering ? changedFields(initial, form, payload) : payload;
        if (!Object.keys(body).length) throw new Error(t('assist.ops.noChange'));
        if (payload.availability === 'CONFIRMED' && (!offering || 'availability' in body || 'lastVerifiedAt' in body || 'expiresAt' in body) && (payload.lastVerifiedAt == null || payload.expiresAt == null || payload.expiresAt <= Date.now() / 1000)) throw new Error(t('assist.ops.confirmedNeeds'));
        return apiRequest(`/preventive/ops/vaccines${offering ? `/${encodeURIComponent(offering.id)}` : ''}`, { method: offering ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      }, saved);
    }}>
      <fieldset disabled={mutation.busy} className="preventive-staff-fields">
        <DataState {...providers} retry={providers.reload}>
          <Field label={t('assist.prev.providerLabel')} hint={t('assist.ops.providerHint')}><select required value={form.providerId} onChange={event => { set('providerId', event.target.value); setSelectedProvider(providers.data?.items.find(item => item.id === event.target.value) ?? null); }}>
            <option value="">{t('assist.ops.chooseProvider')}</option>
            {selectedProvider && !providers.data?.items.some(item => item.id === selectedProvider.id) && <option value={selectedProvider.id}>{selectedProvider.name}</option>}
            {providers.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></Field>
          {!providers.data?.total && <p>{t('assist.ops.needProvider')}</p>}
        </DataState>
        <PageControls page={providers.data} offset={providerOffset} setOffset={setProviderOffset} label={t('assist.ops.labelProviderChoices')} disabled={providers.loading} />
        <div className="wf-form-grid">
          <Field label={t('assist.ops.vaccineName')}><input required minLength={2} maxLength={160} value={form.vaccineName} onChange={event => set('vaccineName', event.target.value)} /></Field>
          <Field label={t('assist.ops.pincode')}><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={event => set('pincode', event.target.value)} /></Field>
          <Field label={t('assist.ops.region')}><input maxLength={100} value={form.region} onChange={event => set('region', event.target.value)} /></Field>
          <Field label={t('assist.ops.price')} hint={t('assist.ops.priceHint')}><input type="number" min="0" max="1000000" step="0.01" value={form.pricePaise} onChange={event => set('pricePaise', event.target.value)} /></Field>
        </div>
        <Field label={t('assist.ops.availability')}><select value={form.availability} onChange={event => set('availability', event.target.value)}><option value="UNKNOWN">{t('assist.ops.availability.UNKNOWN')}</option><option value="CONFIRMED">{t('assist.ops.availability.CONFIRMED')}</option></select></Field>
        <EvidenceFields form={form} set={set} />
      </fieldset>
      <FormError message={mutation.error} />
      <div className="wf-row-actions"><SubmitButton busy={mutation.busy} disabled={!form.providerId}>{offering ? t('assist.ops.saveOffering') : t('assist.ops.createOffering')}</SubmitButton><button type="button" className="health-button" disabled={mutation.busy} onClick={cancel}>{t('assist.ops.cancel')}</button></div>
    </form>
  </section>;
}

function AssignmentForm({ review, doctors, saved }: { review: PendingReview; doctors: StaffAccount[]; saved: () => void }) {
  const t = useT();
  const [clinicianId, setClinicianId] = useState(() => doctors.find(item => item.id === review.assignedClinicianId)?.id ?? '');
  const mutation = useMutation();
  return <article className="wf-card">
    <h4>{t('assist.review.report', { id: review.documentId })}</h4>
    <p><span className="wf-status">{t(`assist.prev.status.${review.status}` as MessageKey)}</span> · {t('assist.review.requestedMeta', { date: displayDate(review.createdAt), version: review.version })}</p>
    {review.assignedClinicianId && <p>{t('assist.ops.assignedTo', { name: doctors.find(item => item.id === review.assignedClinicianId)?.fullName ?? review.assignedClinicianId })}</p>}
    <form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest(`/preventive/ops/report-reviews/${encodeURIComponent(review.id)}/assign`, { method: 'POST', body: JSON.stringify({ clinicianId, expectedVersion: review.version }) }), saved); }}>
      <Field label={t('assist.ops.assignClinician')}><select required disabled={mutation.busy} value={clinicianId} onChange={event => setClinicianId(event.target.value)}><option value="">{t('assist.ops.chooseDoctor')}</option>{doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.fullName} · {doctor.identifier}</option>)}</select></Field>
      <FormError message={mutation.error} />
      {mutation.error && <p>{t('assist.ops.assignErrorHelp')}</p>}
      <SubmitButton busy={mutation.busy} disabled={!clinicianId}>{review.status === 'ASSIGNED' ? t('assist.ops.reassign') : t('assist.ops.assign')}</SubmitButton>
    </form>
  </article>;
}

export function PreventiveOperationsScreen() {
  const t = useT();
  const [providerOffset, setProviderOffset] = useState(0);
  const [offeringOffset, setOfferingOffset] = useState(0);
  const [reviewOffset, setReviewOffset] = useState(0);
  const providers = useApiResource<Page<Provider>>(`/preventive/providers?offset=${providerOffset}&limit=${PAGE_SIZE}`);
  const offerings = useApiResource<Page<Offering>>(`/preventive/vaccines?offset=${offeringOffset}&limit=${PAGE_SIZE}`);
  const reviews = useApiResource<Page<PendingReview>>(`/preventive/ops/report-reviews?offset=${reviewOffset}&limit=${PAGE_SIZE}`);
  const accounts = useApiResource<{ items: StaffAccount[] }>('/ops/accounts');
  const [providerEditor, setProviderEditor] = useState<Provider | 'new' | null>(null);
  const [offeringEditor, setOfferingEditor] = useState<Offering | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const doctors = accounts.data?.items.filter(item => item.active && item.role === 'NMC_DOCTOR') ?? [];
  const reloadListings = () => { providers.reload(); offerings.reload(); };
  const reloadReviews = () => { reviews.reload(); accounts.reload(); };

  return <div className="preventive-staff-screen">
    <header className="wf-panel-heading"><div><span className="care-eyebrow">{t('assist.ops.eyebrow')}</span><h2>{t('assist.ops.title')}</h2><p>{t('assist.ops.intro')}</p></div></header>
    <div role="status" aria-live="polite">{notice}</div>
    <FormError message={mutation.error} />
    <section aria-label={t('assist.ops.providerDirectory')} className="preventive-staff-section">
      <div className="wf-panel-heading"><div><h3>{t('assist.ops.providers')}</h3><p>{t('assist.ops.providersNote')}</p></div><div className="wf-row-actions"><button type="button" className="health-button" disabled={providers.loading || mutation.busy} onClick={reloadListings}>{t('assist.ops.refreshListings')}</button><button type="button" className="health-button health-button-primary" disabled={providerEditor !== null} onClick={() => { setNotice(''); setProviderEditor('new'); }}>{t('assist.ops.addProvider')}</button></div></div>
      {providerEditor && <ProviderEditor key={typeof providerEditor === 'string' ? 'new' : providerEditor.id} provider={typeof providerEditor === 'string' ? undefined : providerEditor} cancel={() => setProviderEditor(null)} saved={() => { setNotice(providerEditor === 'new' ? t('assist.ops.providerCreated') : t('assist.ops.providerUpdated')); setProviderEditor(null); reloadListings(); }} />}
      <DataState {...providers} retry={providers.reload}>
        {providers.data?.items.length ? <div className="preventive-staff-grid">{providers.data.items.map(provider => <article className="wf-card" key={provider.id}>
          <h4>{provider.name}</h4><p><span className="wf-status">{t(`assist.prev.verify.${provider.verificationStatus}` as MessageKey)}</span></p>
          <p>{t('assist.ops.verifiedOn', { date: provider.lastVerifiedAt == null ? t('assist.prev.notSupplied') : displayDate(provider.lastVerifiedAt) })}<br />{t('assist.ops.expiresOn', { date: provider.expiresAt == null ? t('assist.prev.notSupplied') : displayDate(provider.expiresAt) })}</p>
          <div className="wf-row-actions"><a href={provider.sourceUrl} target="_blank" rel="noopener noreferrer">{t('assist.ops.source')}</a>{provider.bookingUrl && <a href={provider.bookingUrl} target="_blank" rel="noopener noreferrer">{t('assist.ops.bookingPage')}</a>}</div>
          <div className="wf-row-actions"><button type="button" className="health-button" aria-label={t('assist.ops.editNamed', { name: provider.name })} disabled={providerEditor !== null || mutation.busy} onClick={() => setProviderEditor(provider)}>{t('assist.ops.edit')}</button><button type="button" className="health-button" aria-label={t('assist.ops.deactivateNamed', { name: provider.name })} disabled={mutation.busy || providerEditor !== null || offeringEditor !== null} onClick={() => { setNotice(''); mutation.run(() => apiRequest(`/preventive/ops/providers/${encodeURIComponent(provider.id)}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }), () => { setNotice(t('assist.ops.providerDeactivated')); reloadListings(); }); }}>{t('assist.ops.deactivate')}</button></div>
        </article>)}</div> : <EmptyState title={t('assist.ops.noProvidersTitle')} description={t('assist.ops.noProvidersBody')} />}
      </DataState>
      <PageControls page={providers.data} offset={providerOffset} setOffset={setProviderOffset} label={t('assist.ops.labelProviders')} disabled={providers.loading} />
    </section>
    <section aria-label={t('assist.ops.offerings')} className="preventive-staff-section">
      <div className="wf-panel-heading"><div><h3>{t('assist.ops.offerings')}</h3><p>{t('assist.ops.offeringsNote')}</p></div><button type="button" className="health-button health-button-primary" disabled={offeringEditor !== null} onClick={() => { setNotice(''); setOfferingEditor('new'); }}>{t('assist.ops.addOffering')}</button></div>
      {offeringEditor && <OfferingEditor key={typeof offeringEditor === 'string' ? 'new' : offeringEditor.id} offering={typeof offeringEditor === 'string' ? undefined : offeringEditor} cancel={() => setOfferingEditor(null)} saved={() => { setNotice(offeringEditor === 'new' ? t('assist.ops.offeringCreated') : t('assist.ops.offeringUpdated')); setOfferingEditor(null); offerings.reload(); }} />}
      <DataState {...offerings} retry={offerings.reload}>
        {offerings.data?.items.length ? <div className="preventive-staff-grid">{offerings.data.items.map(offering => <article className="wf-card" key={offering.id}>
          <h4>{offering.vaccineName}</h4><p>{offering.providerName} · {offering.pincode}{offering.region && ` · ${offering.region}`}</p>
          <p>{offering.pricePaise == null ? t('assist.ops.priceUnknown') : money(offering.pricePaise)} · {t('assist.ops.availabilityIs', { value: t(`assist.ops.availability.${offering.availability}` as MessageKey) })}</p>
          <p><span className="wf-status">{t(`assist.prev.verify.${offering.verificationStatus}` as MessageKey)}</span></p>
          <p>{t('assist.ops.verifiedOn', { date: offering.lastVerifiedAt == null ? t('assist.prev.notSupplied') : displayDate(offering.lastVerifiedAt) })}<br />{t('assist.ops.expiresOn', { date: offering.expiresAt == null ? t('assist.prev.notSupplied') : displayDate(offering.expiresAt) })}</p>
          <a href={offering.sourceUrl} target="_blank" rel="noopener noreferrer">{t('assist.ops.offeringSource')}</a>
          <div className="wf-row-actions"><button type="button" className="health-button" aria-label={t('assist.ops.editNamed', { name: offering.vaccineName })} disabled={offeringEditor !== null || mutation.busy} onClick={() => setOfferingEditor(offering)}>{t('assist.ops.edit')}</button><button type="button" className="health-button" aria-label={t('assist.ops.deactivateNamed', { name: offering.vaccineName })} disabled={mutation.busy || offeringEditor !== null} onClick={() => { setNotice(''); mutation.run(() => apiRequest(`/preventive/ops/vaccines/${encodeURIComponent(offering.id)}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }), () => { setNotice(t('assist.ops.offeringDeactivated')); offerings.reload(); }); }}>{t('assist.ops.deactivate')}</button></div>
        </article>)}</div> : <EmptyState title={t('assist.ops.noOfferingsTitle')} description={t('assist.ops.noOfferingsBody')} />}
      </DataState>
      <PageControls page={offerings.data} offset={offeringOffset} setOffset={setOfferingOffset} label={t('assist.ops.labelOfferings')} disabled={offerings.loading} />
    </section>
    <section aria-label={t('assist.ops.queue')} className="preventive-staff-section">
      <div className="wf-panel-heading"><div><h3>{t('assist.ops.assignments')}</h3><p>{t('assist.ops.assignNote1')}</p><p>{t('assist.ops.assignNote2')}</p></div><button type="button" className="health-button" disabled={reviews.loading || accounts.loading} onClick={reloadReviews}>{t('assist.ops.refreshAssignments')}</button></div>
      <DataState {...reviews} retry={reviews.reload}><DataState {...accounts} retry={accounts.reload}>
        {!doctors.length && <p>{t('assist.ops.noDoctors')}</p>}
        {reviews.data?.items.length ? <div className="preventive-staff-grid">{reviews.data.items.map(review => <AssignmentForm key={`${review.id}-${review.version}`} review={review} doctors={doctors} saved={() => { setNotice(t('assist.ops.assigned')); reviews.reload(); }} />)}</div> : <EmptyState title={t('assist.ops.noPendingTitle')} description={t('assist.ops.noPendingBody')} />}
      </DataState></DataState>
      <PageControls page={reviews.data} offset={reviewOffset} setOffset={setReviewOffset} label={t('assist.ops.labelAssignments')} disabled={reviews.loading || accounts.loading} />
    </section>
  </div>;
}
