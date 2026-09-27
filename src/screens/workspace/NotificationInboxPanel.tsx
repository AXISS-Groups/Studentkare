import React from 'react';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { displayDate } from '../../data/workflowTypes';
import '../../theme/workflows.css';

interface Notification { id: string; eventType: string; payload: Record<string, any>; status: string; delivery?: DeliveryState; createdAt: number; sentAt: number | null; readAt: number | null; }

export type DeliveryState = 'sent' | 'held' | 'suppressed_reminders' | 'suppressed_email' | 'suppressed' | 'failed' | 'pending';

/**
 * What a student is told about a notification that has not arrived.
 *
 * A reminder can now be held until quiet hours end, or suppressed because a
 * setting is off. Silence about either looks like the product losing messages,
 * so each state says what happened and, where there is one, what to do.
 */
export function deliveryNote(delivery: DeliveryState | undefined, status: string): { text: string; tone: 'neutral' | 'info' | 'attention' | 'danger' } {
  switch (delivery) {
    case 'held':
      return { text: 'Held until your quiet hours end', tone: 'info' };
    case 'suppressed_reminders':
      return { text: 'Not sent — reminders are switched off in your settings', tone: 'attention' };
    case 'suppressed_email':
      return { text: 'Not sent — email is switched off in your settings', tone: 'attention' };
    case 'suppressed':
      return { text: 'Not sent — one of your notification settings is off', tone: 'attention' };
    case 'failed':
      return { text: "We could not deliver this. That is on our side — support can resend it", tone: 'danger' };
    case 'pending':
      return { text: 'Queued for delivery', tone: 'neutral' };
    default:
      // An older row, or a server that predates the delivery field.
      return { text: status === 'PENDING' ? 'Queued for delivery' : '', tone: 'neutral' };
  }
}

function label(eventType: string): string {
  return eventType.replace(/_/g, ' ');
}

function body(n: Notification): string {
  const p = n.payload || {};
  if (n.eventType === 'appointment_reminder') return `Appointment reminder.`;
  if (n.eventType === 'medication_refill') return `Refill reminder for ${p.name || 'a medication'}.`;
  return label(n.eventType);
}

export function NotificationInboxPanel() {
  const inbox = useApiResource<{ items: Notification[] }>('/notifications');
  const mutation = useMutation();
  const unread = inbox.data?.items.filter(n => !n.readAt).length ?? 0;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">NOTIFICATION INBOX</span>
      <h2>Your updates.</h2>
      <p>Appointment and medication reminders delivered to your account. Read state is tracked.</p>
    </div></div>

    <DataState {...inbox} retry={inbox.reload}>
      {inbox.data?.items.length ? <>
        <div className="wf-notice" role="status" style={{ marginBottom: 16 }}><Bell size={18} />{unread} unread</div>
        <div className="wf-order-list">
          {inbox.data.items.map(n => <article className="wf-card" key={n.id} style={{ opacity: n.readAt ? 0.72 : 1 }}>
            <div className="wf-panel-heading"><div><span className="care-eyebrow">{label(n.eventType)}</span><h3>{body(n)}</h3></div>
              <span className={`wf-status ${n.readAt ? '' : 'status-accepted'}`}>{n.readAt ? 'Read' : 'New'}</span></div>
            <div className="wf-order-meta"><span><Clock size={13} /> {displayDate(n.createdAt)}</span>
              <span data-tone={n.sentAt ? 'neutral' : deliveryNote(n.delivery, n.status).tone} className="wf-delivery-note">{n.sentAt ? `Delivered ${displayDate(n.sentAt)}` : deliveryNote(n.delivery, n.status).text}</span></div>
            {!n.readAt && <button className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/notifications/${n.id}/read`, { method: 'POST' }), inbox.reload)}><CheckCircle2 size={15} />Mark as read</button>}
          </article>)}
        </div>
      </> : <EmptyState title="No notifications yet." description="Appointment and medication reminders you schedule will appear here with delivery and read status." />}
    </DataState>
  </>;
}
