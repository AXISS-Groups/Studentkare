import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { auditRepository } from '../model/auditRepository';
import { count, readable, when } from '../model/format';
import { AuditExplorerViewModel } from '../viewmodels/AuditExplorerViewModel';
import { useT } from '@/i18n';

export const AuditExplorerView = observer(function AuditExplorerView() {
  const t = useT();
  const [vm] = useState(() => new AuditExplorerViewModel(auditRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const { page, items, total, filtered, selected, lastPage } = vm;

  return <AdminPage eyebrow={t('admin.eyebrow.governance')} title={t('admin.audit.title')} description={t('admin.audit.description')}>
    <div className="sk-admin-card sk-admin-filters" role="search" aria-label={t('admin.audit.filterLabel')}>
      <label>{t('admin.audit.search')}<input type="search" value={vm.search} onChange={event => vm.setSearch(event.target.value)} placeholder={t('admin.audit.searchPlaceholder')} /></label>
      <label>{t('admin.audit.from')}<input type="date" value={vm.from} onChange={event => vm.setFrom(event.target.value)} /></label>
      <label>{t('admin.audit.to')}<input type="date" value={vm.to} onChange={event => vm.setTo(event.target.value)} /></label>
      <label>{t('admin.audit.actor')}<select value={vm.actor} onChange={event => vm.setActor(event.target.value)}><option value="">{t('admin.audit.allActors')}</option>{vm.actors.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>{t('admin.audit.eventType')}<select value={vm.eventType} onChange={event => vm.setEventType(event.target.value)}><option value="">{t('admin.audit.allEvents')}</option>{vm.eventTypes.map(value => <option key={value} value={value}>{readable(value)}</option>)}</select></label>
    </div>
    <p className="sk-admin-note" aria-live="polite">{t('admin.audit.pageOnly', { count: count(items.length) })}{vm.filtering ? ` ${t('admin.audit.matches', { count: count(filtered.length) })}` : ''}</p>

    {vm.loading ? <div className="sk-admin-card"><AdminLoading label={t('admin.audit.loading')} /></div>
      : vm.error ? <AdminError title={t('admin.audit.error')} message={vm.error} onRetry={vm.reload} />
        : total === 0 ? <div className="sk-admin-card"><AdminEmpty title={t('admin.audit.empty')} description={t('admin.audit.emptyBody')} /></div>
          : <div className="sk-admin-split">
            <div className="sk-admin-card sk-admin-table-card">
              <table className="sk-admin-table">
                <caption className="sk-admin-visually-hidden">{t('admin.audit.caption')}</caption>
                <thead><tr><th scope="col">{t('admin.audit.colTime')}</th><th scope="col">{t('admin.audit.colEvent')}</th><th scope="col">{t('admin.audit.actor')}</th><th scope="col">{t('admin.audit.colResource')}</th></tr></thead>
                <tbody>{filtered.length ? filtered.map(item => <tr key={item.id} className={selected?.id === item.id ? 'is-selected' : undefined}>
                  <td><time dateTime={new Date(item.createdAt * 1000).toISOString()}>{when(item.createdAt)}</time></td>
                  <td><button type="button" className="sk-admin-row-button" aria-pressed={selected?.id === item.id} onClick={() => vm.select(item)}>{readable(item.action)}</button></td>
                  <td className="sk-admin-mono">{item.actorId}</td>
                  <td className="sk-admin-mono">{item.resourceId}</td>
                </tr>) : <tr><td colSpan={4}><AdminEmpty title={t('admin.audit.noMatch')} description={t('admin.audit.noMatchBody')} /></td></tr>}</tbody>
              </table>
              <div className="sk-admin-pagination">
                <button type="button" className="sk-admin-button" disabled={page === 0} onClick={() => vm.goTo(page - 1)}>{t('admin.audit.previous')}</button>
                <span>{t('admin.audit.pageOf', { page: count(page + 1), pages: count(lastPage + 1), total: count(total) })}</span>
                <button type="button" className="sk-admin-button" disabled={page >= lastPage} onClick={() => vm.goTo(page + 1)}>{t('admin.audit.next')}</button>
              </div>
            </div>
            <aside className="sk-admin-card sk-admin-detail" aria-label={t('admin.audit.detail')}>
              <h3 className="sk-admin-eyebrow">{t('admin.audit.detail')}</h3>
              {selected ? <dl>
                <dt>{t('admin.audit.colEvent')}</dt><dd>{readable(selected.action)}</dd>
                <dt>{t('admin.audit.colTime')}</dt><dd>{when(selected.createdAt)}</dd>
                <dt>{t('admin.audit.actor')}</dt><dd className="sk-admin-mono">{selected.actorId}</dd>
                <dt>{t('admin.audit.colResource')}</dt><dd className="sk-admin-mono">{selected.resourceId}</dd>
                <dt>{t('admin.audit.eventId')}</dt><dd className="sk-admin-mono">{selected.id}</dd>
              </dl> : <AdminEmpty title={t('admin.audit.noneSelected')} description={t('admin.audit.noneSelectedBody')} />}
            </aside>
          </div>}
    <div className="sk-admin-sections">
      <AdminEmptySection title={t('admin.audit.chain')} description={t('admin.audit.chainBody')} emptyTitle={t('admin.notReported')} emptyDescription={t('admin.audit.chainEmptyBody')} />
      <AdminEmptySection title={t('admin.audit.key')} description={t('admin.audit.keyBody')} emptyTitle={t('admin.notReported')} emptyDescription={t('admin.audit.keyEmptyBody')} />
      <AdminEmptySection title={t('admin.audit.guardrails')} description={t('admin.audit.guardrailsBody')} emptyTitle={t('admin.notReported')} emptyDescription={t('admin.audit.guardrailsEmptyBody')} />
    </div>
  </AdminPage>;
});
