import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage, Drawer, FormField, SkButton } from '@/design-system';
import type { ConsoleTableStatus, DataTableRow, SkTone, Stat } from '@/design-system';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { accountsRepository } from '../model/accountsRepository';
import { catalogueRepository } from '../model/catalogueRepository';
import { count } from '../model/format';
import { CATALOG_CATEGORIES } from '../model/types';
import type { CatalogPage } from '../model/types';
import { CATALOG_PAGE_SIZE, CatalogueViewModel } from '../viewmodels/CatalogueViewModel';
import { boardEmpty, boardError } from './AdminBoard';

/**
 * Super Admin > Catalogue ops (design: CatalogOps), on the console table page.
 *
 * Real entries from /ops/catalog with search and pages; figures from the first 200
 * entries. Each row opens a drawer with the entry's details, stock and photo, and can
 * be hidden or published again; "Add entry" opens the publishing form in a drawer. Not
 * shown: the board's Live / Pending review / Withdrawn tabs (no review state exists, and
 * the list is filtered on the server by search only), its "Ranked by" column and
 * ranking-inputs drawer (no ranking settings exist), and its sponsored-slot and
 * MRP-shown figures (nothing reports them).
 */

/** What the schedule column says for an entry: prescription status for products, otherwise the kind. */
const SCHEDULE: Record<LiveCatalogItem['kind'], { label: MessageKey; tone: SkTone }> = {
  product: { label: 'adminBoard.catalog.otc', tone: 'positive' },
  lab: { label: 'adminBoard.catalog.lab', tone: 'action' },
  consultation: { label: 'adminBoard.catalog.consult', tone: 'action' },
  vaccine: { label: 'adminBoard.catalog.vaccine', tone: 'action' },
};

function schedule(item: LiveCatalogItem): { label: MessageKey; tone: SkTone } {
  if (item.kind === 'product' && item.requiresPrescription) return { label: 'adminBoard.catalog.rx', tone: 'attention' };
  return SCHEDULE[item.kind] ?? SCHEDULE.product;
}

/** The entry's details, stock and photo (right-hand drawer). */
const EntryDrawer = observer(function EntryDrawer({ vm, item, onClose }: { vm: CatalogueViewModel; item: LiveCatalogItem; onClose: () => void }) {
  const t = useT();
  // The photo chosen in the file picker is presentation state.
  const [photo, setPhoto] = useState<File | null>(null);
  const error = vm.actionError || vm.imageError;
  return <Drawer open title={item.name} eyebrow={`${item.brand} · ${item.kind}`} subtitle={item.pack} busy={vm.saving || vm.imageBusy} onClose={onClose}>
    <div className="sk-board-drawer">
      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : null}
      <p className="sk-board-card__text">{item.description}</p>
      {item.preparation ? <p className="sk-board-card__text"><strong>{t('admin.catalogue.instructions')}</strong> {item.preparation}</p> : null}
      <dl className="sk-board-facts">
        <div><dt>{t('admin.catalogue.colPrice')}</dt><dd>{money(item.pricePaise)}</dd></div>
        <div><dt>{t('adminBoard.catalog.mrp')}</dt><dd>{item.mrpPaise > 0 ? money(item.mrpPaise) : '—'}</dd></div>
        <div><dt>{t('admin.catalogue.categoryLabel')}</dt><dd>{item.category}</dd></div>
        <div><dt>{t('admin.catalogue.prescriptionLabel')}</dt><dd>{item.requiresPrescription ? t('admin.catalogue.required') : t('admin.catalogue.notRequired')}</dd></div>
        <div><dt>{t('admin.catalogue.colStatus')}</dt><dd>{item.active ? t('admin.catalogue.published') : t('admin.catalogue.hidden')}</dd></div>
        <div><dt>{t('admin.catalogue.providerLabel')}</dt><dd className="sk-mono">{item.providerId}</dd></div>
      </dl>
      <div className="sk-board-row">
        <FormField label={t('admin.catalogue.stockFor', { name: item.name })}>
          <input type="number" min="0" max="1000000" value={vm.stockText(item)} onChange={event => vm.editStock(item.id, event.target.value)} />
        </FormField>
        <SkButton variant="secondary" disabled={vm.saving || !vm.canSaveStock(item)} onClick={() => void vm.saveStock(item)}>{t('admin.catalogue.saveStock')}</SkButton>
      </div>
      <form className="sk-board-form" onSubmit={event => { event.preventDefault(); if (photo) void vm.uploadImage(item.id, photo).then(done => { if (done) setPhoto(null); }); }}>
        <FormField label={t('admin.catalogue.chooseImage')}>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setPhoto(event.target.files?.[0] ?? null)} />
        </FormField>
        {photo ? <img src={URL.createObjectURL(photo)} alt={t('admin.catalogue.preview')} /> : null}
        <div className="sk-board-actions">
          <SkButton type="submit" variant="secondary" busy={vm.imageBusy} disabled={!photo}>{t('admin.catalogue.uploadSubmit')}</SkButton>
          {item.imageUrl ? <SkButton variant="secondary" disabled={vm.imageBusy} onClick={() => void vm.removeImage(item.id)}>{t('admin.catalogue.removePhoto')}</SkButton> : null}
        </div>
      </form>
      {error ? <p className="sk-board-error" role="alert">{error}</p> : null}
      <SkButton variant={item.active ? 'secondary' : 'primary'} busy={vm.saving} onClick={() => void vm.togglePublished(item)}>{item.active ? t('admin.catalogue.hide') : t('admin.catalogue.publish')}</SkButton>
    </div>
  </Drawer>;
});

/** Publishing a new entry (right-hand drawer). */
const AddEntryDrawer = observer(function AddEntryDrawer({ vm, onClose }: { vm: CatalogueViewModel; onClose: () => void }) {
  const t = useT();
  const [photo, setPhoto] = useState<File | null>(null);
  const { form } = vm;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void vm.publish(photo).then(published => { if (published) { setPhoto(null); onClose(); } });
  };
  return <Drawer open title={t('admin.catalogue.publishTitle')} subtitle={t('admin.catalogue.intro')} busy={vm.saving} onClose={onClose}>
    <form className="sk-board-form" onSubmit={submit}>
      {vm.actionError || vm.accountsError ? <p className="sk-board-error" role="alert">{vm.actionError || vm.accountsError}</p> : null}
      <FormField label={t('admin.catalogue.entryType')}>
        <select value={form.kind} onChange={event => vm.setKind(event.target.value)}>
          <option value="product">{t('admin.catalogue.kindProduct')}</option>
          <option value="lab">{t('admin.catalogue.kindLab')}</option>
          <option value="consultation">{t('admin.catalogue.kindConsultation')}</option>
        </select>
      </FormField>
      <FormField label={t('admin.catalogue.provider')} hint={vm.providers.length === 0 ? t('admin.catalogue.noProvider') : undefined}>
        <select required value={form.providerId} onChange={event => vm.setField('providerId', event.target.value)}>
          <option value="">{t('admin.catalogue.chooseProvider')}</option>
          {vm.providers.map(account => <option key={account.id} value={account.id}>{account.fullName}</option>)}
        </select>
      </FormField>
      <FormField label={t('admin.catalogue.name')}><input required minLength={2} maxLength={160} value={form.name} onChange={event => vm.setField('name', event.target.value)} /></FormField>
      <FormField label={t('admin.catalogue.brand')}><input required maxLength={100} value={form.brand} onChange={event => vm.setField('brand', event.target.value)} /></FormField>
      <FormField label={t('admin.catalogue.category')}>
        <select value={form.category} onChange={event => vm.setField('category', event.target.value)}>{CATALOG_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
      </FormField>
      <FormField label={t('admin.catalogue.pack')}><input required maxLength={160} value={form.pack} onChange={event => vm.setField('pack', event.target.value)} /></FormField>
      <div className="sk-board-row">
        <FormField label={t('admin.catalogue.price')}><input required type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={event => vm.setField('price', event.target.value)} /></FormField>
        <FormField label={t('admin.catalogue.stock')}><input required type="number" min="0" max="1000000" step="1" value={form.stock} onChange={event => vm.setField('stock', event.target.value)} /></FormField>
      </div>
      <FormField label={t('admin.catalogue.photoField')}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setPhoto(event.target.files?.[0] ?? null)} /></FormField>
      {photo ? <img className="sk-board-preview" src={URL.createObjectURL(photo)} alt={t('admin.catalogue.preview')} /> : null}
      <FormField label={t('admin.catalogue.descriptionLabel')}><textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={event => vm.setField('description', event.target.value)} /></FormField>
      <FormField label={t('admin.catalogue.preparation')}><textarea maxLength={1000} rows={2} value={form.preparation} onChange={event => vm.setField('preparation', event.target.value)} /></FormField>
      <label className="sk-board-check"><input type="checkbox" checked={form.requiresPrescription} onChange={event => vm.setField('requiresPrescription', event.target.checked)} />{t('admin.catalogue.requiresRx')}</label>
      {form.requiresPrescription ? <p className="sk-board-hint">{t('admin.catalogue.rxNotice')}</p> : null}
      <SkButton type="submit" busy={vm.saving}>{t('admin.catalogue.publishSubmit')}</SkButton>
    </form>
  </Drawer>;
});

/** Super Admin > Catalogue ops: products and services published to the marketplace. */
export const CatalogueView = observer(function CatalogueView() {
  const t = useT();
  const [vm] = useState(() => new CatalogueViewModel(catalogueRepository, accountsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Presentation state: which drawer is open.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // The view model clears the page while the next one loads; the screen keeps showing the
  // last page meanwhile, so typing in the search box never swaps the table for a skeleton.
  const shown = useRef<CatalogPage | null>(null);
  if (vm.list) shown.current = vm.list;
  const list = shown.current;
  const items = list?.items ?? [];
  const total = list?.total ?? 0;
  const viewing = items.find(item => item.id === viewingId) ?? null;

  const status: ConsoleTableStatus = vm.listError ? 'error' : !list ? 'loading' : 'ready';
  const searching = vm.query.trim() !== '';
  const partial = vm.summaryIsPartial ? ` · ${t('admin.catalogue.firstN', { count: count(vm.sampled.length) })}` : '';
  const summary = vm.summary;
  const stats: Stat[] = [
    { label: t('admin.catalogue.statEntries'), value: summary ? count(summary.total) : null, meta: summary ? t('admin.catalogue.statEntriesMeta') : t('admin.stat.unreported') },
    { label: t('admin.catalogue.statProducts'), value: summary ? count(vm.productCount) : null, meta: summary ? `${t('admin.catalogue.statProductsMeta')}${partial}` : undefined },
    { label: t('admin.catalogue.statServices'), value: summary ? count(vm.serviceCount) : null, meta: summary ? `${t('admin.catalogue.statServicesMeta')}${partial}` : undefined },
    { label: t('admin.catalogue.statOutOfStock'), value: summary ? count(vm.outOfStockCount) : null, tone: vm.outOfStockCount > 0 ? 'attention' : 'text', meta: summary ? `${t('admin.catalogue.statOutOfStockMeta')}${partial}` : undefined },
  ];
  const rows: DataTableRow[] = items.map(item => {
    const kind = schedule(item);
    const saving = item.mrpPaise > item.pricePaise ? t('adminBoard.catalog.saving', { saving: money(item.mrpPaise - item.pricePaise), mrp: money(item.mrpPaise) }) : '';
    return {
      id: item.id,
      muted: !item.active,
      cells: [
        { text: item.name, sub: `${item.brand} · ${item.pack}`, weight: 'strong' },
        { node: <span className="sk-board-price"><strong>{money(item.pricePaise)}</strong>{saving ? <small>{saving}</small> : null}</span> },
        { pill: { label: t(kind.label), tone: kind.tone } },
        { text: item.kind === 'product' ? count(item.stock) : '—', tone: item.kind === 'product' && item.stock === 0 ? 'attention' : undefined },
        { pill: item.active ? { label: t('adminBoard.catalog.live'), tone: 'positive' } : { label: t('adminBoard.catalog.withdrawn'), tone: 'neutral' } },
      ],
      actions: [
        { label: t('admin.catalogue.details'), variant: 'primary', onSelect: () => setViewingId(item.id), accessibleLabel: t('adminBoard.catalog.open', { name: item.name }) },
        { label: item.active ? t('admin.catalogue.hide') : t('admin.catalogue.publish'), onSelect: () => void vm.togglePublished(item), disabled: vm.saving },
      ],
    };
  });
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={status}
      header={{
        eyebrow: t('adminBoard.catalog.eyebrow'),
        title: t('admin.catalogue.title'),
        actions: <SkButton onClick={() => setAdding(true)}>{t('admin.catalogue.add')}</SkButton>,
      }}
      note={!adding && !viewing && (vm.actionError || vm.imageError) ? <p className="sk-board-error" role="alert">{vm.actionError || vm.imageError}</p> : undefined}
      stats={stats}
      statVariant="plain"
      statsLabel={t('admin.catalogue.summary')}
      search={{ value: vm.query, onChange: vm.setQuery, label: t('admin.catalogue.search'), placeholder: t('admin.catalogue.searchPlaceholder') }}
      table={{
        variant: 'plain',
        caption: t('admin.catalogue.heading'),
        columns: [
          { label: t('adminBoard.catalog.colItem'), width: '34%' },
          { label: t('adminBoard.catalog.colPrice') },
          { label: t('adminBoard.catalog.colSchedule') },
          { label: t('admin.catalogue.colStock') },
          { label: t('admin.col.state') },
        ],
        rows,
        rowActions: true,
      }}
      pagination={total > CATALOG_PAGE_SIZE ? {
        page: vm.page + 1, pages, shown: count(items.length), total: count(total),
        onPrevious: () => vm.setPage(Math.max(0, vm.page - 1)), onNext: () => vm.setPage(Math.min(pages - 1, vm.page + 1)),
      } : undefined}
      noMatches={searching ? { title: t('adminBoard.catalog.noMatches', { query: vm.query.trim() }), body: t('adminBoard.catalog.noMatchesBody') } : undefined}
      empty={{ ...boardEmpty(t, t('admin.catalogue.empty'), t('admin.catalogue.emptyBody')), action: { label: t('admin.catalogue.add'), onSelect: () => setAdding(true) } }}
      unconnected={{ title: t('admin.catalogue.title'), body: t('admin.catalogue.emptyBody') }}
      error={boardError(t, t('adminBoard.catalog.what'), 'CatalogOps', vm.reloadList, vm.listError)}
      loadingLabel={t('adminBoard.catalog.loading')}
    />
    {viewing ? <EntryDrawer vm={vm} item={viewing} onClose={() => setViewingId(null)} /> : null}
    {adding ? <AddEntryDrawer vm={vm} onClose={() => setAdding(false)} /> : null}
  </div>;
});
