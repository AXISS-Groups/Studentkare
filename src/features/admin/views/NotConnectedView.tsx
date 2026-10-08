import React from 'react';
import type { RoutePath } from '@/lib/workflowRouting';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';

/** A Super Admin screen whose data source isn't connected yet: the design's header, tiles and columns, empty. */
export interface NotConnectedScreen { eyebrow?: string; title: string; description: string; subject: string; columns: string[]; stats?: string[] }

// Each screen is configuration, so one gaining real data can move to its own View then.
export const NOT_CONNECTED_SCREENS: Partial<Record<RoutePath, NotConnectedScreen>> = {
  'admin/sentinel': { eyebrow: 'Tenants', stats: ['Findings tracked', 'Resolved', 'Blocking release', 'Secrets in source'], title: 'Code sentinel', description: 'Repository inspection for secrets, exposed routes and compliance drift.', subject: 'code sentinel findings', columns: ['Finding', 'Where', 'Age', 'State'] },
  'admin/verification': { eyebrow: 'Gatekeeping', stats: ['Awaiting decision', 'Passed the register', 'Blocked', 'Held for review'], title: 'Clinician verification', description: 'Clinician applicants and their registration checks, before a clinician role is granted.', subject: 'clinician applications', columns: ['Applicant', 'Registration', 'Register check', 'Identity', 'Decision'] },
  'admin/rule-l': { eyebrow: 'Governance', stats: ['Grants under watch', 'Breaches, ever', 'Check interval', 'Default for new grants'], title: 'Rule L firewall', description: 'The database grants that keep clinical data off commercial surfaces.', subject: 'grant checks', columns: ['Grant checked', 'Surface', 'Last verified', 'Result'] },
  'admin/checkins': { eyebrow: 'Governance', stats: ['Check-ins today', 'Matched first time', 'Stopped — mismatch', '“This wasn’t me” reports'], title: 'Check-in audit', description: 'Pass scans across pharmacies, labs, clinics and camps. Face photos are never shown here.', subject: 'check-ins', columns: ['Time', 'Provider', 'Visit', 'Result', 'Reason', 'Outcome'] },
};

export function NotConnectedView({ screen }: { screen: NotConnectedScreen }) {
  return <AdminPage eyebrow={screen.eyebrow} title={screen.title} description={screen.description}>
    {screen.stats && <AdminStats label={`${screen.title} summary`} stats={unreportedStats(screen.stats)} />}
    <NotConnectedTable caption={screen.title} columns={screen.columns} subject={screen.subject} />
  </AdminPage>;
}
