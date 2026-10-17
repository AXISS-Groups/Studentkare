import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStats } from '@/screens/workspace/admin/AdminPage';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { outboxRepository } from '../model/outboxRepository';
import { count, readable, when } from '../model/format';
import { OUTBOX_STATUSES } from '../model/types';
import type { OutboxMessage } from '../model/types';
import { MessageOutboxViewModel, REQUEUEABLE } from '../viewmodels/MessageOutboxViewModel';
import type { OutboxFilter } from '../viewmodels/MessageOutboxViewModel';

const STATUS_LABEL: Record<typeof OUTBOX_STATUSES[number], MessageKey> = {
  PENDING: 'admin.outbox.status.PENDING',
  SENT: 'admin.outbox.status.SENT',
  FAILED: 'admin.outbox.status.FAILED',
  SUPPRESSED: 'admin.outbox.status.SUPPRESSED',
};
const STATUS_TONE: Record<string, string> = { PENDING: 'is-attention', SENT: 'is-positive', FAILED: 'is-danger', SUPPRESSED: 'is-neutral' };
// Channel and product names stay in English in every language.
const CHANNEL_LABEL: Record<string, string> = { SMS: 'SMS', WHATSAPP: 'WhatsApp', EMAIL: 'Email' };
const FILTERS: OutboxFilter[] = ['ALL', ...OUTBOX_STATUSES];

const isKnownStatus = (status: string): status is typeof OUTBOX_STATUSES[number] => (OUTBOX_STATUSES as readonly string[]).includes(status);

/** An epoch-seconds time, readable; '—' when missing. */
const at = (seconds: number | null) => seconds ? when(seconds) : '—';

/**
 * Super Admin → Content & AI → Message outbox (/admin/outbox).
 *
 * The durable notification outbox (care_outbox_events): status, event type, channel,
 * a masked recipient, attempts, the last error and times, filtered by status.
 * "Process now" runs the scheduler's real delivery job once; a failed message can be
 * requeued. Both ask first. The server never sends message payloads (see
 * outboxRepository). No canvas design exists for this screen.
 */
export const MessageOutboxView = observer(function MessageOutboxView() {
  const t = useT();
  const [vm] = useState(() => new MessageOutboxViewModel(outboxRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const statusLabel = (status: string) => isKnownStatus(status) ? t(STATUS_LABEL[status]) : readable(status);
  const channel = (message: OutboxMessage) => message.channel === 'IN_APP' ? t('admin.outbox.channelInApp') : CHANNEL_LABEL[message.channel] ?? (message.channel ? readable(message.channel) : '—');
  const stat = (value: number | null) => value === null ? null : count(value);
  const target = vm.requeueTarget;

  return <AdminPage eyebrow={t('admin.eyebrow.contentAi')} title={t('admin.outbox.title')} description={t('admin.outbox.description')}
    status={<button type="button" className="sk-admin-button sk-admin-button-primary" onClick={vm.askProcess} disabled={vm.processing}>
      <Icon name="refresh" size={16} />{vm.processing ? t('admin.outbox.processing') : t('admin.outbox.process')}
    </button>}>
    <AdminStats label={t('admin.outbox.summary')} stats={[
      { label: t('admin.outbox.statTotal'), value: stat(vm.messages ? vm.messages.length : null), meta: t('admin.outbox.statTotalMeta') },
      { label: t('admin.outbox.statPending'), value: stat(vm.countOf('PENDING')), meta: t('admin.outbox.statPendingMeta') },
      { label: t('admin.outbox.statSent'), value: stat(vm.countOf('SENT')), meta: t('admin.outbox.statSentMeta') },
      { label: t('admin.outbox.statFailed'), value: stat(vm.failedCount), meta: t('admin.outbox.statFailedMeta') },
    ]} />

    {vm.lastRun && <p className="sk-admin-note" role="status">
      {t('admin.outbox.processed', { processed: count(vm.lastRun.processed), delivered: count(vm.lastRun.delivered), inApp: count(vm.lastRun.inApp), failed: count(vm.lastRun.failed), pending: count(vm.lastRun.pending) })}
      {vm.lastRun.deferred > 0 && <>{' '}{t('admin.outbox.processedQuiet', { deferred: count(vm.lastRun.deferred) })}</>}
    </p>}
    {vm.requeueOutcome && <p className="sk-admin-note" role="status">{vm.requeueOutcome === 'requeued' ? t('admin.outbox.requeued') : t('admin.outbox.requeueNotFound')}</p>}
    {vm.processError && <p className="sk-admin-form-error" role="alert">{t('admin.outbox.processError')} {vm.processError}</p>}

    <div className="sk-admin-chips" role="group" aria-label={t('admin.outbox.filterLabel')}>
      {FILTERS.map(filter => <button key={filter} type="button" aria-pressed={vm.filter === filter} onClick={() => vm.setFilter(filter)}>
        {filter === 'ALL' ? t('admin.outbox.filterAll') : t(STATUS_LABEL[filter])}
      </button>)}
    </div>

    <div className="sk-admin-card sk-admin-table-card">
      {vm.loading && !vm.messages ? <AdminLoading label={t('admin.outbox.loading')} />
        : vm.error ? <AdminError title={t('admin.outbox.error')} message={vm.error} onRetry={vm.reload} />
          : <table className="sk-admin-table">
            <caption className="sk-admin-visually-hidden">{t('admin.outbox.caption')}</caption>
            <thead><tr>
              <th scope="col">{t('admin.outbox.colStatus')}</th><th scope="col">{t('admin.outbox.colEvent')}</th><th scope="col">{t('admin.outbox.colChannel')}</th><th scope="col">{t('admin.outbox.colRecipient')}</th>
              <th scope="col">{t('admin.outbox.colAttempts')}</th><th scope="col">{t('admin.outbox.colQueued')}</th><th scope="col">{t('admin.outbox.colSent')}</th>
              <th scope="col">{t('admin.outbox.colError')}</th><th scope="col">{t('admin.outbox.colAction')}</th>
            </tr></thead>
            <tbody>{vm.visible.length ? vm.visible.map(message => <tr key={message.id}>
              <td><span className={`sk-admin-tag ${STATUS_TONE[message.status] ?? 'is-neutral'}`}>{statusLabel(message.status)}</span></td>
              <td>{message.eventType ? readable(message.eventType) : '—'}</td>
              <td>{channel(message)}</td>
              <td className="sk-admin-mono">{message.recipientMasked || '—'}</td>
              <td>{t('admin.outbox.attempts', { attempts: count(message.attempts), max: count(message.maxAttempts) })}</td>
              <td>{at(message.createdAt)}</td>
              <td>{at(message.sentAt)}</td>
              <td>{message.lastError ?? '—'}</td>
              <td>{REQUEUEABLE.has(message.status)
                ? <button type="button" className="sk-admin-button" aria-label={t('admin.outbox.requeueAria', { channel: channel(message), recipient: message.recipientMasked || '—' })} onClick={() => vm.askRequeue(message)}>
                  <Icon name="refresh" size={16} />{t('admin.outbox.requeue')}
                </button>
                : '—'}</td>
            </tr>) : <tr><td colSpan={9}>{vm.messages && vm.messages.length
              ? <AdminEmpty title={t('admin.outbox.emptyFiltered')} description={t('admin.outbox.emptyFilteredBody')} />
              : <AdminEmpty title={t('admin.outbox.empty')} description={t('admin.outbox.emptyBody')} />}</td></tr>}</tbody>
          </table>}
    </div>
    <p className="sk-admin-note">{t('admin.outbox.note')}</p>

    <ConfirmDialog open={vm.confirmingProcess} title={t('admin.outbox.processTitle')} body={t('admin.outbox.processBody')}
      confirmLabel={t('admin.outbox.process')} busy={vm.processing} onConfirm={() => void vm.process()} onCancel={vm.cancelProcess} />
    <ConfirmDialog open={target !== null} title={t('admin.outbox.requeueTitle')}
      body={<>{target && t('admin.outbox.requeueBody', { channel: channel(target), recipient: target.recipientMasked || '—' })}{vm.requeueError && <p className="sk-admin-form-error" role="alert">{t('admin.outbox.requeueError')} {vm.requeueError}</p>}</>}
      confirmLabel={t('admin.outbox.requeue')} busy={vm.requeuing} onConfirm={() => void vm.requeue()} onCancel={vm.cancelRequeue} />
  </AdminPage>;
});
