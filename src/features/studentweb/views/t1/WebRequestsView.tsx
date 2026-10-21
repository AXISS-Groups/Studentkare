import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { Overlay } from '@/design-system/overlays/Overlay';
import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { MyRequestsViewModel, canCancel, statusLabel } from '@/features/requests/viewmodel/RequestsViewModel';
import type { RequestItem } from '@/features/requests/viewmodel/RequestsViewModel';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead, Pill } from '../parts';
import type { PillTone } from '../parts';
import { CrisisLine, dayDate } from './shared';
import '../../studentweb.css';
import './t1web.css';

const DONE = new Set(['COMPLETED', 'RESOLVED', 'PICKED_UP', 'READY', 'DISPATCHED']);
const STOPPED = new Set(['DECLINED', 'CANCELLED']);
const WAITING_ON_YOU = new Set(['RECOLLECTION_REQUIRED']);
const tone = (status: string): PillTone => (DONE.has(status) ? 'positive' : STOPPED.has(status) ? 'muted' : WAITING_ON_YOU.has(status) ? 'attention' : 'action');
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const clock = (seconds: number) => new Date(seconds * 1000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** POST /support limits (SupportInput): subject 3–160, message 10–2000. */
export const SUPPORT_LIMITS = { subjectMin: 3, subjectMax: 160, messageMin: 10, messageMax: 2000 } as const;

type Topic = 'RETURN' | 'HOSTEL_VISIT' | 'REFILL' | 'OTHER';
const TOPICS: ReadonlyArray<{ id: Topic; label: MessageKey; route?: RoutePath }> = [
  { id: 'RETURN', label: 'req.form.RETURN', route: 'return-request' },
  { id: 'HOSTEL_VISIT', label: 'req.newVisit', route: 'hostel-visit' },
  { id: 'REFILL', label: 'req.form.REFILL', route: 'refill-request' },
  { id: 'OTHER', label: 'swt.req.topic.other' },
];

/**
 * My requests, web (canvas 3b, WebRequests, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). Everything the student asked for (GET
 * /my-requests) with its status, and one New request dialog: the three request
 * forms that exist, or a message to support (POST /support).
 *
 * Not drawn, on purpose: per-step timelines and "support calls within 2 h"
 * (the server keeps a status, not a timeline) and "a person replies within 4
 * working hours" (a service promise with no setting or owner, D9-8). The
 * dialog never triages distress: it shows the crisis lines instead.
 */
export const WebRequestsView = observer(function WebRequestsView({ viewModel: vm }: { viewModel: MyRequestsViewModel }) {
  const t = useT();
  const online = useOnline();
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  let body: React.ReactNode;
  if (vm.items === null && !vm.loadFailed) body = <LoadingRows label={t('req.loading')} rows={3} />;
  else if (vm.loadFailed) body = online ? <ErrorPanel title={t('req.failedTitle')} body={t('del.failedBody')} onRetry={() => void vm.load()} /> : <OfflinePanel onRetry={() => void vm.load()} />;
  else if (vm.items && vm.items.length === 0) body = <EmptyPanel title={t('req.emptyTitle')} body={t('req.emptyBody')} action={{ label: t('swt.req.new'), onPress: () => setAsking(true) }} />;
  else {
    body = (vm.items ?? []).map((item) => {
      const key = `${item.kind}-${item.id}`;
      const expanded = open === key;
      return (
        <article key={key} className={`sk-sw-card sk-swt-req${expanded ? ' is-open' : ''}`} data-testid={`request-${key}`}>
          <button type="button" className="sk-swt-req__head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : key)}>
            <span>
              <span className="sk-swt-req__ref">{`${t(`req.kind.${item.kind}` as MessageKey).toUpperCase()} · ${dayDate(item.createdAt)}`}</span>
              <span className="sk-swt-req__title">{item.title}</span>
            </span>
            <Pill tone={tone(item.status)}>{statusLabel(item, t)}</Pill>
          </button>
          {expanded ? <Detail item={item} busy={vm.busyId === item.id} onCancel={() => void vm.cancel(item)} /> : null}
        </article>
      );
    });
  }

  return (
    <div className="sk-sw-page" data-testid="web-requests">
      <PageHead
        title={t('swt.req.title')}
        sub={t('swt.req.sub')}
        actions={<button type="button" className="sk-sw-btn sk-sw-btn--primary" disabled={!online} onClick={() => setAsking(true)}><Icon name="plus" size={17} />{t('swt.req.new')}</button>}
      />
      {vm.error ? <p className="sk-sw-error" role="alert">{say(t, vm.error)}</p> : null}
      {body}
      <CrisisLine />
      <NewRequestDialog open={asking} onClose={() => setAsking(false)} onSent={() => { setAsking(false); void vm.load(); }} />
    </div>
  );
});

function Detail({ item, busy, onCancel }: { item: RequestItem; busy: boolean; onCancel: () => void }) {
  const t = useT();
  const d = item.detail;
  return (
    <div className="sk-swt-req__detail">
      {item.kind === 'RETURN' && d?.refundStatus === 'TO_ARRANGE' && d.refundPaise ? <p>{t('req.refund', { amount: rupees(d.refundPaise) })}</p> : null}
      {item.kind === 'HOSTEL_VISIT' && d?.windowStart && d.windowEnd ? (
        <p>{t('req.visitLine', { block: d.hostelBlock ?? '', room: d.room ?? '', date: dayDate(d.windowStart), from: clock(d.windowStart), to: clock(d.windowEnd) })}</p>
      ) : null}
      {item.kind === 'REFILL' && d?.pharmacy ? <p>{t('req.refillLine', { pharmacy: d.pharmacy, quantity: d.quantity ?? '' })}</p> : null}
      {d?.note ? <p>{t('swt.req.yourNote', { note: d.note })}</p> : null}
      {d?.decisionNote ? <p>{t('sos.theirNote', { note: d.decisionNote })}</p> : null}
      <p className="sk-sw-fine">{t('swt.req.opened', { date: dayDate(item.createdAt) })}</p>
      {canCancel(item) ? (
        <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={busy} aria-busy={busy} onClick={onCancel}>{busy ? t('common.loading') : t('req.cancel')}</button>
      ) : null}
    </div>
  );
}

function NewRequestDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: () => void }) {
  const t = useT();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setTopic(null); setSubject(''); setMessage(''); setError(''); } }, [open]);
  const valid = subject.trim().length >= SUPPORT_LIMITS.subjectMin && message.trim().length >= SUPPORT_LIMITS.messageMin;

  const pick = (choice: (typeof TOPICS)[number]) => {
    if (choice.route) { onClose(); navigate(choice.route); return; }
    setTopic(choice.id);
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/support', { method: 'POST', body: JSON.stringify({ subject: subject.trim(), message: message.trim() }) });
      onSent();
    } catch {
      setError(t('req.sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay open={open} variant="dialog" showClose title={t('swt.req.new')} onClose={onClose} busy={busy}>
      <form className="sk-swt-dialog-form" onSubmit={(event) => void send(event)}>
        <fieldset className="sk-swt-chips">
          <legend className="sk-swt-hint">{t('swt.req.about')}</legend>
          {TOPICS.map((choice) => (
            <button key={choice.id} type="button" className="sk-swt-chip" aria-pressed={topic === choice.id} onClick={() => pick(choice)}>{t(choice.label)}</button>
          ))}
        </fieldset>
        {topic === 'OTHER' ? (
          <>
            <label className="sk-sw-field">{t('swt.req.subject')}
              <input required minLength={SUPPORT_LIMITS.subjectMin} maxLength={SUPPORT_LIMITS.subjectMax} value={subject} onChange={(event) => setSubject(event.target.value)} />
            </label>
            <label className="sk-sw-field">{t('swt.req.what')}
              <textarea required minLength={SUPPORT_LIMITS.messageMin} maxLength={SUPPORT_LIMITS.messageMax} value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
            <p className="sk-swt-hint">{t('swt.req.privacy')}</p>
            {error ? <p className="sk-swt-error" role="alert">{error}</p> : null}
            <div className="sk-swt-actions">
              <button type="button" className="sk-swt-btn sk-swt-btn--ghost" disabled={busy} onClick={onClose}>{t('common.cancel')}</button>
              <button type="submit" className="sk-swt-btn sk-swt-btn--primary" disabled={busy || !valid}>{busy ? t('swt.req.sending') : t('swt.req.send')}</button>
            </div>
          </>
        ) : null}
        <p className="sk-swt-hint">{t('swt.req.notForEmergencies')}</p>
        <CrisisLine />
      </form>
    </Overlay>
  );
}

