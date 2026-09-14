import React, { useState } from 'react';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../../components/interface/WorkflowUI';
import { apiRequest } from '../../../data/http';
import { displayDate, money, StaffAccount } from '../../../data/workflowTypes';
import { useApiResource } from '../../../hooks/useApiResource';
import './preventive-staff.css';

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

function timestamp(value: string) {
  if (!value) return null;
  const result = Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isFinite(result) || result <= 0) throw new Error('Enter a valid date after 1 January 1970.');
  return result;
}

function httpsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && !url.username && !url.password && value.trim().length <= 2000) return value.trim();
  } catch { /* Report a field-specific validation message below. */ }
  throw new Error('URLs must use HTTPS and must not contain a username or password.');
}

function evidenceForm(item?: Provenance): EvidenceForm {
  return { sourceUrl: item?.sourceUrl ?? '', lastVerifiedAt: localDate(item?.lastVerifiedAt), expiresAt: localDate(item?.expiresAt) };
}

function evidencePayload(form: EvidenceForm) {
  const lastVerifiedAt = timestamp(form.lastVerifiedAt);
  const expiresAt = timestamp(form.expiresAt);
  if (lastVerifiedAt != null && lastVerifiedAt > Date.now() / 1000) throw new Error('Verification cannot be in the future.');
  if (lastVerifiedAt != null && expiresAt != null && expiresAt <= lastVerifiedAt) throw new Error('Expiry must follow verification.');
  return { sourceUrl: httpsUrl(form.sourceUrl), lastVerifiedAt, expiresAt };
}

// Public offering values may be masked by provenance. Only explicitly changed
// fields belong in a PATCH; never write the public response back wholesale.
function changedFields<T extends object>(initial: T, current: T, payload: Record<keyof T, unknown>) {
  return Object.fromEntries((Object.keys(current) as (keyof T)[]).filter(key => current[key] !== initial[key]).map(key => [key, payload[key]]));
}

function EvidenceFields({ form, set }: { form: EvidenceForm; set: (key: keyof EvidenceForm, value: string) => void }) {
  return <>
    <Field label="Source URL" hint="Use the actual HTTPS page supporting this listing."><input required type="url" maxLength={2000} value={form.sourceUrl} onChange={event => set('sourceUrl', event.target.value)} /></Field>
    <div className="wf-form-grid">
      <Field label="Last verified" hint="Optional; your local date and time. Must not be in the future."><input type="datetime-local" value={form.lastVerifiedAt} onChange={event => set('lastVerifiedAt', event.target.value)} /></Field>
      <Field label="Verification expires" hint="Optional; your local date and time, after verification."><input type="datetime-local" value={form.expiresAt} onChange={event => set('expiresAt', event.target.value)} /></Field>
    </div>
  </>;
}

function PageControls({ page, offset, setOffset, label, disabled = false }: { page: Page<unknown> | null; offset: number; setOffset: (offset: number) => void; label: string; disabled?: boolean }) {
  return <nav className="preventive-staff-pagination" aria-label={`${label} pages`}>
    <button type="button" className="health-button" disabled={disabled || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous {label}</button>
    <span>{page ? page.items.length ? `${page.offset + 1}–${Math.min(page.offset + page.items.length, page.total)} of ${page.total}` : `No entries on this page (${page.total} total)` : 'Page unavailable'}</span>
    <button type="button" className="health-button" disabled={disabled || !page || offset + PAGE_SIZE >= page.total || offset + PAGE_SIZE > 10000} onClick={() => setOffset(offset + PAGE_SIZE)}>Next {label}</button>
  </nav>;
}

function ProviderEditor({ provider, saved, cancel }: { provider?: Provider; saved: () => void; cancel: () => void }) {
  const [initial] = useState(() => ({ name: provider?.name ?? '', bookingUrl: provider?.bookingUrl ?? '', ...evidenceForm(provider) }));
  const [form, setForm] = useState(initial);
  const mutation = useMutation();
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  return <section className="wf-card preventive-staff-editor" aria-label={provider ? 'Edit provider' : 'New provider'}>
    <h3>{provider ? `Edit ${provider.name}` : 'New provider'}</h3>
    <form className="wf-form" onSubmit={event => {
      event.preventDefault();
      mutation.run(async () => {
        const payload = { name: form.name.trim(), bookingUrl: form.bookingUrl.trim() ? httpsUrl(form.bookingUrl) : null, ...evidencePayload(form) };
        if (payload.name.length < 2) throw new Error('Provider name must contain at least two nonblank characters.');
        const body = provider ? changedFields(initial, form, payload) : payload;
        if (!Object.keys(body).length) throw new Error('Change at least one field before saving.');
        return apiRequest(`/preventive/ops/providers${provider ? `/${encodeURIComponent(provider.id)}` : ''}`, { method: provider ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      }, saved);
    }}>
      <fieldset disabled={mutation.busy} className="preventive-staff-fields">
        <Field label="Provider name"><input required minLength={2} maxLength={160} value={form.name} onChange={event => set('name', event.target.value)} /></Field>
        <Field label="Booking URL" hint="Optional HTTPS booking page. Clear to remove it."><input type="url" maxLength={2000} value={form.bookingUrl} onChange={event => set('bookingUrl', event.target.value)} /></Field>
        <EvidenceFields form={form} set={set} />
      </fieldset>
      <FormError message={mutation.error} />
      <div className="wf-row-actions"><SubmitButton busy={mutation.busy}>{provider ? 'Save provider changes' : 'Create provider'}</SubmitButton><button type="button" className="health-button" disabled={mutation.busy} onClick={cancel}>Cancel</button></div>
    </form>
  </section>;
}

function OfferingEditor({ offering, saved, cancel }: { offering?: Offering; saved: () => void; cancel: () => void }) {
  const [providerOffset, setProviderOffset] = useState(0);
  const providers = useApiResource<Page<Provider>>(`/preventive/providers?offset=${providerOffset}&limit=${PAGE_SIZE}`);
  const [initial] = useState(() => ({ providerId: offering?.providerId ?? '', vaccineName: offering?.vaccineName ?? '', pincode: offering?.pincode ?? '', region: offering?.region ?? '', pricePaise: offering?.pricePaise == null ? '' : (offering.pricePaise / 100).toFixed(2), availability: offering?.availability ?? 'UNKNOWN', ...evidenceForm(offering) }));
  const [form, setForm] = useState(initial);
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(offering ? { id: offering.providerId, name: offering.providerName } : null);
  const mutation = useMutation();
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  return <section className="wf-card preventive-staff-editor" aria-label={offering ? 'Edit vaccine offering' : 'New vaccine offering'}>
    <h3>{offering ? `Edit ${offering.vaccineName}` : 'New vaccine offering'}</h3>
    <p>Availability describes manually checked directory evidence, not reserved stock or clinical eligibility.</p>
    {offering && <p>Public prices can be hidden and availability downgraded when evidence expires. Unchanged fields are preserved when saving.</p>}
    <form className="wf-form" onSubmit={event => {
      event.preventDefault();
      mutation.run(async () => {
        if (form.pricePaise && !/^\d+(\.\d{1,2})?$/.test(form.pricePaise)) throw new Error('Enter a nonnegative price with up to two decimal places.');
        const payload = { ...evidencePayload(form), providerId: form.providerId, vaccineName: form.vaccineName.trim(), pincode: form.pincode, region: form.region.trim(), pricePaise: form.pricePaise === '' ? null : Math.round(Number(form.pricePaise) * 100), availability: form.availability };
        if (!payload.providerId || payload.vaccineName.length < 2) throw new Error('Choose a provider and enter a vaccine name with at least two nonblank characters.');
        if (payload.pricePaise != null && payload.pricePaise > 100000000) throw new Error('Price must not exceed ₹10,00,000.');
        const body = offering ? changedFields(initial, form, payload) : payload;
        if (!Object.keys(body).length) throw new Error('Change at least one field before saving.');
        if (payload.availability === 'CONFIRMED' && (!offering || 'availability' in body || 'lastVerifiedAt' in body || 'expiresAt' in body) && (payload.lastVerifiedAt == null || payload.expiresAt == null || payload.expiresAt <= Date.now() / 1000)) throw new Error('Confirmed availability requires a verification time and a future expiry.');
        return apiRequest(`/preventive/ops/vaccines${offering ? `/${encodeURIComponent(offering.id)}` : ''}`, { method: offering ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      }, saved);
    }}>
      <fieldset disabled={mutation.busy} className="preventive-staff-fields">
        <DataState {...providers} retry={providers.reload}>
          <Field label="Provider" hint="Choose an active persisted provider. Use the provider pages to see more providers."><select required value={form.providerId} onChange={event => { set('providerId', event.target.value); setSelectedProvider(providers.data?.items.find(item => item.id === event.target.value) ?? null); }}>
            <option value="">Choose a provider</option>
            {selectedProvider && !providers.data?.items.some(item => item.id === selectedProvider.id) && <option value={selectedProvider.id}>{selectedProvider.name}</option>}
            {providers.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></Field>
          {!providers.data?.total && <p>Create an active provider before adding an offering.</p>}
        </DataState>
        <PageControls page={providers.data} offset={providerOffset} setOffset={setProviderOffset} label="provider choices" disabled={providers.loading} />
        <div className="wf-form-grid">
          <Field label="Vaccine name"><input required minLength={2} maxLength={160} value={form.vaccineName} onChange={event => set('vaccineName', event.target.value)} /></Field>
          <Field label="Pincode"><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={event => set('pincode', event.target.value)} /></Field>
          <Field label="Region"><input maxLength={100} value={form.region} onChange={event => set('region', event.target.value)} /></Field>
          <Field label="Price (₹)" hint="Optional. Blank means unknown; zero means free. Stored as integer paise."><input type="number" min="0" max="1000000" step="0.01" value={form.pricePaise} onChange={event => set('pricePaise', event.target.value)} /></Field>
        </div>
        <Field label="Availability"><select value={form.availability} onChange={event => set('availability', event.target.value)}><option value="UNKNOWN">Unknown</option><option value="CONFIRMED">Manually confirmed</option></select></Field>
        <EvidenceFields form={form} set={set} />
      </fieldset>
      <FormError message={mutation.error} />
      <div className="wf-row-actions"><SubmitButton busy={mutation.busy} disabled={!form.providerId}>{offering ? 'Save offering changes' : 'Create offering'}</SubmitButton><button type="button" className="health-button" disabled={mutation.busy} onClick={cancel}>Cancel</button></div>
    </form>
  </section>;
}

function AssignmentForm({ review, doctors, saved }: { review: PendingReview; doctors: StaffAccount[]; saved: () => void }) {
  const [clinicianId, setClinicianId] = useState(doctors.some(item => item.id === review.assignedClinicianId) ? review.assignedClinicianId! : '');
  const mutation = useMutation();
  return <article className="wf-card">
    <h4>Report {review.documentId}</h4>
    <p><span className="wf-status">{review.status}</span> · Version {review.version} · Requested {displayDate(review.createdAt)}</p>
    {review.assignedClinicianId && <p>Assigned to {doctors.find(item => item.id === review.assignedClinicianId)?.fullName ?? review.assignedClinicianId}</p>}
    <form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest(`/preventive/ops/report-reviews/${encodeURIComponent(review.id)}/assign`, { method: 'POST', body: JSON.stringify({ clinicianId, expectedVersion: review.version }) }), saved); }}>
      <Field label="Assign clinician"><select required disabled={mutation.busy} value={clinicianId} onChange={event => setClinicianId(event.target.value)}><option value="">Choose an active NMC doctor</option>{doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.fullName} · {doctor.identifier}</option>)}</select></Field>
      <FormError message={mutation.error} />
      {mutation.error && <p>For missing consent, ask the record owner to share this document with the selected doctor. For stale work, refresh the queue before assigning again.</p>}
      <SubmitButton busy={mutation.busy} disabled={!clinicianId}>{review.status === 'ASSIGNED' ? 'Reassign review' : 'Assign review'}</SubmitButton>
    </form>
  </article>;
}

export function PreventiveOperationsScreen() {
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
    <header className="wf-panel-heading"><div><span className="care-eyebrow">PREVENTIVE CARE OPERATIONS</span><h2>Listings & report assignments.</h2><p>Super administrators maintain source-backed listings and assign pending reviews. Clinical decisions require an assigned NMC doctor with a current owner-granted share.</p></div></header>
    <div role="status" aria-live="polite">{notice}</div>
    <FormError message={mutation.error} />
    <section aria-label="Provider directory" className="preventive-staff-section">
      <div className="wf-panel-heading"><div><h3>Providers</h3><p>Only active listings are returned by the directory API. Deactivation also hides that provider’s offerings.</p></div><div className="wf-row-actions"><button className="health-button" disabled={providers.loading || mutation.busy} onClick={reloadListings}>Refresh listings</button><button className="health-button health-button-primary" disabled={providerEditor !== null} onClick={() => { setNotice(''); setProviderEditor('new'); }}>Add provider</button></div></div>
      {providerEditor && <ProviderEditor key={typeof providerEditor === 'string' ? 'new' : providerEditor.id} provider={typeof providerEditor === 'string' ? undefined : providerEditor} cancel={() => setProviderEditor(null)} saved={() => { setNotice(providerEditor === 'new' ? 'Provider created.' : 'Provider updated.'); setProviderEditor(null); reloadListings(); }} />}
      <DataState {...providers} retry={providers.reload}>
        {providers.data?.items.length ? <div className="preventive-staff-grid">{providers.data.items.map(provider => <article className="wf-card" key={provider.id}>
          <h4>{provider.name}</h4><p><span className="wf-status">{provider.verificationStatus}</span></p>
          <p>Verified: {provider.lastVerifiedAt == null ? 'Not supplied' : displayDate(provider.lastVerifiedAt)}<br />Expires: {provider.expiresAt == null ? 'Not supplied' : displayDate(provider.expiresAt)}</p>
          <div className="wf-row-actions"><a href={provider.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>{provider.bookingUrl && <a href={provider.bookingUrl} target="_blank" rel="noopener noreferrer">Booking page</a>}</div>
          <div className="wf-row-actions"><button className="health-button" aria-label={`Edit ${provider.name}`} disabled={providerEditor !== null || mutation.busy} onClick={() => setProviderEditor(provider)}>Edit</button><button className="health-button" aria-label={`Deactivate ${provider.name}`} disabled={mutation.busy || providerEditor !== null || offeringEditor !== null} onClick={() => { setNotice(''); mutation.run(() => apiRequest(`/preventive/ops/providers/${encodeURIComponent(provider.id)}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }), () => { setNotice('Provider deactivated. Its offerings are no longer publicly listed.'); reloadListings(); }); }}>Deactivate</button></div>
        </article>)}</div> : <EmptyState title="No providers on this page." description="Add a persisted provider with a source URL, or return to the previous page." />}
      </DataState>
      <PageControls page={providers.data} offset={providerOffset} setOffset={setProviderOffset} label="providers" disabled={providers.loading} />
    </section>
    <section aria-label="Vaccine offerings" className="preventive-staff-section">
      <div className="wf-panel-heading"><div><h3>Vaccine offerings</h3><p>Prices and availability below reflect public provenance checks. Deactivated entries are not listed.</p></div><button className="health-button health-button-primary" disabled={offeringEditor !== null} onClick={() => { setNotice(''); setOfferingEditor('new'); }}>Add offering</button></div>
      {offeringEditor && <OfferingEditor key={typeof offeringEditor === 'string' ? 'new' : offeringEditor.id} offering={typeof offeringEditor === 'string' ? undefined : offeringEditor} cancel={() => setOfferingEditor(null)} saved={() => { setNotice(offeringEditor === 'new' ? 'Offering created.' : 'Offering updated.'); setOfferingEditor(null); offerings.reload(); }} />}
      <DataState {...offerings} retry={offerings.reload}>
        {offerings.data?.items.length ? <div className="preventive-staff-grid">{offerings.data.items.map(offering => <article className="wf-card" key={offering.id}>
          <h4>{offering.vaccineName}</h4><p>{offering.providerName} · {offering.pincode}{offering.region && ` · ${offering.region}`}</p>
          <p>{offering.pricePaise == null ? 'Price unknown' : money(offering.pricePaise)} · Availability: {offering.availability.toLowerCase()}</p>
          <p><span className="wf-status">{offering.verificationStatus}</span></p>
          <p>Verified: {offering.lastVerifiedAt == null ? 'Not supplied' : displayDate(offering.lastVerifiedAt)}<br />Expires: {offering.expiresAt == null ? 'Not supplied' : displayDate(offering.expiresAt)}</p>
          <a href={offering.sourceUrl} target="_blank" rel="noopener noreferrer">Offering source</a>
          <div className="wf-row-actions"><button className="health-button" aria-label={`Edit ${offering.vaccineName}`} disabled={offeringEditor !== null || mutation.busy} onClick={() => setOfferingEditor(offering)}>Edit</button><button className="health-button" aria-label={`Deactivate ${offering.vaccineName}`} disabled={mutation.busy || offeringEditor !== null} onClick={() => { setNotice(''); mutation.run(() => apiRequest(`/preventive/ops/vaccines/${encodeURIComponent(offering.id)}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }), () => { setNotice('Offering deactivated.'); offerings.reload(); }); }}>Deactivate</button></div>
        </article>)}</div> : <EmptyState title="No offerings on this page." description="Add an offering for an active provider, or return to the previous page." />}
      </DataState>
      <PageControls page={offerings.data} offset={offeringOffset} setOffset={setOfferingOffset} label="offerings" disabled={offerings.loading} />
    </section>
    <section aria-label="Report assignment queue" className="preventive-staff-section">
      <div className="wf-panel-heading"><div><h3>Report review assignments</h3><p>The owner must already have shared this specific report with the selected doctor. Assignment does not create consent or provide administrators with report access. The server checks the live share on every assignment.</p><p>Doctor choices come from existing active NMC accounts (the accounts API returns up to 500 accounts). Share eligibility is checked on submission; this API does not expose an administrator share directory.</p></div><button className="health-button" disabled={reviews.loading || accounts.loading} onClick={reloadReviews}>Refresh assignments</button></div>
      <DataState {...reviews} retry={reviews.reload}><DataState {...accounts} retry={accounts.reload}>
        {!doctors.length && <p>No active NMC doctor accounts are available for assignment.</p>}
        {reviews.data?.items.length ? <div className="preventive-staff-grid">{reviews.data.items.map(review => <AssignmentForm key={`${review.id}-${review.version}`} review={review} doctors={doctors} saved={() => { setNotice('Review assigned. The doctor can access it only while the share remains current.'); reviews.reload(); }} />)}</div> : <EmptyState title="No pending report reviews." description="Requested and assigned reviews appear here while they await a clinical decision." />}
      </DataState></DataState>
      <PageControls page={reviews.data} offset={reviewOffset} setOffset={setReviewOffset} label="assignments" disabled={reviews.loading || accounts.loading} />
    </section>
  </div>;
}
