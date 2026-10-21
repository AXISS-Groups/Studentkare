import React, { useState } from 'react';
import { ConsoleTablePage } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BoardChips, BoardNote, boardEmpty, boardError } from './AdminBoard';

/**
 * Feature flags (design: AdminFlags). No flag service exists, so there are no flags and
 * no toggles, and no "N" counts on the chips. The AI kill switch has activate/reset
 * endpoints but no way to read its state, so it isn't a blind toggle here. Per-campus
 * columns need tenants, which have no data source either, so the columns are Flag,
 * Campuses, Owner and State. The board's kill-switch banner describes a capability that
 * does not exist; the note says what is true instead.
 */
type FlagFilter = 'all' | 'ai' | 'product' | 'hold';
const FLAG_FILTERS: readonly { key: FlagFilter; label: MessageKey; empty: MessageKey }[] = [
  { key: 'all', label: 'admin.flags.filterAll', empty: 'admin.flags.emptyAll' },
  { key: 'ai', label: 'admin.flags.filterAi', empty: 'admin.flags.emptyAi' },
  { key: 'product', label: 'admin.flags.filterProduct', empty: 'admin.flags.emptyProduct' },
  { key: 'hold', label: 'admin.flags.filterHold', empty: 'admin.flags.emptyHold' },
];

export function FeatureFlagsView() {
  const t = useT();
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<FlagFilter>('all');
  const current = FLAG_FILTERS.find(item => item.key === filter) ?? FLAG_FILTERS[0];
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{
        title: t('admin.flags.title'),
        subtitle: t('admin.flags.description'),
        actions: <BoardChips label={t('admin.flags.filterLabel')} options={FLAG_FILTERS.map(item => ({ id: item.key, label: t(item.label) }))} value={filter} onChange={setFilter} />,
      }}
      note={<BoardNote icon="info">{t('adminBoard.flags.note')}</BoardNote>}
      table={{
        caption: t('admin.flags.title'),
        columns: [{ label: t('admin.flags.colFlag'), width: '40%' }, { label: t('admin.flags.colCampuses') }, { label: t('admin.flags.colOwner') }, { label: t('admin.col.state') }],
        rows: [],
        footnote: t('admin.flags.note'),
      }}
      empty={boardEmpty(t, t('adminBoard.flags.empty'))}
      unconnected={{ title: t(current.empty), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('adminBoard.flags.what'), 'AdminFlags', () => undefined)}
      loadingLabel={t('adminBoard.flags.loading')}
    />
  </div>;
}
