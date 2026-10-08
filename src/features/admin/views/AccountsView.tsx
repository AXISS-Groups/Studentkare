import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStats, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import { accountsRepository } from '../model/accountsRepository';
import { opsRepository } from '../model/opsRepository';
import { count, readable, when } from '../model/format';
import { AccountsOverviewViewModel } from '../viewmodels/AccountsOverviewViewModel';
import { AccountsListView } from './AccountsListView';

// Accounts & roles (design: AdminAccounts). Account counts per role are real, clinical
// access comes from rbac.ts and app access from homeForRole. Rows are not links: there is
// no role-detail screen. Not shown: the design's
// "enforced at" column and role-model banner (nothing reports where each role is
// enforced, and the server does guard /ops/* with require_staff / require_super_admin),
// and the clinician-grant drawer (no grant or NMC-register endpoint exists).
const ACCOUNT_TABS = [
  { key: 'roles', label: 'By role' },
  { key: 'pending', label: 'Pending grants' },
  { key: 'recent', label: 'Recently changed' },
] as const;
type AccountTab = (typeof ACCOUNT_TABS)[number]['key'];

function AccountTabs({ current, onChange }: { current: AccountTab; onChange: (tab: AccountTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? ACCOUNT_TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + ACCOUNT_TABS.length) % ACCOUNT_TABS.length;
    refs.current[target]?.focus();
    onChange(ACCOUNT_TABS[target].key);
  };
  return <div className="sk-admin-pilltabs" role="tablist" aria-label="Accounts views">
    {ACCOUNT_TABS.map((tab, index) => <button key={tab.key} ref={element => { refs.current[index] = element; }} type="button" role="tab" id={`sk-accounts-tab-${tab.key}`} aria-selected={tab.key === current} aria-controls="sk-accounts-panel" tabIndex={tab.key === current ? 0 : -1} onClick={() => onChange(tab.key)} onKeyDown={event => move(event, index)}>{tab.label}</button>)}
  </div>;
}

/** Staff accounts created, from the ACCOUNT domain of the ops feed (summaries carry the role only). */
const RecentAccountChanges = observer(function RecentAccountChanges({ vm }: { vm: AccountsOverviewViewModel }) {
  if (vm.recentLoading) return <AdminLoading label="Loading recent account changes…" />;
  if (vm.recentError || !vm.recentFeed) return <AdminError title="Couldn’t load recent account changes" message={vm.recentError} onRetry={() => void vm.loadRecentChanges()} />;
  const changes = vm.recentChanges;
  return <div className="sk-admin-table-card is-plain">
    <table className="sk-admin-table">
      <caption className="sk-admin-visually-hidden">Recently changed accounts</caption>
      <thead><tr><th scope="col">Change</th><th scope="col">Detail</th><th scope="col">When</th></tr></thead>
      <tbody>{changes.length ? changes.map(event => <tr key={event.id}>
        <td><strong>{readable(event.kind)}</strong></td>
        <td>{event.summary || '—'}</td>
        <td><time dateTime={new Date(event.createdAt * 1000).toISOString()}>{when(event.createdAt)}</time></td>
      </tr>) : <tr><td colSpan={3}><AdminEmpty title="No recent access changes" description="Account and permission changes will appear here." /></td></tr>}</tbody>
    </table>
  </div>;
});

/** Super Admin → Accounts & roles. */
export const AccountsView = observer(function AccountsView() {
  const [vm] = useState(() => new AccountsOverviewViewModel(accountsRepository, opsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  // The open tab is presentation state. Recent changes load each time their tab opens.
  const [tab, setTab] = useState<AccountTab>('roles');
  const changeTab = (next: AccountTab) => {
    if (next === 'recent' && tab !== 'recent') void vm.loadRecentChanges();
    if (tab === 'recent' && next !== 'recent') vm.stopRecentChanges();
    setTab(next);
  };
  return <AdminPage title="Accounts & roles" description="Manage platform accounts, roles, permissions, and access boundaries.">
    {vm.loading ? <AdminLoading label="Loading accounts by role…" />
      : vm.error !== null ? <AdminError title="Couldn’t load accounts by role" message={vm.error} onRetry={vm.load} />
        : <>
          <AdminStats plain label="Accounts summary" stats={[
            { label: 'Accounts', value: count(vm.total), meta: 'Total accounts' },
            { label: 'Roles', value: count(vm.roleCount), meta: 'Defined roles' },
            { label: 'Pending grants' },
            { label: 'Break-glass · 30 days' },
          ]} />
          <AccountTabs current={tab} onChange={changeTab} />
          <div id="sk-accounts-panel" role="tabpanel" aria-labelledby={`sk-accounts-tab-${tab}`}>
          {tab === 'pending' ? <div className="sk-admin-table-card is-plain"><AdminEmpty title="No pending access grants" description="Access requests requiring review will appear here. No grant-request data source is connected yet, so none can be listed." /></div>
            : tab === 'recent' ? <RecentAccountChanges vm={vm} />
              : <div className="sk-admin-card sk-admin-table-card">
            <table className="sk-admin-table sk-admin-roles">
              <caption className="sk-admin-visually-hidden">Accounts by role</caption>
              <thead><tr><th scope="col">Role</th><th scope="col">Accounts</th><th scope="col">Clinical access</th><th scope="col">App access</th></tr></thead>
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
          <p className="sk-admin-note"><strong>Access enforcement:</strong> Permissions are enforced by the platform authorization layer. Client-side restrictions are not a security boundary.</p>
        </>}
    <details className="sk-admin-disclosure">
      <summary>Manage accounts <span aria-hidden="true" className="sk-admin-disclosure-arrow">→</span></summary>
      <LegacyPanel><AccountsListView /></LegacyPanel>
    </details>
  </AdminPage>;
});
