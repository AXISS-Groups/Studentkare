import React from 'react';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { displayDate } from '../../data/workflowTypes';
import '../../theme/workflows.css';

interface Notification { id: string; eventType: string; payload: Record<string, any>; status: string; createdAt: number; sentAt: number | null; readAt: number | null; }

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
              <span>{n.sentAt ? `Delivered ${displayDate(n.sentAt)}` : n.status === 'PENDING' ? 'Queued for delivery' : n.status}</span></div>
            {!n.readAt && <button className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/notifications/${n.id}/read`, { method: 'POST' }), inbox.reload)}><CheckCircle2 size={15} />Mark as read</button>}
          </article>)}
        </div>
      </> : <EmptyState title="No notifications yet." description="Appointment and medication reminders you schedule will appear here with delivery and read status." />}
    </DataState>
  </>;
}
