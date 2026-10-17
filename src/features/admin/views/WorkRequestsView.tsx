import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Video } from 'lucide-react';
import type { StaffAppointment } from '@/data/workflowTypes';
import { displayDate, money } from '@/data/workflowTypes';
import { DataState, EmptyState, Field, FormError, Pagination } from '@/components/interface/WorkflowUI';
import { ProviderConsultationDialog } from '@/components/health/ProviderConsultationDialog';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { workRepository } from '../model/workRepository';
import { WORK_REQUEST_FILTERS } from '../model/types';
import type { AppointmentTransition, WorkRequestTransition } from '../model/types';
import { WORK_REQUEST_PAGE_SIZE, WorkRequestsViewModel } from '../viewmodels/WorkRequestsViewModel';

// Status codes (REQUESTED, OPEN, …) are shown as the server sends them: the filter's
// option text is also its value, so it stays the code.

const REQUEST_STEP_LABEL: Record<WorkRequestTransition, MessageKey> = {
  ACCEPTED: 'admin.work.accept',
  DECLINED: 'admin.work.decline',
  DISPATCHED: 'admin.work.dispatched',
  COMPLETED: 'admin.work.completed',
};

const APPOINTMENT_DECISION: Record<AppointmentTransition, { label: MessageKey; primary: boolean }> = {
  CONFIRMED: { label: 'admin.work.confirm', primary: true },
  CANCELLED: { label: 'admin.work.declineShort', primary: false },
  COMPLETED: { label: 'admin.work.completed', primary: true },
  NO_SHOW: { label: 'admin.work.noShow', primary: false },
};

type QueueTab = 'requests' | 'appointments' | 'followups';

const StaffAppointments = observer(function StaffAppointments({ vm }: { vm: WorkRequestsViewModel }) {
  const t = useT();
  // Presentation state: the appointment whose consultation is open.
  const [consulting, setConsulting] = useState<StaffAppointment | null>(null);
  return <DataState loading={vm.appointmentsLoading} error={vm.appointmentsError} retry={vm.reloadAppointments}>
    {consulting && <ProviderConsultationDialog appointment={{ id: consulting.id, customer: consulting.customer }} onClose={() => setConsulting(null)} />}
    {vm.appointmentItems.length ? <div className="wf-order-list">
      {vm.appointmentItems.map(appt => <article className="wf-card" key={appt.id}>
        <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.work.appointmentRef', { id: appt.id.slice(0, 8).toUpperCase() })}</span><h3>{displayDate(appt.slotStart)}</h3></div><span className={`wf-status status-${appt.status.toLowerCase()}`}>{appt.status.replace(/_/g, ' ')}</span></div>
        <div className="wf-request-details">
          <div><span>{t('admin.work.holder')}</span><strong>{appt.customer}</strong><small>{appt.contact}</small></div>
          <div><span>{t('admin.work.service')}</span><strong>{appt.catalogItemId}</strong><small>{t('admin.work.provider', { id: appt.providerId.slice(0, 8) })}</small></div>
          <div><span>{t('admin.work.slot')}</span><strong>{displayDate(appt.slotStart)}</strong><small>{t('admin.work.until', { time: displayDate(appt.slotEnd) })}</small></div>
        </div>
        <div className="wf-row-actions">
          {vm.appointmentDecisions(appt).map(status => <button key={status} type="button" className={APPOINTMENT_DECISION[status].primary ? 'health-button health-button-primary' : 'health-button'} disabled={vm.busy} onClick={() => void vm.decideAppointment(appt, status)}>{t(APPOINTMENT_DECISION[status].label)}</button>)}
          {vm.canJoinConsultation(appt) && <button type="button" className="health-button" onClick={() => setConsulting(appt)}><Video size={16} aria-hidden="true" />{t('admin.work.join')}</button>}
        </div>
      </article>)}
    </div> : <EmptyState title={t('admin.work.noAppointments')} description={t('admin.work.noAppointmentsBody')} />}
  </DataState>;
});

const StaffFollowUps = observer(function StaffFollowUps({ vm }: { vm: WorkRequestsViewModel }) {
  const t = useT();
  return <DataState loading={vm.followUpsLoading} error={vm.followUpsError} retry={vm.reloadFollowUps}>
    {vm.followUpItems.length ? <div className="wf-order-list">{vm.followUpItems.map(task => <article className="wf-card" key={task.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.work.followUpRef', { id: task.id.slice(0, 8).toUpperCase() })}</span><h3>{task.note}</h3></div><span className={`wf-status ${task.status === 'OPEN' ? 'status-requested' : 'status-accepted'}`}>{task.status}</span></div><div className="wf-order-meta"><span>{t('admin.work.order', { id: task.orderId.slice(0, 8) })}</span><small>{t('admin.work.created', { date: displayDate(task.createdAt) })}</small></div>{vm.canResolve(task) && <button type="button" className="health-button" disabled={vm.busy} onClick={() => void vm.resolveFollowUp(task)}>{t('admin.work.resolve')}</button>}</article>)}</div> : <EmptyState title={t('admin.work.noFollowUps')} description={t('admin.work.noFollowUpsBody')} />}
  </DataState>;
});

/** Super Admin → Operations & SOS → Provider requests: service requests, appointments and follow-ups. */
export const WorkRequestsView = observer(function WorkRequestsView() {
  const t = useT();
  const [vm] = useState(() => new WorkRequestsViewModel(workRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // Presentation state: which queue is shown.
  const [tab, setTab] = useState<QueueTab>('requests');
  const items = vm.requestItems;

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.work.eyebrow')}</span><h2>{t('admin.work.title')}</h2><p>{t('admin.work.intro')}</p></div><Field label={t('admin.accountsList.colStatus')}><select value={vm.filter} onChange={event => vm.setFilter(event.target.value)}>{WORK_REQUEST_FILTERS.map(value => <option key={value}>{value}</option>)}</select></Field></div><FormError message={vm.actionError} />
  <div className="wf-choice-row" style={{ marginBottom: 20 }} role="group" aria-label={t('admin.work.queue')}><button type="button" aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>{t('admin.work.tabRequests')}</button><button type="button" aria-pressed={tab === 'appointments'} onClick={() => setTab('appointments')}>{t('admin.work.tabAppointments')}</button><button type="button" aria-pressed={tab === 'followups'} onClick={() => setTab('followups')}>{t('admin.work.tabFollowUps')}</button></div>
  {tab === 'requests' ? <DataState loading={vm.requestsLoading} error={vm.requestsError} retry={vm.reloadRequests}>{items.length ? <><div className="wf-order-list">{items.map(item => <article className="wf-card" key={item.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.work.requestRef', { id: item.orderId.slice(0, 8).toUpperCase() })}</span><h3>{item.name}</h3></div><span className={`wf-status status-${item.status.toLowerCase()}`}>{item.status}</span></div><div className="wf-request-details"><div><span>{t('admin.work.holder')}</span><strong>{item.customer}</strong><small>{item.contact}</small></div><div><span>{t('admin.work.request')}</span><strong>{item.quantity} × {money(item.pricePaise)}</strong><small>{displayDate(item.createdAt)}</small></div><div><span>{t('admin.work.location')}</span><strong>{item.delivery.city} · {item.delivery.pincode}</strong><small>{item.delivery.mode === 'pickup' ? t('admin.work.pickup') : item.delivery.address}</small></div>{item.requestedSlot && <div><span>{t('admin.work.requestedTime')}</span><strong>{displayDate(item.requestedSlot)}</strong></div>}</div><div className="wf-row-actions">{vm.requestSteps(item).map(status => <button key={status} type="button" className={`health-button ${status === 'ACCEPTED' ? 'health-button-primary' : ''}`} disabled={vm.busy} onClick={() => void vm.updateRequest(item, status)}>{t(REQUEST_STEP_LABEL[status])}</button>)}</div></article>)}</div><Pagination page={vm.page} total={vm.requestTotal} pageSize={WORK_REQUEST_PAGE_SIZE} onChange={vm.setPage} /></> : <EmptyState title={t('admin.work.noRequests')} description={t('admin.work.noRequestsBody')} />}</DataState> : tab === 'appointments' ? <StaffAppointments vm={vm} /> : <StaffFollowUps vm={vm} />}
</>;
});
