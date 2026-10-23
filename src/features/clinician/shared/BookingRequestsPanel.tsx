import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { displayDate } from '@/data/types/workflowTypes';
import { SkButton } from '@/design-system/primitives';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { workRepository } from '@/features/admin/model/workRepository';
import { DoctorAppointmentsViewModel } from '../viewmodel/DoctorAppointmentsViewModel';
import type { DoctorAppointmentsRepository } from '../viewmodel/DoctorAppointmentsViewModel';
import './booking-requests.css';

/**
 * Booking requests waiting on this doctor, with Confirm and Decline, on the
 * console's Today and Queue (live-run audit #3). The same view model and
 * transitions as the hub's Appointments page (ClinicianWorkspaceHub,
 * DoctorAppointmentsScreen): PATCH /work/appointments/{id}, scoped by the
 * server to this doctor. Confirming is what unlocks the consult room,
 * prescribing and lab orders for that student. Declining asks first.
 *
 * Draws nothing while loading or when there are no requests.
 */
export const BookingRequestsPanel = observer(function BookingRequestsPanel({ repository = workRepository, onChanged }: {
  repository?: DoctorAppointmentsRepository;
  /** The page re-reads its own bookings after a change. */
  onChanged?: () => void;
}): React.ReactElement | null {
  const t = useT();
  const [vm] = useState(() => new DoctorAppointmentsViewModel(repository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  const requests = vm.items.filter((item) => item.status === 'REQUESTED');

  const decide = async (done: Promise<boolean>) => { if (await done) onChanged?.(); };

  if (vm.loadError) {
    return (
      <section className="sk-clin-requests" aria-label={t('clinRequests.title')}>
        <p className="sk-clin-requests__error" role="alert">{t('clinRequests.loadError')}</p>
        <SkButton variant="secondary" onClick={vm.loadAppointments}>{t('clinRequests.retry')}</SkButton>
      </section>
    );
  }
  if (vm.loading || requests.length === 0) return null;

  return (
    <section className="sk-clin-requests" aria-labelledby="sk-clin-requests-title">
      <h2 id="sk-clin-requests-title" className="sk-clin-requests__title">{t('clinRequests.title')}</h2>
      <p className="sk-clin-requests__sub">{t('clinRequests.sub')}</p>
      {vm.actionFailed ? <p className="sk-clin-requests__error" role="alert">{t('partner.clin.appt.actionFailed')}</p> : null}
      <ul className="sk-clin-requests__list">
        {requests.map((appt) => (
          <li key={appt.id} className="sk-clin-requests__row">
            <span className="sk-clin-requests__who">
              <strong>{appt.customer}</strong>
              <small>{displayDate(appt.slotStart)}</small>
            </span>
            <span className="sk-clin-requests__actions">
              <SkButton variant="secondary" disabled={vm.busy} aria-label={`${t('clinRequests.decline')}: ${appt.customer}`}
                onClick={() => void decide(vm.request(appt, 'CANCELLED'))}>{t('clinRequests.decline')}</SkButton>
              <SkButton disabled={vm.busy} aria-label={`${t('clinRequests.confirm')}: ${appt.customer}`}
                onClick={() => void decide(vm.request(appt, 'CONFIRMED'))}>{t('clinRequests.confirm')}</SkButton>
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={vm.pending !== null}
        tone="destructive"
        title={t('partner.clin.appt.dialog.decline.title')}
        body={t('partner.clin.appt.dialog.decline.body')}
        confirmLabel={t('partner.clin.appt.dialog.decline.confirm')}
        cancelLabel={t('partner.clin.appt.keep')}
        busy={vm.busy}
        onConfirm={() => void decide(vm.confirmPending())}
        onCancel={vm.cancelPending}
      />
    </section>
  );
});
