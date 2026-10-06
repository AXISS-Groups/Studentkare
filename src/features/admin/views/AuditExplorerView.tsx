import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { auditRepository } from '../model/auditRepository';
import { count, readable, when } from '../model/format';
import { AuditExplorerViewModel } from '../viewmodels/AuditExplorerViewModel';

export const AuditExplorerView = observer(function AuditExplorerView() {
  const [vm] = useState(() => new AuditExplorerViewModel(auditRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const { page, items, total, filtered, selected, lastPage } = vm;

  return <AdminPage eyebrow="Governance" title="Audit explorer" description="Search and inspect platform audit activity.">
    <div className="sk-admin-card sk-admin-filters" role="search" aria-label="Filter audit events">
      <label>Search<input type="search" value={vm.search} onChange={event => vm.setSearch(event.target.value)} placeholder="Event, resource or actor" /></label>
      <label>From<input type="date" value={vm.from} onChange={event => vm.setFrom(event.target.value)} /></label>
      <label>To<input type="date" value={vm.to} onChange={event => vm.setTo(event.target.value)} /></label>
      <label>Actor<select value={vm.actor} onChange={event => vm.setActor(event.target.value)}><option value="">All actors</option>{vm.actors.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Event type<select value={vm.eventType} onChange={event => vm.setEventType(event.target.value)}><option value="">All events</option>{vm.eventTypes.map(value => <option key={value} value={value}>{readable(value)}</option>)}</select></label>
    </div>
    <p className="sk-admin-note" aria-live="polite">Filters apply to the {count(items.length)} events on this page only, not the whole audit history.{vm.filtering ? ` ${count(filtered.length)} match.` : ''}</p>

    {vm.loading ? <div className="sk-admin-card"><AdminLoading label="Loading audit events…" /></div>
      : vm.error ? <AdminError title="Couldn’t load audit events" message={vm.error} onRetry={vm.reload} />
        : total === 0 ? <div className="sk-admin-card"><AdminEmpty title="No audit activity yet." description="Audit events will appear here as actions are recorded." /></div>
          : <div className="sk-admin-split">
            <div className="sk-admin-card sk-admin-table-card">
              <table className="sk-admin-table">
                <caption className="sk-admin-visually-hidden">Audit events</caption>
                <thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Resource</th></tr></thead>
                <tbody>{filtered.length ? filtered.map(item => <tr key={item.id} className={selected?.id === item.id ? 'is-selected' : undefined}>
                  <td><time dateTime={new Date(item.createdAt * 1000).toISOString()}>{when(item.createdAt)}</time></td>
                  <td><button type="button" className="sk-admin-row-button" aria-pressed={selected?.id === item.id} onClick={() => vm.select(item)}>{readable(item.action)}</button></td>
                  <td className="sk-admin-mono">{item.actorId}</td>
                  <td className="sk-admin-mono">{item.resourceId}</td>
                </tr>) : <tr><td colSpan={4}><AdminEmpty title="No events on this page match these filters." description="Clear a filter, or go to another page." /></td></tr>}</tbody>
              </table>
              <div className="sk-admin-pagination">
                <button type="button" className="sk-admin-button" disabled={page === 0} onClick={() => vm.goTo(page - 1)}>Previous</button>
                <span>Page {count(page + 1)} of {count(lastPage + 1)} · {count(total)} events</span>
                <button type="button" className="sk-admin-button" disabled={page >= lastPage} onClick={() => vm.goTo(page + 1)}>Next</button>
              </div>
            </div>
            <aside className="sk-admin-card sk-admin-detail" aria-label="Event detail">
              <h3 className="sk-admin-eyebrow">Event detail</h3>
              {selected ? <dl>
                <dt>Event</dt><dd>{readable(selected.action)}</dd>
                <dt>Time</dt><dd>{when(selected.createdAt)}</dd>
                <dt>Actor</dt><dd className="sk-admin-mono">{selected.actorId}</dd>
                <dt>Resource</dt><dd className="sk-admin-mono">{selected.resourceId}</dd>
                <dt>Event ID</dt><dd className="sk-admin-mono">{selected.id}</dd>
              </dl> : <AdminEmpty title="No event selected." description="Choose an event to see its details." />}
            </aside>
          </div>}
    <div className="sk-admin-sections">
      <AdminEmptySection title="Chain integrity" description="Whether every entry still verifies against the one before it." emptyTitle="Not reported." emptyDescription="Chain verification isn’t connected to this console, so no integrity result is shown." />
      <AdminEmptySection title="Signing key" description="The key that signs new entries, and when it last rotated." emptyTitle="Not reported." emptyDescription="Key details will appear here once the signing service is connected." />
      <AdminEmptySection title="Guardrails" description="Counters that should read zero, such as clinical reads from commercial surfaces." emptyTitle="Not reported." emptyDescription="No counter is shown rather than a zero, because a zero would claim a check that isn’t running." />
    </div>
  </AdminPage>;
});
