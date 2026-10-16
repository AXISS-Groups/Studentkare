import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStats, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { waited } from '@/screens/workspace/ClinicalReviewPanel';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { labReviewsRepository, REVIEWER_LIST_LIMIT } from '../model/labReviewsRepository';
import { count } from '../model/format';
import type { UnassignedLabReview } from '../model/types';
import { LabReviewerAssignmentViewModel } from '../viewmodels/LabReviewerAssignmentViewModel';

const ASSIGN_FAILURE = { invalidDoctor: 'admin.labReviewers.errorInvalidDoctor', notWaiting: 'admin.labReviewers.errorNotWaiting', other: 'admin.labReviewers.errorOther' } as const;

/**
 * Super Admin → Gatekeeping → Lab report reviewers (/admin/lab-reviews).
 *
 * Held lab reports that no doctor can review yet (a self-booked test has no ordering
 * doctor), critical first, with how long each has waited. "Assign doctor" picks an
 * active doctor account; the server audits it and notifies the doctor. No result,
 * note or patient is shown: the server does not send them to a super admin, and the
 * admin cannot open or release a report. No canvas design exists for this screen.
 */
export const LabReviewerAssignmentView = observer(function LabReviewerAssignmentView() {
  const t = useT();
  const [vm] = useState(() => new LabReviewerAssignmentViewModel(labReviewsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const tests = (review: UnassignedLabReview) => review.testPanel.length ? review.testPanel.join(', ') : t('admin.labReviewers.unnamedPanel');
  const loaded = !vm.loading && !vm.error && vm.reviews !== null;

  return <AdminPage eyebrow={t('admin.eyebrow.gatekeeping')} title={t('admin.labReviewers.title')} description={t('admin.labReviewers.description')}
    status={loaded && vm.criticalCount > 0 ? <AdminStatus tone="danger">{t('admin.labReviewers.statusCritical', { count: count(vm.criticalCount) })}</AdminStatus> : undefined}>
    <AdminStats label={t('admin.labReviewers.summary')} stats={[
      { label: t('admin.labReviewers.statWaiting'), value: loaded ? count(vm.items.length) : null, meta: t('admin.labReviewers.statWaitingMeta') },
      { label: t('admin.labReviewers.statCritical'), value: loaded ? count(vm.criticalCount) : null, meta: t('admin.labReviewers.statCriticalMeta') },
      { label: t('admin.labReviewers.statLongest'), value: loaded && vm.longestWait !== null ? waited(vm.longestWait, t) : null, meta: t('admin.labReviewers.statLongestMeta') },
    ]} />

    {vm.notice && <div className="sk-admin-card sk-admin-card-heading" role="status">
      <p className="sk-admin-note"><Icon name="check-circle" size={16} />{' '}{t('admin.labReviewers.assigned', { doctor: vm.notice.doctorName, tests: vm.notice.tests.join(', ') || t('admin.labReviewers.unnamedPanel') })}</p>
      <button type="button" className="sk-admin-button" onClick={vm.dismissNotice}>{t('admin.labReviewers.dismiss')}</button>
    </div>}

    <div className="sk-admin-card sk-admin-table-card">
      {vm.loading ? <AdminLoading label={t('admin.labReviewers.loading')} />
        : vm.error ? <AdminError title={t('admin.labReviewers.error')} message={vm.error} onRetry={vm.reload} />
          : <table className="sk-admin-table">
            <caption className="sk-admin-visually-hidden">{t('admin.labReviewers.caption')}</caption>
            <thead><tr><th scope="col">{t('admin.labReviewers.colTests')}</th><th scope="col">{t('admin.labReviewers.colFlag')}</th><th scope="col">{t('admin.labReviewers.colWaiting')}</th><th scope="col">{t('admin.labReviewers.colAction')}</th></tr></thead>
            <tbody>{vm.items.length ? vm.items.map(review => <tr key={review.id}>
              <td><strong>{tests(review)}</strong></td>
              <td>{review.criticalFlag
                ? <span className="sk-admin-tag is-danger"><Icon name="alert-triangle" size={14} />{' '}{t('admin.labReviewers.critical')}</span>
                : <span className="sk-admin-tag is-neutral">{t('admin.labReviewers.routine')}</span>}</td>
              <td>{waited(review.waitingSeconds, t)}</td>
              <td><button type="button" className="sk-admin-button" aria-label={t('admin.labReviewers.assignAria', { tests: tests(review) })} onClick={() => vm.open(review)}>
                <Icon name="stethoscope" size={16} />{t('admin.labReviewers.assign')}
              </button></td>
            </tr>) : <tr><td colSpan={4}><AdminEmpty title={t('admin.labReviewers.empty')} description={t('admin.labReviewers.emptyBody')} /></td></tr>}</tbody>
          </table>}
    </div>
    <p className="sk-admin-note">{t('admin.labReviewers.note')}</p>

    {vm.target && <ShopDialog title={t('admin.labReviewers.dialogTitle')} onClose={vm.close}>
      <form onSubmit={event => { event.preventDefault(); void vm.assign(); }}>
        <p className="sk-admin-note"><strong>{tests(vm.target)}</strong></p>
        {vm.target.criticalFlag && <p className="sk-admin-note"><Icon name="alert-triangle" size={16} />{' '}{t('admin.labReviewers.dialogCritical')}</p>}
        <p className="sk-admin-note">{t('admin.labReviewers.dialogBody')}</p>
        {vm.reviewersLoading ? <AdminLoading label={t('admin.labReviewers.doctorsLoading')} />
          : vm.reviewersError ? <AdminError title={t('admin.labReviewers.doctorsError')} message={vm.reviewersError} onRetry={vm.reloadReviewers} />
            : vm.reviewers && !vm.reviewers.length ? <AdminEmpty title={t('admin.labReviewers.noDoctors')} description={t('admin.labReviewers.noDoctorsBody')} />
              : <div className="sk-admin-filters">
                <label>{t('admin.labReviewers.doctorField')}
                  <select required value={vm.doctorId} onChange={event => vm.setDoctorId(event.target.value)} disabled={vm.assigning}>
                    <option value="">{t('admin.labReviewers.chooseDoctor')}</option>
                    {(vm.reviewers ?? []).map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>)}
                  </select>
                </label>
              </div>}
        {vm.reviewersTruncated && <p className="sk-admin-note">{t('admin.labReviewers.truncated', { count: count(REVIEWER_LIST_LIMIT) })}</p>}
        {vm.assignFailure && <p className="sk-admin-form-error" role="alert">{t(ASSIGN_FAILURE[vm.assignFailure])}</p>}
        <div className="sk-admin-actions">
          <button type="button" className="sk-admin-button" onClick={vm.close} disabled={vm.assigning}>{t('common.cancel')}</button>
          <button type="submit" className="sk-admin-button sk-admin-button-primary" disabled={vm.assigning || !vm.selectedDoctor} aria-busy={vm.assigning}>
            {vm.assigning ? t('admin.labReviewers.submitting') : t('admin.labReviewers.submit')}
          </button>
        </div>
      </form>
    </ShopDialog>}
  </AdminPage>;
});
