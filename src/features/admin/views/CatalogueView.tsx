import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Eye, Plus, Trash2, Upload } from 'lucide-react';
import type { LiveCatalogItem } from '@/data/workflowTypes';
import { money } from '@/data/workflowTypes';
import { DataState, EmptyState, Field, FormError, Pagination, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { AdminError, AdminLoading, AdminPage, AdminStats, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import '@/screens/workspace/operations-overview.css';
import { accountsRepository } from '../model/accountsRepository';
import { catalogueRepository } from '../model/catalogueRepository';
import { count } from '../model/format';
import { CATALOG_CATEGORIES } from '../model/types';
import { CATALOG_PAGE_SIZE, CatalogueViewModel } from '../viewmodels/CatalogueViewModel';

/** The summary above the catalogue, from the first 200 entries. */
const CatalogueSummary = observer(function CatalogueSummary({ vm }: { vm: CatalogueViewModel }) {
  if (vm.summaryLoading) return <AdminLoading label="Loading catalogue summary…" />;
  if (vm.summaryError || !vm.summary) return <AdminError title="Couldn’t load the catalogue summary" message={vm.summaryError} onRetry={vm.reloadSummary} />;
  const partial = vm.summaryIsPartial ? ` · first ${count(vm.sampled.length)}` : '';
  return <AdminStats label="Catalogue summary" stats={[
    { label: 'Entries', value: count(vm.summary.total), meta: 'Products and services' },
    { label: 'Products', value: count(vm.productCount), meta: `With stock tracked${partial}` },
    { label: 'Lab tests & services', value: count(vm.serviceCount), meta: `Labs, consultations, vaccines${partial}` },
    { label: 'Products out of stock', value: count(vm.outOfStockCount), meta: `Stock at 0${partial}` },
  ]} />;
});

/** Super Admin → Catalogue ops: products and services published to the marketplace. */
export const CatalogueView = observer(function CatalogueView() {
  const [vm] = useState(() => new CatalogueViewModel(catalogueRepository, accountsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Presentation state: which dialog is open, and the image files chosen in the file pickers.
  const [viewingItem, setViewingItem] = useState<LiveCatalogItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [itemImageUpload, setItemImageUpload] = useState<File | null>(null);
  const { form } = vm;

  const publishEntry = (event: React.FormEvent) => {
    event.preventDefault();
    void vm.publish(imageFile).then(published => { if (published) { setAdding(false); setImageFile(null); } });
  };

  const uploadRowImage = (itemId: string) => {
    if (!itemImageUpload) return;
    void vm.uploadImage(itemId, itemImageUpload).then(uploaded => { if (uploaded) { setUploadingItemId(null); setItemImageUpload(null); } });
  };

  return <AdminPage eyebrow="Gatekeeping" title="Catalogue ops" description="Products and services published to the marketplace, with their provider, price and stock."><CatalogueSummary vm={vm} /><LegacyPanel>
    <><div className="wf-panel-heading"><div><span className="care-eyebrow">THE CATALOG YOUR CUSTOMERS SEE</span><h2>Products & care services.</h2><p>Entries are published from your database with an assigned provider and optional custom product image.</p></div><button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Add catalog entry</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
    <input
      type="search"
      placeholder="Search catalog by name, brand, or category…"
      value={vm.query}
      onChange={e => vm.setQuery(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '240px', flex: 1 }}
    />
  </div>
  <FormError message={!adding ? (vm.actionError || vm.imageError) : ''} />
  <DataState loading={vm.listLoading} error={vm.listError} retry={vm.reloadList}>{vm.list?.items.length ? <><div className="wf-card wf-table-scroll"><table><thead><tr><th>Photo</th><th>Entry (Click for details)</th><th>Type</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{vm.list.items.map(item => <tr key={item.id}><td style={{ width: '60px' }}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} onClick={() => setViewingItem(item)} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--rule)', cursor: 'pointer' }} title="Click to view details" /> : <div onClick={() => setViewingItem(item)} style={{ width: '48px', height: '48px', background: 'var(--surface-2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '11px', textAlign: 'center', cursor: 'pointer' }}>No img</div>}</td><td><button type="button" onClick={() => setViewingItem(item)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'block' }} title="Click to view full details"><strong style={{ color: 'var(--action, #4f46e5)', textDecoration: 'underline', display: 'block', fontSize: 13 }}>{item.name}</strong><small style={{ color: 'var(--text-3)', display: 'block' }}>{item.brand} · {item.category}</small></button></td><td><span style={{ textTransform: 'capitalize', fontSize: 12 }}>{item.kind}</span></td><td><strong>{money(item.pricePaise)}</strong></td><td><input className="wf-stock-input" aria-label={`Stock for ${item.name}`} type="number" min="0" max="1000000" value={vm.stockText(item)} onChange={event => vm.editStock(item.id, event.target.value)} /></td><td><span className="wf-status">{item.active ? 'Published' : 'Hidden'}</span></td><td><div className="wf-row-actions"><button className="health-button" disabled={vm.saving || !vm.canSaveStock(item)} onClick={() => void vm.saveStock(item)}>Save stock</button><button className="health-text-button" disabled={vm.saving} onClick={() => void vm.togglePublished(item)}>{item.active ? 'Hide' : 'Publish'}</button><button className="health-text-button" title="View details" onClick={() => setViewingItem(item)}><Eye size={13} style={{ display: 'inline', marginRight: 3 }} />Details</button><button className="health-text-button" title="Change photo" onClick={() => { setUploadingItemId(item.id); setItemImageUpload(null); }}><Upload size={13} style={{ display: 'inline', marginRight: 3 }} />Photo</button>{item.imageUrl && <button className="wf-icon-button" title="Remove photo" onClick={() => void vm.removeImage(item.id)}><Trash2 size={13} /></button>}</div></td></tr>)}</tbody></table></div>
  <Pagination page={vm.page} total={vm.total} pageSize={CATALOG_PAGE_SIZE} onChange={vm.setPage} />
  </> : <EmptyState title="Your catalog is empty." description="Create a provider account, then add actual products or services. Nothing is populated from sample data." />}</DataState>

  {/* View Product Details Modal */}
  {viewingItem && <ShopDialog title={viewingItem.name} onClose={() => setViewingItem(null)} wide>
    <div style={{ display: 'grid', gridTemplateColumns: viewingItem.imageUrl ? '180px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
      {viewingItem.imageUrl && (
        <div>
          <img src={viewingItem.imageUrl} alt={viewingItem.name} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--rule)', objectFit: 'cover' }} />
        </div>
      )}
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span className="care-eyebrow" style={{ margin: 0 }}>{viewingItem.brand}</span>
          <span className="wf-status" style={{ fontSize: 11 }}>{viewingItem.kind.toUpperCase()}</span>
          <span className="wf-status" style={{ fontSize: 11 }}>{viewingItem.active ? 'PUBLISHED' : 'HIDDEN'}</span>
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 20, color: 'var(--ink)' }}>{viewingItem.name}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 12px 0' }}>{viewingItem.pack}</p>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 14 }}>
          {money(viewingItem.pricePaise)}
          {viewingItem.mrpPaise > viewingItem.pricePaise && (
            <span style={{ fontSize: 13, textDecoration: 'line-through', color: 'var(--text-3)', marginLeft: 8 }}>
              {money(viewingItem.mrpPaise)}
            </span>
          )}
        </div>
        <div style={{ backgroundColor: 'var(--surface-2)', borderRadius: 8, padding: 14, marginBottom: 14, border: '1px solid var(--rule)' }}>
          <strong style={{ display: 'block', fontSize: 12, color: 'var(--ink)', marginBottom: 4 }}>Description</strong>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{viewingItem.description}</p>
        </div>
        {viewingItem.preparation && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, padding: 14, marginBottom: 14, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <strong style={{ display: 'block', fontSize: 12, color: 'var(--positive, #10b981)', marginBottom: 4 }}>Service Instructions / Usage</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{viewingItem.preparation}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 12 }}>
          <div><span style={{ color: 'var(--text-3)' }}>Category:</span> <strong style={{ color: 'var(--text)' }}>{viewingItem.category}</strong></div>
          <div><span style={{ color: 'var(--text-3)' }}>Current Stock:</span> <strong style={{ color: 'var(--text)' }}>{viewingItem.stock}</strong></div>
          <div><span style={{ color: 'var(--text-3)' }}>Prescription:</span> <strong style={{ color: 'var(--text)' }}>{viewingItem.requiresPrescription ? 'Required' : 'Not required'}</strong></div>
          <div><span style={{ color: 'var(--text-3)' }}>Provider ID:</span> <code style={{ color: 'var(--text-2)' }}>{viewingItem.providerId.slice(0, 10)}…</code></div>
        </div>
      </div>
    </div>
  </ShopDialog>}

  {uploadingItemId && <ShopDialog title="Upload Product Photo" onClose={() => setUploadingItemId(null)}><form className="wf-form" onSubmit={e => { e.preventDefault(); uploadRowImage(uploadingItemId); }}><Field label="Choose Image File (PNG, JPEG, WEBP · max 5 MB)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setItemImageUpload(e.target.files?.[0] || null)} /></Field>{itemImageUpload && <div style={{ marginTop: 8 }}><img src={URL.createObjectURL(itemImageUpload)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px' }} /></div>}<SubmitButton busy={vm.imageBusy} disabled={!itemImageUpload}>Upload Photo</SubmitButton></form></ShopDialog>}

  {adding && <ShopDialog title="Publish a catalog entry" onClose={() => setAdding(false)} wide><form className="wf-form" onSubmit={publishEntry}><FormError message={vm.actionError || vm.accountsError} /><div className="wf-form-grid"><Field label="Entry type"><select value={form.kind} onChange={event => vm.setKind(event.target.value)}><option value="product">Product</option><option value="lab">Lab package</option><option value="consultation">Consultation</option></select></Field><Field label="Assigned provider"><select required value={form.providerId} onChange={event => vm.setField('providerId', event.target.value)}><option value="">Choose a provider</option>{vm.providers.map(account => <option key={account.id} value={account.id}>{account.fullName}</option>)}</select></Field><Field label="Name"><input required minLength={2} maxLength={160} value={form.name} onChange={event => vm.setField('name', event.target.value)} /></Field><Field label="Brand or provider name"><input required maxLength={100} value={form.brand} onChange={event => vm.setField('brand', event.target.value)} /></Field><Field label="Category"><select value={form.category} onChange={event => vm.setField('category', event.target.value)}>{CATALOG_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Pack size or service details"><input required maxLength={160} value={form.pack} onChange={event => vm.setField('pack', event.target.value)} /></Field><Field label="Price (₹)"><input required type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={event => vm.setField('price', event.target.value)} /></Field><Field label="Available product stock"><input type="number" required min="0" max="1000000" step="1" value={form.stock} onChange={event => vm.setField('stock', event.target.value)} /></Field><Field label="Product Photo (Upload PNG, JPEG, WEBP · max 5 MB)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} /></Field></div>{imageFile && <div style={{ marginBottom: 12, padding: 8, background: '#f3f4f6', borderRadius: 8 }}><span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Selected Photo Preview:</span><img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'contain' }} /></div>}<Field label="Description"><textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={event => vm.setField('description', event.target.value)} /></Field><Field label="Preparation / service instructions"><textarea maxLength={1000} rows={2} value={form.preparation} onChange={event => vm.setField('preparation', event.target.value)} /></Field><label className="wf-checkbox"><input type="checkbox" checked={form.requiresPrescription} onChange={event => vm.setField('requiresPrescription', event.target.checked)} />Requires prescription review</label>{form.requiresPrescription && <p className="wf-notice">This entry can be viewed, but ordering stays unavailable until a prescription-review service is connected.</p>}{vm.providers.length === 0 && <p className="wf-notice">Create an eligible provider account before publishing this service.</p>}<SubmitButton busy={vm.saving}>Publish entry</SubmitButton></form></ShopDialog>}
  </>
  </LegacyPanel></AdminPage>;
});
