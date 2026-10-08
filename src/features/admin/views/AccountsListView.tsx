import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Plus } from 'lucide-react';
import { DataState, Field, FormError, Pagination, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { accountsRepository } from '../model/accountsRepository';
import type { StaffAccount } from '@/data/workflowTypes';
import { ACCOUNTS_PAGE_SIZE, AccountsListViewModel } from '../viewmodels/AccountsListViewModel';

/** Accounts & roles → Manage accounts: list, search and filter accounts, and create staff accounts. */
export const AccountsListView = observer(function AccountsListView() {
  const [vm] = useState(() => new AccountsListViewModel(accountsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // Whether the create form is open is presentation state.
  const [adding, setAdding] = useState(false);
  const [scopeFor, setScopeFor] = useState<StaffAccount | null>(null);
  const [scopeCampus, setScopeCampus] = useState('');

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">SERVER-ASSIGNED ACCESS</span><h2>Accounts & provider roles.</h2><p>Staff accounts are provisioned here. Public signup always creates a student account.</p></div><button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Create staff account</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
    <input
      type="search"
      placeholder="Search accounts by name or email/phone…"
      value={vm.query}
      onChange={e => vm.setQuery(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '240px', flex: 1 }}
    />
    <select
      value={vm.roleFilter}
      onChange={e => vm.setRoleFilter(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
    >
      <option value="">All roles</option>
      <option value="SUPER_ADMIN">Super Admin</option>
      <option value="VENDOR">Vendor / Partner</option>
      <option value="NMC_DOCTOR">Clinician</option>
      <option value="CAMPUS_ADMIN">Campus Admin</option>
      <option value="STUDENT">Student</option>
    </select>
  </div>
  <DataState loading={vm.loading} error={vm.error} retry={vm.reload}><div className="wf-card wf-table-scroll"><table><thead><tr><th>Name</th><th>Verified at sign-in</th><th>Role</th><th>Status</th><th>Campus</th></tr></thead><tbody>{vm.data?.items.map(account => <tr key={account.id}><td>{account.fullName}</td><td>{account.identifier}</td><td>{account.role.replace(/_/g, ' ')}</td><td><span className="wf-status">{account.active ? 'Active' : 'Inactive'}</span></td><td>{account.role === 'CAMPUS_ADMIN' ? <>{account.campus || <span className="wf-status status-declined">Not set — sees no students</span>}{' '}<button type="button" className="health-text-button" onClick={() => { setScopeFor(account); setScopeCampus(account.campus || ''); }}>Set campus</button></> : '—'}</td></tr>)}</tbody></table></div>
  <Pagination page={vm.page} total={vm.total} pageSize={ACCOUNTS_PAGE_SIZE} onChange={vm.setPage} />
  </DataState>{scopeFor && <ShopDialog title={`Campus for ${scopeFor.fullName}`} onClose={() => setScopeFor(null)}><form className="wf-form" onSubmit={event => { event.preventDefault(); void vm.setCampus(scopeFor.id, scopeCampus).then(saved => { if (saved) setScopeFor(null); }); }}><FormError message={vm.scopeError} /><Field label="Campus they administer" hint="They will only see and verify students who chose this campus."><input required minLength={2} maxLength={160} value={scopeCampus} onChange={event => setScopeCampus(event.target.value)} /></Field><SubmitButton busy={vm.scoping}>Save campus</SubmitButton></form></ShopDialog>}{adding && <ShopDialog title="Create a staff account" onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); void vm.create().then(created => { if (created) setAdding(false); }); }}><FormError message={vm.createError} /><Field label="Full name"><input required minLength={2} maxLength={120} value={vm.fullName} onChange={event => vm.setFullName(event.target.value)} /></Field><Field label="Role"><select value={vm.role} onChange={event => vm.setRole(event.target.value)}><option value="VENDOR">Vendor / lab partner</option><option value="NMC_DOCTOR">Clinician</option><option value="CAMPUS_ADMIN">Campus administrator</option></select></Field>{vm.role === 'CAMPUS_ADMIN' && <Field label="Campus they administer" hint="They will only see and verify students who chose this campus."><input required minLength={2} maxLength={160} value={vm.university} onChange={event => vm.setUniversity(event.target.value)} /></Field>}<Field label="Sign-in channel"><select value={vm.channel} onChange={event => vm.setChannel(event.target.value)}><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select></Field><Field label="Contact address"><input required type={vm.channel === 'EMAIL' ? 'email' : 'tel'} maxLength={254} value={vm.identifier} onChange={event => vm.setIdentifier(event.target.value)} /></Field><p>The account holder must verify this contact address at login. Creating a clinician account does not independently validate a professional licence.</p><SubmitButton busy={vm.creating}>Create account</SubmitButton></form></ShopDialog>}</>;
});
