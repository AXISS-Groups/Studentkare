import React from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { AdminEmpty, AdminEmptySection, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';

// Check-in audit → Case (“This wasn’t me”). Check-ins have no data source, so there is
// no case to open. The case screen keeps the design's sections; calling the student and
// closing the case need a backend and hold a phone number and a counter photo, so
// neither is here.
export function CaseView() {
  const t = useT();
  return <AdminPage eyebrow={t('admin.checkins.title')} title={t('admin.case.title')} description={t('admin.case.description')}>
    <button type="button" className="sk-admin-back" onClick={() => navigate('admin/checkins')}><span aria-hidden="true">← </span>{t('admin.checkins.title')}</button>
    <div className="sk-admin-card"><AdminEmpty title={t('admin.case.noneTitle')} description={t('admin.case.noneBody')} /></div>
    <div className="sk-admin-sections">
      <AdminEmptySection title={t('admin.case.timeline')} description={t('admin.case.timelineBody')} emptyTitle={t('admin.case.timelineEmpty')} emptyDescription={t('admin.case.timelineEmptyBody')} />
      <AdminEmptySection title={t('admin.case.evidence')} description={t('admin.case.evidenceBody')} emptyTitle={t('admin.case.evidenceEmpty')} emptyDescription={t('admin.case.evidenceEmptyBody')} />
      <AdminEmptySection title={t('admin.case.outcome')} description={t('admin.case.outcomeBody')} emptyTitle={t('admin.case.outcomeEmpty')} emptyDescription={t('admin.case.outcomeEmptyBody')} />
    </div>
  </AdminPage>;
}
