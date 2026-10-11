import React from 'react';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';

/** Super Admin → Surveillance map. No surveillance source is connected, so the cluster table is empty. */
export function SurveillanceView() {
  const t = useT();
  return <AdminPage eyebrow={t('admin.eyebrow.platform')} title={t('admin.surveillance.title')} description={t('admin.surveillance.description')}>
    <AdminStats label={t('admin.surveillance.summary')} stats={unreportedStats([t('admin.surveillance.statFlagged'), t('admin.surveillance.statWatching'), t('admin.surveillance.statCohort'), t('admin.surveillance.statNamed')])} />
    <NotConnectedTable caption={t('admin.surveillance.caption')} columns={[t('admin.surveillance.colCluster'), t('admin.flags.colCampuses'), t('admin.surveillance.colSignal'), t('admin.surveillance.colCohort'), t('admin.col.state')]} subject={t('admin.surveillance.subject')} emptyTitle={t('admin.surveillance.empty')} />
    <p className="sk-admin-note">{t('admin.surveillance.note')}</p>
  </AdminPage>;
}
