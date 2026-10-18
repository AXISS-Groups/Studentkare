import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Eye, Plus, Trash2, Upload } from 'lucide-react';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { money } from '@/data/types/workflowTypes';
import { DataState, EmptyState, Field, FormError, Pagination, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { AdminError, AdminLoading, AdminPage, AdminStats, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import '@/screens/workspace/operations-overview.css';
import { accountsRepository } from '../model/accountsRepository';
import { catalogueRepository } from '../model/catalogueRepository';
import { count } from '../model/format';
import { CATALOG_CATEGORIES } from '../model/types';
import { CATALOG_PAGE_SIZE, CatalogueViewModel } from '../viewmodels/CatalogueViewModel';

/** The summary above the catalogue, from the first 200 entries. */
const CatalogueSummary = observer(function CatalogueSummary({ vm }: { vm: CatalogueViewModel }) {
  const t = useT();
  if (vm.summaryLoading) return <AdminLoading label={t('admin.catalogue.summaryLoading')} />;
  if (vm.summaryError || !vm.summary) return <AdminError title={t('admin.catalogue.summaryError')} message={vm.summaryError} onRetry={vm.reloadSummary} />;
  const partial = vm.summaryIsPartial ? ` · ${t('admin.catalogue.firstN', { count: count(vm.sampled.length) })}` : '';
  return <AdminStats label={t('admin.catalogue.summary')} stats={[
    { label: t('admin.catalogue.statEntries'), value: count(vm.summary.total), meta: t('admin.catalogue.statEntriesMeta') },
    { label: t('admin.catalogue.statProducts'), value: count(vm.productCount), meta: `${t('admin.catalogue.statProductsMeta')}${partial}` },
    { label: t('admin.catalogue.statServices'), value: count(vm.serviceCount), meta: `${t('admin.catalogue.statServicesMeta')}${partial}` },
    { label: t('admin.catalogue.statOutOfStock'), value: count(vm.outOfStockCount), meta: `${t('admin.catalogue.statOutOfStockMeta')}${partial}` },
  ]} />;
});

/** Super Admin → Catalogue ops: products and services published to the marketplace. */
export const CatalogueView = observer(function CatalogueView() {
  const t = useT();
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

  return <AdminPage eyebrow={t('admin.eyebrow.gatekeeping')} title={t('admin.catalogue.title')} description={t('admin.catalogue.description')}><CatalogueSummary vm={vm} /><LegacyPanel>
    <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.catalogue.eyebrow')}</span><h2>{t('admin.catalogue.heading')}</h2><p>{t('admin.catalogue.intro')}</p></div><button type="button" className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />{t('admin.catalogue.add')}</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
    <input
      type="search"
      aria-label={t('admin.catalogue.search')}
      placeholder={t('admin.catalogue.searchPlaceholder')}
      value={vm.query}
      onChange={e => vm.setQuery(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '240px', minHeight: 44, flex: 1 }}
    />
  </div>
  <FormError message={!adding ? (vm.actionError || vm.imageError) : ''} />
  <DataState loading={vm.listLoading} error={vm.listError} retry={vm.reloadList}>{vm.list?.items.length ? <><div className="wf-card wf-table-scroll"><table><thead><tr><th>{t('admin.catalogue.colPhoto')}</th><th>{t('admin.catalogue.colEntry')}</th><th>{t('admin.catalogue.colType')}</th><th>{t('admin.catalogue.colPrice')}</th><th>{t('admin.catalogue.colStock')}</th><th>{t('admin.catalogue.colStatus')}</th><th>{t('admin.catalogue.colActions')}</th></tr></thead><tbody>{vm.list.items.map(item => <tr key={item.id}><td style={{ width: '60px' }}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--rule)' }} /> : <div style={{ width: '48px', height: '48px', background: 'var(--surface-2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '11px', textAlign: 'center' }}>{t('admin.catalogue.noImage')}</div>}</td><td><button type="button" onClick={() => setViewingItem(item)} style={{ background: 'none', border: 'none', padding: 0, minHeight: 44, textAlign: 'left', cursor: 'pointer', display: 'block' }} title={t('admin.catalogue.viewDetailsHint')}><strong style={{ color: 'var(--sk-color-action)', textDecoration: 'underline', display: 'block', fontSize: 13 }}>{item.name}</strong><small style={{ color: 'var(--text-3)', display: 'block' }}>{item.brand} · {item.category}</small></button></td><td><span style={{ textTransform: 'capitalize', fontSize: 12 }}>{item.kind}</span></td><td><strong>{money(item.pricePaise)}</strong></td><td><input className="wf-stock-input" aria-label={t('admin.catalogue.stockFor', { name: item.name })} type="number" min="0" max="1000000" value={vm.stockText(item)} onChange={event => vm.editStock(item.id, event.target.value)} /></td><td><span className="wf-status">{item.active ? t('admin.catalogue.published') : t('admin.catalogue.hidden')}</span></td><td><div className="wf-row-actions"><button type="button" className="health-button" disabled={vm.saving || !vm.canSaveStock(item)} onClick={() => void vm.saveStock(item)}>{t('admin.catalogue.saveStock')}</button><button type="button" className="health-text-button" disabled={vm.saving} onClick={() => void vm.togglePublished(item)}>{item.active ? t('admin.catalogue.hide') : t('admin.catalogue.publish')}</button><button type="button" className="health-text-button" title={t('admin.catalogue.viewDetails')} onClick={() => setViewingItem(item)}><Eye size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 3 }} />{t('admin.catalogue.details')}</button><button type="button" className="health-text-button" title={t('admin.catalogue.changePhoto')} onClick={() => { setUploadingItemId(item.id); setItemImageUpload(null); }}><Upload size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 3 }} />{t('admin.catalogue.photo')}</button>{item.imageUrl && <button type="button" className="wf-icon-button" title={t('admin.catalogue.removePhoto')} aria-label={t('admin.catalogue.removePhotoFor', { name: item.name })} style={{ minWidth: 44, minHeight: 44 }} onClick={() => void vm.removeImage(item.id)}><Trash2 size={13} aria-hidden="true" /></button>}</div></td></tr>)}</tbody></table></div>
  <Pagination page={vm.page} total={vm.total} pageSize={CATALOG_PAGE_SIZE} onChange={vm.setPage} />
  </> : <EmptyState title={t('admin.catalogue.empty')} description={t('admin.catalogue.emptyBody')} />}</DataState>

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
          <span className="wf-status" style={{ fontSize: 11 }}>{viewingItem.active ? t('admin.catalogue.published') : t('admin.catalogue.hidden')}</span>
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
          <strong style={{ display: 'block', fontSize: 12, color: 'var(--ink)', marginBottom: 4 }}>{t('admin.catalogue.descriptionLabel')}</strong>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{viewingItem.description}</p>
        </div>
        {viewingItem.preparation && (
          <div style={{ backgroundColor: 'var(--sk-color-positive-bg)', borderRadius: 8, padding: 14, marginBottom: 14, border: '1px solid var(--sk-color-positive)' }}>
            <strong style={{ display: 'block', fontSize: 12, color: 'var(--sk-color-positive)', marginBottom: 4 }}>{t('admin.catalogue.instructions')}</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{viewingItem.preparation}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 12 }}>
          <div><span style={{ color: 'var(--text-3)' }}>{t('admin.catalogue.categoryLabel')}</span> <strong style={{ color: 'var(--text)' }}>{viewingItem.category}</strong></div>
          <div><span style={{ color: 'var(--text-3)' }}>{t('admin.catalogue.stockLabel')}</span> <strong style={{ color: 'var(--text)' }}>{viewingItem.stock}</strong></div>
          <div><span style={{ color: 'var(--text-3)' }}>{t('admin.catalogue.prescriptionLabel')}</span> <strong style={{ color: 'var(--text)' }}>{viewingItem.requiresPrescription ? t('admin.catalogue.required') : t('admin.catalogue.notRequired')}</strong></div>
          <div><span style={{ color: 'var(--text-3)' }}>{t('admin.catalogue.providerLabel')}</span> <code style={{ color: 'var(--text-2)' }}>{viewingItem.providerId.slice(0, 10)}…</code></div>
        </div>
      </div>
    </div>
  </ShopDialog>}

  {uploadingItemId && <ShopDialog title={t('admin.catalogue.uploadTitle')} onClose={() => setUploadingItemId(null)}><form className="wf-form" onSubmit={e => { e.preventDefault(); uploadRowImage(uploadingItemId); }}><Field label={t('admin.catalogue.chooseImage')}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setItemImageUpload(e.target.files?.[0] || null)} /></Field>{itemImageUpload && <div style={{ marginTop: 8 }}><img src={URL.createObjectURL(itemImageUpload)} alt={t('admin.catalogue.preview')} style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px' }} /></div>}<SubmitButton busy={vm.imageBusy} disabled={!itemImageUpload}>{t('admin.catalogue.uploadSubmit')}</SubmitButton></form></ShopDialog>}

  {adding && <ShopDialog title={t('admin.catalogue.publishTitle')} onClose={() => setAdding(false)} wide><form className="wf-form" onSubmit={publishEntry}><FormError message={vm.actionError || vm.accountsError} /><div className="wf-form-grid"><Field label={t('admin.catalogue.entryType')}><select value={form.kind} onChange={event => vm.setKind(event.target.value)}><option value="product">{t('admin.catalogue.kindProduct')}</option><option value="lab">{t('admin.catalogue.kindLab')}</option><option value="consultation">{t('admin.catalogue.kindConsultation')}</option></select></Field><Field label={t('admin.catalogue.provider')}><select required value={form.providerId} onChange={event => vm.setField('providerId', event.target.value)}><option value="">{t('admin.catalogue.chooseProvider')}</option>{vm.providers.map(account => <option key={account.id} value={account.id}>{account.fullName}</option>)}</select></Field><Field label={t('admin.catalogue.name')}><input required minLength={2} maxLength={160} value={form.name} onChange={event => vm.setField('name', event.target.value)} /></Field><Field label={t('admin.catalogue.brand')}><input required maxLength={100} value={form.brand} onChange={event => vm.setField('brand', event.target.value)} /></Field><Field label={t('admin.catalogue.category')}><select value={form.category} onChange={event => vm.setField('category', event.target.value)}>{CATALOG_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field><Field label={t('admin.catalogue.pack')}><input required maxLength={160} value={form.pack} onChange={event => vm.setField('pack', event.target.value)} /></Field><Field label={t('admin.catalogue.price')}><input required type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={event => vm.setField('price', event.target.value)} /></Field><Field label={t('admin.catalogue.stock')}><input type="number" required min="0" max="1000000" step="1" value={form.stock} onChange={event => vm.setField('stock', event.target.value)} /></Field><Field label={t('admin.catalogue.photoField')}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} /></Field></div>{imageFile && <div style={{ marginBottom: 12, padding: 8, background: 'var(--sk-color-surface-2)', borderRadius: 8 }}><span style={{ fontSize: 11, color: 'var(--sk-color-text-3)', display: 'block', marginBottom: 4 }}>{t('admin.catalogue.selectedPreview')}</span><img src={URL.createObjectURL(imageFile)} alt={t('admin.catalogue.preview')} style={{ maxHeight: 120, borderRadius: 8, objectFit: 'contain' }} /></div>}<Field label={t('admin.catalogue.descriptionLabel')}><textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={event => vm.setField('description', event.target.value)} /></Field><Field label={t('admin.catalogue.preparation')}><textarea maxLength={1000} rows={2} value={form.preparation} onChange={event => vm.setField('preparation', event.target.value)} /></Field><label className="wf-checkbox"><input type="checkbox" checked={form.requiresPrescription} onChange={event => vm.setField('requiresPrescription', event.target.checked)} />{t('admin.catalogue.requiresRx')}</label>{form.requiresPrescription && <p className="wf-notice">{t('admin.catalogue.rxNotice')}</p>}{vm.providers.length === 0 && <p className="wf-notice">{t('admin.catalogue.noProvider')}</p>}<SubmitButton busy={vm.saving}>{t('admin.catalogue.publishSubmit')}</SubmitButton></form></ShopDialog>}
  </>
  </LegacyPanel></AdminPage>;
});
