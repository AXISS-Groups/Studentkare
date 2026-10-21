import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage, DataTable } from '@/design-system';
import type { ConsoleTableStatus, DataTableRow, SkTone, Stat } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { AdminError, AdminLoading, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import { accountsRepository } from '../model/accountsRepository';
import { opsRepository } from '../model/opsRepository';
import { count, readable, when } from '../model/format';
import { AccountsOverviewViewModel } from '../viewmodels/AccountsOverviewViewModel';
import { AccountsListView } from './AccountsListView';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

// Accounts & roles (design: AdminAccounts), on the design-system console table page.
// Account counts per role are real, clinical access comes from rbac.ts and app access
// from homeForRole. Rows are not links: there is no role-detail screen. Not shown: the
// design's "routes" and "enforced at" columns and role-model banner (nothing reports
// where each role is enforced, and the server does guard /ops/* with require_staff /
// require_super_admin), and the clinician-grant drawer (no grant or NMC-register
// endpoint exists). Pending grants and break-glass have no source: "—", never 0.
type AccountTab = 'roles' | 'pending' | 'recent';
const ACCOUNT_TABS: readonly { key: AccountTab; label: MessageKey }[] = [
  { key: 'roles', label: 'admin.accounts.tabRoles' },
  { key: 'pending', label: 'admin.accounts.tabPending' },
  { key: 'recent', label: 'admin.accounts.tabRecent' },
];

function AccountTabs({ current, onChange }: { current: AccountTab; onChange: (tab: AccountTab) => void }) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? ACCOUNT_TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + ACCOUNT_TABS.length) % ACCOUNT_TABS.length;
    refs.current[target]?.focus();
    onChange(ACCOUNT_TABS[target].key);
  };
  return <div className="sk-admin-pilltabs" role="tablist" aria-label={t('admin.accounts.tabsLabel')}>
    {ACCOUNT_TABS.map((tab, index) => <button key={tab.key} ref={element => { refs.current[index] = element; }} type="button" role="tab" id={`sk-accounts-tab-${tab.key}`} aria-selected={tab.key === current} aria-controls="sk-accounts-panel" tabIndex={tab.key === current ? 0 : -1} onClick={() => onChange(tab.key)} onKeyDown={event => move(event, index)}>{t(tab.label)}</button>)}
  </div>;
}

/** `is-positive` (accessRules / format) > the pill's tone. */
function toneOf(tag: string): SkTone {
  if (tag === 'is-positive') return 'positive';
  if (tag === 'is-attention') return 'attention';
  if (tag === 'is-danger') return 'danger';
  return 'neutral';
}

/**
 * Pending grants: no endpoint lists role-grant requests or checks a registration number
 * against the NMC register, so the board's grant drawer is not built. The tab says so
 * (alert-triangle-4, as the board's role-model banner) above the designed columns.
 */
function PendingGrants() {
  const t = useT();
  return <>
    <BoardNote icon="alert-triangle-4" tone="attention">{t('adminBoard.accounts.pendingNote')}</BoardNote>
    <DataTable
      variant="plain"
      caption={t('admin.accounts.tabPending')}
      columns={[{ label: t('admin.accountsList.colRole') }, { label: t('adminBoard.accounts.colApplicant') }, { label: t('adminBoard.accounts.colCheck') }, { label: t('admin.col.state') }]}
      rows={[]}
      emptyMessage={{ title: t('admin.accounts.pendingEmpty'), body: t('admin.accounts.pendingEmptyBody') }}
    />
  </>;
}

/** Staff accounts created, from the ACCOUNT domain of the ops feed (summaries carry the role only). */
const RecentAccountChanges = observer(function RecentAccountChanges({ vm }: { vm: AccountsOverviewViewModel }) {
  const t = useT();
  if (vm.recentLoading) return <AdminLoading label={t('admin.accounts.recentLoading')} />;
  if (vm.recentError || !vm.recentFeed) return <AdminError title={t('admin.accounts.recentError')} message={vm.recentError} onRetry={() => void vm.loadRecentChanges()} />;
  const rows: DataTableRow[] = vm.recentChanges.map(event => ({
    id: event.id,
    cells: [
      { text: readable(event.kind), weight: 'strong' },
      { text: event.summary || '\u2014' },
      { node: <time dateTime={new Date(event.createdAt * 1000).toISOString()}>{when(event.createdAt)}</time> },
    ],
  }));
  return <DataTable
    variant="plain"
    caption={t('admin.accounts.recentCaption')}
    columns={[{ label: t('admin.accounts.colChange') }, { label: t('admin.accounts.colDetail') }, { label: t('admin.accounts.colWhen') }]}
    rows={rows}
    emptyMessage={{ title: t('admin.accounts.recentEmpty'), body: t('admin.accounts.recentEmptyBody') }}
  />;
});

/** Super Admin > Accounts & roles. */
export const AccountsView = observer(function AccountsView() {
  const t = useT();
  const [vm] = useState(() => new AccountsOverviewViewModel(accountsRepository, opsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // The open tab is presentation state. Recent changes load each time their tab opens.
  const [tab, setTab] = useState<AccountTab>('roles');
  const changeTab = (next: AccountTab) => {
    if (next === 'recent' && tab !== 'recent') void vm.loadRecentChanges();
    if (tab === 'recent' && next !== 'recent') vm.stopRecentChanges();
    setTab(next);
  };
  const status: ConsoleTableStatus = vm.loading ? 'loading' : vm.error !== null ? 'error' : 'ready';
  const unreported = t('admin.stat.unreported');
  const stats: Stat[] = status === 'ready' ? [
    { label: t('admin.accounts.statAccounts'), value: count(vm.total), meta: t('admin.accounts.statAccountsMeta') },
    { label: t('admin.accounts.statRoles'), value: count(vm.roleCount), meta: t('admin.accounts.statRolesMeta') },
    { label: t('admin.accounts.tabPending'), value: null, meta: unreported },
    { label: t('admin.accounts.statBreakGlass'), value: null, meta: unreported },
  ] : [];
  const rows: DataTableRow[] = status === 'ready' ? vm.roleRows.map(({ role, name, description, count: accounts, access, app }) => ({
    id: role,
    cells: [
      { node: <><span className="sk-admin-role-name"><strong>{name}</strong><code className="sk-admin-role-code">{role}</code></span><span className="sk-admin-role-description">{description}</span></> },
      { node: <strong className="sk-admin-role-count">{count(accounts)}</strong> },
      { pill: { label: access.label, tone: toneOf(access.tone) } },
      { text: app },
    ],
  })) : [];
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={status}
      header={{ eyebrow: t('admin.accounts.eyebrow'), title: t('admin.accounts.title'), actions: <AccountTabs current={tab} onChange={changeTab} /> }}
      stats={stats}
      statVariant="plain"
      statsLabel={t('admin.accounts.summary')}
      tabPanel={{ id: 'sk-accounts-panel', labelledBy: `sk-accounts-tab-${tab}` }}
      alternate={tab === 'pending'
        ? <PendingGrants />
        : tab === 'recent' ? <RecentAccountChanges vm={vm} /> : undefined}
      table={{
        variant: 'plain',
        caption: t('admin.accounts.rolesCaption'),
        columns: [
          { label: t('admin.accountsList.colRole'), width: '34%' },
          { label: t('admin.accounts.statAccounts'), width: '14%' },
          { label: t('admin.accounts.colClinical'), width: '28%' },
          { label: t('admin.accounts.colApp') },
        ],
        rows,
        footnote: `${t('admin.accounts.enforcementLabel')} ${t('admin.accounts.enforcementBody')}`,
      }}
      empty={boardEmpty(t, t('adminBoard.accounts.empty'))}
      unconnected={{ title: t('admin.accounts.title'), body: t('admin.accounts.description') }}
      error={boardError(t, t('adminBoard.accounts.what'), 'AdminAccounts', vm.load, vm.error)}
      loadingLabel={t('admin.accounts.loading')}
    />
    <details className="sk-admin-disclosure">
      <summary>{t('admin.accounts.manage')} <Icon name="arrow-right" size={16} className="sk-admin-disclosure-arrow" /></summary>
      <LegacyPanel><AccountsListView /></LegacyPanel>
    </details>
  </div>;
});
