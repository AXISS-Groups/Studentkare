import React from 'react';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** A Super Admin screen whose data source isn't connected yet: the design's header, tiles and columns, empty. Every text is a message key. */
export interface NotConnectedScreen { eyebrow?: MessageKey; title: MessageKey; description: MessageKey; subject: MessageKey; columns: MessageKey[]; stats?: MessageKey[] }

// Each screen is configuration, so one gaining real data can move to its own View then.
export const NOT_CONNECTED_SCREENS: Partial<Record<RoutePath, NotConnectedScreen>> = {
  'admin/sentinel': { eyebrow: 'admin.eyebrow.tenants', stats: ['admin.sentinel.statTracked', 'admin.sentinel.statResolved', 'admin.sentinel.statBlocking', 'admin.sentinel.statSecrets'], title: 'admin.sentinel.title', description: 'admin.sentinel.description', subject: 'admin.sentinel.subject', columns: ['admin.sentinel.colFinding', 'admin.sentinel.colWhere', 'admin.sentinel.colAge', 'admin.col.state'] },
  'admin/verification': { eyebrow: 'admin.eyebrow.gatekeeping', stats: ['admin.verification.statAwaiting', 'admin.verification.statPassed', 'admin.verification.statBlocked', 'admin.verification.statHeld'], title: 'admin.verification.title', description: 'admin.verification.description', subject: 'admin.verification.subject', columns: ['admin.verification.colApplicant', 'admin.verification.colRegistration', 'admin.verification.colRegisterCheck', 'admin.verification.colIdentity', 'admin.col.decision'] },
  'admin/rule-l': { eyebrow: 'admin.eyebrow.governance', stats: ['admin.ruleL.statGrants', 'admin.ruleL.statBreaches', 'admin.ruleL.statInterval', 'admin.ruleL.statDefault'], title: 'admin.ruleL.title', description: 'admin.ruleL.description', subject: 'admin.ruleL.subject', columns: ['admin.ruleL.colGrant', 'admin.ruleL.colSurface', 'admin.ruleL.colVerified', 'admin.ruleL.colResult'] },
  'admin/checkins': { eyebrow: 'admin.eyebrow.governance', stats: ['admin.checkins.statToday', 'admin.checkins.statMatched', 'admin.checkins.statStopped', 'admin.checkins.statReports'], title: 'admin.checkins.title', description: 'admin.checkins.description', subject: 'admin.checkins.subject', columns: ['admin.checkins.colTime', 'admin.checkins.colProvider', 'admin.checkins.colVisit', 'admin.checkins.colResult', 'admin.checkins.colReason', 'admin.checkins.colOutcome'] },
};

export function NotConnectedView({ screen }: { screen: NotConnectedScreen }) {
  const t = useT();
  const title = t(screen.title);
  return <AdminPage eyebrow={screen.eyebrow ? t(screen.eyebrow) : undefined} title={title} description={t(screen.description)}>
    {screen.stats && <AdminStats label={t('admin.summaryOf', { title })} stats={unreportedStats(screen.stats.map(key => t(key)))} />}
    <NotConnectedTable caption={title} columns={screen.columns.map(key => t(key))} subject={t(screen.subject)} />
  </AdminPage>;
}
