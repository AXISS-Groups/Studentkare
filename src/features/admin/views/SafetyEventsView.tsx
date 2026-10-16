import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStats, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { opsRepository } from '../model/opsRepository';
import { count, readable, safetyEventState, when } from '../model/format';
import { SafetyEventsViewModel } from '../viewmodels/SafetyEventsViewModel';
import { useT } from '@/i18n';

const OpenSafetyStatus = observer(function OpenSafetyStatus({ vm }: { vm: SafetyEventsViewModel }) {
  const t = useT();
  const open = vm.openCount;
  return vm.showOpenStatus ? <AdminStatus tone="danger">{open === 1 ? t('admin.safety.openOne') : t('admin.safety.openOther', { count: count(open) })}</AdminStatus> : null;
});

// SAFETY events from the ops feed, whose summaries carry counts and states only.
// /ops/crisis-events is not used: it returns student names, contacts and the crisis
// kind, which this board must never show.
const SafetyEvents = observer(function SafetyEvents({ vm }: { vm: SafetyEventsViewModel }) {
  const t = useT();
  return <>
    {vm.countsLoading ? <AdminLoading label={t('admin.safety.countsLoading')} />
      : vm.countsError ? <AdminError title={t('admin.safety.countsError')} message={vm.countsError} onRetry={vm.reloadCounts} />
        : <AdminStats label={t('admin.safety.summary')} stats={[
          { label: t('admin.safety.statOpen'), value: count(vm.openCount), meta: t('admin.safety.statOpenMeta') },
          { label: t('admin.safety.statCampuses') },
          { label: t('admin.safety.statApi') },
          { label: t('admin.safety.statMedian') },
        ]} />}
    <div className="sk-admin-card sk-admin-table-card">
      {vm.feedLoading ? <AdminLoading label={t('admin.safety.loading')} />
        : vm.feedError ? <AdminError title={t('admin.safety.error')} message={vm.feedError} onRetry={vm.reloadFeed} />
          : <table className="sk-admin-table">
            <caption className="sk-admin-visually-hidden">{t('admin.safety.caption')}</caption>
            <thead><tr><th scope="col">{t('admin.safety.colAlert')}</th><th scope="col">{t('admin.accounts.colDetail')}</th><th scope="col">{t('admin.safety.colRaised')}</th><th scope="col">{t('admin.col.state')}</th></tr></thead>
            <tbody>{vm.feed?.items.length ? vm.feed.items.map(event => {
              const state = safetyEventState(event);
              return <tr key={event.id}>
                <td><strong>{readable(event.kind)}</strong></td>
                <td>{event.summary || '—'}</td>
                <td><time dateTime={new Date(event.createdAt * 1000).toISOString()}>{when(event.createdAt)}</time></td>
                <td><span className={`sk-admin-tag ${state.tone}`}>{state.label === 'Open' ? t('admin.safety.stateOpen') : t('admin.safety.stateAcknowledged')}</span></td>
              </tr>;
            }) : <tr><td colSpan={4}><AdminEmpty title={t('admin.safety.empty')} description={t('admin.safety.emptyBody')} /></td></tr>}</tbody>
          </table>}
    </div>
    <p className="sk-admin-note">{t('admin.safety.note')}</p>
  </>;
});

/** Super Admin → Operations & SOS (/admin/ops): safety events, with the open-safety status in the header. */
export const SafetyEventsView = observer(function SafetyEventsView() {
  const [vm] = useState(() => new SafetyEventsViewModel(opsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  const t = useT();
  return <AdminPage eyebrow={t('admin.eyebrow.platform')} title={t('admin.ops.title')} description={t('admin.ops.description')} status={<OpenSafetyStatus vm={vm} />}>
    <SafetyEvents vm={vm} />
  </AdminPage>;
});

/** The open-safety status alone, for the header of the other Operations & SOS routes. Loads the counts only. */
export const OpenSafetyStatusView = observer(function OpenSafetyStatusView() {
  const [vm] = useState(() => new SafetyEventsViewModel(opsRepository));
  useEffect(() => { vm.reloadCounts(); return vm.dispose; }, [vm]);
  return <OpenSafetyStatus vm={vm} />;
});
