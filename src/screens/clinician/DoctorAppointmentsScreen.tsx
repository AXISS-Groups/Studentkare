import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { StaffAppointment } from '@/data/types/workflowTypes';
import { displayDate } from '@/data/types/workflowTypes';
import { DataState, EmptyState, FormError } from '@/components/interface/WorkflowUI';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { workRepository } from '@/features/admin/model/workRepository';
import type { AppointmentTransition } from '@/features/admin/model/types';
import { DoctorAppointmentsViewModel } from '@/features/clinician/viewmodel/DoctorAppointmentsViewModel';
import type { DoctorAppointmentsRepository } from '@/features/clinician/viewmodel/DoctorAppointmentsViewModel';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

type Status = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type Action = 'confirm' | 'decline' | 'complete' | 'noShow' | 'cancel';

const STATUS_KEY: Record<Status, MessageKey> = {
  REQUESTED: 'partner.clin.appt.status.REQUESTED',
  CONFIRMED: 'partner.clin.appt.status.CONFIRMED',
  COMPLETED: 'partner.clin.appt.status.COMPLETED',
  CANCELLED: 'partner.clin.appt.status.CANCELLED',
  NO_SHOW: 'partner.clin.appt.status.NO_SHOW',
};
const ACTION_KEY: Record<Action, MessageKey> = {
  confirm: 'partner.clin.appt.action.confirm',
  decline: 'partner.clin.appt.action.decline',
  complete: 'partner.clin.appt.action.complete',
  noShow: 'partner.clin.appt.action.noShow',
  cancel: 'partner.clin.appt.action.cancel',
};
const DIALOG_KEY: Record<'decline' | 'cancel' | 'noShow', { title: MessageKey; body: MessageKey; confirm: MessageKey }> = {
  decline: { title: 'partner.clin.appt.dialog.decline.title', body: 'partner.clin.appt.dialog.decline.body', confirm: 'partner.clin.appt.dialog.decline.confirm' },
  cancel: { title: 'partner.clin.appt.dialog.cancel.title', body: 'partner.clin.appt.dialog.cancel.body', confirm: 'partner.clin.appt.dialog.cancel.confirm' },
  noShow: { title: 'partner.clin.appt.dialog.noShow.title', body: 'partner.clin.appt.dialog.noShow.body', confirm: 'partner.clin.appt.dialog.noShow.confirm' },
};

const TOUCH: React.CSSProperties = { minHeight: 'var(--sk-size-touch-target)', minWidth: 'var(--sk-size-touch-target)' };

const isStatus = (value: string): value is Status => value in STATUS_KEY;

/** Cancelling a request is declining it; cancelling a confirmed appointment is a cancellation. */
function actionFor(appointment: StaffAppointment, status: AppointmentTransition): Action {
  if (status === 'CONFIRMED') return 'confirm';
  if (status === 'COMPLETED') return 'complete';
  if (status === 'NO_SHOW') return 'noShow';
  return appointment.status === 'REQUESTED' ? 'decline' : 'cancel';
}

/**
 * Clinician hub → Appointments. The signed-in doctor's own appointments, from
 * GET /work/appointments (the server returns only those on this doctor's services and
 * answers 404 for anyone else's). A confirmed or completed appointment is what lets the
 * doctor prescribe and write encounter notes for that student.
 *
 * Decline, cancel and no-show end the appointment and tell the student, so each asks first.
 */
export const DoctorAppointmentsScreen = observer(function DoctorAppointmentsScreen({ repository = workRepository }: { repository?: DoctorAppointmentsRepository }) {
  const [vm] = useState(() => new DoctorAppointmentsViewModel(repository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  const t = useT();
  const pendingAction = vm.pending ? actionFor(vm.pending.appointment, vm.pending.status) : null;
  const dialog = pendingAction === 'decline' || pendingAction === 'cancel' || pendingAction === 'noShow' ? DIALOG_KEY[pendingAction] : null;

  return <div>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">{t('partner.clin.appt.eyebrow')}</span>
        <h2>{t('partner.clin.appt.title')}</h2>
        <p>{t('partner.clin.appt.subtitle')}</p>
      </div>
    </div>
    <FormError message={vm.actionFailed ? t('partner.clin.appt.actionFailed') : ''} />
    <DataState loading={vm.loading} error={vm.loadError} retry={vm.loadAppointments}>
      {vm.items.length ? <div className="wf-order-list">
        {vm.items.map(appt => <article className="wf-card" key={appt.id} aria-label={`${appt.customer}, ${displayDate(appt.slotStart)}`}>
          <div className="wf-panel-heading">
            <div><span className="care-eyebrow">{t('partner.clin.appt.student')}</span><h3>{appt.customer}</h3></div>
            <span className={`wf-status status-${appt.status.toLowerCase()}`}>{isStatus(appt.status) ? t(STATUS_KEY[appt.status]) : appt.status}</span>
          </div>
          <div className="wf-request-details">
            <div><span>{t('partner.clin.appt.slot')}</span><strong>{displayDate(appt.slotStart)}</strong><small>{t('partner.clin.appt.until')} {displayDate(appt.slotEnd)}</small></div>
          </div>
          {vm.steps(appt).length > 0 && <div className="wf-row-actions">
            {vm.steps(appt).map(status => <button
              key={status}
              type="button"
              className={status === 'CONFIRMED' || status === 'COMPLETED' ? 'health-button health-button-primary' : 'health-button'}
              style={TOUCH}
              disabled={vm.busy}
              aria-label={`${t(ACTION_KEY[actionFor(appt, status)])}: ${appt.customer}`}
              onClick={() => void vm.request(appt, status)}
            >{t(ACTION_KEY[actionFor(appt, status)])}</button>)}
          </div>}
        </article>)}
      </div> : <EmptyState title={t('partner.clin.appt.emptyTitle')} description={t('partner.clin.appt.emptyBody')} />}
    </DataState>
    <ConfirmDialog
      open={Boolean(dialog)}
      tone="destructive"
      title={dialog ? t(dialog.title) : ''}
      body={dialog ? t(dialog.body) : ''}
      confirmLabel={dialog ? t(dialog.confirm) : ''}
      cancelLabel={t('partner.clin.appt.keep')}
      busy={vm.busy}
      onConfirm={() => void vm.confirmPending()}
      onCancel={vm.cancelPending}
    />
  </div>;
});
