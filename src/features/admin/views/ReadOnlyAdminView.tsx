import React from 'react';
import type { RoutePath } from '@/lib/workflowRouting';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** A Tier 1 (safety-critical) screen: a read-only empty layout until its named design review. Every text is a message key. */
export interface ReadOnlyScreen { title: MessageKey; description: MessageKey; subject: MessageKey; columns: MessageKey[]; emptyTitle: MessageKey; stats?: MessageKey[] }

export const READ_ONLY_SCREENS: Partial<Record<RoutePath, ReadOnlyScreen>> = {
  'admin/consent-policy': { stats: ['admin.consentPolicy.statRules', 'admin.consentPolicy.statLocked', 'admin.consentPolicy.statOpen', 'admin.consentPolicy.statLoosened'], title: 'admin.consentPolicy.title', description: 'admin.consentPolicy.description', subject: 'admin.consentPolicy.subject', columns: ['admin.consentPolicy.colRule', 'admin.consentPolicy.colSetTo', 'admin.consentPolicy.colChangeable', 'admin.col.state'], emptyTitle: 'admin.consentPolicy.empty' },
  'admin/handover': { stats: ['admin.handover.statTransfers', 'admin.handover.statOverrides', 'admin.handover.statCountersign', 'admin.handover.statTold'], title: 'admin.handover.title', description: 'admin.handover.description', subject: 'admin.handover.subject', columns: ['admin.handover.colCase', 'admin.handover.colTransfer', 'admin.handover.colAuthorised', 'admin.handover.colOpened', 'admin.handover.colAudit'], emptyTitle: 'admin.handover.empty' },
};

/** No forms and no actions: nothing on a Tier 1 screen can be changed until its design review. */
export function ReadOnlyAdminView({ screen }: { screen: ReadOnlyScreen }) {
  const t = useT();
  const title = t(screen.title);
  return <AdminPage eyebrow={t('admin.eyebrow.readOnly')} title={title} description={t(screen.description)}>
    <p className="sk-admin-note" role="note">{t('admin.readOnly.note')}</p>
    {screen.stats && <AdminStats label={t('admin.summaryOf', { title })} stats={unreportedStats(screen.stats.map(key => t(key)))} />}
    <NotConnectedTable caption={title} columns={screen.columns.map(key => t(key))} subject={t(screen.subject)} emptyTitle={t(screen.emptyTitle)} />
  </AdminPage>;
}
