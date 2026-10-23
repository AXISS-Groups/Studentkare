import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleEmptyState, ConsolePageHeader } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { auditRepository } from '../model/auditRepository';
import { count, readable } from '../model/format';
import { AuditExplorerViewModel, isBreakGlass, isDenied } from '../viewmodels/AuditExplorerViewModel';
import type { AuditTab } from '../viewmodels/AuditExplorerViewModel';
import { BoardChips, boardEmpty } from './AdminBoard';
import { BoardFailure, BoardLoading, GovCard, GovLines, GovPill, ago } from './GovBoard';
import './gov-board.css';

const TABS: readonly { id: AuditTab; label: MessageKey }[] = [
  { id: 'all', label: 'gov.audit.tabAll' },
  { id: 'break-glass', label: 'gov.audit.tabBreakGlass' },
  { id: 'denied', label: 'gov.audit.tabDenied' },
];
/** Counters the board says should read zero. None is computed yet, so each reads "—". */
const GUARDRAILS: readonly MessageKey[] = ['gov.audit.guardNoEntry', 'gov.audit.guardNoReason', 'gov.audit.guardPastWindow', 'gov.audit.guardSuppressed'];
const shortId = (id: string) => `${id.slice(0, 4)}…${id.slice(-4)}`;

/**
 * Audit explorer (design: AuditExplorer, Tier 1), on GET /ops/audit: actor, action,
 * resource and time, newest first, a page at a time. The tabs narrow the loaded page
 * (the endpoint has no action filter). The board's rule and outcome columns have no
 * source and are not shown; the short code under each row is the entry's id, not a
 * hash. There is no hash chain or signing key behind the ledger, so chain integrity is
 * reported as not verified (guardrail 6), and the guardrail counters read "—".
 */
export const AuditExplorerView = observer(function AuditExplorerView() {
  const t = useT();
  const [vm] = useState(() => new AuditExplorerViewModel(auditRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const { page, filtered, total, lastPage } = vm;

  if (vm.loading) return <BoardLoading label={t('admin.audit.loading')} />;
  if (vm.error) return <BoardFailure t={t} what={t('gov.audit.what')} screen="AuditExplorer" onRetry={vm.reload} detail={vm.error} />;
  if (total === 0) return <div className="sk-ds sk-ctp"><ConsoleEmptyState empty={boardEmpty(t, t('admin.audit.empty'), t('admin.audit.emptyBody'))} headingLevel={1} /></div>;

  return <div className="sk-ds sk-admin-page sk-gov">
    <div className="sk-gov-grid sk-gov-grid--main-side">
      <div className="sk-gov-stack">
        <ConsolePageHeader eyebrow={t('gov.audit.eyebrow')} title={t('admin.audit.title')} />
        <div className="sk-gov-toolbar">
          <BoardChips label={t('gov.audit.tabsLabel')} options={TABS.map(tab => ({ id: tab.id, label: t(tab.label) }))} value={vm.tab} onChange={vm.setTab} />
          <label className="sk-gov-searchbox">
            <span className="sk-board-visually-hidden">{t('admin.audit.search')}</span>
            <input type="search" value={vm.search} onChange={event => vm.setSearch(event.target.value)} placeholder={t('admin.audit.searchPlaceholder')} />
          </label>
        </div>
        <p className="sk-gov-fine" aria-live="polite">{t('admin.audit.pageOnly', { count: count(vm.items.length) })}</p>
        {filtered.length ? <ol className="sk-gov-events" aria-label={t('admin.audit.caption')}>{filtered.map(item => {
          const denied = isDenied(item.action);
          const breakGlass = isBreakGlass(item.action);
          return <li key={item.id} className="sk-gov-event sk-gov-event--wide">
            <span className={`sk-gov-dot${denied ? ' sk-gov-dot--danger' : breakGlass ? ' sk-gov-dot--attention' : ''}`} aria-hidden="true" />
            <div className="sk-gov-event__copy">
              <strong><span className="sk-mono">{item.actorId || t('gov.audit.system')}</span>{' '}
                {denied ? <GovPill tone="danger">{t('gov.audit.denied')}</GovPill> : breakGlass ? <GovPill tone="attention">{t('gov.audit.breakGlass')}</GovPill> : null}</strong>
              <span>{readable(item.action)} · <span className="sk-mono">{item.resourceId}</span></span>
              <span className="sk-mono" aria-label={t('gov.audit.entryId', { id: item.id })}>{shortId(item.id)}</span>
            </div>
            <time className="sk-gov-event__when" dateTime={new Date(item.createdAt * 1000).toISOString()}>{ago(t, item.createdAt)}</time>
          </li>;
        })}</ol> : <div className="sk-gov-empty"><strong>{t('admin.audit.noMatch')}</strong><p className="sk-gov-fine">{t('admin.audit.noMatchBody')}</p></div>}
        <nav className="sk-ctp-pages" aria-label={t('console.pagination.label')}>
          <span className="sk-ctp-pages__summary">{t('admin.audit.pageOf', { page: count(page + 1), pages: count(lastPage + 1), total: count(total) })}</span>
          <span className="sk-ctp-pages__buttons">
            <button type="button" className="sk-ctp-pages__button" disabled={page === 0} onClick={() => vm.goTo(page - 1)}>{t('admin.audit.previous')}</button>
            <button type="button" className="sk-ctp-pages__button" disabled={page >= lastPage} onClick={() => vm.goTo(page + 1)}>{t('admin.audit.next')}</button>
          </span>
        </nav>
      </div>
      <div className="sk-gov-stack">
        <GovCard eyebrow={t('admin.audit.chain')}>
          <p className="sk-gov-big"><strong className="sk-gov-muted">{t('gov.audit.notVerified')}</strong></p>
          <p className="sk-gov-text">{t('gov.audit.chainBody')}</p>
        </GovCard>
        <GovCard eyebrow={t('gov.audit.guardrails')}>
          <GovLines label={t('gov.audit.guardrails')} lines={GUARDRAILS.map(key => ({ label: t(key), value: null }))} />
          <p className="sk-gov-fine">{t('admin.audit.guardrailsEmptyBody')}</p>
        </GovCard>
      </div>
    </div>
  </div>;
});
