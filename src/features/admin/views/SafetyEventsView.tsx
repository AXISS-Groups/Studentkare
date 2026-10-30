import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage, DataTable } from '@/design-system';
import type { DataTableRow, SkTone, Stat } from '@/design-system';
import { AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { opsRepository } from '../model/opsRepository';
import { governanceRepository } from '../model/governanceRepository';
import type { SosAlertRow } from '../model/governanceTypes';
import { count, readable, safetyEventState } from '../model/format';
import { SafetyEventsViewModel } from '../viewmodels/SafetyEventsViewModel';
import { boardEmpty, boardError } from './AdminBoard';
import { GovCard, GovPill, ago, median, useResource } from './GovBoard';

/** SOS states, in the order the board lists them: anything still open sorts first. */
const SOS_ORDER: Record<string, number> = { ACTIVE: 0, ACKNOWLEDGED: 1 };
const SOS_OPEN = new Set(['ACTIVE', 'ACKNOWLEDGED']);
const SOS_STATE: Record<string, { label: MessageKey; tone: SkTone }> = {
  ACTIVE: { label: 'gov.ops.stateLive', tone: 'danger' },
  ACKNOWLEDGED: { label: 'gov.ops.stateAcknowledged', tone: 'attention' },
  RESOLVED: { label: 'gov.ops.stateResolved', tone: 'neutral' },
  CANCELLED: { label: 'gov.ops.stateCancelled', tone: 'neutral' },
};

/** Live first, then acknowledged, then the rest; newest first within each. Never paginated. */
export function sortSos(alerts: SosAlertRow[]): SosAlertRow[] {
  const rank = (alert: SosAlertRow) => SOS_ORDER[alert.status] ?? Object.keys(SOS_ORDER).length;
  return [...alerts].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);
}

/** Median seconds from an SOS to the campus acknowledging it, over the alerts that were acknowledged. */
export function medianToAcknowledge(alerts: SosAlertRow[]): number | null {
  return median(alerts.filter(alert => alert.acknowledgedAt).map(alert => (alert.acknowledgedAt ?? alert.createdAt) - alert.createdAt));
}

const SECONDS_PER_MINUTE = 60;

const OpenSafetyStatus = observer(function OpenSafetyStatus({ vm }: { vm: SafetyEventsViewModel }) {
  const t = useT();
  const open = vm.openCount;
  return vm.showOpenStatus ? <AdminStatus tone="danger">{open === 1 ? t('admin.safety.openOne') : t('admin.safety.openOther', { count: count(open) })}</AdminStatus> : null;
});

/**
 * Other SAFETY events from the ops feed, whose summaries carry counts and states only.
 * /ops/crisis-events is not used: it returns student names, contacts and the crisis
 * kind, which this board must never show.
 */
const SafetyFeed = observer(function SafetyFeed({ vm }: { vm: SafetyEventsViewModel }) {
  const t = useT();
  const items = vm.feed?.items ?? [];
  const rows: DataTableRow[] = items.map(event => {
    const state = safetyEventState(event);
    return {
      id: event.id,
      cells: [
        { text: readable(event.kind), weight: 'strong' },
        { text: event.summary || '—' },
        { text: ago(t, event.createdAt), weight: 'muted' },
        { pill: state.label === 'Open' ? { label: t('admin.safety.stateOpen'), tone: event.severity === 'CRITICAL' ? 'danger' : 'attention' } : { label: t('admin.safety.stateAcknowledged'), tone: 'neutral' } },
      ],
    };
  });
  return <GovCard eyebrow={t('gov.ops.feedTitle')}>
    {vm.feedLoading ? <p className="sk-gov-fine" role="status">{t('admin.safety.loading')}</p>
      : vm.feedError ? <p className="sk-gov-error" role="alert">{t('admin.safety.error')}</p>
        : <DataTable variant="plain" caption={t('admin.safety.caption')} columns={[{ label: t('admin.safety.colAlert') }, { label: t('admin.accounts.colDetail') }, { label: t('admin.safety.colRaised') }, { label: t('admin.col.state'), align: 'end' }]}
          rows={rows} emptyMessage={{ title: t('admin.safety.empty'), body: t('admin.safety.emptyBody') }} />}
  </GovCard>;
});

/**
 * Super Admin, Operations & SOS (design: AdminOps, Tier 1): every campus's SOS from
 * /ops/sos (super admin is not campus-scoped), live ones first and never paginated
 * away. A row says that an alert exists, where, when and who was told — never the
 * student or their condition: the name, contact, hostel, location note and closing
 * note the endpoint returns are not read. If the SOS list can't load, the board says
 * so and shows no figures (it never reads "0 live" when it doesn't know).
 */
export const SafetyEventsView = observer(function SafetyEventsView() {
  const t = useT();
  const sos = useResource(governanceRepository.sosAlerts);
  const [feed] = useState(() => new SafetyEventsViewModel(opsRepository));
  useEffect(() => { feed.load(); return feed.dispose; }, [feed]);

  const alerts = sortSos(sos.data?.items ?? []);
  // Live means raised and not yet acknowledged; an acknowledged SOS is still open (sorted first) but has a responder.
  const live = alerts.filter(alert => alert.status === 'ACTIVE').length;
  const toAcknowledge = medianToAcknowledge(alerts);
  const stats: Stat[] = [
    { label: t('gov.ops.statLive'), value: count(live), tone: live ? 'danger' : 'positive' },
    { label: t('admin.safety.statCampuses'), value: null },
    { label: t('admin.safety.statApi'), value: null },
    { label: t('gov.ops.statAcknowledge'), value: toAcknowledge === null ? null : t('gov.ops.minutes', { count: count(Math.max(1, Math.round(toAcknowledge / SECONDS_PER_MINUTE))) }) },
  ];
  const rows: DataTableRow[] = alerts.map(alert => {
    const state = SOS_STATE[alert.status] ?? { label: 'gov.ops.stateResolved', tone: 'neutral' };
    const notified = alert.deliveries.filter(delivery => delivery.status === 'SENT').length;
    return {
      id: alert.id,
      muted: !SOS_OPEN.has(alert.status),
      cells: [
        { text: t('gov.ops.alertId', { id: alert.id.slice(0, 6).toUpperCase() }), weight: 'strong', mono: true },
        { text: t('gov.ops.where', { campus: alert.campus || t('gov.ops.noCampus') }) },
        { text: ago(t, alert.createdAt), weight: 'muted' },
        { text: alert.acknowledgedAt ? t('gov.ops.respondersAck', { count: count(notified) }) : t('gov.ops.responders', { count: count(notified) }) },
        { node: <GovPill tone={state.tone} dot={alert.status === 'ACTIVE' ? 'live' : undefined}>{t(state.label)}</GovPill> },
      ],
    };
  });
  const title = t('admin.ops.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={sos.status}
      header={{
        title,
        subtitle: t('admin.ops.description'),
        badge: live ? { label: live === 1 ? t('gov.ops.badgeOne') : t('gov.ops.badgeOther', { count: count(live) }), tone: 'danger' } : undefined,
        actions: <OpenSafetyStatus vm={feed} />,
      }}
      stats={stats}
      statLabels={stats.map(stat => stat.label)}
      statsLabel={t('admin.safety.summary')}
      table={{
        caption: t('gov.ops.caption'),
        columns: [{ label: t('admin.safety.colAlert') }, { label: t('gov.ops.colCampus'), width: '34%' }, { label: t('admin.safety.colRaised') }, { label: t('gov.ops.colResponders') }, { label: t('admin.col.state'), align: 'end' }],
        rows,
        footnote: t('gov.ops.footnote'),
      }}
      empty={boardEmpty(t, t('gov.ops.empty'), t('gov.ops.emptyBody'))}
      unconnected={{ title: t('gov.ops.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.ops.what'), 'AdminOps', sos.reload, sos.error)}
      loadingLabel={t('gov.ops.loading')}
    >
      <SafetyFeed vm={feed} />
    </ConsoleTablePage>
  </div>;
});

/** The open-safety status alone, for the header of the other Operations & SOS routes. Loads the counts only. */
export const OpenSafetyStatusView = observer(function OpenSafetyStatusView() {
  const [vm] = useState(() => new SafetyEventsViewModel(opsRepository));
  useEffect(() => { vm.reloadCounts(); return vm.dispose; }, [vm]);
  return <OpenSafetyStatus vm={vm} />;
});
