import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Video } from 'lucide-react';
import type { StaffAppointment } from '@/data/workflowTypes';
import { displayDate, money } from '@/data/workflowTypes';
import { DataState, EmptyState, Field, FormError, Pagination } from '@/components/interface/WorkflowUI';
import { ProviderConsultationDialog } from '@/components/health/ProviderConsultationDialog';
import { workRepository } from '../model/workRepository';
import { WORK_REQUEST_FILTERS } from '../model/types';
import type { AppointmentTransition, WorkRequestTransition } from '../model/types';
import { WORK_REQUEST_PAGE_SIZE, WorkRequestsViewModel } from '../viewmodels/WorkRequestsViewModel';

const REQUEST_STEP_LABEL: Record<WorkRequestTransition, string> = {
  ACCEPTED: 'Accept request',
  DECLINED: 'Decline request',
  DISPATCHED: 'Mark dispatched',
  COMPLETED: 'Mark completed',
};

const APPOINTMENT_DECISION: Record<AppointmentTransition, { label: string; primary: boolean }> = {
  CONFIRMED: { label: 'Confirm', primary: true },
  CANCELLED: { label: 'Decline', primary: false },
  COMPLETED: { label: 'Mark completed', primary: true },
  NO_SHOW: { label: 'No-show', primary: false },
};

type QueueTab = 'requests' | 'appointments' | 'followups';

const StaffAppointments = observer(function StaffAppointments({ vm }: { vm: WorkRequestsViewModel }) {
  // Presentation state: the appointment whose consultation is open.
  const [consulting, setConsulting] = useState<StaffAppointment | null>(null);
  return <DataState loading={vm.appointmentsLoading} error={vm.appointmentsError} retry={vm.reloadAppointments}>
    {consulting && <ProviderConsultationDialog appointment={{ id: consulting.id, customer: consulting.customer }} onClose={() => setConsulting(null)} />}
    {vm.appointmentItems.length ? <div className="wf-order-list">
      {vm.appointmentItems.map(appt => <article className="wf-card" key={appt.id}>
        <div className="wf-panel-heading"><div><span className="care-eyebrow">APPOINTMENT {appt.id.slice(0, 8).toUpperCase()}</span><h3>{displayDate(appt.slotStart)}</h3></div><span className={`wf-status status-${appt.status.toLowerCase()}`}>{appt.status.replace(/_/g, ' ')}</span></div>
        <div className="wf-request-details">
          <div><span>Account holder</span><strong>{appt.customer}</strong><small>{appt.contact}</small></div>
          <div><span>Service</span><strong>{appt.catalogItemId}</strong><small>Provider {appt.providerId.slice(0, 8)}</small></div>
          <div><span>Slot</span><strong>{displayDate(appt.slotStart)}</strong><small>until {displayDate(appt.slotEnd)}</small></div>
        </div>
        <div className="wf-row-actions">
          {vm.appointmentDecisions(appt).map(status => <button key={status} className={APPOINTMENT_DECISION[status].primary ? 'health-button health-button-primary' : 'health-button'} disabled={vm.busy} onClick={() => void vm.decideAppointment(appt, status)}>{APPOINTMENT_DECISION[status].label}</button>)}
          {vm.canJoinConsultation(appt) && <button className="health-button" onClick={() => setConsulting(appt)}><Video size={16} />Join consultation</button>}
        </div>
      </article>)}
    </div> : <EmptyState title="No appointments assigned to you." description="Appointments booked on your services will appear here for confirmation." />}
  </DataState>;
});

const StaffFollowUps = observer(function StaffFollowUps({ vm }: { vm: WorkRequestsViewModel }) {
  return <DataState loading={vm.followUpsLoading} error={vm.followUpsError} retry={vm.reloadFollowUps}>
    {vm.followUpItems.length ? <div className="wf-order-list">{vm.followUpItems.map(task => <article className="wf-card" key={task.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">FOLLOW-UP {task.id.slice(0, 8).toUpperCase()}</span><h3>{task.note}</h3></div><span className={`wf-status ${task.status === 'OPEN' ? 'status-requested' : 'status-accepted'}`}>{task.status}</span></div><div className="wf-order-meta"><span>Order {task.orderId.slice(0, 8)}</span><small>Created {displayDate(task.createdAt)}</small></div>{vm.canResolve(task) && <button className="health-button" disabled={vm.busy} onClick={() => void vm.resolveFollowUp(task)}>Mark resolved</button>}</article>)}</div> : <EmptyState title="No follow-up tasks." description="Overdue care requests generate follow-up tasks automatically on the 2-hour cycle." />}
  </DataState>;
});

/** Super Admin → Operations & SOS → Provider requests: service requests, appointments and follow-ups. */
export const WorkRequestsView = observer(function WorkRequestsView() {
  const [vm] = useState(() => new WorkRequestsViewModel(workRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Presentation state: which queue is shown.
  const [tab, setTab] = useState<QueueTab>('requests');
  const items = vm.requestItems;

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">YOUR ASSIGNED CARE REQUESTS</span><h2>Requests & fulfilment.</h2><p>Updates are saved to the request and shown to the account holder.</p></div><Field label="Status"><select value={vm.filter} onChange={event => vm.setFilter(event.target.value)}>{WORK_REQUEST_FILTERS.map(value => <option key={value}>{value}</option>)}</select></Field></div><FormError message={vm.actionError} />
  <div className="wf-choice-row" style={{ marginBottom: 20 }} aria-label="Staff queue"><button aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>Service requests</button><button aria-pressed={tab === 'appointments'} onClick={() => setTab('appointments')}>Appointments</button><button aria-pressed={tab === 'followups'} onClick={() => setTab('followups')}>Follow-ups</button></div>
  {tab === 'requests' ? <DataState loading={vm.requestsLoading} error={vm.requestsError} retry={vm.reloadRequests}>{items.length ? <><div className="wf-order-list">{items.map(item => <article className="wf-card" key={item.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">REQUEST {item.orderId.slice(0, 8).toUpperCase()}</span><h3>{item.name}</h3></div><span className={`wf-status status-${item.status.toLowerCase()}`}>{item.status}</span></div><div className="wf-request-details"><div><span>Account holder</span><strong>{item.customer}</strong><small>{item.contact}</small></div><div><span>Request</span><strong>{item.quantity} × {money(item.pricePaise)}</strong><small>{displayDate(item.createdAt)}</small></div><div><span>Location</span><strong>{item.delivery.city} · {item.delivery.pincode}</strong><small>{item.delivery.mode === 'pickup' ? 'Provider pickup' : item.delivery.address}</small></div>{item.requestedSlot && <div><span>Requested time</span><strong>{displayDate(item.requestedSlot)}</strong></div>}</div><div className="wf-row-actions">{vm.requestSteps(item).map(status => <button key={status} className={`health-button ${status === 'ACCEPTED' ? 'health-button-primary' : ''}`} disabled={vm.busy} onClick={() => void vm.updateRequest(item, status)}>{REQUEST_STEP_LABEL[status]}</button>)}</div></article>)}</div><Pagination page={vm.page} total={vm.requestTotal} pageSize={WORK_REQUEST_PAGE_SIZE} onChange={vm.setPage} /></> : <EmptyState title="No service requests assigned to you." description="Requests from your catalog will appear here for you to accept or decline." />}</DataState> : tab === 'appointments' ? <StaffAppointments vm={vm} /> : <StaffFollowUps vm={vm} />}
</>;
});
