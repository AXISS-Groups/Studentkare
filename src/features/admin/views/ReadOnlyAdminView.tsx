import React from 'react';
import type { RoutePath } from '@/lib/workflowRouting';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';

/** A Tier 1 (safety-critical) screen: a read-only empty layout until its named design review. */
export interface ReadOnlyScreen { title: string; description: string; subject: string; columns: string[]; emptyTitle: string; stats?: string[] }

export const READ_ONLY_SCREENS: Partial<Record<RoutePath, ReadOnlyScreen>> = {
  'admin/consent-policy': { stats: ['Rules in force', 'Locked by statute or design', 'Open question', 'Loosened since launch'], title: 'Consent policy', description: 'Retention, durations and age gates — what is ours to set and what is not.', subject: 'consent rules', columns: ['Rule', 'Set to', 'Changeable by', 'State'], emptyTitle: 'No consent rules reported.' },
  'admin/handover': { stats: ['Transfers, 30 days', 'Overrides used', 'Countersign overdue', 'Students told afterwards'], title: 'Casualty handover', description: 'Break-glass transfers to tertiary hospitals, and whether each override was countersigned.', subject: 'casualty handovers', columns: ['Case', 'Transfer', 'Authorised by', 'Record opened', 'Audit'], emptyTitle: 'No casualty handovers recorded.' },
};

/** No forms and no actions: nothing on a Tier 1 screen can be changed until its design review. */
export function ReadOnlyAdminView({ screen }: { screen: ReadOnlyScreen }) {
  return <AdminPage eyebrow="Read-only" title={screen.title} description={screen.description}>
    <p className="sk-admin-note" role="note">This safety-critical screen is read-only until its design review is complete. Nothing can be changed here.</p>
    {screen.stats && <AdminStats label={`${screen.title} summary`} stats={unreportedStats(screen.stats)} />}
    <NotConnectedTable caption={screen.title} columns={screen.columns} subject={screen.subject} emptyTitle={screen.emptyTitle} />
  </AdminPage>;
}
