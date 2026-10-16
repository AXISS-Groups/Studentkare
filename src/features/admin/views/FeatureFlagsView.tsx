import React, { useState } from 'react';
import { AdminPage, NotConnectedTable } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

// Feature flags. No flag service exists, so there are no flags and no toggles. The AI
// kill switch has activate/reset endpoints but no way to read its state, so it isn't a
// blind toggle here. Per-campus columns need tenants, which have no data source either.
const FLAG_FILTERS: readonly { key: 'all' | 'ai' | 'product' | 'hold'; label: MessageKey; empty: MessageKey }[] = [
  { key: 'all', label: 'admin.flags.filterAll', empty: 'admin.flags.emptyAll' },
  { key: 'ai', label: 'admin.flags.filterAi', empty: 'admin.flags.emptyAi' },
  { key: 'product', label: 'admin.flags.filterProduct', empty: 'admin.flags.emptyProduct' },
  { key: 'hold', label: 'admin.flags.filterHold', empty: 'admin.flags.emptyHold' },
];

export function FeatureFlagsView() {
  const t = useT();
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<(typeof FLAG_FILTERS)[number]['key']>('all');
  const current = FLAG_FILTERS.find(item => item.key === filter) ?? FLAG_FILTERS[0];
  return <AdminPage eyebrow={t('admin.eyebrow.platform')} title={t('admin.flags.title')} description={t('admin.flags.description')}
    status={<div className="sk-admin-chips" role="group" aria-label={t('admin.flags.filterLabel')}>
      {FLAG_FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{t(item.label)}</button>)}
    </div>}>
    <NotConnectedTable caption={t('admin.flags.title')} columns={[t('admin.flags.colFlag'), t('admin.flags.colCampuses'), t('admin.flags.colOwner'), t('admin.col.state')]} subject={t('admin.flags.subject')} emptyTitle={t(current.empty)} />
    <p className="sk-admin-note">{t('admin.flags.note')}</p>
  </AdminPage>;
}
