import React from 'react';
import { Bell, CheckCircle2, Clock, Settings } from 'lucide-react';
import { navigate } from '../../lib/utils/workflowRouting';
import { useNavigate } from '@/core/navigation';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { displayDate } from '../../data/types/workflowTypes';
import { translate, useT, type MessageKey, type Vars } from '@/i18n';
import '../../theme/workflows.css';

interface Notification { id: string; eventType: string; payload: Record<string, unknown>; status: string; delivery?: DeliveryState; createdAt: number; sentAt: number | null; readAt: number | null; }

export type DeliveryState =
  | 'sent' | 'held' | 'suppressed_reminders' | 'suppressed_email'
  | 'suppressed_appointment_cancelled' | 'suppressed_appointment_passed'
  | 'suppressed' | 'failed' | 'pending';

type Translate = (key: MessageKey, vars?: Vars) => string;
const english: Translate = (key, vars) => translate('en', key, vars);

/**
 * What a student is told about a notification that has not arrived.
 *
 * A reminder can now be held until quiet hours end, or suppressed because a
 * setting is off. Silence about either looks like the product losing messages,
 * so each state says what happened and, where there is one, what to do.
 */
export function deliveryNote(delivery: DeliveryState | undefined, status: string, t: Translate = english): { text: string; tone: 'neutral' | 'info' | 'attention' | 'danger' } {
  switch (delivery) {
    case 'held':
      return { text: t('care.inbox.delivery.held'), tone: 'info' };
    case 'suppressed_reminders':
      return { text: t('care.inbox.delivery.suppressedReminders'), tone: 'attention' };
    case 'suppressed_email':
      return { text: t('care.inbox.delivery.suppressedEmail'), tone: 'attention' };
    // Not a setting: the appointment itself changed, so say that instead.
    case 'suppressed_appointment_cancelled':
      return { text: t('care.inbox.delivery.suppressedAppointmentCancelled'), tone: 'neutral' };
    case 'suppressed_appointment_passed':
      return { text: t('care.inbox.delivery.suppressedAppointmentPassed'), tone: 'neutral' };
    case 'suppressed':
      return { text: t('care.inbox.delivery.suppressed'), tone: 'attention' };
    case 'failed':
      return { text: t('care.inbox.delivery.failed'), tone: 'danger' };
    case 'pending':
      return { text: t('care.inbox.delivery.queued'), tone: 'neutral' };
    default:
      // An older row, or a server that predates the delivery field.
      return { text: status === 'PENDING' ? t('care.inbox.delivery.queued') : '', tone: 'neutral' };
  }
}

const KNOWN_EVENTS = new Set(['appointment_reminder', 'medication_refill', 'MEDICATION_REMINDER', 'ENCOUNTER_FINALIZED', 'STOCK_BACK']);

function label(eventType: string, t: Translate): string {
  return KNOWN_EVENTS.has(eventType) ? t(`care.inbox.event.${eventType}` as MessageKey) : eventType.replace(/_/g, ' ');
}

function body(n: Notification, t: Translate): string {
  const name = n.payload?.name;
  if (n.eventType === 'appointment_reminder') return t('care.inbox.body.appointment');
  if (n.eventType === 'ENCOUNTER_FINALIZED') return t('care.inbox.body.encounter');
  if (n.eventType === 'STOCK_BACK') return t('refill.inbox.stockBack');
  if (n.eventType === 'medication_refill') return typeof name === 'string' && name ? t('care.inbox.body.refill', { name }) : t('care.inbox.body.refillUnnamed');
  return label(n.eventType, t);
}

/** The tracked refill a refill reminder is about (an opaque id, never a medicine), or ''. */
function refillId(n: Notification): string {
  const id = n.payload?.resourceId;
  return n.eventType === 'medication_refill' && n.payload?.resourceType === 'refill_tracker' && typeof id === 'string' ? id : '';
}

/** The signed note a "notes finalised" notification is about, or '' for any other notification. */
function visitSummaryId(n: Notification): string {
  const id = n.payload?.resourceId;
  return n.eventType === 'ENCOUNTER_FINALIZED' && n.payload?.resourceType === 'encounter' && typeof id === 'string' ? id : '';
}

export function NotificationInboxPanel() {
  const t = useT();
  const routerNavigate = useNavigate();
  const inbox = useApiResource<{ items: Notification[] }>('/notifications');
  const mutation = useMutation();
  const unread = inbox.data?.items.filter(n => !n.readAt).length ?? 0;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('care.inbox.eyebrow')}</span>
      <h2>{t('care.inbox.title')}</h2>
      <p>{t('care.inbox.intro')}</p>
    </div><button type="button" className="health-button" onClick={() => navigate('notification-settings')}><Settings size={16} aria-hidden="true" />{t('care.inbox.settings')}</button></div>

    <DataState {...inbox} retry={inbox.reload}>
      {inbox.data?.items.length ? <>
        <div className="wf-notice" role="status" style={{ marginBottom: 16 }}><Bell size={18} aria-hidden="true" />{t('care.inbox.unread', { count: unread })}</div>
        <div className="wf-order-list">
          {inbox.data.items.map(n => {
            const note = deliveryNote(n.delivery, n.status, t);
            return <article className="wf-card" key={n.id} style={{ opacity: n.readAt ? 0.72 : 1 }}>
              <div className="wf-panel-heading"><div><span className="care-eyebrow">{label(n.eventType, t)}</span><h3>{body(n, t)}</h3></div>
                <span className={`wf-status ${n.readAt ? '' : 'status-accepted'}`}>{n.readAt ? t('notif.read') : t('care.inbox.new')}</span></div>
              <div className="wf-order-meta"><span><Clock size={13} aria-hidden="true" /> {displayDate(n.createdAt)}</span>
                <span data-tone={n.sentAt ? 'neutral' : note.tone} className="wf-delivery-note">{n.sentAt ? t('care.inbox.delivered', { date: displayDate(n.sentAt) }) : note.text}</span></div>
              {visitSummaryId(n) && <button type="button" className="health-text-button" onClick={() => routerNavigate(`/visit-summaries?id=${encodeURIComponent(visitSummaryId(n))}`)}>{t('care.inbox.openVisit')}</button>}
              {refillId(n) && <button type="button" className="health-text-button" onClick={() => routerNavigate(`/health/refills?id=${encodeURIComponent(refillId(n))}`)}>{t('refill.inbox.open')}</button>}
              {!n.readAt && <button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/notifications/${n.id}/read`, { method: 'POST' }), inbox.reload)}><CheckCircle2 size={15} aria-hidden="true" />{t('notif.markRead')}</button>}
            </article>;
          })}
        </div>
      </> : <EmptyState title={t('notif.emptyTitle')} description={t('care.inbox.emptyBody')} animation="anim-bell-off" />}
    </DataState>
  </>;
}
