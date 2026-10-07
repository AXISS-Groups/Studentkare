import React, { useState } from 'react';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';

// Break-glass log (Tier 1, read-only). break_glass_sessions has no admin endpoint. The
// design's tiles, filters and columns are kept; there is no export or review action
// until the design review.
const BREAK_GLASS_FILTERS = [
  { key: 'all', label: 'All', empty: 'No emergency-card openings recorded.' },
  { key: 'needs-review', label: 'Needs review', empty: 'No openings waiting for review.' },
  { key: 'pattern', label: 'Pattern alerts', empty: 'No pattern alerts.' },
  { key: 'reviewed', label: 'Reviewed', empty: 'No reviewed openings.' },
] as const;

export function BreakGlassLogView() {
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<(typeof BREAK_GLASS_FILTERS)[number]['key']>('all');
  const current = BREAK_GLASS_FILTERS.find(item => item.key === filter) ?? BREAK_GLASS_FILTERS[0];
  return <AdminPage eyebrow="Read-only" title="Break-glass log" description="Every emergency-card opening across all campuses. Review each one within 48 hours.">
    <p className="sk-admin-note" role="note">This safety-critical screen is read-only until its design review is complete. Nothing can be changed here.</p>
    <AdminStats label="Break-glass summary" stats={unreportedStats(['Openings this term', 'Needs review', 'Pattern alerts', 'Median open time'])} />
    <div className="sk-admin-chips" role="group" aria-label="Filter openings">
      {BREAK_GLASS_FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
    </div>
    <NotConnectedTable caption="Emergency-card openings" columns={['Audit ID', 'When', 'Campus · opened by', 'Student', 'Reason', 'Open', 'Review']} subject="emergency-card openings" emptyTitle={current.empty} />
  </AdminPage>;
}
