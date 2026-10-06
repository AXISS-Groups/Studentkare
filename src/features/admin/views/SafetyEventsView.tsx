import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStats, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { opsRepository } from '../model/opsRepository';
import { count, readable, safetyEventState, when } from '../model/format';
import { SafetyEventsViewModel } from '../viewmodels/SafetyEventsViewModel';

const PAGE = { eyebrow: 'Platform', title: 'Operations & SOS', description: 'Every campus, one board. Emergencies above everything else.' } as const;

const OpenSafetyStatus = observer(function OpenSafetyStatus({ vm }: { vm: SafetyEventsViewModel }) {
  const open = vm.openCount;
  return vm.showOpenStatus ? <AdminStatus tone="danger">{count(open)} open safety {open === 1 ? 'event' : 'events'}</AdminStatus> : null;
});

// SAFETY events from the ops feed, whose summaries carry counts and states only.
// /ops/crisis-events is not used: it returns student names, contacts and the crisis
// kind, which this board must never show.
const SafetyEvents = observer(function SafetyEvents({ vm }: { vm: SafetyEventsViewModel }) {
  return <>
    {vm.countsLoading ? <AdminLoading label="Loading safety counts…" />
      : vm.countsError ? <AdminError title="Couldn’t load safety counts" message={vm.countsError} onRetry={vm.reloadCounts} />
        : <AdminStats label="Operations summary" stats={[
          { label: 'Open safety events', value: count(vm.openCount), meta: 'Unacknowledged, from the activity feed' },
          { label: 'Campuses up' },
          { label: 'API availability, 30 days' },
          { label: 'Median SOS to first responder' },
        ]} />}
    <div className="sk-admin-card sk-admin-table-card">
      {vm.feedLoading ? <AdminLoading label="Loading safety events…" />
        : vm.feedError ? <AdminError title="Couldn’t load safety events" message={vm.feedError} onRetry={vm.reloadFeed} />
          : <table className="sk-admin-table">
            <caption className="sk-admin-visually-hidden">Safety events</caption>
            <thead><tr><th scope="col">Alert</th><th scope="col">Detail</th><th scope="col">Raised</th><th scope="col">State</th></tr></thead>
            <tbody>{vm.feed?.items.length ? vm.feed.items.map(event => {
              const state = safetyEventState(event);
              return <tr key={event.id}>
                <td><strong>{readable(event.kind)}</strong></td>
                <td>{event.summary || '—'}</td>
                <td><time dateTime={new Date(event.createdAt * 1000).toISOString()}>{when(event.createdAt)}</time></td>
                <td><span className={`sk-admin-tag ${state.tone}`}>{state.label}</span></td>
              </tr>;
            }) : <tr><td colSpan={4}><AdminEmpty title="No safety events yet." description="Safety events appear here as they are raised." /></td></tr>}</tbody>
          </table>}
    </div>
    <p className="sk-admin-note">This board shows that an alert exists and whether it was acknowledged — never the student’s condition.</p>
  </>;
});

/** Super Admin → Operations & SOS (/admin/ops): safety events, with the open-safety status in the header. */
export const SafetyEventsView = observer(function SafetyEventsView() {
  const [vm] = useState(() => new SafetyEventsViewModel(opsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  return <AdminPage {...PAGE} status={<OpenSafetyStatus vm={vm} />}>
    <SafetyEvents vm={vm} />
  </AdminPage>;
});

/** The open-safety status alone, for the header of the other Operations & SOS routes. Loads the counts only. */
export const OpenSafetyStatusView = observer(function OpenSafetyStatusView() {
  const [vm] = useState(() => new SafetyEventsViewModel(opsRepository));
  useEffect(() => { vm.reloadCounts(); return vm.dispose; }, [vm]);
  return <OpenSafetyStatus vm={vm} />;
});
