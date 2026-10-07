import React from 'react';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';

/** Super Admin → Surveillance map. No surveillance source is connected, so the cluster table is empty. */
export function SurveillanceView() {
  return <AdminPage eyebrow="Platform" title="Surveillance map" description="Cross-campus signal, aggregated and suppressed · no individual is resolvable.">
    <AdminStats label="Surveillance summary" stats={unreportedStats(['Clusters flagged', 'Watching', 'Smallest cohort released', 'Campuses named to each other'])} />
    <NotConnectedTable caption="Surveillance clusters" columns={['Cluster', 'Campuses', 'Signal', 'Cohort', 'State']} subject="surveillance clusters" emptyTitle="No surveillance sources connected." />
    <p className="sk-admin-note">A flagged cluster notifies the campuses inside it and the state health authority where the law requires it. It never tells one campus about another’s numbers, and mental health signals are excluded entirely.</p>
  </AdminPage>;
}
