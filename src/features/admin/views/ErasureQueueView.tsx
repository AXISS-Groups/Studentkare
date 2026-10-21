import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage, DataTable, Drawer, SkButton } from '@/design-system';
import type { DataTableRow, Stat } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { count } from '../model/format';
import { governanceRepository } from '../model/governanceRepository';
import type { ErasureArchive, ErasurePending } from '../model/governanceTypes';
import { BoardNote, BoardToast, boardEmpty, boardError } from './AdminBoard';
import { GovBar, GovCard, maskId, median, useResource, wholeDays } from './GovBoard';

type Translate = ReturnType<typeof useT>;

const day = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
/** The server refuses a reason shorter than this (OpenArchiveInput). */
const REASON_MIN = 10;
const REASON_MAX = 500;

/** Where one request stands against the date the server scheduled its erasure for. */
export function erasureClock(request: ErasurePending, now: number) {
  const span = Math.max(1, request.scheduledFor - request.requestedAt);
  const overdue = now > request.scheduledFor;
  return {
    overdue,
    daysLeft: wholeDays(now, request.scheduledFor),
    daysOver: wholeDays(request.scheduledFor, now),
    age: wholeDays(request.requestedAt, now),
    used: Math.min(span, Math.max(0, now - request.requestedAt)),
    span,
  };
}

function Clock({ t, request, now }: { t: Translate; request: ErasurePending; now: number }) {
  const clock = erasureClock(request, now);
  return <span className="sk-gov-clock">
    <span className="sk-gov-clock__line">
      <strong className={clock.overdue ? 'is-danger' : undefined}>{clock.overdue ? t('gov.erasure.over', { count: count(clock.daysOver) }) : t('gov.erasure.left', { count: count(clock.daysLeft) })}</strong>
      <span>{t('gov.erasure.age', { count: count(clock.age) })}</span>
    </span>
    <GovBar value={clock.used} max={clock.span} tone={clock.overdue ? 'danger' : 'action'} />
  </span>;
}

/**
 * Erasure requests (design: DpdpQueue, Tier 1), on GET /ops/erasure. A request is
 * erased automatically on the date the server scheduled when the student asked (they
 * can cancel until then); there is no "complete now" endpoint, so the board has no
 * Act now / Review button. The clock runs to that scheduled date, not to a statutory
 * window: no statutory number is set anywhere (legal to fix it). A request still
 * pending after its date is the real breach this board can see, and is red. If the
 * archive key or retention is not configured nothing is erased, and the board says why.
 * Sealed archives open only with a written reason, audited by the server.
 */
export const ErasureQueueView = observer(function ErasureQueueView() {
  const t = useT();
  const vm = useResource(governanceRepository.erasureQueue);
  const [opening, setOpening] = useState<ErasureArchive | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const now = Date.now() / 1000;
  const queue = vm.data;
  const pending = [...(queue?.pending ?? [])].sort((a, b) => a.scheduledFor - b.scheduledFor);
  const overdue = pending.filter(request => erasureClock(request, now).overdue).length;
  const medianAge = median(pending.map(request => wholeDays(request.requestedAt, now)));
  const live = (queue?.archives ?? []).filter(archive => !archive.destroyed).length;

  const stats: Stat[] = [
    { label: t('gov.erasure.statPending'), value: count(pending.length), meta: t('gov.erasure.statPendingMeta') },
    { label: t('gov.erasure.statOverdue'), value: count(overdue), tone: overdue ? 'danger' : 'positive', meta: overdue ? t('gov.erasure.statOverdueMeta') : undefined },
    { label: t('gov.erasure.statMedian'), value: medianAge === null ? null : t('gov.erasure.days', { count: count(Math.round(medianAge)) }) },
    { label: t('gov.erasure.statArchives'), value: count(live), meta: queue?.retentionDays ? t('gov.erasure.statArchivesMeta', { days: count(queue.retentionDays) }) : t('gov.erasure.retentionUnset') },
  ];
  const rows: DataTableRow[] = pending.map(request => {
    const clock = erasureClock(request, now);
    return {
      id: request.accountId,
      cells: [
        { text: maskId('acct_', request.accountId), weight: 'strong', mono: true },
        { text: day(request.requestedAt) },
        { node: <Clock t={t} request={request} now={now} /> },
        { pill: clock.overdue ? { label: t('gov.erasure.stateOverdue'), tone: 'danger' } : { label: t('gov.erasure.stateScheduled'), tone: 'action' } },
      ],
    };
  });
  const archiveRows: DataTableRow[] = (queue?.archives ?? []).map(archive => ({
    id: archive.id,
    muted: archive.destroyed,
    cells: [
      { text: maskId('acct_', archive.formerAccountId), weight: 'strong', mono: true },
      { text: day(archive.archivedAt) },
      { text: t('gov.erasure.rows', { count: count(archive.rowCount) }) },
      { text: archive.destroyed ? t('member.erasure.destroyed') : t('member.erasure.destroyedOn', { date: day(archive.destroyAfter) }), weight: 'muted' },
    ],
    actions: archive.destroyed ? undefined : [{ label: t('member.erasure.openWithReason'), icon: 'lock', onSelect: () => { setOpening(archive); setReason(''); setFailure(''); }, accessibleLabel: t('gov.erasure.openArchive', { id: maskId('acct_', archive.formerAccountId) }) }],
  }));

  const open = async () => {
    if (!opening || reason.trim().length < REASON_MIN) return;
    setBusy(true);
    setFailure('');
    try {
      const result = await governanceRepository.openErasureArchive(opening.id, reason.trim());
      const url = URL.createObjectURL(new Blob([JSON.stringify(result.archive, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `erasure-archive-${opening.id.slice(0, 8)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setOpening(null);
      setToast(t('gov.erasure.opened'));
    } catch (reasonError) {
      setFailure(reasonError instanceof Error && reasonError.message ? reasonError.message : t('gov.erasure.openFailed'));
    } finally {
      setBusy(false);
    }
  };

  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={vm.status}
      header={{
        title: t('gov.erasure.title'),
        subtitle: t('gov.erasure.subtitle'),
        badge: overdue ? { label: t('gov.erasure.badge', { count: count(overdue) }), tone: 'danger' } : undefined,
      }}
      note={queue?.blocked ? <BoardNote icon="alert-triangle" tone="attention">{t('member.erasure.paused', { reason: queue.blocked })}</BoardNote> : undefined}
      stats={stats}
      statLabels={stats.map(stat => stat.label)}
      statsLabel={t('gov.erasure.summary')}
      table={{
        caption: t('gov.erasure.caption'),
        columns: [{ label: t('gov.erasure.colAccount') }, { label: t('gov.erasure.colRequested') }, { label: t('gov.erasure.colClock'), width: '38%' }, { label: t('admin.col.state'), align: 'end' }],
        rows,
      }}
      noMatches={{ title: t('gov.erasure.empty'), body: t('member.erasure.noRequestsBody') }}
      empty={boardEmpty(t, t('gov.erasure.empty'))}
      unconnected={{ title: t('gov.erasure.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.erasure.what'), 'DpdpQueue', vm.reload, vm.error)}
      loadingLabel={t('gov.erasure.loading')}
    >
      <GovCard eyebrow={t('member.erasure.archives')}>
        <DataTable variant="plain" caption={t('member.erasure.archives')} actionsLabel={t('console.table.actions')}
          columns={[{ label: t('gov.erasure.colFormer') }, { label: t('gov.erasure.colSealed') }, { label: t('gov.erasure.colRows') }, { label: t('gov.erasure.colDestroyed') }]}
          rows={archiveRows} emptyMessage={{ title: t('member.erasure.noArchivesTitle'), body: t('member.erasure.noArchivesBody') }} />
      </GovCard>
      <GovCard tone="soft">
        <p className="sk-gov-unavailable"><Icon name="info-5" size={18} strokeWidth={2.2} />{queue?.retentionDays ? t('gov.erasure.footnoteDays', { days: count(queue.retentionDays) }) : t('gov.erasure.footnote')}</p>
      </GovCard>
    </ConsoleTablePage>
    <Drawer open={opening !== null} title={opening ? t('member.erasure.openTitle', { id: opening.id.slice(0, 8).toUpperCase() }) : ''} busy={busy} onClose={() => setOpening(null)}>
      <form className="sk-gov-form" onSubmit={event => { event.preventDefault(); void open(); }}>
        <p className="sk-gov-text">{t('member.erasure.openBody')}</p>
        <label>{t('member.erasure.reason')}
          <textarea required minLength={REASON_MIN} maxLength={REASON_MAX} rows={4} value={reason} onChange={event => setReason(event.target.value)} aria-describedby="sk-gov-reason-hint" />
          <span id="sk-gov-reason-hint" className="sk-gov-form__hint">{t('member.erasure.reasonHint')}</span>
        </label>
        {failure ? <p className="sk-gov-error" role="alert"><Icon name="alert-triangle" size={16} />{failure}</p> : null}
        <SkButton type="submit" busy={busy} disabled={reason.trim().length < REASON_MIN}>{t('member.erasure.openSubmit')}</SkButton>
      </form>
    </Drawer>
    <BoardToast message={toast} onDone={() => setToast(null)} />
  </div>;
});
