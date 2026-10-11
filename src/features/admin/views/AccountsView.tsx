import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStats, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import { accountsRepository } from '../model/accountsRepository';
import { opsRepository } from '../model/opsRepository';
import { count, readable, when } from '../model/format';
import { AccountsOverviewViewModel } from '../viewmodels/AccountsOverviewViewModel';
import { AccountsListView } from './AccountsListView';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

// Accounts & roles (design: AdminAccounts). Account counts per role are real, clinical
// access comes from rbac.ts and app access from homeForRole. Rows are not links: there is
// no role-detail screen. Not shown: the design's
// "enforced at" column and role-model banner (nothing reports where each role is
// enforced, and the server does guard /ops/* with require_staff / require_super_admin),
// and the clinician-grant drawer (no grant or NMC-register endpoint exists).
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

/** Staff accounts created, from the ACCOUNT domain of the ops feed (summaries carry the role only). */
const RecentAccountChanges = observer(function RecentAccountChanges({ vm }: { vm: AccountsOverviewViewModel }) {
  const t = useT();
  if (vm.recentLoading) return <AdminLoading label={t('admin.accounts.recentLoading')} />;
  if (vm.recentError || !vm.recentFeed) return <AdminError title={t('admin.accounts.recentError')} message={vm.recentError} onRetry={() => void vm.loadRecentChanges()} />;
  const changes = vm.recentChanges;
  return <div className="sk-admin-table-card is-plain">
    <table className="sk-admin-table">
      <caption className="sk-admin-visually-hidden">{t('admin.accounts.recentCaption')}</caption>
      <thead><tr><th scope="col">{t('admin.accounts.colChange')}</th><th scope="col">{t('admin.accounts.colDetail')}</th><th scope="col">{t('admin.accounts.colWhen')}</th></tr></thead>
      <tbody>{changes.length ? changes.map(event => <tr key={event.id}>
        <td><strong>{readable(event.kind)}</strong></td>
        <td>{event.summary || '—'}</td>
        <td><time dateTime={new Date(event.createdAt * 1000).toISOString()}>{when(event.createdAt)}</time></td>
      </tr>) : <tr><td colSpan={3}><AdminEmpty title={t('admin.accounts.recentEmpty')} description={t('admin.accounts.recentEmptyBody')} /></td></tr>}</tbody>
    </table>
  </div>;
});

/** Super Admin → Accounts & roles. */
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
  return <AdminPage title={t('admin.accounts.title')} description={t('admin.accounts.description')}>
    {vm.loading ? <AdminLoading label={t('admin.accounts.loading')} />
      : vm.error !== null ? <AdminError title={t('admin.accounts.error')} message={vm.error} onRetry={vm.load} />
        : <>
          <AdminStats plain label={t('admin.accounts.summary')} stats={[
            { label: t('admin.accounts.statAccounts'), value: count(vm.total), meta: t('admin.accounts.statAccountsMeta') },
            { label: t('admin.accounts.statRoles'), value: count(vm.roleCount), meta: t('admin.accounts.statRolesMeta') },
            { label: t('admin.accounts.tabPending') },
            { label: t('admin.accounts.statBreakGlass') },
          ]} />
          <AccountTabs current={tab} onChange={changeTab} />
          <div id="sk-accounts-panel" role="tabpanel" aria-labelledby={`sk-accounts-tab-${tab}`}>
          {tab === 'pending' ? <div className="sk-admin-table-card is-plain"><AdminEmpty title={t('admin.accounts.pendingEmpty')} description={t('admin.accounts.pendingEmptyBody')} /></div>
            : tab === 'recent' ? <RecentAccountChanges vm={vm} />
              : <div className="sk-admin-card sk-admin-table-card">
            <table className="sk-admin-table sk-admin-roles">
              <caption className="sk-admin-visually-hidden">{t('admin.accounts.rolesCaption')}</caption>
              <thead><tr><th scope="col">{t('admin.accountsList.colRole')}</th><th scope="col">{t('admin.accounts.statAccounts')}</th><th scope="col">{t('admin.accounts.colClinical')}</th><th scope="col">{t('admin.accounts.colApp')}</th></tr></thead>
              <tbody>{vm.roleRows.map(({ role, name, description, count: accounts, access, app }) => {
                return <tr key={role}>
                  <td><span className="sk-admin-role-name"><strong>{name}</strong><code className="sk-admin-role-code">{role}</code></span><span className="sk-admin-role-description">{description}</span></td>
                  <td><strong className="sk-admin-role-count">{count(accounts)}</strong></td>
                  <td><span className={`sk-admin-tag ${access.tone}`}>{access.label}</span></td>
                  <td className="sk-admin-role-app">{app}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
          </div>
          <p className="sk-admin-note"><strong>{t('admin.accounts.enforcementLabel')}</strong> {t('admin.accounts.enforcementBody')}</p>
        </>}
    <details className="sk-admin-disclosure">
      <summary>{t('admin.accounts.manage')} <span aria-hidden="true" className="sk-admin-disclosure-arrow">→</span></summary>
      <LegacyPanel><AccountsListView /></LegacyPanel>
    </details>
  </AdminPage>;
});
