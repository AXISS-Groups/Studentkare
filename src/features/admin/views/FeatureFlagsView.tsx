import React, { useState } from 'react';
import { AdminPage, NotConnectedTable } from '@/screens/workspace/admin/AdminPage';

// Feature flags. No flag service exists, so there are no flags and no toggles. The AI
// kill switch has activate/reset endpoints but no way to read its state, so it isn't a
// blind toggle here. Per-campus columns need tenants, which have no data source either.
const FLAG_FILTERS = [
  { key: 'all', label: 'All', empty: 'No feature flags yet.' },
  { key: 'ai', label: 'AI & safety', empty: 'No AI or safety flags yet.' },
  { key: 'product', label: 'Product', empty: 'No product flags yet.' },
  { key: 'hold', label: 'On hold', empty: 'No flags on hold.' },
] as const;

export function FeatureFlagsView() {
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<(typeof FLAG_FILTERS)[number]['key']>('all');
  const current = FLAG_FILTERS.find(item => item.key === filter) ?? FLAG_FILTERS[0];
  return <AdminPage eyebrow="Platform" title="Feature flags" description="Turn features on per campus."
    status={<div className="sk-admin-chips" role="group" aria-label="Filter flags">
      {FLAG_FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
    </div>}>
    <NotConnectedTable caption="Feature flags" columns={['Flag', 'Campuses', 'Owner', 'State']} subject="feature flags" emptyTitle={current.empty} />
    <p className="sk-admin-note">A column for each campus will appear once tenants and a flag service are connected.</p>
  </AdminPage>;
}
