import React, { useState } from 'react';
import { AdminPage, AdminStats, NotConnectedTable, unreportedStats } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

// Break-glass log (Tier 1, read-only). break_glass_sessions has no admin endpoint. The
// design's tiles, filters and columns are kept; there is no export or review action
// until the design review.
const BREAK_GLASS_FILTERS: readonly { key: 'all' | 'needs-review' | 'pattern' | 'reviewed'; label: MessageKey; empty: MessageKey }[] = [
  { key: 'all', label: 'admin.breakGlass.filterAll', empty: 'admin.breakGlass.emptyAll' },
  { key: 'needs-review', label: 'admin.breakGlass.filterNeedsReview', empty: 'admin.breakGlass.emptyNeedsReview' },
  { key: 'pattern', label: 'admin.breakGlass.filterPattern', empty: 'admin.breakGlass.emptyPattern' },
  { key: 'reviewed', label: 'admin.breakGlass.filterReviewed', empty: 'admin.breakGlass.emptyReviewed' },
];

export function BreakGlassLogView() {
  const t = useT();
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<(typeof BREAK_GLASS_FILTERS)[number]['key']>('all');
  const current = BREAK_GLASS_FILTERS.find(item => item.key === filter) ?? BREAK_GLASS_FILTERS[0];
  return <AdminPage eyebrow={t('admin.eyebrow.readOnly')} title={t('admin.breakGlass.title')} description={t('admin.breakGlass.description')}>
    <p className="sk-admin-note" role="note">{t('admin.readOnly.note')}</p>
    <AdminStats label={t('admin.breakGlass.summary')} stats={unreportedStats([t('admin.breakGlass.statOpenings'), t('admin.breakGlass.filterNeedsReview'), t('admin.breakGlass.filterPattern'), t('admin.breakGlass.statMedian')])} />
    <div className="sk-admin-chips" role="group" aria-label={t('admin.breakGlass.filterLabel')}>
      {BREAK_GLASS_FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{t(item.label)}</button>)}
    </div>
    <NotConnectedTable caption={t('admin.breakGlass.caption')} columns={[t('admin.breakGlass.colAuditId'), t('admin.breakGlass.colWhen'), t('admin.breakGlass.colCampus'), t('admin.breakGlass.colStudent'), t('admin.breakGlass.colReason'), t('admin.breakGlass.colOpen'), t('admin.breakGlass.colReview')]} subject={t('admin.breakGlass.subject')} emptyTitle={t(current.empty)} />
  </AdminPage>;
}
