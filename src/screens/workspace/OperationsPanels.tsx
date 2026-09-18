import React, { useState } from 'react';
import { ArrowRight, Plus, Trash2, Upload, Users, Video } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { AuditEvent, FollowUpTask, LiveCatalogItem, OpsSummary, StaffAccount, StaffAppointment, WorkRequest, displayDate, money } from '../../data/workflowTypes';
import { DataState, EmptyState, Field, FormError, Pagination, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ProviderConsultationDialog } from '../../components/health/ProviderConsultationDialog';
import { navigate } from '../../lib/workflowRouting';

const STATUS_ACTION_LABEL: Record<string, string> = {
  ACCEPTED: 'Accept request',
  DECLINED: 'Decline request',
  DISPATCHED: 'Mark dispatched',
  COMPLETED: 'Mark completed',
};

export function OperationsOverview() {
  const resource = useApiResource<OpsSummary>('/ops/summary');
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">RECORDED ACTIVITY, IN ONE VIEW</span><h2>Your operational overview.</h2><p>Counts come from the configured database. No sample activity is included.</p></div></div><DataState {...resource} retry={resource.reload}>{resource.data && <><div className="wf-metric-grid">{[{ label: 'Accounts', value: resource.data.accounts }, { label: 'Catalog entries', value: resource.data.catalogItems }, { label: 'Order requests', value: resource.data.orderRequests }, { label: 'Open support', value: resource.data.openSupport }].map(item => <article key={item.label} className="wf-metric-card"><span className="wf-metric-icon"><Users size={19} /></span><span>{item.label}</span><strong>{item.value.toLocaleString('en-IN')}</strong><small>From platform records</small></article>)}</div><section className="wf-card"><h3>Request status distribution</h3>{Object.keys(resource.data.statuses).length ? <div className="wf-status-chart">{Object.entries(resource.data.statuses).map(([status, count]) => <div key={status}><span>{status.replace(/_/g, ' ')}</span><progress max={Math.max(...Object.values(resource.data!.statuses))} value={count} aria-label={`${status}: ${count} requests`} /><strong>{count}</strong></div>)}</div> : <EmptyState title="No request activity yet." description="Requests will appear after customers submit them from an available catalog." />}</section><div className="wf-two-column wf-section-gap"><button className="wf-navigation-card" onClick={() => navigate('admin/accounts')}><Users size={24} /><strong>Set up your provider accounts.</strong><span>Create staff accounts with explicit roles. They sign in using verified contact details.</span><ArrowRight size={17} /></button><button className="wf-navigation-card wf-navigation-mint" onClick={() => navigate('admin/catalog')}><Plus size={24} /><strong>Publish actual services.</strong><span>Add products or service packages with an assigned provider and authoritative pricing.</span><ArrowRight size={17} /></button></div></>}</DataState></>;
}

export function AccountsPanel() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const resource = useApiResource<{ items: StaffAccount[]; total: number }>(`/ops/accounts?limit=15&offset=${page * 15}${query ? `&query=${encodeURIComponent(query)}` : ''}${roleFilter ? `&role=${roleFilter}` : ''}`);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState('VENDOR');
  const [channel, setChannel] = useState('EMAIL');
  const mutation = useMutation();
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">SERVER-ASSIGNED ACCESS</span><h2>Accounts & provider roles.</h2><p>Staff accounts are provisioned here. Public signup always creates a student account.</p></div><button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Create staff account</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
    <input
      type="search"
      placeholder="Search accounts by name or email/phone…"
      value={query}
      onChange={e => { setQuery(e.target.value); setPage(0); }}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', minWidth: '240px', flex: 1 }}
    />
    <select
      value={roleFilter}
      onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
    >
      <option value="">All roles</option>
      <option value="SUPER_ADMIN">Super Admin</option>
      <option value="VENDOR">Vendor / Partner</option>
      <option value="NMC_DOCTOR">Clinician</option>
      <option value="CAMPUS_ADMIN">Campus Admin</option>
      <option value="STUDENT">Student</option>
    </select>
  </div>
  <DataState {...resource} retry={resource.reload}><div className="wf-card wf-table-scroll"><table><thead><tr><th>Name</th><th>Verified at sign-in</th><th>Role</th><th>Status</th></tr></thead><tbody>{resource.data?.items.map(account => <tr key={account.id}><td>{account.fullName}</td><td>{account.identifier}</td><td>{account.role.replace(/_/g, ' ')}</td><td><span className="wf-status">{account.active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table></div>
  <Pagination page={page} total={resource.data?.total || 0} pageSize={15} onChange={setPage} />
  </DataState>{adding && <ShopDialog title="Create a staff account" onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/ops/accounts', { method: 'POST', body: JSON.stringify({ fullName: name, identifier, channel, role }) }), () => { setAdding(false); setName(''); setIdentifier(''); resource.reload(); }); }}><FormError message={mutation.error} /><Field label="Full name"><input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></Field><Field label="Role"><select value={role} onChange={event => setRole(event.target.value)}><option value="VENDOR">Vendor / lab partner</option><option value="NMC_DOCTOR">Clinician</option><option value="CAMPUS_ADMIN">Campus administrator</option></select></Field><Field label="Sign-in channel"><select value={channel} onChange={event => setChannel(event.target.value)}><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select></Field><Field label="Contact address"><input required type={channel === 'EMAIL' ? 'email' : 'tel'} maxLength={254} value={identifier} onChange={event => setIdentifier(event.target.value)} /></Field><p>The account holder must verify this contact address at login. Creating a clinician account does not independently validate a professional licence.</p><SubmitButton busy={mutation.busy}>Create account</SubmitButton></form></ShopDialog>}</>;
}

export function CatalogManagementPanel() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const resource = useApiResource<{ items: LiveCatalogItem[]; total: number }>(`/ops/catalog?limit=15&offset=${page * 15}${query ? `&query=${encodeURIComponent(query)}` : ''}`);
  const accounts = useApiResource<{ items: StaffAccount[] }>('/ops/accounts');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', kind: 'product', category: 'devices', description: '', pack: '', price: '', stock: '', providerId: '', preparation: '', requiresPrescription: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [itemImageUpload, setItemImageUpload] = useState<File | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const mutation = useMutation();
  const imageMutation = useMutation();
  const set = (key: string, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }));
  const providers = accounts.data?.items.filter(item => item.active && item.role === (form.kind === 'consultation' ? 'NMC_DOCTOR' : 'VENDOR')) || [];

  const handleUploadNewProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const { price, ...payload } = form;
    mutation.run(async () => {
      const created = await apiRequest<LiveCatalogItem>('/ops/catalog', {
        method: 'POST',
        body: JSON.stringify({ ...payload, stock: Number(form.stock || 0), pricePaise: Math.round(Number(price) * 100) }),
      });
      if (imageFile && created?.id) {
        const formData = new FormData();
        formData.append('file', imageFile);
        await apiRequest(`/ops/catalog/${created.id}/image`, {
          method: 'POST',
          body: formData,
        });
      }
    }, () => {
      setAdding(false);
      setImageFile(null);
      setForm({ name: '', brand: '', kind: 'product', category: 'devices', description: '', pack: '', price: '', stock: '', providerId: '', preparation: '', requiresPrescription: false });
      resource.reload();
    });
  };

  const handleRowImageUpload = (itemId: string) => {
    if (!itemImageUpload) return;
    const formData = new FormData();
    formData.append('file', itemImageUpload);
    imageMutation.run(async () => {
      await apiRequest(`/ops/catalog/${itemId}/image`, {
        method: 'POST',
        body: formData,
      });
    }, () => {
      setUploadingItemId(null);
      setItemImageUpload(null);
      resource.reload();
    });
  };

  const handleDeleteImage = (itemId: string) => {
    imageMutation.run(async () => {
      await apiRequest(`/ops/catalog/${itemId}/image`, { method: 'DELETE' });
    }, () => {
      resource.reload();
    });
  };

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">THE CATALOG YOUR CUSTOMERS SEE</span><h2>Products & care services.</h2><p>Entries are published from your database with an assigned provider and optional custom product image.</p></div><button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Add catalog entry</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
    <input
      type="search"
      placeholder="Search catalog by name, brand, or category…"
      value={query}
      onChange={e => { setQuery(e.target.value); setPage(0); }}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', minWidth: '240px', flex: 1 }}
    />
  </div>
  <FormError message={!adding ? (mutation.error || imageMutation.error) : ''} />
  <DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <><div className="wf-card wf-table-scroll"><table><thead><tr><th>Image</th><th>Entry</th><th>Type</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Photo & Actions</th></tr></thead><tbody>{resource.data.items.map(item => <tr key={item.id}><td style={{ width: '60px' }}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }} /> : <div style={{ width: '48px', height: '48px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '11px', textAlign: 'center' }}>No img</div>}</td><td><strong>{item.name}</strong><small>{item.brand}</small></td><td>{item.kind}</td><td>{money(item.pricePaise)}</td><td><input className="wf-stock-input" aria-label={`Stock for ${item.name}`} type="number" min="0" max="1000000" value={stockEdits[item.id] ?? String(item.stock)} onChange={event => setStockEdits(previous => ({ ...previous, [item.id]: event.target.value }))} /></td><td><span className="wf-status">{item.active ? 'Published' : 'Hidden'}</span></td><td><div className="wf-row-actions"><button className="health-button" disabled={mutation.busy || !/^[0-9]+$/.test(stockEdits[item.id] ?? String(item.stock))} onClick={() => mutation.run(() => apiRequest(`/ops/catalog/${item.id}`, { method: 'PATCH', body: JSON.stringify({ stock: Number(stockEdits[item.id] ?? item.stock), active: item.active }) }), resource.reload)}>Save stock</button><button className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/catalog/${item.id}`, { method: 'PATCH', body: JSON.stringify({ stock: item.stock, active: !item.active }) }), resource.reload)}>{item.active ? 'Hide' : 'Publish'}</button><button className="health-text-button" onClick={() => { setUploadingItemId(item.id); setItemImageUpload(null); }}><Upload size={13} style={{ display: 'inline', marginRight: 4 }} />Upload Photo</button>{item.imageUrl && <button className="wf-icon-button" title="Delete image" onClick={() => handleDeleteImage(item.id)}><Trash2 size={14} /></button>}</div></td></tr>)}</tbody></table></div>
  <Pagination page={page} total={resource.data?.total || 0} pageSize={15} onChange={setPage} />
  </> : <EmptyState title="Your catalog is empty." description="Create a provider account, then add actual products or services. Nothing is populated from sample data." />}</DataState>

  {uploadingItemId && <ShopDialog title="Upload Product Photo" onClose={() => setUploadingItemId(null)}><form className="wf-form" onSubmit={e => { e.preventDefault(); handleRowImageUpload(uploadingItemId); }}><Field label="Choose Image File (PNG, JPEG, WEBP · max 5 MB)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setItemImageUpload(e.target.files?.[0] || null)} /></Field>{itemImageUpload && <div style={{ marginTop: 8 }}><img src={URL.createObjectURL(itemImageUpload)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px' }} /></div>}<SubmitButton busy={imageMutation.busy} disabled={!itemImageUpload}>Upload Photo</SubmitButton></form></ShopDialog>}

  {adding && <ShopDialog title="Publish a catalog entry" onClose={() => setAdding(false)} wide><form className="wf-form" onSubmit={handleUploadNewProduct}><FormError message={mutation.error || accounts.error} /><div className="wf-form-grid"><Field label="Entry type"><select value={form.kind} onChange={event => { set('kind', event.target.value); set('providerId', ''); }}><option value="product">Product</option><option value="lab">Lab package</option><option value="consultation">Consultation</option></select></Field><Field label="Assigned provider"><select required value={form.providerId} onChange={event => set('providerId', event.target.value)}><option value="">Choose a provider</option>{providers.map(account => <option key={account.id} value={account.id}>{account.fullName}</option>)}</select></Field><Field label="Name"><input required minLength={2} maxLength={160} value={form.name} onChange={event => set('name', event.target.value)} /></Field><Field label="Brand or provider name"><input required maxLength={100} value={form.brand} onChange={event => set('brand', event.target.value)} /></Field><Field label="Category"><select value={form.category} onChange={event => set('category', event.target.value)}>{['devices', 'vitamins', 'skin', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Pack size or service details"><input required maxLength={160} value={form.pack} onChange={event => set('pack', event.target.value)} /></Field><Field label="Price (₹)"><input required type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={event => set('price', event.target.value)} /></Field><Field label="Available product stock"><input type="number" required min="0" max="1000000" step="1" value={form.stock} onChange={event => set('stock', event.target.value)} /></Field><Field label="Product Photo (Optional · PNG, JPEG, WEBP)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} /></Field></div>{imageFile && <div style={{ marginBottom: 12 }}><img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ maxHeight: 120, borderRadius: 8 }} /></div>}<Field label="Description"><textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={event => set('description', event.target.value)} /></Field><Field label="Preparation / service instructions"><textarea maxLength={1000} rows={2} value={form.preparation} onChange={event => set('preparation', event.target.value)} /></Field><label className="wf-checkbox"><input type="checkbox" checked={form.requiresPrescription} onChange={event => set('requiresPrescription', event.target.checked)} />Requires prescription review</label>{form.requiresPrescription && <p className="wf-notice">This entry can be viewed, but ordering stays unavailable until a prescription-review service is connected.</p>}{providers.length === 0 && <p className="wf-notice">Create an eligible provider account before publishing this service.</p>}<SubmitButton busy={mutation.busy}>Publish entry</SubmitButton></form></ShopDialog>}
  </>;
}

export function WorkRequestsPanel() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const resource = useApiResource<{ items: WorkRequest[]; total?: number }>(`/work/requests?limit=15&offset=${page * 15}${filter !== 'ALL' ? `&status=${filter}` : ''}`);
  const appointments = useApiResource<{ items: StaffAppointment[] }>('/work/appointments');
  const followups = useApiResource<{ items: FollowUpTask[] }>('/work/followups');
  const [tab, setTab] = useState<'requests' | 'appointments' | 'followups'>('requests');
  const mutation = useMutation();
  const items = resource.data?.items || [];

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">YOUR ASSIGNED CARE REQUESTS</span><h2>Requests & fulfilment.</h2><p>Updates are saved to the request and shown to the account holder.</p></div><Field label="Status"><select value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}>{['ALL', 'REQUESTED', 'ACCEPTED', 'DISPATCHED', 'COMPLETED', 'DECLINED', 'CANCELLED'].map(value => <option key={value}>{value}</option>)}</select></Field></div><FormError message={mutation.error} />
  <div className="wf-choice-row" style={{ marginBottom: 20 }} aria-label="Staff queue"><button aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>Service requests</button><button aria-pressed={tab === 'appointments'} onClick={() => setTab('appointments')}>Appointments</button><button aria-pressed={tab === 'followups'} onClick={() => setTab('followups')}>Follow-ups</button></div>
  {tab === 'requests' ? <DataState {...resource} retry={resource.reload}>{items.length ? <><div className="wf-order-list">{items.map(item => <article className="wf-card" key={item.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">REQUEST {item.orderId.slice(0, 8).toUpperCase()}</span><h3>{item.name}</h3></div><span className={`wf-status status-${item.status.toLowerCase()}`}>{item.status}</span></div><div className="wf-request-details"><div><span>Account holder</span><strong>{item.customer}</strong><small>{item.contact}</small></div><div><span>Request</span><strong>{item.quantity} × {money(item.pricePaise)}</strong><small>{displayDate(item.createdAt)}</small></div><div><span>Location</span><strong>{item.delivery.city} · {item.delivery.pincode}</strong><small>{item.delivery.mode === 'pickup' ? 'Provider pickup' : item.delivery.address}</small></div>{item.requestedSlot && <div><span>Requested time</span><strong>{displayDate(item.requestedSlot)}</strong></div>}</div><div className="wf-row-actions">{(item.status === 'REQUESTED' ? ['ACCEPTED', 'DECLINED'] : item.status === 'ACCEPTED' ? [item.kind === 'product' ? 'DISPATCHED' : 'COMPLETED'] : item.status === 'DISPATCHED' ? ['COMPLETED'] : []).map(status => <button key={status} className={`health-button ${status === 'ACCEPTED' ? 'health-button-primary' : ''}`} disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/work/requests/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }), resource.reload)}>{STATUS_ACTION_LABEL[status] || status.replace(/_/g, ' ')}</button>)}</div></article>)}</div><Pagination page={page} total={resource.data?.total || items.length} pageSize={15} onChange={setPage} /></> : <EmptyState title="No service requests assigned to you." description="Requests from your catalog will appear here for you to accept or decline." />}</DataState> : tab === 'appointments' ? <StaffAppointments resource={appointments} mutation={mutation} /> : <StaffFollowUps resource={followups} mutation={mutation} />}
</>;
}

function StaffAppointments({ resource, mutation }: { resource: { data: { items?: StaffAppointment[] } | null; loading: boolean; error: string; reload: () => void }; mutation: { busy: boolean; run: (t: () => Promise<any>, done?: () => void) => void } }) {
  const items = resource.data?.items || [];
  const [consulting, setConsulting] = useState<StaffAppointment | null>(null);
  return <DataState {...resource} retry={resource.reload}>
    {consulting && <ProviderConsultationDialog appointment={{ id: consulting.id, customer: consulting.customer }} onClose={() => setConsulting(null)} />}
    {items.length ? <div className="wf-order-list">
      {items.map(appt => <article className="wf-card" key={appt.id}>
        <div className="wf-panel-heading"><div><span className="care-eyebrow">APPOINTMENT {appt.id.slice(0, 8).toUpperCase()}</span><h3>{displayDate(appt.slotStart)}</h3></div><span className={`wf-status status-${appt.status.toLowerCase()}`}>{appt.status.replace(/_/g, ' ')}</span></div>
        <div className="wf-request-details">
          <div><span>Account holder</span><strong>{appt.customer}</strong><small>{appt.contact}</small></div>
          <div><span>Service</span><strong>{appt.catalogItemId}</strong><small>Provider {appt.providerId.slice(0, 8)}</small></div>
          <div><span>Slot</span><strong>{displayDate(appt.slotStart)}</strong><small>until {displayDate(appt.slotEnd)}</small></div>
        </div>
        <div className="wf-row-actions">
          {appt.status === 'REQUESTED' && <>
            <button className="health-button health-button-primary" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/work/appointments/${appt.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }), resource.reload)}>Confirm</button>
            <button className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/work/appointments/${appt.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }), resource.reload)}>Decline</button>
          </>}
          {appt.status === 'CONFIRMED' && <>
            <button className="health-button health-button-primary" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/work/appointments/${appt.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) }), resource.reload)}>Mark completed</button>
            <button className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/work/appointments/${appt.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'NO_SHOW' }) }), resource.reload)}>No-show</button>
            <button className="health-button" onClick={() => setConsulting(appt)}><Video size={16} />Join consultation</button>
          </>}
        </div>
      </article>)}
    </div> : <EmptyState title="No appointments assigned to you." description="Appointments booked on your services will appear here for confirmation." />}
  </DataState>;
}

function StaffFollowUps({ resource, mutation }: { resource: { data: { items?: FollowUpTask[] } | null; loading: boolean; error: string; reload: () => void }; mutation: { busy: boolean; run: (t: () => Promise<any>, done?: () => void) => void } }) {
  const items = resource.data?.items || [];
  return <DataState {...resource} retry={resource.reload}>
    {items.length ? <div className="wf-order-list">{items.map(task => <article className="wf-card" key={task.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">FOLLOW-UP {task.id.slice(0, 8).toUpperCase()}</span><h3>{task.note}</h3></div><span className={`wf-status ${task.status === 'OPEN' ? 'status-requested' : 'status-accepted'}`}>{task.status}</span></div><div className="wf-order-meta"><span>Order {task.orderId.slice(0, 8)}</span><small>Created {displayDate(task.createdAt)}</small></div>{task.status === 'OPEN' && <button className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/work/followups/${task.id}/resolve`, { method: 'POST' }), resource.reload)}>Mark resolved</button>}</article>)}</div> : <EmptyState title="No follow-up tasks." description="Overdue care requests generate follow-up tasks automatically on the 2-hour cycle." />}
  </DataState>;
}

export function AuditPanel() {
  const [page, setPage] = useState(0);
  const resource = useApiResource<{ items: AuditEvent[]; total?: number }>(`/ops/audit?limit=25&offset=${page * 25}`);
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">RECORDED PLATFORM CHANGES</span><h2>Workflow audit history.</h2><p>Actions are recorded with the authenticated actor and resource reference.</p></div></div><DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <><div className="wf-card wf-table-scroll"><table><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Resource</th></tr></thead><tbody>{resource.data.items.map(event => <tr key={event.id}><td>{displayDate(event.createdAt)}</td><td>{event.action.replace(/_/g, ' ')}</td><td><code>{event.actorId}</code></td><td><code>{event.resourceId}</code></td></tr>)}</tbody></table></div><Pagination page={page} total={resource.data?.total || resource.data.items.length} pageSize={25} onChange={setPage} /></> : <EmptyState title="No workflow events yet." description="Supported account, catalog, and request changes will be recorded here." />}</DataState></>;
}
