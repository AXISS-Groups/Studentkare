import React, { useState } from 'react';
import { ConsoleTablePage, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BoardChips, BoardNote, boardEmpty, boardError } from './AdminBoard';
import { GovCard, Unavailable } from './GovBoard';

type BreakGlassFilter = 'all' | 'needs-review' | 'pattern' | 'reviewed';
const BREAK_GLASS_FILTERS: readonly { key: BreakGlassFilter; label: MessageKey; empty: MessageKey }[] = [
  { key: 'all', label: 'admin.breakGlass.filterAll', empty: 'admin.breakGlass.emptyAll' },
  { key: 'needs-review', label: 'admin.breakGlass.filterNeedsReview', empty: 'admin.breakGlass.emptyNeedsReview' },
  { key: 'pattern', label: 'admin.breakGlass.filterPattern', empty: 'admin.breakGlass.emptyPattern' },
  { key: 'reviewed', label: 'admin.breakGlass.filterReviewed', empty: 'admin.breakGlass.emptyReviewed' },
];

/**
 * Break-glass log (design: AdminBreakGlassLog, Tier 1). Emergency-card openings are kept
 * in break_glass_sessions, but no endpoint lists them yet (WP-11 §3 backend ticket), so
 * the board keeps its figures ("—"), filters and columns, empty. "Export for DPO" has
 * nothing to export and is disabled. The review drawer opens from a row, so it has
 * nothing to open; its three decisions are described, not offered. Once connected, "what
 * was seen" lists field names only (never values) and "suspend" is a server-side change
 * that alerts the campus lead.
 */
export function BreakGlassLogView() {
  const t = useT();
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<BreakGlassFilter>('all');
  const current = BREAK_GLASS_FILTERS.find(item => item.key === filter) ?? BREAK_GLASS_FILTERS[0];
  const title = t('admin.breakGlass.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{
        title,
        subtitle: t('admin.breakGlass.description'),
        actions: <span className="sk-board-actions">
          <SkButton variant="secondary" disabled aria-describedby="sk-gov-bg-export"><Icon name="download-2" size={16} />{t('gov.breakGlass.export')}</SkButton>
          <span id="sk-gov-bg-export" className="sk-board-visually-hidden">{t('gov.breakGlass.exportUnavailable')}</span>
        </span>,
      }}
      note={<>
        <BoardNote icon="info">{t('gov.breakGlass.note')}</BoardNote>
        <BoardChips label={t('admin.breakGlass.filterLabel')} options={BREAK_GLASS_FILTERS.map(item => ({ id: item.key, label: t(item.label) }))} value={filter} onChange={setFilter} />
      </>}
      statLabels={[t('admin.breakGlass.statOpenings'), t('admin.breakGlass.filterNeedsReview'), t('admin.breakGlass.filterPattern'), t('admin.breakGlass.statMedian')]}
      statsLabel={t('admin.breakGlass.summary')}
      table={{
        caption: t('admin.breakGlass.caption'),
        columns: [
          { label: t('admin.breakGlass.colAuditId') }, { label: t('admin.breakGlass.colWhen') }, { label: t('admin.breakGlass.colCampus') }, { label: t('admin.breakGlass.colStudent') },
          { label: t('admin.breakGlass.colReason') }, { label: t('admin.breakGlass.colOpen') }, { label: t('admin.breakGlass.colReview') },
        ],
        rows: [],
      }}
      empty={boardEmpty(t, t('admin.breakGlass.emptyAll'))}
      unconnected={{ title: t(current.empty), body: t('gov.breakGlass.unconnected') }}
      error={boardError(t, t('gov.breakGlass.what'), 'AdminBreakGlassLog', () => undefined)}
      loadingLabel={t('gov.breakGlass.loading')}
    >
      <GovCard eyebrow={t('gov.breakGlass.reviewTitle')}>
        <p className="sk-gov-text">{t('gov.breakGlass.reviewBody')}</p>
        <ul className="sk-gov-checks">
          <li><Icon name="check" size={16} strokeWidth={2.4} />{t('gov.breakGlass.decisionReal')}</li>
          <li><Icon name="info" size={16} strokeWidth={2.2} />{t('gov.breakGlass.decisionExplain')}</li>
          <li><Icon name="x" size={16} strokeWidth={2.4} />{t('gov.breakGlass.decisionMisuse')}</li>
        </ul>
        <Unavailable>{t('gov.breakGlass.reviewUnavailable')}</Unavailable>
      </GovCard>
    </ConsoleTablePage>
  </div>;
}
